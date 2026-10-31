import { beginGame } from "../../lib/gameHelpers";
import type { Card } from "../../lib/types";

export const dealtHand = (seed: number) => beginGame(2, seed).players[0].hand;

// first seed whose opening hand satisfies the condition
export function findSeed(matches: (hand: Card[]) => boolean, max = 2000): number {
  const seed = Array.from({ length: max }, (_, i) => i + 1).find((s) => matches(dealtHand(s)));
  if (seed === undefined) throw new Error("No seed found for that hand");
  return seed;
}

export function drawCards() {
  cy.get('[data-cy="my-hand"] [data-cy="card"]').its("length").then((before) => {
    cy.get('[data-cy="draw-pile"]').click();
    cy.get('[data-cy="my-hand"] [data-cy="card"]').should("have.length", before + 2);
  });
}