import type { Card as CardType } from "@/lib/types";
import Card from "@/components/Card";

export default function ActionPile({ cards }: { cards: CardType[] }) {
  const top = cards[cards.length - 1];

  return (
    <div
      data-cy="action-pile"
      data-count={cards.length}
      className="flex flex-col items-center gap-3"
    >
      <div className="w-(--card-w)">
        {top ? (
          <Card card={top} className="rounded-lg shadow-md" />
        ) : (
          <div className="aspect-(--card-ratio) rounded-lg border-2 border-dashed border-black/30" />
        )}
      </div>
      {/* <span className="text-sm font-semibold text-black">
        Action pile · <span data-cy="action-pile-count">{cards.length}</span>
      </span> */}
    </div>
  );
}