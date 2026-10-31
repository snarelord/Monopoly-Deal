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

      <div className="grid grid-cols-[minmax(7rem,calc(var(--card-w)*2.5+3rem))_minmax(0,1fr)_minmax(7rem,calc(var(--card-w)*2.5+3rem))] items-stretch gap-4">
        <div className="self-end">
          <PlayerBank playerId={me.id} cards={me.bank} />
        </div>

        <PlayerHand cards={me.hand} turn={turn} onMove={onMove} />

        <div className="relative">
          <div className="absolute inset-0">
            <PropertyPile playerId={me.id} sets={me.properties} />
          </div>
        </div>
      </div>
    </div>
  );
}
