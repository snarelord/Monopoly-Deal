import { useState } from "react";
import type { Card as CardType } from "@/lib/types";
import Card from "@/components/Card";
import CardPreview from "./CardPreview";

interface PlayerBankProps {
  playerId: number;
  cards: CardType[];
}

export default function PlayerBank({ playerId, cards }: PlayerBankProps) {
  const [previewCard, setPreviewCard] = useState<CardType | null>(null);
  const total = cards.reduce((sum, card) => sum + card.value, 0);

  return (
    <div
      data-cy={`bank-${playerId}`}
      data-count={cards.length}
      data-total={total}
      className="flex h-full w-full flex-col rounded-lg border border-black/20 bg-white/60 p-3 text-black"
    >
      <div className="mb-2 flex justify-between text-sm font-semibold">
        <span>Bank</span>
        <span>{total}M</span>
      </div>

      {cards.length === 0 ? (
        <div className="grid flex-1 place-items-center rounded border-2 border-dashed border-black/30 text-xs">
          Empty
        </div>
      ) : (
        // fixed-width columns narrower than a card, so each card overlaps the next and shows its value corner.
        // rows wrap when full, right padding leaves room for the last card in a row to show in full
        <ul className="grid flex-1 grid-cols-[repeat(auto-fill,calc(var(--card-w)*0.35))] content-start gap-y-2 overflow-y-auto overflow-x-hidden pr-[calc(var(--card-w)*0.4)]">
          {cards.map((card) => (
            <li key={card.id} className="relative hover:z-10 hover:drop-shadow-lg">
              <button
                type="button"
                className="block w-[calc(var(--card-w)*0.75)] p-0"
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
      )}

      <CardPreview card={previewCard} onClose={() => setPreviewCard(null)} />
    </div>
  );
}
