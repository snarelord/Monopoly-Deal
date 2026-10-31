import { dealtHand, findSeed } from "../support/dealHelper";
import type { Card } from "../../lib/types";

function sameColourPair(hand: Card[]) {
  const byColour: Record<string, Card[]> = {};
  for (const c of hand) if (c.type === "property") (byColour[c.colour] ??= []).push(c);
  return Object.values(byColour).find((cards) => cards.length >= 2)?.slice(0, 2);
}

const seed = findSeed((hand) => !!sameColourPair(hand));
const [first, second] = sameColourPair(dealtHand(seed))!;

const pile = '[data-cy="properties-0"]';
const playToProperties = (id: string) => {
  cy.get(`[data-cy="my-hand"] [data-card-id="${id}"]`).click({ force: true });
  cy.get('[data-cy="action-place-property"]').click();
};

describe("Property pile", () => {
  beforeEach(() => cy.visit(`/?seed=${seed}`));

  it("starts empty", () => {
    cy.get(pile).should("have.attr", "data-count", "0");
    cy.get(pile).should("contain.text", "No properties yet");
  });

  it("starts a set when I play a property card", () => {
    playToProperties(first.id);

    cy.get('[data-cy="my-hand"] [data-cy="card"]').should("have.length", 4);
    cy.get(`${pile} [data-cy="property-set"]`).should("have.length", 1)
      .and("have.attr", "data-colour", (first as any).colour)
      .and("have.attr", "data-count", "1");
  });

  it("adds a second card of the same colour to the same set", () => {
    playToProperties(first.id);
    playToProperties(second.id);

    cy.get(`${pile} [data-cy="property-set"]`).should("have.length", 1)
      .and("have.attr", "data-count", "2");
  });

  it("stacks cards so each one's top strip is visible", () => {
    playToProperties(first.id);
    playToProperties(second.id);

    cy.get(`${pile} [data-cy="property-set"] [data-cy="card"]`).should(($cards) => {
      const a = $cards[0].getBoundingClientRect();
      const b = $cards[1].getBoundingClientRect();
      expect(b.top - a.top, "gap between card tops").to.be.within(20, 40);
    });
  });

  it("previews a card on right-click and closes on Escape", () => {
    playToProperties(first.id);

    cy.get(`${pile} [data-cy="card"]`).first().rightclick({ force: true });
    cy.get('[data-cy="card-preview"]').should("exist");

    cy.get("body").type("{esc}");
    cy.get('[data-cy="card-preview"]').should("not.exist");
  });
});