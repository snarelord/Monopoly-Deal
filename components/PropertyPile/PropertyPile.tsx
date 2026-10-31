import { useState } from "react";
import type { Card as CardType, Colour, PropertySet } from "@/lib/types";
import { SETS, isComplete } from "@/lib/types";
import Card from "@/components/Card";
import CardPreview from "../PlayerHand/CardPreview";

// Full class names, so Tailwind can see them
const COLOUR_STYLES: Record<Colour, string> = {
  brown: "bg-amber-900 text-white",
  lightBlue: "bg-sky-300",
  pink: "bg-pink-400",
  orange: "bg-orange-500",
  red: "bg-red-600 text-white",
  yellow: "bg-yellow-300",
  green: "bg-green-600 text-white",
  darkBlue: "bg-blue-800 text-white",
  railroad: "bg-neutral-800 text-white",
  utility: "bg-lime-200",
};

interface PropertyPileProps {
  playerId: number;
  sets: PropertySet[];
}

export default function PropertyPile({ playerId, sets }: PropertyPileProps) {
  const [previewCard, setPreviewCard] = useState<CardType | null>(null);

  return (
    <div
      data-cy={`properties-${playerId}`}
      data-count={sets.length}
      className="flex h-full w-full flex-col rounded-lg border border-black/20 bg-white/60 p-3 text-black"
    >
      <div className="mb-2 text-sm font-semibold">Properties</div>

      {sets.length === 0 ? (
        <div className="grid flex-1 place-items-center rounded border-2 border-dashed border-black/30 text-xs">
          No properties yet
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(calc(var(--card-w)_+_0.5rem),1fr))] content-start gap-3 overflow-y-auto">
          {sets.map((set) => (
            // how much of each card shows the last card in a set is always shown in full
            <section
              key={set.cards[0].id}
              data-cy="property-set"
              data-colour={set.colour}
              data-count={set.cards.length}
              data-complete={isComplete(set)}
              className="[--peek:calc(var(--card-w)*0.29)]"
            >
              <header className={`mb-1 flex w-24 justify-between rounded px-1.5 py-0.5 text-xs font-semibold ${COLOUR_STYLES[set.colour]}`}>
                <span className="capitalize">{set.colour.replace(/([A-Z])/g, " $1")}</span>
                <span className="shrink-0">
                  {set.cards.length}/{SETS[set.colour].size}
                  {isComplete(set) && " ✓"}
                </span>
              </header>

              <ul className="w-(--card-w)">
                {set.cards.map((card) => (
                  <li
                    key={card.id}
                    className="relative h-(--peek) transition-[filter] last:h-auto hover:z-10 hover:drop-shadow-lg"
                  >
                    <button
                      type="button"
                      className="block p-0"
                      onContextMenu={(event) => {
                        event.preventDefault();
                        setPreviewCard(card);
                      }}
                    >
                      <Card card={card} className="rounded" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <CardPreview card={previewCard} onClose={() => setPreviewCard(null)} />
    </div>
  );
}