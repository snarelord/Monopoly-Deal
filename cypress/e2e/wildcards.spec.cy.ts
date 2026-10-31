import { applyMove, beginGame } from "../../lib/gameHelpers";
import { drawCards, findSeed } from "../support/dealHelper";
import { cardData } from "../../lib/cardData";
import type { Card, Colour, GameState, Move } from "../../lib/types";

const card = (id: string) => cardData.find((c) => c.id === id)!;
const wild = (colours: [Colour, Colour] | "any") =>
  cardData.find((c) => c.type === "wildcard" && JSON.stringify(c.colours) === JSON.stringify(colours))!;
const property = (colour: Colour) =>
  cardData.find((c) => c.type === "property" && c.colour === colour)!;

// player 0 has drawn and is holding exactly these cards
const holding = (...hand: Card[]): GameState => {
  const game = beginGame(2, 1);
  return {
    ...game,
    hasDrawnCards: true,
    players: game.players.map((p) => (p.id === 0 ? { ...p, hand } : p)),
  };
};

const attempt = (game: GameState, move: Move) => applyMove(game, 0, move);
const play = (game: GameState, move: Move) => {
  const result = attempt(game, move);
  if (!result.ok) throw new Error(result.error);
  return result.game;
};

describe("Wildcards", () => {
  it("starts a set in the colour you choose", () => {
    const w = wild(["orange", "pink"]);
    const after = play(holding(w), { type: "place-property", cardId: w.id, colour: "pink" });

    expect(after.players[0].hand).to.have.length(0);
    expect(after.players[0].properties).to.have.length(1);
    expect(after.players[0].properties[0].colour).to.equal("pink");
    expect(after.cardsPlayed).to.equal(1);
  });

  it("joins an unfinished set of that colour", () => {
    const p = property("orange");
    const w = wild(["orange", "pink"]);
    let game = play(holding(p, w), { type: "place-property", cardId: p.id });
    game = play(game, { type: "place-property", cardId: w.id, colour: "orange" });

    expect(game.players[0].properties).to.have.length(1);
    expect(game.players[0].properties[0].cards.map((c) => c.id)).to.deep.equal([p.id, w.id]);
  });

  it("lets the any-colour wildcard join a set of any colour", () => {
    const p = property("darkBlue");
    const w = wild("any");
    let game = play(holding(p, w), { type: "place-property", cardId: p.id });
    game = play(game, { type: "place-property", cardId: w.id, colour: "darkBlue" });
    expect(game.players[0].properties[0].cards.map((c) => c.id)).to.deep.equal([p.id, w.id]);
  });

  it("won't let the any-colour wildcard start a set on its own", () => {
    const w = wild("any");
    const result = attempt(holding(w), { type: "place-property", cardId: w.id, colour: "darkBlue" });
    expect(result.ok).to.equal(false);
  });

  it("refuses a colour the wildcard doesn't have", () => {
    const w = wild(["orange", "pink"]);
    const result = attempt(holding(w), { type: "place-property", cardId: w.id, colour: "green" });
    expect(result.ok).to.equal(false);
  });

  it("refuses a wildcard with no colour chosen", () => {
    const w = wild(["orange", "pink"]);
    const result = attempt(holding(w), { type: "place-property", cardId: w.id });
    expect(result.ok).to.equal(false);
  });

  it("still places normal properties without a colour", () => {
    const p = card("property-old-kent-road");
    const after = play(holding(p), { type: "place-property", cardId: p.id });
    expect(after.players[0].properties[0].colour).to.equal("brown");
  });

  it("is worth nothing when it's the any-colour wildcard", () => {
    expect(wild("any").value).to.equal(0);
  });
});

describe("Wildcards in the property pile", () => {
  const isTwoColourWild = (c: Card) => c.type === "wildcard" && c.colours !== "any";
  const seed = findSeed((hand) => hand.some(isTwoColourWild));

  const placeWildAs = (pick: 0 | 1) => {
    cy.visit(`/?seed=${seed}`);
    drawCards();
    cy.get('[data-cy="my-hand"] [data-card-id^="wildcard-"]')
      .not('[data-card-id^="wildcard-any"]')
      .first()
      .invoke("attr", "data-card-id")
      .then((id) => {
        const w = card(id!) as Extract<Card, { type: "wildcard" }>;
        const colour = (w.colours as [Colour, Colour])[pick];
        // force: cards overlap in the hand, so another card may cover the middle of this one
        cy.get(`[data-cy="my-hand"] [data-card-id="${id}"]`).click({ force: true });
        cy.get('[data-cy="action-place-property"]').click();
        cy.get(`[data-cy="colour-${colour}"]`).click();
        cy.get(`[data-cy="property-set"][data-colour="${colour}"] li`).last().as("placed");
      });
  };

  it("stays upright when played as its first colour", () => {
    placeWildAs(0);
    cy.get("@placed").should("have.attr", "data-flipped", "false");
  });

  it("turns upside down when played as its second colour", () => {
    placeWildAs(1);
    cy.get("@placed").should("have.attr", "data-flipped", "true");
  });
});
