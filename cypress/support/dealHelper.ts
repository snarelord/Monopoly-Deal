import { applyMove, beginGame } from "../../lib/gameHelpers";
import type { Card, GameState } from "../../lib/types";

export const dealtHand = (seed: number) => beginGame(2, seed).players[0].hand;

// every target is asked about a just say no first (see justSayNo.spec). this accepts for them all,
// for tests about what happens once an action goes ahead
export function acceptAll(game: GameState): GameState {
  return (game.pending?.debts ?? [])
    .filter((debt) => debt.status === "responding")
    .reduce((next, debt) => {
      const result = applyMove(next, debt.playerId, { type: "accept" });
      if (!result.ok) throw new Error(result.error);
      return result.game;
    }, game);
}

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
// hot-seat: when the game moves to another player, a pass screen covers the board until they click through
export function takeSeat() {
  cy.get('[data-cy="pass-continue"]').click();
}
