import { useState } from "react";
import { defaultName, MAX_NAME_LENGTH, MAX_PLAYERS, MIN_PLAYERS } from "@/lib/gameHelpers";
import Link from "next/link";
import HouseRules from "@/components/HouseRules";
import SetupScreen, { ActionPanel, BLUE_PANEL, ERROR, FIELD, LABEL, PANEL, QUIET_LINK } from "@/components/SetupScreen";

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
    <SetupScreen data-cy="game-setup" title="Play local" fit={3.54} back="/">
      <div className={PANEL}>
        <fieldset className="min-w-0">
          <legend className={`${LABEL} mb-3`}>How many players?</legend>
          <div className="flex gap-2">
            {COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                data-cy={`players-${n}`}
                aria-pressed={count === n}
                onClick={() => setCount(n)}
                className={`h-12 flex-1 cursor-pointer border-2 font-heading text-3xl ${
                  count === n ? "border-highlight bg-highlight text-primary" : "border-paper/35 hover:border-paper"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>

        {/* HOT-SEAT ONLY: online, each player picks their own name when they join */}
        <fieldset className="min-w-0">
          <legend className={`${LABEL} mb-3`}>Names</legend>
          <div className="grid gap-2 sm:grid-cols-2">
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
                className={FIELD}
              />
            ))}
          </div>
          {sameName && (
            <p data-cy="same-name" className={`mt-3 ${ERROR}`}>
              Two players have the same name.
            </p>
          )}
        </fieldset>

        <Link href="/online" data-cy="play-online" className={`mt-auto ${QUIET_LINK}`}>
          Play online instead
        </Link>
      </div>

      <div className={BLUE_PANEL}>
        {/* HOT-SEAT ONLY: online, everyone joins with a room code instead */}
        <p>Everyone plays on this device, passing it round between turns.</p>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            data-cy="pass-screens"
            checked={passScreens}
            onChange={(event) => setPassScreens(event.target.checked)}
            className="mt-1 accent-highlight"
          />
          <span>
            Pass the device screens
            <span className="mt-1 block text-sm text-paper/80">
              Hides each hand until the next player is ready. Turn off when playing on your own.
            </span>
          </span>
        </label>

        <HouseRules />
      </div>

      <ActionPanel
        type="button"
        data-cy="deal"
        disabled={sameName}
        onClick={() => onDeal(names, passScreens)}
        hint={`${count} players on one device`}
        label="Deal"
      />
    </SetupScreen>
  );
}
