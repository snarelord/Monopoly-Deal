import { applyMove, beginGame } from "../../lib/gameHelpers";
import type { GameState, Move } from "../../lib/types";

const play = (game: GameState, move: Move) => {
  const result = applyMove(game, 0, move);
  if (!result.ok) throw new Error(result.error);
  return result.game;
};

const lowDeck = (deckSize: number): GameState => {
  const game = beginGame(2, 1);
  return { ...game, deck: game.deck.slice(0, deckSize), discardPile: game.deck.slice(deckSize) };
};

const totalCards = (game: GameState) =>
  game.deck.length +
  game.discardPile.length +
  game.players.reduce((n, p) => n + p.hand.length + p.bank.length, 0);

describe("Deck", () => {
  it("reshuffles the discard pile in when the deck runs short", () => {
    const before = lowDeck(1);
    const after = play(before, { type: "draw" });

    expect(after.players[0].hand).to.have.length(7);
    expect(after.players[0].hand[5]).to.deep.equal(before.deck[0]); // the last deck card is drawn first
    expect(after.discardPile).to.have.length(0);
    expect(totalCards(after)).to.equal(totalCards(before));
  });

  it("reshuffles the same way every time for the same game", () => {
    const a = play(lowDeck(0), { type: "draw" });
    const b = play(lowDeck(0), { type: "draw" });
    expect(a.deck.map((c) => c.id)).to.deep.equal(b.deck.map((c) => c.id));
  });

  it("still lets the turn carry on when both piles are empty", () => {
    const empty = { ...beginGame(2, 1), deck: [], discardPile: [] };
    const drawn = play(empty, { type: "draw" });

    expect(drawn.players[0].hand).to.have.length(5);
    expect(drawn.hasDrawnCards).to.equal(true);
    expect(play(drawn, { type: "end-turn" }).currentPlayerIndex).to.equal(1);
  });

  it("puts played action cards on the discard pile", () => {
    const game = { ...beginGame(2, 1), hasDrawnCards: true };
    const card = game.players[0].hand[0];
    const after = play(game, { type: "play", cardId: card.id });
    expect(after.discardPile.map((c) => c.id)).to.deep.equal([card.id]);
  });
});
