"use client";

import { useCallback, useState } from "react";
import type { Move } from "../lib/types";
import type { PlayerView } from "../lib/playerView";
import PlayerHand from "./PlayerHand/PlayerHand";
import DrawPile from "./DrawPile/DrawPile";
import ActionPile from "./ActionPile/ActionPile";
import PlayerBank from "./PlayerHand/PlayerBank";
import PropertyPile from "./PropertyPile/PropertyPile";
import TurnInfo from "./TurnInfo";
import PaymentPanel from "./PaymentPanel";
import ResponsePanel from "./ResponsePanel";
import GameLog from "./GameLog";
import Toasts from "./Toasts";
import GameOver from "./GameOver";
import { describeEntry, isAimedAt } from "./logText";
import OpponentPanel from "./OpponentPanel";

/*
  PLANNED:
  - clicking an opponent's bank or properties opens the full view (see the PLANNED notes in PlayerBank and PropertyPile)
*/
export interface GameBoardProps extends PlayerView {
  onMove: (move: Move) => void;
  moveError: string | null;
  onNewGame?: () => void; // HOT-SEAT ONLY: deal again on the same device
  paused: boolean; // hot-seat: the pass screen is covering the board
}

export default function GameBoard({
  me,
  opponents,
  drawPileCount,
  discardPile,
  onMove,
  turn,
  moveError,
  onNewGame,
  log,
  paused,
}: GameBoardProps) {
  const [seen, setSeen] = useState<Record<number, number>>(() => ({ [me.id]: log.length }));
  const [showGameOver, setShowGameOver] = useState(true);
  const everyone = [{ id: me.id, name: me.name, properties: me.properties, bank: me.bank }, ...opponents].toSorted(
    (a, b) => a.id - b.id,
  );
  const names = everyone.map((p) => p.name); // names[id], since ids are seat numbers

  const toasts = log
    .map((entry, index) => ({ entry, index }))
    .slice(seen[me.id] ?? 0)
    .filter(({ entry }) => isAimedAt(entry, me.id))
    .map(({ entry, index }) => ({ index, text: describeEntry(entry, me.id, names) }));

  const dismissToasts = useCallback(() => setSeen((s) => ({ ...s, [me.id]: log.length })), [me.id, log.length]);

  const myDebt = turn.owing.find((debt) => debt.playerId === me.id && debt.status === "paying");
  const myResponse = turn.owing.find(
    (debt) =>
      (debt.playerId === me.id && debt.status === "responding") ||
      (debt.toPlayerId === me.id && debt.status === "countering"),
  );

  return (
    <div
      data-cy="game-board"
      className="grid h-dvh grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden px-4 pt-4"
    >
      <div className="flex h-[clamp(8rem,22dvh,13rem)] justify-center-safe gap-4 overflow-x-auto">
        {opponents.map((opponent) => (
          <div key={opponent.id} className="h-full min-w-56 max-w-xl flex-1">
            <OpponentPanel opponent={opponent} isTheirTurn={opponent.id === turn.currentPlayerId} />
          </div>
        ))}
      </div>

      <div className="relative grid min-h-0 place-items-center">
        {onNewGame && (
          <button
            type="button"
            data-cy="new-game"
            onClick={onNewGame}
            className="absolute left-0 top-0 cursor-pointer rounded border-2 border-black/40 px-2 py-1 text-xs text-black"
          >
            Deal again
          </button>
        )}
        <div className="absolute bottom-0 left-0 top-9 hidden w-56 lg:flex">
          <GameLog log={log} viewerId={me.id} names={names} />
        </div>
        <div className="flex items-center gap-[calc(var(--card-w)*0.4)]">
          <DrawPile
            count={drawPileCount}
            canDraw={turn.canDraw}
            onDraw={() => onMove({ type: "draw" })}
          />
          <ActionPile cards={discardPile} />
          <div className="flex w-52 flex-col gap-2">
            <TurnInfo turn={turn} names={names} moveError={moveError} />
            <button
              type="button"
              data-cy="end-turn"
              disabled={!turn.canEndTurn}
              onClick={() => onMove({ type: "end-turn" })}
              className="cursor-pointer rounded bg-green-700 px-3 py-1.5 text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              End turn
            </button>
          </div>
        </div>
        {log.length > 0 && (
          <p data-cy="latest-log" className="max-w-full truncate text-xs text-black/70 lg:hidden">
            {describeEntry(log[log.length - 1], me.id, names)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 items-stretch gap-4 md:grid-cols-[minmax(12rem,1fr)_minmax(0,1.4fr)_minmax(12rem,1fr)]">
        <div className="relative order-2 min-h-[clamp(11rem,30dvh,24rem)] md:order-0">
          <div className="absolute inset-0">
            <PlayerBank playerId={me.id} cards={me.bank} />
          </div>
        </div>

        <div className="order-1 col-span-2 min-w-0 self-end md:order-0 md:col-span-1">
          <PlayerHand
            me={me}
            turn={turn}
            opponents={opponents}
            names={names}
            onMove={onMove}
          />
        </div>

        <div className="relative order-3 min-h-[clamp(11rem,30dvh,24rem)] md:order-0">
          <div className="absolute inset-0">
            <PropertyPile
              playerId={me.id}
              sets={me.properties}
              onMoveWildcard={
                me.id === turn.currentPlayerId && !turn.pendingCard && turn.winnerId === null
                  ? (cardId, colour) => onMove({ type: "move-wildcard", cardId, colour })
                  : undefined
              }
            />
          </div>
        </div>
      </div>

      <Toasts toasts={toasts} paused={paused} onDismiss={dismissToasts} />

      {turn.winnerId !== null && showGameOver && (
        <GameOver
          players={everyone}
          winnerId={turn.winnerId}
          onPlayAgain={onNewGame}
          onClose={() => setShowGameOver(false)}
        />
      )}

      {myDebt && (
        <PaymentPanel key={me.id} me={me} amount={myDebt.amount} toName={names[myDebt.toPlayerId]} onMove={onMove} />
      )}
      {!myDebt && myResponse && turn.pendingCard && (
        <ResponsePanel
          me={me}
          pendingCard={turn.pendingCard}
          effect={turn.pendingEffect!}
          debt={myResponse}
          names={names}
          onMove={onMove}
        />
      )}
    </div>
  );
}
