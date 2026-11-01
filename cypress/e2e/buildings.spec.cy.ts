import { applyMove, beginGame } from "../../lib/gameHelpers";
import { autoPay } from "../../lib/payment";
import { rentFor } from "../../lib/rent";
import { cardData } from "../../lib/cardData";
import type { ActionCard, Card, Colour, GameState, Move, Player, PropertySet } from "../../lib/types";

const card = (id: string) => {
  const found = cardData.find((c) => c.id === id);
  if (!found) throw new Error(`No card with id "${id}"`);
  return found;
};
const house = card("house-1") as ActionCard;
const hotel = card("hotel-1") as ActionCard;
const set = (colour: Colour, ids: string[], buildings: Partial<Pick<PropertySet, "house" | "hotel">> = {}): PropertySet =>
  ({ colour, cards: ids.map(card) as PropertySet["cards"], house: null, hotel: null, ...buildings });

const darkBlue = (buildings = {}) => set("darkBlue", ["property-park-lane", "property-mayfair"], buildings); // 8M rent

// player 0 has drawn, the rest of each player is whatever `players` says (hands start empty)
const setup = (players: Record<number, Partial<Player>>): GameState => {
  const game = beginGame(2, 1);
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
const ids = (cards: (Card | null)[]) => cards.map((c) => c?.id ?? null);

describe("Building", () => {
  it("puts a house on a complete set and uses a play", () => {
    const after = act(setup({ 0: { hand: [house], properties: [darkBlue()] } }), 0, {
      type: "build", cardId: house.id, colour: "darkBlue",
    });
    expect(after.players[0].properties[0].house?.id).to.equal(house.id);
    expect(after.players[0].hand).to.have.length(0);
    expect(after.cardsPlayed).to.equal(1);
  });

  it("won't build on an incomplete set", () => {
    const game = setup({ 0: { hand: [house], properties: [set("darkBlue", ["property-park-lane"])] } });
    expect(attempt(game, 0, { type: "build", cardId: house.id, colour: "darkBlue" }).ok).to.equal(false);
  });

  it("won't build on utilities or railroads", () => {
    const utilities = set("utility", ["utilities-electric-company", "utilities-water-works"]);
    const game = setup({ 0: { hand: [house], properties: [utilities] } });
    expect(attempt(game, 0, { type: "build", cardId: house.id, colour: "utility" }).ok).to.equal(false);
  });

  it("allows one house per set", () => {
    const game = setup({ 0: { hand: [card("house-2")], properties: [darkBlue({ house })] } });
    expect(attempt(game, 0, { type: "build", cardId: "house-2", colour: "darkBlue" }).ok).to.equal(false);
  });

  it("needs a house before a hotel", () => {
    const bare = setup({ 0: { hand: [hotel], properties: [darkBlue()] } });
    expect(attempt(bare, 0, { type: "build", cardId: hotel.id, colour: "darkBlue" }).ok).to.equal(false);

    const withHouse = setup({ 0: { hand: [hotel], properties: [darkBlue({ house })] } });
    const after = act(withHouse, 0, { type: "build", cardId: hotel.id, colour: "darkBlue" });
    expect(after.players[0].properties[0].hotel?.id).to.equal(hotel.id);
  });

  it("adds 3M rent for a house and 4M for a hotel", () => {
    const owner = (properties: PropertySet[]) => ({ id: 0, name: "Player 1", hand: [], bank: [], properties });
    expect(rentFor(owner([darkBlue()]), "darkBlue")).to.equal(8);
    expect(rentFor(owner([darkBlue({ house })]), "darkBlue")).to.equal(11);
    expect(rentFor(owner([darkBlue({ house, hotel })]), "darkBlue")).to.equal(15);
  });
});

describe("Buildings and paying", () => {
  const birthday = card("action-birthday-1");
  // player 0 plays a birthday (2M), player 1 owns a built up dark blue set and nothing in the bank
  const owed = (buildings = {}) =>
    act(
      act(setup({ 0: { hand: [birthday] }, 1: { properties: [darkBlue(buildings)] } }), 0, { type: "play", cardId: birthday.id }),
      1,
      { type: "accept" },
    );

  it("moves the buildings to the bank when a set stops being complete", () => {
    const paid = act(owed({ house, hotel }), 1, { type: "pay", cardIds: ["property-mayfair"] });
    const [left] = paid.players[1].properties;

    expect(ids(left.cards)).to.deep.equal(["property-park-lane"]);
    expect(left.house).to.equal(null);
    expect(left.hotel).to.equal(null);
    expect(ids(paid.players[1].bank)).to.deep.equal([house.id, hotel.id]);
  });

  it("can pay with a house, and the hotel left without one goes to the bank", () => {
    const paid = act(owed({ house, hotel }), 1, { type: "pay", cardIds: [house.id] });

    expect(ids(paid.players[0].bank)).to.deep.equal([house.id]); // the receiver banks the building
    expect(ids(paid.players[1].bank)).to.deep.equal([hotel.id]);
  });

  it("pays automatically with buildings like properties, only once the bank runs out", () => {
    const player = { id: 1, name: "Player 2", hand: [], bank: [card("money-1m-1")], properties: [darkBlue({ house })] };
    // owes 3M: the 1M, then the cheapest card on the table that covers the other 2M is the 3M house
    expect(autoPay(player, 3).sort()).to.deep.equal(["house-1", "money-1m-1"]);
    expect(autoPay(player, 1)).to.deep.equal(["money-1m-1"]);
  });
});
