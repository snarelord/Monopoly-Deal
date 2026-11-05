"use client";

import { useState } from "react";
import { makeMove } from "../../../app/online/actions"
import GameBoard from "../../../components/GameBoard";
import type { PlayerView } from "../../../lib/playerView";
import type { Move } from "../../../lib/types";
import { seenVersions } from "./seenVersions";

interface OnlineGameProps {
  code: string;
  view: PlayerView;
  version: number;
}

export default function OnlineGame({ code, view, version }: OnlineGameProps) {
  const [moveError, setMoveError] = useState<string | null>(null);
  const [latest, setLatest] = useState<{ view: PlayerView; version: number } | null>(null);

  async function send(move: Move) {
    setMoveError(null);
    try {
      const result = await makeMove(code, move);
      if ("error" in result) return setMoveError(result.error);
      seenVersions.set(code, result.version);
      setLatest(result);
    } catch {
      setMoveError("Something went wrong. Check connection and try again.")
    }
  }

  // the page and this tab's own moves can arrive in either order, so the newest wins
  const current = latest && latest.version > version ? latest.view : view;

  return (
    <GameBoard {...current} moveError={moveError} onMove={send} paused={false} />
  );
}
