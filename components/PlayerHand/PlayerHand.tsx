
import { useEffect, useState, useRef } from "react";
import type { CSSProperties } from "react";
import type { Card as CardType } from "@/lib/types";
import Card from "@/components/Card";
import FanControls from "./FanControls";
import PlayerCardActions from "./PlayerCardActions"
import { getCardActions, type CardActionId } from "@/lib/cardActions";

const DEFAULT_DEGREES = 10;
const MIN_DEGREES = 3;
const MAX_DEGREES = 20;
const DEGREE_STEP = 1;

export default function PlayerHand({ cards }: { cards: CardType[] }) {
  const [previewCard, setPreviewCard] = useState<CardType | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [degreesBetweenCards, setDegreesBetweenCards] = useState(DEFAULT_DEGREES);
  const handRef = useRef<HTMLUListElement>(null);
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

  useEffect(() => {
    if (!selectedId) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedId(null);
    }
    function onPointerDown(event: PointerEvent) {
      if (!handRef.current?.contains(event.target as Node)) setSelectedId(null);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [selectedId]);

  function handleAction(card: CardType, actionId: CardActionId) {
    console.log(`${actionId}: ${card.name}`); // placeholder until the rules exist
    setSelectedId(null);
  }

  return (
    <div className="mb-5">
      <ul ref={handRef} data-cy="my-hand" className="relative mx-auto h-64 w-full max-w-3xl">
        {cards.map((card, i) => {
          const isSelected = card.id === selectedId;
          return (
            <li
              key={card.id}
              className={`hand-slot ${isSelected ? "is-selected" : ""}`}
              style={{ "--rot": `${(i - middle) * degreesBetweenCards}deg` } as CSSProperties}
            >
              <button
                type="button"
                className="card-button"
                aria-pressed={isSelected}
                onClick={() => setSelectedId(isSelected ? null : card.id)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setPreviewCard(card);
                }}
              >
                <Card card={card} />
              </button>

              {isSelected && (
                <PlayerCardActions
                  actions={getCardActions(card, { handSize: cards.length })}
                  onActionClick={(id) => handleAction(card, id)}
                  onClose={() => setSelectedId(null)}
                />
              )}
            </li>
          );
        })}
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
