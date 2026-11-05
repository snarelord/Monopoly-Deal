import CardBack from "./CardBack";

interface DrawPileProps {
  count: number;
  onDraw: () => void;
  canDraw: boolean;
}

export default function DrawPile({ count, onDraw, canDraw }: DrawPileProps) {
  // stays clickable when empty: drawing reshuffles the discard pile in
  return (
    <button
      type="button"
      data-cy="draw-pile"
      data-count={count}
      onClick={onDraw}
      disabled={!canDraw}
      className="flex cursor-pointer flex-col items-center gap-2 disabled:cursor-default"
    >
      <div className="w-(--pile-w)">
        {count === 0 ? (
          <div className="aspect-(--card-ratio) rounded-lg border-2 border-dashed border-paper/30" />
        ) : (
          <CardBack />
        )}
      </div>

      <span data-cy="draw-pile-count" className="text-sm text-paper/80">
        {count}
      </span>
    </button>
  );
}
