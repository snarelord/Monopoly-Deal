import { useState } from "react";
import { defaultName, MAX_NAME_LENGTH, MAX_PLAYERS, MIN_PLAYERS } from "@/lib/gameHelpers";
import Link from "next/link";

const COUNTS = Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => MIN_PLAYERS + i);

interface GameSetupProps {
  initialNames: string[];
  initialPassScreens: boolean;
  onDeal: (names: string[], passScreens: boolean) => void;
}

export default function GameSetup({ initialNames, initialPassScreens, onDeal }: GameSetupProps) {
  const [count, setCount] = useState(initialNames.length);
  // what's typed in each box, blank for the default name. MAX_PLAYERS long so changing the count keeps them
  const [typed, setTyped] = useState(() =>
    Array.from({ length: MAX_PLAYERS }, (_, i) => (initialNames[i] && initialNames[i] !== defaultName(i) ? initialNames[i] : "")),
  );
  const [passScreens, setPassScreens] = useState(initialPassScreens);

  const names = typed.slice(0, count).map((name, i) => name.trim() || defaultName(i));
  const sameName = new Set(names.map((name) => name.toLowerCase())).size < names.length;

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

        {/* HOT-SEAT ONLY: online, each player picks their own name when they join */}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">Names</legend>
          {typed.slice(0, count).map((name, i) => (
            <input
              key={i}
              type="text"
              data-cy={`name-${i}`}
              aria-label={`Name for player ${i + 1}`}
              placeholder={defaultName(i)}
              maxLength={MAX_NAME_LENGTH}
              value={name}
              onChange={(event) => setTyped((t) => t.map((old, j) => (j === i ? event.target.value : old)))}
              className="rounded border-2 border-black/30 bg-white px-2 py-1 focus:border-black"
            />
          ))}
          {sameName && (
            <p data-cy="same-name" className="text-xs text-red-700">
              Two players have the same name.
            </p>
          )}
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
          disabled={sameName}
          onClick={() => onDeal(names, passScreens)}
          className="cursor-pointer rounded bg-green-700 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Deal
        </button>
        <Link href="/online" data-cy="play-online" className="text-center text-xs text-black/60 underline">
          Play online instead
        </Link>
      </div>
    </main>
  );
}
