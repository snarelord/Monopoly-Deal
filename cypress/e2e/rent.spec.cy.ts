import { applyMove, beginGame } from "../../lib/gameHelpers";
import { rentFor } from "../../lib/rent";
import { cardData } from "../../lib/cardData";
import { SETS } from "../../lib/types";
import type { Card, Colour, GameState, Move, PropertySet, RentCard } from "../../lib/types";
import { drawCards, takeSeat } from "../support/dealHelper";

const card = (id: string) => cardData.find((c) => c.id === id)!;
const set = (colour: Colour, ...ids: string[]): PropertySet =>
  ({ colour, cards: ids.map(card) as PropertySet["cards"], house: null, hotel: null });
const owner = (...properties: PropertySet[]) => ({ id: 0, hand: [], bank: [], properties });

const brownRent = card("action-rent-brown-light-blue-1");
const anyRent = card("action-any-colour-1");
const double1 = card("double-the-rent-1");
const double2 = card("double-the-rent-2");
const browns = set("brown", "property-old-kent-road", "property-whitechapel-road"); // full brown set: 2M rent

describe("Working out rent", () => {
  it("charges the rent table for how many cards are in the set", () => {
    expect(rentFor(owner(set("brown", "property-old-kent-road")), "brown")).to.equal(1);
    expect(rentFor(owner(browns), "brown")).to.equal(2);
    expect(rentFor(owner(set("orange", "property-vine-street", "property-bow-street")), "orange")).to.equal(3);
  });

  it("charges for the better set when there are two of a colour", () => {
    const full = set("orange", "property-vine-street", "property-bow-street", "property-marlborough-street");
    const partial = set("orange", "wildcard-orange-pink-1");
    expect(rentFor(owner(partial, full), "orange")).to.equal(5);
  });

  it("counts wildcards towards the set", () => {
    expect(rentFor(owner(set("orange", "property-vine-street", "wildcard-orange-pink-1")), "orange")).to.equal(3);
  });

  it("charges nothing for colours you don't own", () => {
    expect(rentFor(owner(browns), "darkBlue")).to.equal(0);
  });

  it("charges nothing for a set that's only an any colour wildcard", () => {
    expect(rentFor(owner(set("darkBlue", "wildcard-any-1")), "darkBlue")).to.equal(0);
  });
});

// 3 players: player 0 has drawn, holds `hand` and owns a full brown set, the others have some money
const setup = (...hand: Card[]): GameState => {
  const game = beginGame(3, 1);
  return {
    ...game,
    hasDrawnCards: true,
    players: game.players.map((p) =>
      p.id === 0
        ? { ...p, hand, properties: [browns] }
        : { ...p, hand: [], bank: [card(`money-5m-${p.id}`)] },
    ),
  };
};

const attempt = (game: GameState, move: Move) => applyMove(game, 0, move);
const act = (game: GameState, move: Move) => {
  const result = attempt(game, move);
  if (!result.ok) throw new Error(result.error);
  return result.game;
};

describe("Rent cards", () => {
  it("charges every other player with a two colour rent card", () => {
    const after = act(setup(brownRent), { type: "rent", cardId: brownRent.id, colour: "brown" });

    expect(after.pending?.debts).to.deep.equal([
      { playerId: 1, amount: 2, status: "paying", sayNoCount: 0 },
      { playerId: 2, amount: 2, status: "paying", sayNoCount: 0 },
    ]);
    expect(after.cardsPlayed).to.equal(1);
    expect(after.discardPile.map((c) => c.id)).to.deep.equal([brownRent.id]);
  });

  it("charges only the chosen player with the any colour rent card", () => {
    const after = act(setup(anyRent), { type: "rent", cardId: anyRent.id, colour: "brown", targetId: 2 });
    expect(after.pending?.debts).to.deep.equal([{ playerId: 2, amount: 2, status: "paying", sayNoCount: 0 }]);
  });

  it("needs a player for the any colour rent card", () => {
    expect(attempt(setup(anyRent), { type: "rent", cardId: anyRent.id, colour: "brown" }).ok).to.equal(false);
  });

  it("refuses a colour that isn't on the card", () => {
    const result = attempt(setup(brownRent), { type: "rent", cardId: brownRent.id, colour: "orange" });
    expect(result.ok).to.equal(false);
  });

  it("refuses a colour you don't own any of", () => {
    const result = attempt(setup(brownRent), { type: "rent", cardId: brownRent.id, colour: "lightBlue" });
    expect(result.ok).to.equal(false);
  });

  it("can't be played as a plain action card", () => {
    expect(attempt(setup(brownRent), { type: "play", cardId: brownRent.id }).ok).to.equal(false);
  });
});

describe("Double the Rent", () => {
  it("doubles the rent and uses a play of its own", () => {
    const after = act(setup(brownRent, double1), {
      type: "rent", cardId: brownRent.id, colour: "brown", doubleRentIds: [double1.id],
    });
    expect(after.pending?.debts.map((d) => d.amount)).to.deep.equal([4, 4]);
    expect(after.cardsPlayed).to.equal(2);
    expect(after.discardPile.map((c) => c.id)).to.deep.equal([brownRent.id, double1.id]);
    expect(after.players[0].hand).to.have.length(0);
  });

  it("stacks two to make it four times the rent", () => {
    const after = act(setup(brownRent, double1, double2), {
      type: "rent", cardId: brownRent.id, colour: "brown", doubleRentIds: [double1.id, double2.id],
    });
    expect(after.pending?.debts.map((d) => d.amount)).to.deep.equal([8, 8]);
    expect(after.cardsPlayed).to.equal(3);
  });

  it("needs a play left for every card", () => {
    const game = { ...setup(brownRent, double1, double2), cardsPlayed: 1 };
    const result = attempt(game, {
      type: "rent", cardId: brownRent.id, colour: "brown", doubleRentIds: [double1.id, double2.id],
    });
    expect(result.ok).to.equal(false);
  });

  it("can't be played on its own", () => {
    expect(attempt(setup(double1), { type: "play", cardId: double1.id }).ok).to.equal(false);
  });
});

describe("Rent in the game", () => {
  const isDouble = (c: Card) => c.type === "action" && c.action === "double-the-rent";

  /*
    player 1 opens with a two colour rent card and a property it can charge for, and doesn't pick up
    a double the rent by their second draw (so the menu skips that step). player 2 gets money by their first draw
  */
  const found = Array.from({ length: 5000 }, (_, i) => i + 1).map((seed) => {
    const game = beginGame(2, seed);
    const p1 = game.players[0].hand;
    const rentCard = p1.find((c): c is RentCard => c.type === "rent" && c.colours !== "any");
    const property = p1.find((c) => c.type === "property" && rentCard?.colours.includes(c.colour));
    const p1Draws = [...game.deck.slice(0, 2), ...game.deck.slice(4, 6)];
    const p2Cards = [...game.players[1].hand, ...game.deck.slice(2, 4)];
    const fits = rentCard && property && ![...p1, ...p1Draws].some(isDouble)
      && p2Cards.some((c) => c.type === "money")
      && !p2Cards.some((c) => c.type === "action" && c.action === "just-say-no"); // otherwise player 2 gets asked first
    return fits ? { seed, rentCard, property: property as Extract<Card, { type: "property" }> } : null;
  }).find(Boolean)!;

  it("charges the other player rent for a property you own", () => {
    const { seed, rentCard, property } = found;
    cy.visit(`/?seed=${seed}`);

    // player 1 puts the property down
    drawCards();
    cy.get(`[data-cy="my-hand"] [data-card-id="${property.id}"]`).click({ force: true });
    cy.get('[data-cy="action-place-property"]').click();
    cy.get('[data-cy="end-turn"]').click();
    takeSeat();

    // player 2 banks some money
    drawCards();
    cy.get('[data-cy="my-hand"] [data-card-id^="money-"]').first().click({ force: true });
    cy.get('[data-cy="action-bank"]').click();
    cy.get('[data-cy="end-turn"]').click();
    takeSeat();

    // player 1 charges rent on that colour
    drawCards();
    cy.get(`[data-cy="my-hand"] [data-card-id="${rentCard.id}"]`).click({ force: true });
    cy.get('[data-cy="action-rent"]').click();
    cy.get(`[data-cy="colour-${property.colour}"]`).click();

    takeSeat();
    cy.get('[data-cy="payment-panel"]').should("contain.text", `Pay Player 1 ${SETS[property.colour].rent[0]}M`);
    cy.get('[data-cy="pay-auto"]').click();

    takeSeat();
    cy.get('[data-cy="bank-0"]').should("have.attr", "data-count", "1");
  });
});
