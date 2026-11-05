import type { Card as CardType } from "@/lib/types";
import Card from "@/components/Card";

export default function ActionPile({ cards }: { cards: CardType[] }) {
  const top = cards[cards.length - 1];

  return (
    <div data-cy="action-pile" data-count={cards.length} className="flex flex-col items-center gap-2">
      <div className="w-(--pile-w)">
        {top ? (
          <Card card={top} className="rounded-lg shadow-md" />
        ) : (
          <div className="aspect-(--card-ratio) rounded-lg border-2 border-dashed border-paper/30" />
        )}
      </div>
      <span className="text-sm text-paper/80">Last played</span>
    </div>
  );
}
