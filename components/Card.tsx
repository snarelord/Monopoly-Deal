import type { Card as CardType } from "@/lib/types";

interface CardProps {
  card: CardType;
  className?: string;
}

export default function Card({ card, className = "" }: CardProps) {
  return (
    <img
      data-cy="card"
      data-card-id={card.id}
      src={card.image}
      alt={card.name}
      draggable={false}
      className={`block w-full select-none ${className}`}
    />
  );
}