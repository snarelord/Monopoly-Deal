import { applyMove, beginGame, PLAYS_PER_TURN } from "../../lib/gameHelpers";
import { getCardActions } from "../../lib/cardActions";
import { cardData } from "../../lib/cardData";
import type { ActionCard, Card, Colour, GameState, Move, Player, PropertySet } from "../../lib/types";
import { drawCards, takeSeat } from "../support/dealHelper";

const card = (id: string) => {
  const found = cardData.find((c) => c.id === id);
  if (!found) throw new Error(`No card with id "${id}"`);
  return found;
};
const set = (colour: Colour, ids: string[], buildings: Partial<Pick<PropertySet, "house" | "hotel">> = {}): PropertySet =>
  ({ colour, cards: ids.map(card) as PropertySet["cards"], house: null, hotel: null, ...buildings });

const slyDeal = card("action-sly-deal-1");
const forcedDeal = card("action-forced-deal-1");
const dealBreaker = card("action-deal-breaker-1");
const sayNo = card("action-just-say-no-1");
const darkBlue = (buildings = {}) => set("darkBlue", ["property-park-lane", "property-mayfair"], buildings);
const brown = () => set("brown", ["property-old-kent-road", "property-whitechapel-road"]);
const vine = () => set("orange", ["property-vine-street"]);

// player 0 has drawn, the rest of each player is whatever `players` says (hands start empty)
const setup = (players: Record<number, Partial<Player>>, playerCount = 2): GameState => {
  const game = beginGame(playerCount, 1);
  return {
    ...game,
    hasDrawnCards: true,
    players: game.players.map((p) => ({ ...p, hand: [], ...players[p.id] })),
  };
};

const attempt = (game: GameState, actorId: number, move: Move) => applyMove(game, actorId, move);
const act = (game: GameState, actorId: number, move: Move) => {
  const result = attempt(game, actorId, move);
  if (!result.ok) throw new Error(result.error);
  return result.game;
};
const cardIds = (p: Player) => p.properties.map((s) => `${s.colour}:${s.cards.map((c) => c.id).join(",")}`);

describe("Sly Deal", () => {
  it("takes a property that isn't in a complete set", () => {
    const game = setup({ 0: { hand: [slyDeal] }, 1: { properties: [vine(), darkBlue()] } });
    const after = act(game, 0, { type: "play", cardId: slyDeal.id, targetId: 1, takeId: "property-vine-street" });

    expect(cardIds(after.players[0])).to.deep.equal(["orange:property-vine-street"]);
    expect(cardIds(after.players[1])).to.deep.equal(["darkBlue:property-park-lane,property-mayfair"]);
    expect(after.cardsPlayed).to.equal(1);
    expect(after.discardPile.map((c) => c.id)).to.deep.equal([slyDeal.id]);
  });

  it("adds it to an unfinished set of the same colour", () => {
    const game = setup({
      0: { hand: [slyDeal], properties: [set("orange", ["property-bow-street"])] },
      1: { properties: [vine()] },
    });
    const after = act(game, 0, { type: "play", cardId: slyDeal.id, targetId: 1, takeId: "property-vine-street" });
    expect(cardIds(after.players[0])).to.deep.equal(["orange:property-bow-street,property-vine-street"]);
  });

  it("keeps a wildcard as the colour it was being used as", () => {
    const game = setup({ 0: { hand: [slyDeal] }, 1: { properties: [set("pink", ["wildcard-orange-pink-1"])] } });
    const after = act(game, 0, { type: "play", cardId: slyDeal.id, targetId: 1, takeId: "wildcard-orange-pink-1" });
    expect(cardIds(after.players[0])).to.deep.equal(["pink:wildcard-orange-pink-1"]);
  });

  it("won't take from a complete set", () => {
    const game = setup({ 0: { hand: [slyDeal] }, 1: { properties: [darkBlue()] } });
    const result = attempt(game, 0, { type: "play", cardId: slyDeal.id, targetId: 1, takeId: "property-mayfair" });
    expect(result.ok).to.equal(false);
  });

  it("needs a card to take", () => {
    const game = setup({ 0: { hand: [slyDeal] }, 1: { properties: [vine()] } });
    expect(attempt(game, 0, { type: "play", cardId: slyDeal.id, targetId: 1 }).ok).to.equal(false);
  });

  it("waits for a target holding a Just Say No, and only takes it if they accept", () => {
    const game = setup({ 0: { hand: [slyDeal] }, 1: { hand: [sayNo], properties: [vine()] } });
    const played = act(game, 0, { type: "play", cardId: slyDeal.id, targetId: 1, takeId: "property-vine-street" });
    expect(played.pending?.debts[0].status).to.equal("responding");
    expect(played.players[1].properties).to.have.length(1); // nothing taken yet

    const accepted = act(played, 1, { type: "accept" });
    expect(accepted.pending).to.equal(null);
    expect(cardIds(accepted.players[0])).to.deep.equal(["orange:property-vine-street"]);

    const refused = act(played, 1, { type: "just-say-no", cardId: sayNo.id });
    expect(refused.pending).to.equal(null);
    expect(cardIds(refused.players[1])).to.deep.equal(["orange:property-vine-street"]);
  });
});

describe("Forced Deal", () => {
  it("swaps one of yours for one of theirs", () => {
    const game = setup({
      0: { hand: [forcedDeal], properties: [vine()] },
      1: { properties: [set("pink", ["property-pall-mall"])] },
    });
    const after = act(game, 0, {
      type: "play", cardId: forcedDeal.id, targetId: 1, takeId: "property-pall-mall", giveId: "property-vine-street",
    });
    expect(cardIds(after.players[0])).to.deep.equal(["pink:property-pall-mall"]);
    expect(cardIds(after.players[1])).to.deep.equal(["orange:property-vine-street"]);
  });

  it("won't give away a card from your own complete set", () => {
    const game = setup({
      0: { hand: [forcedDeal], properties: [brown()] },
      1: { properties: [set("pink", ["property-pall-mall"])] },
    });
    const result = attempt(game, 0, {
      type: "play", cardId: forcedDeal.id, targetId: 1, takeId: "property-pall-mall", giveId: "property-old-kent-road",
    });
    expect(result.ok).to.equal(false);
  });

  it("won't take a card from their complete set", () => {
    const game = setup({ 0: { hand: [forcedDeal], properties: [vine()] }, 1: { properties: [darkBlue()] } });
    const result = attempt(game, 0, {
      type: "play", cardId: forcedDeal.id, targetId: 1, takeId: "property-mayfair", giveId: "property-vine-street",
    });
    expect(result.ok).to.equal(false);
  });
});

describe("Deal Breaker", () => {
  const house = card("house-1") as ActionCard;

  it("takes a whole complete set, buildings and all", () => {
    const game = setup({ 0: { hand: [dealBreaker] }, 1: { properties: [darkBlue({ house }), vine()] } });
    const after = act(game, 0, { type: "play", cardId: dealBreaker.id, targetId: 1, takeId: "property-park-lane" });

    expect(cardIds(after.players[0])).to.deep.equal(["darkBlue:property-park-lane,property-mayfair"]);
    expect(after.players[0].properties[0].house?.id).to.equal(house.id);
    expect(cardIds(after.players[1])).to.deep.equal(["orange:property-vine-street"]);
  });

  it("won't take a set that isn't complete", () => {
    const game = setup({ 0: { hand: [dealBreaker] }, 1: { properties: [vine()] } });
    const result = attempt(game, 0, { type: "play", cardId: dealBreaker.id, targetId: 1, takeId: "property-vine-street" });
    expect(result.ok).to.equal(false);
  });

  it("can win the game", () => {
    const game = setup({
      0: { hand: [dealBreaker], properties: [brown(), set("green", ["property-bond-street", "property-oxford-street", "property-regent-street"])] },
      1: { properties: [darkBlue()] },
    });
    const after = act(game, 0, { type: "play", cardId: dealBreaker.id, targetId: 1, takeId: "property-mayfair" });
    expect(after.winnerId).to.equal(0);
  });
});

describe("Steal menu options", () => {
  // the menu for player 0 holding `steal`, with players 1 and 2 owning the given properties
  const options = (steal: Card, mine: PropertySet[], p1: PropertySet[], p2: PropertySet[]) => {
    const me = { id: 0, hand: [steal], bank: [], properties: mine };
    const opponents = [p1, p2].map((properties, i) => ({ id: i + 1, handCount: 0, bank: [], properties }));
    const ctx = { playBlockedReason: null, canDiscard: false, opponents, me, playsLeft: PLAYS_PER_TURN };
    return getCardActions(steal, ctx).find((a) => a.id === "play-on-player")!;
  };

  it("only offers players with something to take", () => {
    expect(options(slyDeal, [], [darkBlue()], [vine()]).targets).to.deep.equal([2]);
    expect(options(dealBreaker, [], [darkBlue()], [vine()]).targets).to.deep.equal([1]);
  });

  it("is greyed out when there's nothing to take", () => {
    expect(options(slyDeal, [], [darkBlue()], []).disabled).to.equal(true);
    expect(options(forcedDeal, [darkBlue()], [vine()], []).disabled).to.equal(true); // nothing loose to give
  });
});

describe("Sly Deal in the game", () => {
  const isSayNo = (c: Card) => c.type === "action" && c.action === "just-say-no";

  // player 1 opens with a sly deal, player 2 has a property by their first draw and no just say no
  const found = Array.from({ length: 20000 }, (_, i) => i + 1).map((seed) => {
    const game = beginGame(2, seed);
    const p2Cards = [...game.players[1].hand, ...game.deck.slice(2, 4)];
    const property = p2Cards.find((c) => c.type === "property");
    const fits = game.players[0].hand.some((c) => c.id.startsWith("action-sly-deal")) && property && !p2Cards.some(isSayNo);
    return fits ? { seed, property: property! } : null;
  }).find(Boolean)!;

  it("takes the other player's property through the picker", () => {
    const { seed, property } = found;
    cy.visit(`/?seed=${seed}`);
    drawCards();
    cy.get('[data-cy="end-turn"]').click();
    takeSeat();

    // player 2 puts a property down
    drawCards();
    cy.get(`[data-cy="my-hand"] [data-card-id="${property.id}"]`).click({ force: true });
    cy.get('[data-cy="action-place-property"]').click();
    cy.get('[data-cy="end-turn"]').click();
    takeSeat();

    // player 1 sly deals it
    drawCards();
    cy.get('[data-cy="my-hand"] [data-card-id^="action-sly-deal"]').first().click({ force: true });
    cy.get('[data-cy="action-play-on-player"]').click();
    cy.get('[data-cy="target-1"]').click();
    cy.get('[data-cy="steal-confirm"]').should("be.disabled");
    cy.get(`[data-cy="steal-take"] [data-card-id="${property.id}"]`).click();
    cy.get('[data-cy="steal-confirm"]').click();

    // player 2 has no just say no, so it's taken straight away and it's still player 1's turn
    cy.get('[data-cy="steal-picker"]').should("not.exist");
    cy.get('[data-cy="pass-screen"]').should("not.exist");
    cy.get(`[data-cy="properties-0"] [data-card-id="${property.id}"]`).should("exist");
  });
});
