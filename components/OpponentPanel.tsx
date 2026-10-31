import { useState } from "react";
import type { Card as CardType, OpponentView } from "@/lib/types";
import { SETS, isComplete, isFlipped } from "@/lib/types";
import { COLOUR_STYLES, colourName } from "@/components/colourStyles";
import Card from "@/components/Card";
import CardPreview from "@/components/PlayerHand/CardPreview";

// PLANNED: clicking the bank total or a set opens the full view (see the notes in PlayerBank and PropertyPile)
export default function OpponentPanel({ opponent, isTheirTurn }: { opponent: OpponentView; isTheirTurn: boolean }) {
  const [preview, setPreview] = useState<{ card: CardType; flipped: boolean } | null>(null);
  const bankTotal = opponent.bank.reduce((sum, card) => sum + card.value, 0);

  return (
    <section
      data-cy={`opponent-${opponent.id}`}
      data-bank-total={bankTotal}
      data-hand-count={opponent.handCount}
      data-their-turn={isTheirTurn}
      className={`flex h-full min-w-0 flex-col rounded-lg border bg-white/60 text-black ${
        isTheirTurn ? "border-green-600 ring-2 ring-green-600" : "border-black/20"
      }`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-black/10 px-3 py-1.5 text-sm">
        <span className="font-semibold">
          Player {opponent.id + 1}
          {isTheirTurn && <span className="ml-2 text-xs font-normal text-green-700">their turn</span>}
        </span>
        <span className="flex shrink-0 gap-3 text-xs">
          <span title={`${opponent.bank.length} cards in the bank`}>
            Bank <b>{bankTotal}M</b>
          </span>
          <span>{opponent.handCount} in hand</span>
        </span>
      </header>

      {opponent.properties.length === 0 ? (
        <div className="grid flex-1 place-items-center text-xs text-black/50">No properties yet</div>
      ) : (
        <ul className="flex flex-1 flex-wrap content-start gap-2 overflow-y-auto p-2 [--mini:calc(var(--card-w)*0.55)]">
          {opponent.properties.map((set) => {
            const cards = ([...set.cards, set.house, set.hotel] as (CardType | null)[]).filter(
              (c): c is CardType => c !== null,
            );
            return (
              <li
                key={set.cards[0].id}
                data-cy="opponent-set"
                data-colour={set.colour}
                data-count={set.cards.length}
                data-complete={isComplete(set)}
                className="w-(--mini)"
              >
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
                      setPreview({ card, flipped: isFlipped(card, set.colour) });
                    }}
                  >
                    <Card card={card} className={`rounded-sm ${isFlipped(card, set.colour) ? "rotate-180" : ""}`} />
                  </button>
                ))}
              </li>
            );
          })}
        </ul>
      )}

      <CardPreview card={preview?.card ?? null} flipped={preview?.flipped} onClose={() => setPreview(null)} />
    </section>
  );
}
