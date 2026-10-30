"use client";

import type { Card, Player, OpponentView } from "@/lib/types";
import PlayerHand from "./PlayerHand/PlayerHand";

export interface GameBoardProps {
  me: Player;
  opponents: OpponentView[];
  drawPileCount: number;
  discardPile: Card[];
  currentPlayerId: number;
}

export default function GameBoard({
  me,
  opponents,
  drawPileCount,
  discardPile,
  currentPlayerId,
}: GameBoardProps) {
  return (
    <div data-cy="game-board">
      <h2 className="mb-2 text-black">Your hand</h2>
      <PlayerHand cards={me.hand} />
    </div>
  );
}