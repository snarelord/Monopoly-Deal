
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { Card as CardType } from "@/lib/types";
import Card from "@/components/Card";
import FanControls from "./FanControls";

const DEFAULT_DEGREES = 10;
const MIN_DEGREES = 3;
const MAX_DEGREES = 20;
const DEGREE_STEP = 1;

export default function PlayerHand({ cards }: { cards: CardType[] }) {
  const [previewCard, setPreviewCard] = useState<CardType | null>(null);
  const [degreesBetweenCards, setDegreesBetweenCards] = useState(DEFAULT_DEGREES);
  const middle = (cards.length - 1) / 2;

  useEffect(() => {
    if (!previewCard) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPreviewCard(null);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewCard]);

  return (
    <div className="mb-5">
      <ul data-cy="my-hand" className="relative mx-auto h-64 w-full max-w-3xl">
        {cards.map((card, i) => (
          <li
            key={card.id}
            className="hand-slot"
            style={{
              "--rot": `${(i - middle) * degreesBetweenCards}deg`,
            } as CSSProperties}
          >
            <div
              onContextMenu={(event) => {
                event.preventDefault();
                setPreviewCard(card);
              }}
            >
              <Card card={card} />
            </div>
          </li>
        ))}
      </ul>

        <FanControls
          minDegrees={MIN_DEGREES}
          maxDegrees={MAX_DEGREES}
          degreeStep={DEGREE_STEP}
          degreesBetweenCards={degreesBetweenCards}
          setDegreesBetweenCards={setDegreesBetweenCards}
        />

      {previewCard && (
        <div className="card-preview">
          <button
            className="card-preview-backdrop"
            onClick={() => setPreviewCard(null)}
            aria-label="Close card preview"
          />

          <div
            className="card-preview-content"
            role="dialog"
            aria-modal="true"
            aria-label={`Card preview: ${previewCard.name}`}
          >
            <Card card={previewCard} className="w-80" />
          </div>
        </div>
      )}
    </div>
  );
}
