"use client";

import { useEffect, useState } from "react";
import { beginGame, endTurn } from "@/lib/gameHelpers";
import GameBoard from "@/components/GameBoard";
import type { OpponentView, GameState } from "@/lib/types";

export default function Home() {
  const [game, setGame] = useState<GameState | null>(null);

  useEffect(() => {
    setGame(beginGame());
  }, []);

  if (!game) return null;

  const me = game.players[0];
  const others = game.players.filter((player) => player.id !== me.id);

  const opponents: OpponentView[] = others.map((p) => ({
    id: p.id,
    handCount: p.hand.length,
    bank: p.bank,
    properties: p.properties,
  }));

  function handleDraw() {
    setGame((currentGame) => {
      if (!currentGame) return currentGame;
      if (currentGame.hasDrawnCards) return currentGame;
      if (currentGame.deck.length === 0) return currentGame;

      const cardsToDraw = currentGame.deck.slice(0, 2);
      const remainingDeck = currentGame.deck.slice(2);
      const currentPlayerId = currentGame.players[currentGame.currentPlayerIndex].id;

      const players = currentGame.players.map((player) =>
        player.id === currentPlayerId
          ? { ...player, hand: [...player.hand, ...cardsToDraw] }
          : player
      );

      return {
        ...currentGame,
        players,
        deck: remainingDeck,
        hasDrawnCards: true,
      };
    })
  }

  return (
    <main className="relative">
      <GameBoard
        me={me}
        opponents={opponents}
        drawPileCount={game.deck.length}
        discardPile={game.discardPile}
        currentPlayerId={me.id}
        onDraw={handleDraw}
        hasDrawnCards={game.hasDrawnCards}
      />
      <div className="fixed left-4 top-4 z-50  inline-flex rounded-base shadow-xs -space-x-px" role="group">
        <button
          className="cursor-pointer border-2 text-black p-2"
          onClick={() => setGame(beginGame())}
        >
          Deal again
        </button>
        <button
          className="cursor-pointer border-2 text-black p-2"
          onClick={() => endTurn()} // end turn does nothing currently
        >
          End turn
        </button>
      </div>
    </main>
  );
}