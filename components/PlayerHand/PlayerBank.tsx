import type { Card as CardType } from "@/lib/types";
import Card from "@/components/Card";

interface PlayerBankProps {
  playerId: number;
  cards: CardType[];
}

export default function PlayerBank({ playerId, cards }: PlayerBankProps) {
  const total = cards.reduce((sum, card) => sum + card.value, 0);
  console.log('playerId', playerId)
  return (
    <div
      data-cy={`bank-${playerId}`}
      data-count={cards.length}
      data-total={total}
      className="w-72 rounded-lg border border-black/20 bg-white/60 p-3 text-black"
    >
      <div className="mb-2 flex justify-between text-sm font-semibold">
        <span>Bank</span>
        <span>{total}M</span>
      </div>

      {cards.length === 0 ? (
        <div className="grid h-20 place-items-center rounded border-2 border-dashed border-black/30 text-xs">
          Empty
        </div>
      ) : (
        <ul className="flex">
          {cards.map((card) => (
            <li key={card.id} className="ml-[calc(-0.43*var(--card-w))] w-[calc(var(--card-w)*0.6)] shrink-0 first:ml-0 [&>img]:w-full">
              <Card card={card} className="rounded" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}