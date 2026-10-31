
import { useEffect, useState, useRef } from "react";
import type { CSSProperties } from "react";
import type { Card as CardType } from "@/lib/types";
import { getCardActions, type CardActionId } from "@/lib/cardActions";
import Card from "@/components/Card";
import FanControls from "./FanControls";
import PlayerCardActions from "./PlayerCardActions"
import CardPreview from "./CardPreview";

const DEFAULT_DEGREES = 10;
const MIN_DEGREES = 3;
const MAX_DEGREES = 20;
const DEGREE_STEP = 1;

export default function PlayerHand({
  cards,
  onCardAction,
}: {
  cards: CardType[];
  onCardAction: (cardId: string, actionId: CardActionId) => void;
}) {
  const [previewCard, setPreviewCard] = useState<CardType | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [degreesBetweenCards, setDegreesBetweenCards] =
    useState(DEFAULT_DEGREES);
  const handRef = useRef<HTMLUListElement>(null);
  const middle = (cards.length - 1) / 2;

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
    onCardAction(card.id, actionId);
    setSelectedId(null);
  }

  return (
    <div className="mb-5">
      <ul
        ref={handRef}
        data-cy="my-hand"
        className="relative mx-auto h-[calc(var(--card-w)*2.7)] w-full max-w-3xl"
      >
        {cards.map((card, i) => {
          const isSelected = card.id === selectedId;
          return (
            <li
              key={card.id}
              className={`hand-slot ${isSelected ? "is-selected" : ""}`}
              style={
                {
                  "--rot": `${(i - middle) * degreesBetweenCards}deg`,
                } as CSSProperties
              }
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

      <CardPreview card={previewCard} onClose={() => setPreviewCard(null)} />
    </div>
  );
}
