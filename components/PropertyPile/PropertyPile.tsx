import { useState } from "react";
import type { Card as CardType, Colour, PropertySet } from "@/lib/types";
import { SETS, isComplete } from "@/lib/types";
import { COLOUR_STYLES } from "../colourStyles";
import Card from "@/components/Card";
import CardPreview from "../PlayerHand/CardPreview";

const isFlipped = (card: CardType, setColour: Colour) =>
  card.type === "wildcard" && card.colours !== "any" && card.colours[1] === setColour;

/*
  PLANNED: viewing another player's property pile
  - clicking an opponent's property chips in their panel (see GameBoard) opens this component for them, read only,
    with right click preview (and flipped wildcards) working the same
  - needs a prop to say whose pile it is (the heading becomes "Player 2's properties")
  - later this becomes the picker for Sly Deal / Forced Deal (pick one card, not from a complete set)
    and Deal Breaker (pick a whole complete set), so a "pick" mode that highlights what's allowed
*/
interface PropertyPileProps {
  playerId: number;
  sets: PropertySet[];
}

export default function PropertyPile({ playerId, sets }: PropertyPileProps) {
  const [preview, setPreview] = useState<{ card: CardType; flipped: boolean } | null>(null);

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
        <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(calc(var(--card-w)+0.5rem),1fr))] content-start gap-3 overflow-y-auto">
          {sets.map((set) => (
            <section
              key={set.cards[0].id}
              data-cy="property-set"
              data-colour={set.colour}
              data-count={set.cards.length}
              data-complete={isComplete(set)}
              className="[--peek:calc(var(--card-w)*0.29)]"
            >
              <header className={`mb-1 flex w-(--card-w) justify-between rounded px-1.5 py-0.5 text-xs font-semibold ${COLOUR_STYLES[set.colour]}`}>
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
                    data-flipped={isFlipped(card, set.colour)}
                    className="relative h-(--peek) transition-[filter] last:h-auto hover:z-10 hover:drop-shadow-lg"
                  >
                    <button
                      type="button"
                      className="block p-0"
                      onContextMenu={(event) => {
                        event.preventDefault();
                        setPreview({ card, flipped: isFlipped(card, set.colour) });
                      }}
                    >
                      <Card card={card} className={`rounded ${isFlipped(card, set.colour) ? "rotate-180" : ""}`} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <CardPreview
        card={preview?.card ?? null}
        flipped={preview?.flipped}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}