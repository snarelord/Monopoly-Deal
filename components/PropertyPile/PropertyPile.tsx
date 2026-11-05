import { useState } from "react";
import type { Card as CardType, Colour, PropertySet } from "@/lib/types";
import { SETS, isComplete, isFlipped, wildcardMoves } from "@/lib/types";
import { SETS_TO_WIN } from "@/lib/gameHelpers";
import { COLOUR_STYLES, colourName } from "../colourStyles";
import Card from "@/components/Card";
import CardPreview from "../PlayerHand/CardPreview";
import { completeCount } from "@/components/SetMeter";

/*
  PLANNED: this becomes the picker for Sly Deal / Forced Deal (pick one card, not from a complete set)
  and Deal Breaker (pick a whole complete set), so a "pick" mode that highlights what's allowed
*/
interface PropertyPileProps {
  playerId: number;
  sets: PropertySet[];
  title?: string;
  onMoveWildcard?: (cardId: string, colour: Colour) => void; // left out when wildcards can't be moved right now
}

export default function PropertyPile({ playerId, sets, title = "Your sets", onMoveWildcard }: PropertyPileProps) {
  const [preview, setPreview] = useState<{ card: CardType; flipped: boolean } | null>(null);
  const [moving, setMoving] = useState<{ card: CardType; colours: Colour[] } | null>(null);

  return (
    <div
      data-cy={`properties-${playerId}`}
      data-count={sets.length}
      className="flex h-full w-full flex-col"
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-heading text-3xl leading-none">{title}</h2>
        <span className="text-sm text-highlight">
          {completeCount(sets)} of {SETS_TO_WIN} complete
        </span>
      </div>

      {sets.length === 0 ? (
        <div className="grid min-h-24 flex-1 place-items-center border-2 border-dashed border-paper/20 text-sm text-paper/70">
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
              <header className={`font-heading mb-1 flex w-(--card-w) justify-between gap-1 px-1.5 pt-0.5 text-[clamp(12px,calc(var(--card-w)*0.15),16px)] leading-tight ${COLOUR_STYLES[set.colour]}`}>
                <span className="min-w-0 truncate capitalize">{set.colour.replace(/([A-Z])/g, " $1")}</span>
                <span className="shrink-0">
                  {set.cards.length}/{SETS[set.colour].size}
                  {isComplete(set) && " ✓"}
                </span>
              </header>

              {/* buildings sit on top of the set's cards, like laying them on the set in the real game */}
              <ul className="w-(--card-w)">
                {([...set.cards, set.house, set.hotel] as (CardType | null)[]).filter((c): c is CardType => c !== null).map((card) => {
                  const moves = onMoveWildcard ? wildcardMoves(sets, card.id) : [];
                  return (
                  <li
                    key={card.id}
                    data-flipped={isFlipped(card, set.colour)}
                    data-building={card.type === "action" ? card.action : undefined}
                    data-movable={moves.length > 0}
                    className="relative h-(--peek) transition-[filter] last:h-auto hover:z-10 hover:drop-shadow-lg"
                  >
                    <button
                      type="button"
                      className={`block p-0 ${moves.length ? "cursor-pointer" : "cursor-default"}`}
                      title={moves.length ? "Move to another colour" : undefined}
                      onClick={() => moves.length && setMoving({ card, colours: moves })}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        setPreview({ card, flipped: isFlipped(card, set.colour) });
                      }}
                    >
                      <Card card={card} className={`rounded ${isFlipped(card, set.colour) ? "rotate-180" : ""}`} />
                    </button>
                  </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {moving && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4">
          <div
            data-cy="wildcard-mover"
            role="dialog"
            aria-label={`Move ${moving.card.name}`}
            className="flex w-full max-w-xs flex-col gap-3 rounded-lg bg-white p-4 text-black shadow-xl"
          >
            <h2 className="font-heading text-lg font-semibold">Move {moving.card.name} to…</h2>
            <div className="grid grid-cols-2 gap-2">
              {moving.colours.map((colour) => (
                <button
                  key={colour}
                  type="button"
                  data-cy={`move-colour-${colour}`}
                  onClick={() => {
                    onMoveWildcard?.(moving.card.id, colour);
                    setMoving(null);
                  }}
                  className={`cursor-pointer rounded px-2 py-1 text-sm capitalize hover:outline hover:outline-black ${COLOUR_STYLES[colour]}`}
                >
                  {colourName(colour)}
                </button>
              ))}
            </div>
            <button
              type="button"
              data-cy="move-cancel"
              onClick={() => setMoving(null)}
              className="cursor-pointer self-end rounded border-2 border-black px-3 py-1"
            >
              Cancel
            </button>
          </div>
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