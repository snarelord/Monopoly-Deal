import type { Card as CardType, PropertySet } from "@/lib/types";
import { SETS, isComplete, isFlipped } from "@/lib/types";
import { COLOUR_STYLES, colourName } from "@/components/colourStyles";
import Card from "@/components/Card";

// a property set as a small stack of cards with its colour bar. the parent sets the card width with --mini
export default function MiniSet({
  set,
  onPreview,
}: {
  set: PropertySet;
  onPreview: (card: CardType, flipped: boolean) => void;
}) {
  const cards = ([...set.cards, set.house, set.hotel] as (CardType | null)[]).filter((c): c is CardType => c !== null);

  return (
    <>
      <div
        title={colourName(set.colour)}
        className={`mb-0.5 rounded px-1 text-[0.6rem] font-semibold leading-4 ${COLOUR_STYLES[set.colour]}`}
      >
        {set.cards.length}/{SETS[set.colour].size}
        {isComplete(set) && " ✓"}
      </div>
      {cards.map((card) => (
        <button
          key={card.id}
          type="button"
          className="relative block h-[calc(var(--mini)*0.29)] w-full cursor-default p-0 last:h-auto hover:z-10"
          onContextMenu={(event) => {
            event.preventDefault();
            onPreview(card, isFlipped(card, set.colour));
          }}
        >
          <Card card={card} className={`rounded-sm ${isFlipped(card, set.colour) ? "rotate-180" : ""}`} />
        </button>
      ))}
    </>
  );
}
