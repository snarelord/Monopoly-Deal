"use client";

import { useEffect, useState } from "react";
import {
  beginGame,
  discardCard,
  drawForTurn,
  endTurn,
  getTurnStatus,
  playToActionPile,
  playToBank,
  playToProperties,
} from "@/lib/gameHelpers";
import GameBoard from "@/components/GameBoard";
import type { OpponentView, GameState, CardActionId, Colour } from "@/lib/types";

export default function Home() {
  const [game, setGame] = useState<GameState | null>(null);

  useEffect(() => {
    const seed = new URLSearchParams(window.location.search).get("seed");
    setGame(beginGame(2, seed ? Number(seed) : undefined));
  }, []);

  if (!game) return null;

  const turn = getTurnStatus(game);
  const me = game.players[0];
  const others = game.players.filter((player) => player.id !== me.id);

  const update = (change: (g: GameState) => GameState) => setGame((g) => (g ? change(g) : g));
  type Move = (game: GameState, playerId: number, cardId: string, colour?: Colour) => GameState;

  function handleCardAction(cardId: string, actionId: CardActionId, colour?: Colour) {
    const moves: Partial<Record<CardActionId, Move>> = {
      play: playToActionPile,
      bank: playToBank,
      "place-property": playToProperties,
      discard: discardCard,
    };
    const move = moves[actionId];
    if (!move) {
      console.log(`${actionId}: ${cardId} (not built yet)`);
      return;
    }
    update((g) => move(g, g.players[g.currentPlayerIndex].id, cardId, colour));
  }

  const opponents: OpponentView[] = others.map((p) => ({
    id: p.id,
    handCount: p.hand.length,
    bank: p.bank,
    properties: p.properties,
  }));

  return (
    <main className="relative">
      <GameBoard
        me={me}
        opponents={opponents}
        drawPileCount={game.deck.length}
        discardPile={game.discardPile}
        currentPlayerId={me.id}
        turn={turn}
        onDraw={() => update(drawForTurn)}
        actionPile={game.actionCards}
        onCardAction={handleCardAction}
      />
      <div className="fixed left-4 top-4 z-50  inline-flex rounded-base shadow-xs -space-x-px" role="group">
        <button
          className="cursor-pointer border-2 text-black p-2"
          onClick={() => setGame(beginGame())}
        >
          Deal again
        </button>
        <button
          data-cy="end-turn"
          className="cursor-pointer border-2 text-black p-2"
          disabled={!turn.canEndTurn}
          onClick={() => update(endTurn)}
        >
          End turn
        </button>
      </div>
    </main>
  );
}