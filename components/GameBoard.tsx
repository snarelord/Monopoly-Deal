"use client";

import type { Card, Player, OpponentView, Move } from "../lib/types";
import { TurnStatus } from "../lib/gameHelpers";
import PlayerHand from "./PlayerHand/PlayerHand";
import DrawPile from "./DrawPile/DrawPile";
import ActionPile from "./ActionPile/ActionPile";
import PlayerBank from "./PlayerHand/PlayerBank";
import PropertyPile from "./PropertyPile/PropertyPile";
import TurnInfo from "./TurnInfo";

export interface GameBoardProps {
  me: Player;
  opponents: OpponentView[];
  drawPileCount: number;
  discardPile: Card[];
  currentPlayerId: number;
  onMove: (move: Move) => void;
  turn: TurnStatus,
  moveError: string | null;
}

export default function GameBoard({
  me,
  drawPileCount,
  discardPile,
  onMove,
  turn,
  moveError,
}: GameBoardProps) {
  return (
    <div
      data-cy="game-board"
      className="grid h-dvh grid-rows-[minmax(0,1fr)_auto] gap-4 overflow-hidden px-4 pt-4"
    >
      <div className="absolute right-4 top-4">
        <TurnInfo turn={turn} moveError={moveError} />
      </div>
      <div className="grid place-items-center">
        <div className="flex gap-[calc(var(--card-w)*0.4)]">
          <DrawPile
            count={drawPileCount}
            canDraw={turn.canDraw}
            onDraw={() => onMove({ type: "draw" })}
          />
          {/* played actions and discards share one pile, like the real game */}
          <ActionPile cards={discardPile} />
        </div>
      </div>

      {/* bank and properties are at least ~a third of the screen tall and scroll inside when full */}
      <div className="grid grid-cols-2 items-stretch gap-4 md:grid-cols-[minmax(12rem,1fr)_minmax(0,1.4fr)_minmax(12rem,1fr)]">
        <div className="relative order-2 min-h-[clamp(13rem,36dvh,26rem)] md:order-0">
          <div className="absolute inset-0">
            <PlayerBank playerId={me.id} cards={me.bank} />
          </div>
        </div>

        <div className="order-1 col-span-2 min-w-0 self-end md:order-0 md:col-span-1">
          <PlayerHand cards={me.hand} turn={turn} onMove={onMove} />
        </div>

        <div className="relative order-3 min-h-[clamp(13rem,36dvh,26rem)] md:order-0">
          <div className="absolute inset-0">
            <PropertyPile playerId={me.id} sets={me.properties} />
          </div>
        </div>
      </div>
    </div>
  );
}
