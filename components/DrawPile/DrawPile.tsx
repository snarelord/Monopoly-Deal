import CardBack from "./CardBack";

// pile thickness: one layer per ~20 cards capped at 5
const layersFor = (count: number) => Math.min(5, Math.ceil(count / 20));

const stackShadow = (layers: number) =>
  Array.from(
    { length: layers },
    (_, i) =>
      `${(i + 1) * 2}px ${(i + 1) * 2}px 0 ${i % 2 ? "#7f1d1d" : "#b91c1c"}`,
  ).join(", ");

interface DrawPileProps {
  count: number;
  onDraw: () => void;
  canDraw: boolean;
}

export default function DrawPile({ count, onDraw, canDraw }: DrawPileProps) {
  // stays clickable when empty: drawing reshuffles the discard pile in
  const cannotDraw = !canDraw;

  return (
    <button
      type="button"
      data-cy="draw-pile"
      data-count={count}
      onClick={onDraw}
      disabled={cannotDraw}
      className="flex flex-col items-center gap-3 cursor-pointer"
    >
      <div className="w-24">
        {count === 0 ? (
          <div className="aspect-5/7 rounded-lg border-2 border-dashed border-black/30" />
        ) : (
          <div
            className="rounded-lg"
            style={{ boxShadow: stackShadow(layersFor(count)) }}
          >
            <div
              className="rounded-lg transition-shadow"
              style={{
                boxShadow: `
                  ${stackShadow(layersFor(count))},
                  0 0 24px ${cannotDraw ? "#f87171" : "#4ade80"}
                `,
              }}
            >
              <CardBack />
            </div>
          </div>
        )}
      </div>

      <span
        data-cy="draw-pile-count"
        className="text-sm font-semibold text-black"
      >
        {count}
      </span>
    </button>
  );
}
