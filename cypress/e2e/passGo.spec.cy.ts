import { applyMove, beginGame } from "../../lib/gameHelpers";
import { cardData } from "../../lib/cardData";
import type { Card, GameState, Move } from "../../lib/types";
import { drawCards, findSeed } from "../support/dealHelper";

const passGo = cardData.find((c) => c.id === "pass-go-1")!;
const isPassGo = (c: Card) => c.type === "action" && c.action === "pass-go";

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

describe("Pass Go", () => {
  it("draws the top two cards of the deck", () => {
    const before = holding(passGo);
    const after = play(before, { type: "play", cardId: passGo.id });

    expect(after.players[0].hand.map((c) => c.id)).to.deep.equal(before.deck.slice(0, 2).map((c) => c.id));
    expect(after.deck).to.have.length(before.deck.length - 2);
  });

  it("goes on the discard pile and uses up a play", () => {
    const after = play(holding(passGo), { type: "play", cardId: passGo.id });
    expect(after.discardPile.map((c) => c.id)).to.deep.equal([passGo.id]);
    expect(after.cardsPlayed).to.equal(1);
  });

  it("reshuffles the discard pile in when the deck runs short", () => {
    const game = holding(passGo);
    const before = { ...game, deck: game.deck.slice(0, 1), discardPile: game.deck.slice(1, 10) };
    const after = play(before, { type: "play", cardId: passGo.id });

    expect(after.players[0].hand).to.have.length(2);
    expect(after.players[0].hand[0].id).to.equal(before.deck[0].id);
    expect(after.discardPile).to.have.length(0);
  });

  it("can't be played with no plays left", () => {
    const result = attempt({ ...holding(passGo), cardsPlayed: 3 }, { type: "play", cardId: passGo.id });
    expect(result.ok).to.equal(false);
  });
});

describe("Pass Go in the hand", () => {
  const seed = findSeed((hand) => hand.some(isPassGo));

  it("swaps the card for two new ones", () => {
    cy.visit(`/?seed=${seed}`);
    drawCards(); // 7 cards

    cy.get('[data-cy="my-hand"] [data-card-id^="pass-go-"]').first().click({ force: true });
    cy.get('[data-cy="action-play"]').click();

    cy.get('[data-cy="my-hand"] [data-cy="card"]').should("have.length", 8);
    cy.get('[data-cy="action-pile-count"]').should("have.text", "1");
    cy.get('[data-cy="turn-info"]').should("have.attr", "data-plays-left", "2");
  });
});
