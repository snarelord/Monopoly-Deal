import { useState } from "react";
import type { Card as CardType, OpponentView, Player } from "@/lib/types";
import { completeSets, looseProperties, type StealKind } from "@/lib/steal";
import { colourName } from "@/components/colourStyles";
import Card from "@/components/Card";

interface StealPickerProps {
  kind: StealKind;
  target: OpponentView;
  me: Player;
  onConfirm: (takeId: string, giveId?: string) => void;
  onCancel: () => void;
}

const TITLES: Record<StealKind, string> = {
  "sly-deal": "Sly Deal: take a property",
  "forced-deal": "Forced Deal: swap a property",
  "deal-breaker": "Deal Breaker: take a complete set",
};

const CONFIRM: Record<StealKind, string> = {
  "sly-deal": "Take it",
  "forced-deal": "Swap",
  "deal-breaker": "Take this set",
};

/*
  picks the cards for a steal once the player is chosen. a stand in until the opponent view exists
  (see the PLANNED note in PropertyPile), which becomes the picker instead
*/
export default function StealPicker({ kind, target, me, onConfirm, onCancel }: StealPickerProps) {
  const [takeId, setTakeId] = useState<string | null>(null);
  const [giveId, setGiveId] = useState<string | null>(null);
  const ready = takeId !== null && (kind !== "forced-deal" || giveId !== null);

  const cardButton = (card: CardType, selected: boolean, onClick: () => void, dataCy: string) => (
    <li key={card.id}>
      <button
        type="button"
        data-cy={dataCy}
        data-selected={selected}
        aria-pressed={selected}
        onClick={onClick}
        className={`block w-[calc(var(--card-w)*0.8)] cursor-pointer rounded-md transition-transform ${
          selected ? "-translate-y-1 outline-3 outline-green-600" : "opacity-80 hover:opacity-100"
        }`}
      >
        <Card card={card} className="rounded-md" />
      </button>
    </li>
  );

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4">
      <div
        data-cy="steal-picker"
        data-kind={kind}
        role="dialog"
        aria-label={TITLES[kind]}
        className="flex max-h-full w-full max-w-2xl flex-col gap-3 rounded-lg bg-white p-4 text-black shadow-xl"
      >
        <h2 className="text-lg font-semibold">{TITLES[kind]}</h2>

        {/* padding gives the selected card's outline and lift room inside the scroll area */}
        <div className="flex flex-col gap-3 overflow-y-auto p-2">
          {kind === "deal-breaker" ? (
            <section>
              <div className="mb-1 text-xs font-semibold">Player {target.id + 1}&apos;s complete sets</div>
              <ul className="flex flex-col gap-2">
                {completeSets(target.properties).map((set) => {
                  const id = set.cards[0].id;
                  const selected = takeId === id;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        data-cy="steal-set"
                        data-colour={set.colour}
                        aria-pressed={selected}
                        onClick={() => setTakeId(id)}
                        className={`flex w-full cursor-pointer items-center gap-2 rounded-md border-2 p-2 text-left transition-colors ${
                          selected ? "border-green-600 bg-green-50" : "border-black/10 hover:border-black/30"
                        }`}
                      >
                        <span className="w-20 text-xs font-semibold capitalize">{colourName(set.colour)}</span>
                        {[...set.cards, set.house, set.hotel].map(
                          (card) =>
                            card && (
                              <span key={card.id} className="block w-[calc(var(--card-w)*0.6)]">
                                <Card card={card} className="rounded" />
                              </span>
                            ),
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : (
            <>
              <section>
                <div className="mb-1 text-xs font-semibold">
                  Take from Player {target.id + 1} (not from a complete set)
                </div>
                <ul className="flex flex-wrap gap-2">
                  {looseProperties(target.properties).map((card) =>
                    cardButton(card, takeId === card.id, () => setTakeId(card.id), "steal-take"),
                  )}
                </ul>
              </section>
              {kind === "forced-deal" && (
                <section>
                  <div className="mb-1 text-xs font-semibold">Give one of yours (not from a complete set)</div>
                  <ul className="flex flex-wrap gap-2">
                    {looseProperties(me.properties).map((card) =>
                      cardButton(card, giveId === card.id, () => setGiveId(card.id), "steal-give"),
                    )}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            data-cy="steal-cancel"
            onClick={onCancel}
            className="cursor-pointer rounded border-2 border-black px-3 py-1"
          >
            Cancel
          </button>
          <button
            type="button"
            data-cy="steal-confirm"
            disabled={!ready}
            onClick={() => onConfirm(takeId!, giveId ?? undefined)}
            className="cursor-pointer rounded bg-green-700 px-3 py-1 text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {CONFIRM[kind]}
          </button>
        </div>
      </div>
    </div>
  );
}
