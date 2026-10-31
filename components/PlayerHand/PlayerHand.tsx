
import { useEffect, useState, useRef } from "react";
import type { CSSProperties } from "react";
import type { Card as CardType, Move, Player } from "../../lib/types";
import type { TurnStatus } from "../../lib/gameHelpers";
import { getCardActions, toMove, type ActionChoice, type CardAction } from "@/lib/cardActions";
import Card from "@/components/Card";
import FanControls from "./FanControls";
import PlayerCardActions from "./PlayerCardActions"
import CardPreview from "./CardPreview";

// how much of each card shows, as a % of card width: 25 is a tight overlap, 110 is spread with a gap
const DEFAULT_SPACING = 60;
const MIN_SPACING = 25;
const MAX_SPACING = 110;
const SPACING_STEP = 15;

export default function PlayerHand({
  me,
  turn,
  opponentIds,
  onMove,
}: {
  me: Player;
  turn: TurnStatus;
  opponentIds: number[];
  onMove: (move: Move) => void;
}) {
  const [previewCard, setPreviewCard] = useState<CardType | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [spacing, setSpacing] = useState(DEFAULT_SPACING);
  const handRef = useRef<HTMLUListElement>(null);
  const cards = me.hand;
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

  function handleAction(card: CardType, action: CardAction, choice?: ActionChoice) {
    const move = toMove(card, action.id, choice);
    if (move) onMove(move);
    else console.log(`${action.id}: ${card.id} (not built yet)`);
    setSelectedId(null);
  }

  return (
    <div className="mb-5">
      {/* top padding leaves room for a card to lift without being cut off */}
      <ul
        ref={handRef}
        data-cy="my-hand"
        className="hand-row flex w-full justify-center pt-[calc(var(--card-w)*0.4)]"
        style={{ "--hand-spacing": spacing / 100 } as CSSProperties}
      >
        {cards.map((card, i) => {
          const isSelected = card.id === selectedId;
          return (
            <li key={card.id} className={`hand-slot ${isSelected ? "is-selected" : ""}`}>
              <div className="hand-card">
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
                  <Card card={card} className="rounded-lg" />
                </button>

                {isSelected && (
                  <PlayerCardActions
                    actions={getCardActions(card, {
                      playBlockedReason: turn.playBlockedReason,
                      canDiscard: turn.mustDiscard,
                      opponentIds,
                      me,
                      playsLeft: turn.playsLeft,
                    })}
                    // open towards the middle of the screen so it never runs off the edge
                    side={i > middle ? "left" : "right"}
                    onActionClick={(action, choice) => handleAction(card, action, choice)}
                    onClose={() => setSelectedId(null)}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <FanControls
        minSpacing={MIN_SPACING}
        maxSpacing={MAX_SPACING}
        spacingStep={SPACING_STEP}
        spacing={spacing}
        setSpacing={setSpacing}
      />

      <CardPreview card={previewCard} onClose={() => setPreviewCard(null)} />
    </div>
  );
}
