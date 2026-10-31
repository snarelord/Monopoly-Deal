import { applyMove, beginGame } from "../../lib/gameHelpers";
import { drawCards, findSeed } from "../support/dealHelper";
import { cardData } from "../../lib/cardData";
import type { ActionCard, Card, Colour, GameState, Move, PropertySet } from "../../lib/types";

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

describe("Moving wildcards", () => {
  const set = (colour: Colour, ...ids: string[]): PropertySet =>
    ({ colour, cards: ids.map(card) as PropertySet["cards"], house: null, hotel: null });
  const owning = (...properties: PropertySet[]): GameState => {
    const game = holding();
    return { ...game, players: game.players.map((p) => (p.id === 0 ? { ...p, properties } : p)) };
  };
  const sets = (game: GameState) =>
    game.players[0].properties.map((s) => `${s.colour}:${s.cards.map((c) => c.id).join(",")}`);
  const move = (cardId: string, colour: Colour): Move => ({ type: "move-wildcard", cardId, colour });

  it("switches a two colour wildcard to its other colour without using a play", () => {
    const after = play(owning(set("orange", "wildcard-orange-pink-1")), move("wildcard-orange-pink-1", "pink"));
    expect(sets(after)).to.deep.equal(["pink:wildcard-orange-pink-1"]);
    expect(after.cardsPlayed).to.equal(0);
  });

  it("joins an unfinished set of the new colour", () => {
    const game = owning(set("orange", "property-vine-street", "wildcard-orange-pink-1"), set("pink", "property-pall-mall"));
    expect(sets(play(game, move("wildcard-orange-pink-1", "pink")))).to.deep.equal([
      "orange:property-vine-street",
      "pink:property-pall-mall,wildcard-orange-pink-1",
    ]);
  });

  it("only moves the any colour wildcard into a set you've started", () => {
    const game = owning(set("darkBlue", "property-park-lane", "wildcard-any-1"), set("pink", "property-pall-mall"));
    expect(attempt(game, move("wildcard-any-1", "green")).ok).to.equal(false);
    expect(sets(play(game, move("wildcard-any-1", "pink")))).to.deep.equal([
      "darkBlue:property-park-lane",
      "pink:property-pall-mall,wildcard-any-1",
    ]);
  });

  it("refuses a colour the wildcard doesn't have, or the one it's already", () => {
    const game = owning(set("orange", "wildcard-orange-pink-1"));
    expect(attempt(game, move("wildcard-orange-pink-1", "green")).ok).to.equal(false);
    expect(attempt(game, move("wildcard-orange-pink-1", "orange")).ok).to.equal(false);
  });

  it("can only be done on your own turn", () => {
    const game = owning(set("orange", "wildcard-orange-pink-1"));
    expect(applyMove(game, 1, move("wildcard-orange-pink-1", "pink")).ok).to.equal(false);
  });

  it("sends the buildings to the bank when it breaks a complete set", () => {
    const house = card("house-1") as ActionCard;
    const lightBlue = set("lightBlue", "property-euston-road", "property-pentonville-road", "wildcard-brown-light-blue-1");
    const after = play(owning({ ...lightBlue, house }), move("wildcard-brown-light-blue-1", "brown"));

    expect(after.players[0].properties.find((s) => s.colour === "lightBlue")?.house).to.equal(null);
    expect(after.players[0].bank.map((c) => c.id)).to.include("house-1");
  });

  it("can complete a third set and win", () => {
    const game = owning(
      set("brown", "property-old-kent-road", "property-whitechapel-road"),
      set("darkBlue", "property-park-lane", "property-mayfair"),
      set("orange", "property-vine-street", "property-bow-street"),
      set("pink", "wildcard-orange-pink-1"),
    );
    expect(play(game, move("wildcard-orange-pink-1", "orange")).winnerId).to.equal(0);
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

  it("can be moved to its other colour from the property pile, without using a play", () => {
    placeWildAs(0);
    cy.get("@placed").find("[data-card-id]").invoke("attr", "data-card-id").then((id) => {
      const w = card(id!) as Extract<Card, { type: "wildcard" }>;
      const other = (w.colours as [Colour, Colour])[1];

      cy.get("@placed").find("button").click();
      cy.get(`[data-cy="move-colour-${other}"]`).click();

      cy.get('[data-cy="wildcard-mover"]').should("not.exist");
      cy.get(`[data-cy="property-set"][data-colour="${other}"] [data-card-id="${id}"]`)
        .closest("li")
        .should("have.attr", "data-flipped", "true");
      cy.get('[data-cy="turn-info"]').should("have.attr", "data-plays-left", "2"); // only the placing used a play
    });
  });
});
