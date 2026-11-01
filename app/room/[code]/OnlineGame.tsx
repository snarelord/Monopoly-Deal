"use client";

import { useState } from "react";
import GameBoard from "@/components/GameBoard";
import type { PlayerView } from "@/lib/playerView";

export default function OnlineGame({ view }: { view: PlayerView }) {
  const [moveError, setMoveError] = useState<string | null>(null);
  return (
    <GameBoard
      {...view}
      moveError={moveError}
      // PLANNED: send the move to the server, which runs applyMove and saves it
      onMove={() => setMoveError("Moves don't work online yet.")}
      paused={false}
    />
  );
}
