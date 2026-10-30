"use client";

import { useEffect, useState } from "react";
import { beginGame } from "@/lib/gameHelpers";
import GameBoard from "@/components/GameBoard";
import type { OpponentView } from "@/lib/types";

type Game = ReturnType<typeof beginGame>;

export default function Home() {
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    setGame(beginGame());
  }, []);

  if (!game) return null;

  const [me, ...others] = game.players;

  const opponents: OpponentView[] = others.map((p) => ({
    id: p.id,
    handCount: p.hand.length,
    bank: p.bank,
    properties: p.properties,
  }));

  return (
    <main className="p-6">
      <GameBoard
        me={me}
        opponents={opponents}
        drawPileCount={game.deck.length}
        discardPile={game.discardPile}
        currentPlayerId={me.id}
      />

      <button
        className="cursor-pointer mt-8 border-2 p-2 border-black text-black"
        onClick={() => setGame(beginGame())}
      >
        Deal again
      </button>
    </main>
  );
}