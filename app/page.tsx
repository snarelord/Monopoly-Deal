"use client";

import { useEffect, useState } from "react";
import { beginGame } from "@/lib/gameHelpers";

type Game = ReturnType<typeof beginGame>;

export default function Home() {
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    setGame(beginGame());
  }, []);

  if (!game) return null;

  return (
    <main style={{ padding: 24 }}>
      <h1 className="mb-6">Monopoly Deal</h1>

      <h2 className="mb-2">Your hand</h2>
      <ul className="grid h-56 grid-cols-5 content-start">
        {game.hand.map((card) => (
          <div key={card.id} className="">
            <img src={card.image} className="max-w-24"></img>
          </div>
        ))}
      </ul>

      <p>Cards left in deck: {game.deck.length}</p>

      <button className="cursor-pointer mt-8 border-2 p-2" onClick={() => setGame(beginGame())}>Deal again</button>
    </main>
  );
}