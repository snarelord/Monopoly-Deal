import { applyMove, beginGame } from "../../lib/gameHelpers";
import { cardData } from "../../lib/cardData";
import type { Colour, GameState, LogEntry, Move, Player, PropertySet } from "../../lib/types";
import { describeEntry, isAimedAt } from "../../components/logText";

const card = (id: string) => {
  const found = cardData.find((c) => c.id === id);
  if (!found) throw new Error(`No card with id "${id}"`);
  return found;
};
const set = (colour: Colour, ...ids: string[]): PropertySet =>
  ({ colour, cards: ids.map(card) as PropertySet["cards"], house: null, hotel: null });

// player 0 has drawn, the rest of each player is whatever `players` says (hands start empty)
const setup = (players: Record<number, Partial<Player>>): GameState => {
  const game = beginGame(2, 1);
  return {
    ...game,
    hasDrawnCards: true,
    players: game.players.map((p) => ({ ...p, hand: [], ...players[p.id] })),
  };
};

const act = (game: GameState, actorId: number, move: Move) => {
  const result = applyMove(game, actorId, move);
  if (!result.ok) throw new Error(result.error);
  return result.game;
};
const kinds = (game: GameState) => game.log.map((e) => e.kind);
const last = (game: GameState) => game.log[game.log.length - 1];

describe("Game log", () => {
  it("records a draw as a count, never the cards", () => {
    const game = { ...beginGame(2, 1), hasDrawnCards: false };
    const entry = last(act(game, 0, { type: "draw" }));
    expect(entry).to.deep.equal({ kind: "drew", playerId: 0, count: 2, turn: 1 });
  });

  it("records banking a card", () => {
    const after = act(setup({ 0: { hand: [card("money-5m-1")] } }), 0, { type: "bank", cardId: "money-5m-1" });
    expect(last(after)).to.include({ kind: "banked", playerId: 0 });
  });

  it("records a debt collector and the payment", () => {
    const debtCollector = card("action-debt-collector-1");
    let game = setup({ 0: { hand: [debtCollector] }, 1: { bank: [card("money-5m-1")] } });
    game = act(game, 0, { type: "play", cardId: debtCollector.id, targetId: 1 });
    expect(last(game)).to.include({ kind: "played", playerId: 0, amount: 5 });

    game = act(game, 1, { type: "pay", cardIds: ["money-5m-1"] });
    expect(last(game)).to.include({ kind: "paid", playerId: 1, toId: 0 });
  });

  it("records a player with nothing to pay", () => {
    const birthday = card("action-birthday-1");
    const after = act(setup({ 0: { hand: [birthday] } }), 0, { type: "play", cardId: birthday.id });
    expect(kinds(after)).to.deep.equal(["played", "paid"]);
    expect(last(after)).to.deep.include({ playerId: 1, toId: 0, cards: [] });
  });

  it("records a Just Say No and the action being cancelled", () => {
    const debtCollector = card("action-debt-collector-1");
    let game = setup({
      0: { hand: [debtCollector] },
      1: { hand: [card("action-just-say-no-1")], bank: [card("money-5m-1")] },
    });
    game = act(game, 0, { type: "play", cardId: debtCollector.id, targetId: 1 });
    game = act(game, 1, { type: "just-say-no", cardId: "action-just-say-no-1" });
    expect(kinds(game)).to.deep.equal(["played", "said-no", "cancelled"]);
    expect(last(game)).to.include({ playerId: 0, forId: 1 });
  });

  it("records a steal", () => {
    const slyDeal = card("action-sly-deal-1");
    const game = setup({ 0: { hand: [slyDeal] }, 1: { properties: [set("orange", "property-vine-street")] } });
    const after = act(game, 0, { type: "play", cardId: slyDeal.id, targetId: 1, takeId: "property-vine-street" });
    expect(last(after)).to.include({ kind: "took", playerId: 0, fromId: 1 });
  });

  it("records the end of a turn against the player and turn it ended", () => {
    const after = act(setup({}), 0, { type: "end-turn" });
    expect(last(after)).to.deep.equal({ kind: "ended-turn", playerId: 0, turn: 1 });
  });

  it("records the win", () => {
    const bond = card("property-bond-street");
    const game = setup({
      0: {
        hand: [bond],
        properties: [
          set("brown", "property-old-kent-road", "property-whitechapel-road"),
          set("darkBlue", "property-park-lane", "property-mayfair"),
          set("green", "property-oxford-street", "property-regent-street"),
        ],
      },
    });
    expect(kinds(act(game, 0, { type: "place-property", cardId: bond.id }))).to.deep.equal(["placed", "won"]);
  });
});

describe("Log wording and toasts", () => {
  const paid: LogEntry = { kind: "paid", playerId: 1, toId: 0, cards: [card("money-5m-1")], turn: 3 };
  const played: LogEntry = { kind: "played", playerId: 0, card: card("action-debt-collector-1"), targetIds: [1], amount: 5, turn: 3 };
  const cancelled: LogEntry = { kind: "cancelled", playerId: 0, card: card("action-debt-collector-1"), forId: 1, turn: 3 };

  it("says 'you' to the player it's about", () => {
    const names = ["Player 1", "Player 2"];
    expect(describeEntry(paid, 0, names)).to.equal("Player 2 paid you 5M (5M)");
    expect(describeEntry(paid, 1, names)).to.equal("You paid Player 1 5M (5M)");
    expect(describeEntry(cancelled, 0, names)).to.equal("Your Debt Collector was cancelled for Player 2");
  });

  it("uses the players' names", () => {
    const names = ["Alex", "Sam"];
    expect(describeEntry(paid, 0, names)).to.equal("Sam paid you 5M (5M)");
    expect(describeEntry(cancelled, 1, names)).to.equal("Alex's Debt Collector was cancelled for you");
  });

  it("toasts the player something was done to, not the one who did it", () => {
    expect(isAimedAt(played, 1)).to.equal(true);
    expect(isAimedAt(played, 0)).to.equal(false);
    expect(isAimedAt(paid, 0)).to.equal(true);
    expect(isAimedAt(cancelled, 0)).to.equal(true); // your action was cancelled
  });
});
