"use client";

import { useEffect, useState } from "react";
import { applyMove, beginGame, getTurnStatus, MAX_PLAYERS, MIN_PLAYERS, waitingOn } from "@/lib/gameHelpers";
import GameBoard from "@/components/GameBoard";
import GameSetup from "@/components/GameSetup";
import PassScreen from "@/components/PassScreen";
import type { OpponentView, GameState, Move } from "@/lib/types";

export default function Home() {
  const [game, setGame] = useState<GameState | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  // HOT-SEAT ONLY: the player who last confirmed they're at the screen (see PassScreen)
  const [seatedId, setSeatedId] = useState(0);
  const [settingUp, setSettingUp] = useState(false);
  const [playerCount, setPlayerCount] = useState(MIN_PLAYERS);

  function deal(count: number, seed?: number) {
    setPlayerCount(count);
    setGame(beginGame(count, seed));
    setMoveError(null);
    setSeatedId(0);
    setSettingUp(false);
  }

  useEffect(() => {
    // ?seed= or ?players= deals straight away (tests rely on this), otherwise choose the players first
    const params = new URLSearchParams(window.location.search);
    const seed = params.get("seed");
    const players = params.get("players");
    if (!seed && !players) return setSettingUp(true);
    const count = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Number(players ?? MIN_PLAYERS)));
    setPlayerCount(count);
    setGame(beginGame(count, seed ? Number(seed) : undefined));
  }, []);

  if (settingUp) return <GameSetup initialCount={playerCount} onDeal={(count) => deal(count)} />;
  if (!game) return null;

  const turn = getTurnStatus(game);
  // HOT-SEAT ONLY: the screen shows whoever the game is waiting on: the current player,
  // or someone who owes money. online, `me` becomes the signed-in player instead
  const me = game.players.find((p) => p.id === waitingOn(game)[0])!;
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
        key={game.seed} // a new game starts with a fresh board (toasts already seen, etc)
        me={me}
        opponents={opponents}
        drawPileCount={game.deck.length}
        discardPile={game.discardPile}
        currentPlayerId={turn.currentPlayerId}
        turn={turn}
        moveError={moveError}
        onMove={dispatch}
        onNewGame={() => setSettingUp(true)}
        log={game.log}
        paused={me.id !== seatedId}
      />
      {/* HOT-SEAT ONLY: the game has moved on to another player, hand the device over first */}
      {me.id !== seatedId && !game.isGameOver && <PassScreen playerId={me.id} onReady={() => setSeatedId(me.id)} />}
    </main>
  );
}
