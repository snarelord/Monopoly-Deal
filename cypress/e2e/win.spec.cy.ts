import { applyMove, beginGame, waitingOn } from "../../lib/gameHelpers";
import { cardData } from "../../lib/cardData";
import type { Colour, GameState, Move, Player, PropertySet } from "../../lib/types";

const card = (id: string) => {
  const found = cardData.find((c) => c.id === id);
  if (!found) throw new Error(`No card with id "${id}"`);
  return found;
};
const set = (colour: Colour, ...ids: string[]): PropertySet =>
  ({ colour, cards: ids.map(card) as PropertySet["cards"], houses: 0, hotels: 0 });

// two complete sets, and a green set one card short (bond street finishes it)
const nearlyWon = () => [
  set("brown", "property-old-kent-road", "property-whitechapel-road"),
  set("darkBlue", "property-park-lane", "property-mayfair"),
  set("green", "property-oxford-street", "property-regent-street"),
];
const bondStreet = card("property-bond-street");

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

describe("Winning", () => {
  it("wins when a placed property completes a third set", () => {
    const game = setup({ 0: { hand: [bondStreet], properties: nearlyWon() } });
    const after = act(game, 0, { type: "place-property", cardId: bondStreet.id });

    expect(after.isGameOver).to.equal(true);
    expect(after.winnerId).to.equal(0);
  });

  it("only counts two complete sets of the same colour once", () => {
    const game = setup({
      0: {
        hand: [bondStreet],
        properties: [
          set("brown", "property-old-kent-road", "property-whitechapel-road"),
          set("darkBlue", "property-park-lane", "property-mayfair"),
          set("darkBlue", "wildcard-dark-blue-green-1", "wildcard-any-1"),
        ],
      },
    });
    const after = act(game, 0, { type: "place-property", cardId: bondStreet.id }); // green 1/3

    expect(after.isGameOver).to.equal(false);
    expect(after.winnerId).to.equal(null);
  });

  it("wins when being paid a property completes a third set", () => {
    const debtCollector = card("action-debt-collector-1");
    let game = setup({
      0: { hand: [debtCollector], properties: nearlyWon() },
      1: { properties: [set("green", bondStreet.id)] },
    });
    game = act(game, 0, { type: "play", cardId: debtCollector.id, targetId: 1 });
    game = act(game, 1, { type: "pay", cardIds: [bondStreet.id] }); // all they have, so short is fine

    expect(game.isGameOver).to.equal(true);
    expect(game.winnerId).to.equal(0); // the player who was paid, not the one who moved
  });

  it("drops anything still pending once someone has won", () => {
    const birthday = card("action-birthday-1");
    let game = setup(
      {
        0: { hand: [birthday], properties: nearlyWon() },
        1: { properties: [set("green", bondStreet.id)] },
        2: { bank: [card("money-5m-1")] },
      },
      3,
    );
    game = act(game, 0, { type: "play", cardId: birthday.id });
    game = act(game, 1, { type: "pay", cardIds: [bondStreet.id] }); // player 2 still owes at this point

    expect(game.winnerId).to.equal(0);
    expect(game.pending).to.equal(null);
    expect(attempt(game, 2, { type: "pay", cardIds: ["money-5m-1"] }).ok).to.equal(false);
    expect(waitingOn(game)).to.deep.equal([0]);
  });

  it("allows no more moves once the game is over", () => {
    const game = setup({ 0: { hand: [bondStreet, card("money-1m-1")], properties: nearlyWon() } });
    const over = act(game, 0, { type: "place-property", cardId: bondStreet.id });

    expect(attempt(over, 0, { type: "bank", cardId: "money-1m-1" }).ok).to.equal(false);
    expect(attempt(over, 0, { type: "end-turn" }).ok).to.equal(false);
  });
});
