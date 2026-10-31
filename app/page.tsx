"use client";

import { useEffect, useState } from "react";
import { applyMove, beginGame, getTurnStatus } from "@/lib/gameHelpers";
import GameBoard from "@/components/GameBoard";
import type { OpponentView, GameState, Move } from "@/lib/types";

export default function Home() {
  const [game, setGame] = useState<GameState | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  useEffect(() => {
    const seed = new URLSearchParams(window.location.search).get("seed");
    setGame(beginGame(2, seed ? Number(seed) : undefined));
  }, []);

  if (!game) return null;

  const turn = getTurnStatus(game);
  // hot-seat for now: whoever's turn it is is at the screen. online, this becomes the signed-in player
  const me = game.players[game.currentPlayerIndex];
  const others = game.players.filter((player) => player.id !== me.id);

  // always act as the player who clicked; the game logic decides if it's allowed
  function dispatch(move: Move) {
    const result = applyMove(game!, me.id, move);
    if (!result.ok) {
      setMoveError(result.error);
      return;
    }
    setMoveError(null);
    setGame(result.game);
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
        currentPlayerId={turn.currentPlayerId}
        turn={turn}
        moveError={moveError}
        onMove={dispatch}
      />
      <div className="fixed left-4 top-4 z-50  inline-flex rounded-base shadow-xs -space-x-px" role="group">
        <button
          className="cursor-pointer border-2 text-black p-2"
          onClick={() => {
            setGame(beginGame());
            setMoveError(null);
          }}
        >
          Deal again
        </button>
        <button
          data-cy="end-turn"
          className="cursor-pointer border-2 text-black p-2"
          disabled={!turn.canEndTurn}
          onClick={() => dispatch({ type: "end-turn" })}
        >
          End turn
        </button>
      </div>
    </main>
  );
}
