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
import NextStep from "./NextStep";
import PaymentPanel from "./PaymentPanel";
import ResponsePanel from "./ResponsePanel";
import GameLog from "./GameLog";
import Toasts from "./Toasts";
import GameOver from "./GameOver";
import Stripe from "./Stripe";
import { describeEntry, isAimedAt } from "./logText";
import OpponentPanel from "./OpponentPanel";
import { useCardFlights } from "./useCardFlights";

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
  const [discardIds, setDiscardIds] = useState<string[]>([]);
  const noteMove = useCardFlights(me.id, me.hand.map((card) => card.id));

  function playMove(move: Move) {
    noteMove(move); // before the move, while the card is still where it started
    onMove(move);
  }
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

  function toggleDiscard(id: string) {
    setDiscardIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < turn.cardsToDiscard ? [...ids, id] : ids,
    );
  }

  function discard() {
    playMove({ type: "discard", cardIds: discardIds });
    setDiscardIds([]);
  }

  // HOT-SEAT ONLY: on a shared screen "your turn" doesn't say whose, so it uses the name
  const banner =
    turn.winnerId !== null
      ? { title: `${names[turn.winnerId]} wins` }
      : turn.mustDiscard
        ? { title: "Discard", accent: String(turn.cardsToDiscard), tail: turn.cardsToDiscard === 1 ? "card" : "cards" }
        : { title: me.id === turn.currentPlayerId && !onNewGame ? "Your turn" : `${names[turn.currentPlayerId]}'s turn` };

  return (
    <div
      data-cy="game-board"
      className="flex min-h-dvh flex-col overflow-x-clip bg-primary text-paper [--gutter:clamp(16px,2.5vw,36px)] [--pile-w:calc(var(--card-w)*0.8)] max-md:[--card-w:clamp(5rem,24vw,6.5rem)] lg:h-dvh lg:overflow-hidden"
    >
      <TurnInfo turn={turn} {...banner} onNewGame={onNewGame} />
      <Stripe height="clamp(8px,1vw,12px)" className="mt-2 flex-none" />

      {log.length > 0 && (
        <p data-cy="latest-log" className="truncate px-(--gutter) py-1 text-xs text-paper/70 lg:hidden">
          {describeEntry(log[log.length - 1], me.id, names)}
        </p>
      )}

      <div className="grid flex-1 lg:min-h-0 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)_minmax(0,2fr)] lg:grid-rows-[minmax(0,1fr)_auto]">
        <aside
          aria-label="Other players"
          className="flex min-w-0 flex-col gap-3 bg-secondary p-2 lg:col-start-2 lg:row-start-1 lg:min-h-0 lg:overflow-y-auto lg:p-3"
        >
          <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {opponents.map((opponent) => (
              <div key={opponent.id} className="w-60 flex-none lg:w-auto">
                <OpponentPanel opponent={opponent} isTheirTurn={opponent.id === turn.currentPlayerId} compact={opponents.length > 3} />
              </div>
            ))}
          </div>
          <div className="hidden min-h-24 flex-1 lg:flex">
            <GameLog log={log} viewerId={me.id} names={names} />
          </div>
        </aside>

        <div className="min-w-0 px-(--gutter) py-4 lg:col-start-1 lg:row-start-1 lg:min-h-0">
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

        <section
          aria-label="Your bank and hand"
          className="flex min-w-0 flex-col-reverse gap-4 px-(--gutter) lg:col-span-2 lg:col-start-1 lg:row-start-2 lg:flex-row lg:items-end lg:gap-[clamp(20px,3vw,44px)]"
        >
          <div className="relative h-36 flex-none lg:h-auto lg:w-[clamp(11rem,19vw,17rem)] lg:self-stretch">
            <div className="absolute inset-0 lg:pb-3">
              <PlayerBank playerId={me.id} cards={me.bank} />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <PlayerHand
              me={me}
              turn={turn}
              opponents={opponents}
              names={names}
              onMove={playMove}
              discardIds={turn.mustDiscard ? discardIds : null}
              onToggleDiscard={toggleDiscard}
            />
          </div>
        </section>

        {/* phones: contents, so the next step can stay pinned to the bottom of the whole board */}
        <div className="flex min-w-0 [--gutter:1rem] max-md:contents lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:flex-col">
          <div className="flex flex-none justify-center gap-3 px-3 py-4">
            <DrawPile count={drawPileCount} canDraw={turn.canDraw} onDraw={() => onMove({ type: "draw" })} />
            <ActionPile cards={discardPile} />
          </div>
          <NextStep
            turn={turn}
            myId={me.id}
            names={names}
            moveError={moveError}
            discardIds={discardIds}
            onDiscard={discard}
            onMove={onMove}
          />
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
