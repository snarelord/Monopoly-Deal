"use client";

import { useState, useSyncExternalStore } from "react";
import { applyMove, beginGame, getTurnStatus, MAX_PLAYERS, MIN_PLAYERS, waitingOn } from "@/lib/gameHelpers";
import GameBoard from "@/components/GameBoard";
import GameSetup from "@/components/GameSetup";
import PassScreen from "@/components/PassScreen";
import type { OpponentView, GameState, Move } from "@/lib/types";

function startFrom(search: string) {
  const params = new URLSearchParams(search);
  const seed = params.get("seed");
  const players = params.get("players");
  const count = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Number(players ?? MIN_PLAYERS)));
  return { count, game: seed || players ? beginGame(count, seed ? Number(seed) : undefined) : null };
}

const noSubscribe = () => () => {};

export default function Home() {
  // the url only exists in the browser (null while the server renders), so the game is set up there
  const search = useSyncExternalStore(noSubscribe, () => window.location.search, () => null);
  return search === null ? null : <HotSeatGame search={search} />;
}

function HotSeatGame({ search }: { search: string }) {
  const [start] = useState(() => startFrom(search));
  const [game, setGame] = useState<GameState | null>(start.game);
  const [moveError, setMoveError] = useState<string | null>(null);
  // HOT-SEAT ONLY: the player who last confirmed they're at the screen (see PassScreen)
  const [seatedId, setSeatedId] = useState(0);
  const [settingUp, setSettingUp] = useState(start.game === null);
  const [playerCount, setPlayerCount] = useState(start.count);

  function deal(count: number, seed?: number) {
    setPlayerCount(count);
    setGame(beginGame(count, seed));
    setMoveError(null);
    setSeatedId(0);
    setSettingUp(false);
  }

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
        key={game.seed}
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
