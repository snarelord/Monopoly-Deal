"use client";

import type { Card, Player, OpponentView, Move } from "../lib/types";
import { TurnStatus } from "../lib/gameHelpers";
import PlayerHand from "./PlayerHand/PlayerHand";
import DrawPile from "./DrawPile/DrawPile";
import ActionPile from "./ActionPile/ActionPile";
import PlayerBank from "./PlayerHand/PlayerBank";
import PropertyPile from "./PropertyPile/PropertyPile";
import TurnInfo from "./TurnInfo";
import PaymentPanel from "./PaymentPanel";
import ResponsePanel from "./ResponsePanel";
import OpponentPanel from "./OpponentPanel";

/*
  PLANNED:
  - clicking an opponent's bank or properties opens the full view (see the PLANNED notes in PlayerBank and PropertyPile)
  - a game log feed in the empty space left of the draw/discard piles, reading GameState.log (see types.ts),
    collapsing to just the latest entry on mobile
  - toasts only for things aimed at you, e.g. "Player 2 said Just Say No to your Debt Collector"
    (right now when an action is cancelled the game just carries on and nobody is told)
*/
export interface GameBoardProps {
  me: Player;
  opponents: OpponentView[];
  drawPileCount: number;
  discardPile: Card[];
  currentPlayerId: number;
  onMove: (move: Move) => void;
  turn: TurnStatus,
  moveError: string | null;
  onNewGame: () => void;
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
}: GameBoardProps) {
  // a debt I'm paying, or one where it's my move to just say no (as the debtor) or say no back (as the one owed)
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
      <div className="flex h-[clamp(8rem,22dvh,13rem)] justify-center gap-4 overflow-x-auto">
        {opponents.map((opponent) => (
          <div key={opponent.id} className="h-full min-w-56 max-w-xl flex-1">
            <OpponentPanel opponent={opponent} isTheirTurn={opponent.id === turn.currentPlayerId} />
          </div>
        ))}
      </div>

      <div className="relative grid min-h-0 place-items-center">
        <button
          type="button"
          data-cy="new-game"
          onClick={onNewGame}
          className="absolute left-0 top-0 cursor-pointer rounded border-2 border-black/40 px-2 py-1 text-xs text-black"
        >
          Deal again
        </button>
        <div className="flex items-center gap-[calc(var(--card-w)*0.4)]">
          <DrawPile
            count={drawPileCount}
            canDraw={turn.canDraw}
            onDraw={() => onMove({ type: "draw" })}
          />
          {/* played actions and discards share one pile, instead of having seperate piles*/}
          <ActionPile cards={discardPile} />
          <div className="flex w-52 flex-col gap-2">
            <TurnInfo turn={turn} moveError={moveError} />
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

      {myDebt && (
        <PaymentPanel key={me.id} me={me} amount={myDebt.amount} toPlayerId={myDebt.toPlayerId} onMove={onMove} />
      )}
      {!myDebt && myResponse && turn.pendingCard && (
        <ResponsePanel
          me={me}
          pendingCard={turn.pendingCard}
          effect={turn.pendingEffect!}
          debt={myResponse}
          onMove={onMove}
        />
      )}
    </div>
  );
}
