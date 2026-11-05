import type { Card as CardType } from "@/lib/types";
import Card from "@/components/Card";

interface CardChoiceProps {
  card: CardType;
  selected: boolean;
  onClick: () => void;
  dataCy: string;
}

export default function CardChoice({ card, selected, onClick, dataCy }: CardChoiceProps) {
  return (
    <button
      type="button"
      data-cy={dataCy}
      data-selected={selected}
      aria-pressed={selected}
      onClick={onClick}
      className={`block w-[calc(var(--card-w)*0.9)] cursor-pointer rounded-lg transition-transform ${
        selected ? "-translate-y-1.5 outline-3 outline-offset-1 outline-highlight" : "hover:-translate-y-0.5"
      }`}
    >
      <Card card={card} className="rounded-lg" />
    </button>
  );
}
