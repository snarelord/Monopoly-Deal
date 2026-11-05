import { useLayoutEffect, useRef } from "react";
import { animate } from "motion";
import type { Move } from "@/lib/types";

const inHand = (id: string) => document.querySelector(`[data-cy="my-hand"] [data-card-id="${id}"]`);

// flies a copy over the top of the board, because the bank and sets scroll and would clip the real card
function flyCard(from: DOMRect, to: HTMLImageElement, delay = 0) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const end = to.getBoundingClientRect();
  const copy = new Image();
  copy.src = to.currentSrc || to.src;
  copy.alt = "";
  Object.assign(copy.style, {
    position: "fixed",
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    zIndex: "60",
    pointerEvents: "none",
    transformOrigin: "0 0",
  });
  document.body.append(copy);
  to.style.opacity = "0";

  animate(
    copy,
    { x: end.left - from.left, y: end.top - from.top, scale: end.width / from.width },
    { type: "spring", stiffness: 260, damping: 28, delay },
  ).then(() => {
    to.style.opacity = "";
    copy.remove();
  });
}

// watches cards change place: from the hand when they're played, and from the draw pile when they're drawn
export function useCardFlights(meId: number, handIds: string[]) {
  const leaving = useRef(new Map<string, DOMRect>());
  const played = useRef(new Set<string>());
  const lastHand = useRef({ meId, ids: handIds });

  function noteMove(move: Move) {
    const ids = "cardId" in move ? [move.cardId] : "cardIds" in move ? move.cardIds : [];
    for (const id of ids) {
      const card = inHand(id);
      if (!card) continue;
      leaving.current.set(id, card.getBoundingClientRect());
      played.current.add(id);
    }
  }

  useLayoutEffect(() => {
    for (const [id, from] of leaving.current) {
      if (inHand(id)) continue; // still saving, or the move was refused
      leaving.current.delete(id);
      const to = document.querySelector<HTMLImageElement>(`[data-cy="game-board"] [data-card-id="${id}"]`);
      if (to) flyCard(from, to);
    }

    // hot-seat swaps to a different player's hand, which isn't them drawing
    if (lastHand.current.meId === meId) {
      const pile = document.querySelector('[data-cy="card-back"]')?.getBoundingClientRect();
      // a card coming back after a refused move hasn't been drawn, so it just reappears
      const drawn = handIds.filter((id) => !lastHand.current.ids.includes(id) && !played.current.has(id));
      drawn.forEach((id, i) => {
        const to = inHand(id);
        if (pile && to) flyCard(pile, to as HTMLImageElement, i * 0.09);
      });
    }
    lastHand.current = { meId, ids: handIds };
  });

  return noteMove;
}
