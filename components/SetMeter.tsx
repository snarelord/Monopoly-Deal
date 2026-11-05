import { COLOUR_STYLES, colourName } from "@/components/colourStyles";
import { COLOURS, SETS, isComplete, type PropertySet } from "@/lib/types";

export const completeCount = (sets: PropertySet[]) => new Set(sets.filter(isComplete).map((set) => set.colour)).size;

interface SetMeterProps {
  sets: PropertySet[];
  compact?: boolean;
}

// the stripe as a progress bar: one slot per colour, filling as cards arrive, outlined once complete
export default function SetMeter({ sets, compact = false }: SetMeterProps) {
  const slots = COLOURS.map((colour) => {
    const best = sets.filter((set) => set.colour === colour).toSorted((a, b) => b.cards.length - a.cards.length)[0];
    return { colour, set: best, size: SETS[colour].size };
  });
  const summary = slots
    .filter(({ set }) => set)
    .map(({ colour, set, size }) => `${colourName(colour)} ${set.cards.length} of ${size}`)
    .join(", ");

  return (
    <span
      role="img"
      aria-label={summary || "No properties yet"}
      className={`grid grid-cols-10 gap-0.5 ${compact ? "h-3.5" : "h-5"}`}
    >
      {slots.map(({ colour, set, size }) => (
        <span
          key={colour}
          data-cy={set ? "opponent-set" : undefined}
          data-colour={colour}
          data-count={set?.cards.length ?? 0}
          data-complete={set ? isComplete(set) : false}
          className="relative block bg-[#3a3d49]"
        >
          {set && (
            <span
              className={`absolute inset-x-0 bottom-0 block ${COLOUR_STYLES[colour]} ${isComplete(set) ? "ring-2 ring-paper ring-inset" : ""}`}
              style={{ height: `${Math.min(100, (set.cards.length / size) * 100)}%` }}
            />
          )}
        </span>
      ))}
    </span>
  );
}
