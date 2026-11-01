"use client";

import { useState, useSyncExternalStore } from "react";
import { applyMove, beginGame, defaultNames, MAX_PLAYERS, MIN_PLAYERS, waitingOn } from "@/lib/gameHelpers";
import { viewFor } from "@/lib/playerView";
import GameBoard from "@/components/GameBoard";
import GameSetup from "@/components/GameSetup";
import PassScreen from "@/components/PassScreen";
import type { GameState, Move } from "@/lib/types";

function startFrom(search: string) {
  const params = new URLSearchParams(search);
  const seed = params.get("seed");
  const players = params.get("players");
  const count = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Number(players ?? MIN_PLAYERS)));
  return {
    names: defaultNames(count),
    game: seed || players ? beginGame(count, seed ? Number(seed) : undefined) : null,
    passScreens: params.get("hotseat") !== "open", // ?hotseat=open skips the pass screens
  };
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
  const [names, setNames] = useState(start.names);
  // HOT-SEAT ONLY: whether to hide hands behind a pass screen when the device changes hands
  const [passScreens, setPassScreens] = useState(start.passScreens);

  function deal(playerNames: string[], withPassScreens: boolean) {
    setNames(playerNames);
    setPassScreens(withPassScreens);
    setGame(beginGame(playerNames));
    setMoveError(null);
    setSeatedId(0);
    setSettingUp(false);
  }

  if (settingUp) {
    return <GameSetup initialNames={names} initialPassScreens={passScreens} onDeal={deal} />;
  }
  if (!game) return null;

  // HOT-SEAT ONLY: the screen shows whoever the game is waiting on: the current player,
  // or someone who owes money. online, it's the signed-in player instead
  const view = viewFor(game, waitingOn(game)[0]);
  const { me } = view;
  const waitingForSeat = passScreens && me.id !== seatedId;

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

  return (
    <main className="relative">
      <GameBoard
        key={game.seed}
        {...view}
        moveError={moveError}
        onMove={dispatch}
        onNewGame={() => setSettingUp(true)}
        paused={waitingForSeat}
      />
      {/* HOT-SEAT ONLY: the game has moved on to another player, hand the device over first */}
      {waitingForSeat && !game.isGameOver && <PassScreen name={me.name} onReady={() => setSeatedId(me.id)} />}
    </main>
  );
}
