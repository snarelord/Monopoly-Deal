import { useState } from "react";
import type { Card as CardType, Colour, PropertySet } from "@/lib/types";
import { SETS, isComplete, isFlipped, wildcardMoves } from "@/lib/types";
import { COLOUR_STYLES, colourName } from "../colourStyles";
import Card from "@/components/Card";
import CardPreview from "../PlayerHand/CardPreview";

/*
  PLANNED: viewing another player's property pile
  - clicking an opponent's property chips in their panel (see GameBoard) opens this component for them, read only,
    with right click preview (and flipped wildcards) working the same
  - needs a prop to say whose pile it is (the heading becomes "Sam's properties", from their name)
  - later this becomes the picker for Sly Deal / Forced Deal (pick one card, not from a complete set)
    and Deal Breaker (pick a whole complete set), so a "pick" mode that highlights what's allowed
*/
interface PropertyPileProps {
  playerId: number;
  sets: PropertySet[];
  onMoveWildcard?: (cardId: string, colour: Colour) => void; // left out when wildcards can't be moved right now
}

export default function PropertyPile({ playerId, sets, onMoveWildcard }: PropertyPileProps) {
  const [preview, setPreview] = useState<{ card: CardType; flipped: boolean } | null>(null);
  const [moving, setMoving] = useState<{ card: CardType; colours: Colour[] } | null>(null);

  return (
    <div
      data-cy={`properties-${playerId}`}
      data-count={sets.length}
      className="flex h-full w-full flex-col rounded-lg border border-black/20 bg-white/60 p-3 text-black"
    >
      <div className="mb-2 text-sm font-semibold">Properties</div>

      {sets.length === 0 ? (
        <div className="grid flex-1 place-items-center rounded border-2 border-black/30 text-xs">
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
            <h2 className="text-lg font-semibold">Move {moving.card.name} to…</h2>
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