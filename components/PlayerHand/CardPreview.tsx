import { useEffect } from "react";
import type { Card as CardType } from "@/lib/types";
import Card from "@/components/Card";

interface CardPreviewProps {
  card: CardType | null;
  flipped?: boolean; // show it upside down, like a wildcard played as its second colour
  onClose: () => void;
}

export default function CardPreview({ card, flipped = false, onClose }: CardPreviewProps) {
  useEffect(() => {
    if (!card) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [card, onClose]);

  if (!card) return null;

  return (
    <div data-cy="card-preview" className="card-preview">
      <button
        className="card-preview-backdrop"
        onClick={onClose}
        aria-label="Close card preview"
      />
      <div
        className="card-preview-content"
        role="dialog"
        aria-modal="true"
        aria-label={`Card preview: ${card.name}`}
      >
        <Card card={card} className={flipped ? "rotate-180" : ""} />
      </div>
    </div>
  );
}