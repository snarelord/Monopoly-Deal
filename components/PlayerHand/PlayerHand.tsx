
import { useEffect, useState, useRef } from "react";
import type { CSSProperties } from "react";
import type { Card as CardType, Move, OpponentView, Player } from "../../lib/types";
import type { TurnStatus } from "../../lib/gameHelpers";
import { getCardActions, toMove, type ActionChoice, type CardAction } from "@/lib/cardActions";
import Card from "@/components/Card";
import FanControls from "./FanControls";
import PlayerCardActions from "./PlayerCardActions"
import CardPreview from "./CardPreview";
import StealPicker from "@/components/StealPicker";

const DEFAULT_SPACING = 60;
const MIN_SPACING = 25;
const MAX_SPACING = 110;
const SPACING_STEP = 15;

export default function PlayerHand({
  me,
  turn,
  opponents,
  onMove,
}: {
  me: Player;
  turn: TurnStatus;
  opponents: OpponentView[];
  onMove: (move: Move) => void;
}) {
  const [previewCard, setPreviewCard] = useState<CardType | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [spacing, setSpacing] = useState(DEFAULT_SPACING);
  const [picking, setPicking] = useState<{ card: CardType; action: CardAction; choice: ActionChoice } | null>(null);
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

  function handleAction(card: CardType, action: CardAction, choice: ActionChoice = {}) {
    setSelectedId(null);
    if (action.pick && choice.takeId === undefined) return setPicking({ card, action, choice });
    setPicking(null);
    const move = toMove(card, action.id, choice);
    if (move) onMove(move);
    else console.log(`${action.id}: ${card.id} (not built yet)`);
  }

  const pickingFrom = picking && opponents.find((o) => o.id === picking.choice.targetId);

  return (
    <div className="mb-5">
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
                      opponents,
                      me,
                      playsLeft: turn.playsLeft,
                    })}
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

      {picking && pickingFrom && (
        <StealPicker
          kind={picking.action.pick!}
          target={pickingFrom}
          me={me}
          onConfirm={(takeId, giveId) => handleAction(picking.card, picking.action, { ...picking.choice, takeId, giveId })}
          onCancel={() => setPicking(null)}
        />
      )}
    </div>
  );
}
