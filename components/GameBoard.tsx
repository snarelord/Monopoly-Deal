"use client";

import type { Card, Player, OpponentView } from "@/lib/types";

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
      <h2 className="mb-2">Your hand</h2>
      <ul data-cy="my-hand" className="grid h-56 grid-cols-5 content-start">
        {me.hand.map((card) => (
          <li key={card.id} data-cy="card" data-card-id={card.id}>
            <img src={card.image} alt={card.name} className="max-w-24" />
          </li>
        ))}
      </ul>
    </div>
  );
}