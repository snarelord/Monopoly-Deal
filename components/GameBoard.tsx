"use client";

import type { Card, Player, OpponentView } from "@/lib/types";
import PlayerHand from "./PlayerHand/PlayerHand";
import DrawPile from "./DrawPile/DrawPile";

export interface GameBoardProps {
  me: Player;
  opponents: OpponentView[];
  drawPileCount: number;
  discardPile: Card[];
  currentPlayerId: number;
  onDraw: () => void;
  hasDrawnCards: boolean;
}

export default function GameBoard({
  me,
  drawPileCount,
  onDraw,
  hasDrawnCards,
}: GameBoardProps) {
  return (
    <div data-cy="game-board" className="relative h-dvh overflow-hidden">
      <div className="absolute left-[60%] top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-10">
        <DrawPile
          count={drawPileCount}
          onDraw={onDraw}
          disabled={hasDrawnCards}
        />

        {/* discard pile goes next to it */}
      </div>

      <div className="absolute inset-x-0 bottom-0">
        <PlayerHand cards={me.hand} />
      </div>
    </div>
  );
}