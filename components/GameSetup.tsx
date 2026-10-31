import { useState } from "react";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/lib/gameHelpers";

const COUNTS = Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => MIN_PLAYERS + i);

interface GameSetupProps {
  initialCount: number;
  initialPassScreens: boolean;
  onDeal: (playerCount: number, passScreens: boolean) => void;
}

export default function GameSetup({ initialCount, initialPassScreens, onDeal }: GameSetupProps) {
  const [count, setCount] = useState(initialCount);
  const [passScreens, setPassScreens] = useState(initialPassScreens);

  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div
        data-cy="game-setup"
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-black/20 bg-white/70 p-6 text-black shadow"
      >
        <h1 className="text-2xl font-bold">Monopoly Deal</h1>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">How many players?</legend>
          <div className="flex gap-2">
            {COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                data-cy={`players-${n}`}
                aria-pressed={count === n}
                onClick={() => setCount(n)}
                className={`flex-1 cursor-pointer rounded border-2 py-2 text-lg font-semibold ${
                  count === n ? "border-green-700 bg-green-700 text-white" : "border-black/30 hover:border-black"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>

        {/* HOT-SEAT ONLY: online, everyone joins with a room code instead */}
        <p className="text-xs text-black/60">Everyone plays on this device, passing it round between turns.</p>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            data-cy="pass-screens"
            checked={passScreens}
            onChange={(event) => setPassScreens(event.target.checked)}
            className="mt-1"
          />
          <span>
            Pass-the-device screens
            <span className="block text-xs text-black/60">
              Hides each hand until the next player is ready. Turn off when playing on your own.
            </span>
          </span>
        </label>

        <button
          type="button"
          data-cy="deal"
          onClick={() => onDeal(count, passScreens)}
          className="cursor-pointer rounded bg-green-700 py-2 text-white"
        >
          Deal
        </button>
      </div>
    </main>
  );
}
