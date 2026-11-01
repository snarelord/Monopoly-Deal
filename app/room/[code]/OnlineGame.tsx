"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { makeMove } from "../../../app/online/actions"
import GameBoard from "../../../components/GameBoard";
import type { PlayerView } from "../../../lib/playerView";
import type { Move } from "../../../lib/types";

export default function OnlineGame({ code, view }: { code: string, view: PlayerView }) {
  const router = useRouter();
  const [moveError, setMoveError] = useState<string | null>(null);

  async function send(move: Move) {
    setMoveError(null);
    try {
      const result = await makeMove(code, move);
      if (result) setMoveError(result.error)
      else router.refresh() // show move straightaway 
    } catch {
      setMoveError("Something went wrong. Check connection and try again.")
    }
  }
  return (
    <GameBoard {...view} moveError={moveError} onMove={send} paused={false} />
  );
}
