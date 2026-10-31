import { applyMove, beginGame, waitingOn } from "../../lib/gameHelpers";
import { cardData } from "../../lib/cardData";
import type { Card, GameState, Move } from "../../lib/types";
import { drawCards, takeSeat } from "../support/dealHelper";

const card = (id: string) => cardData.find((c) => c.id === id)!;
const birthday = card("action-birthday-1");

// 3 players: player 0 has drawn and holds a birthday card, the others have the given banks
const setup = (banks: Record<number, Card[]>): GameState => {
  const game = beginGame(3, 1);
  return {
    ...game,
    hasDrawnCards: true,
    players: game.players.map((p) =>
      p.id === 0 ? { ...p, hand: [birthday] } : { ...p, hand: [], bank: banks[p.id] ?? [] },
    ),
  };
};

const act = (game: GameState, actorId: number, move: Move) => {
  const result = applyMove(game, actorId, move);
  if (!result.ok) throw new Error(result.error);
  return result.game;
};
const celebrate = (game: GameState) => act(game, 0, { type: "play", cardId: birthday.id });

describe("Birthday", () => {
  it("makes every other player owe 2M", () => {
    const after = celebrate(setup({ 1: [card("money-2m-1")], 2: [card("money-2m-2")] }));

    expect(after.pending?.debts).to.deep.equal([
      { playerId: 1, amount: 2, status: "paying", sayNoCount: 0 },
      { playerId: 2, amount: 2, status: "paying", sayNoCount: 0 },
    ]);
    expect(waitingOn(after)).to.deep.equal([1, 2]);
    expect(after.cardsPlayed).to.equal(1);
  });

  it("waits until everyone has paid before the turn carries on", () => {
    let game = celebrate(setup({ 1: [card("money-2m-1")], 2: [card("money-3m-1")] }));

    game = act(game, 1, { type: "pay", cardIds: ["money-2m-1"] });
    expect(waitingOn(game)).to.deep.equal([2]);
    expect(applyMove(game, 0, { type: "end-turn" }).ok).to.equal(false);

    game = act(game, 2, { type: "pay", cardIds: ["money-3m-1"] });
    expect(game.pending).to.equal(null);
    expect(waitingOn(game)).to.deep.equal([0]);
    expect(game.players[0].bank.map((c) => c.id)).to.deep.equal(["money-2m-1", "money-3m-1"]);
  });

  it("lets players with nothing off and only waits on the rest", () => {
    const after = celebrate(setup({ 2: [card("money-1m-1")] }));
    expect(waitingOn(after)).to.deep.equal([2]);
  });

  it("doesn't wait at all if nobody can pay", () => {
    const after = celebrate(setup({}));
    expect(after.pending).to.equal(null);
    expect(waitingOn(after)).to.deep.equal([0]);
  });
});

const isSayNo = (c: Card) => c.type === "action" && c.action === "just-say-no";

describe("Birthday in the game", () => {
  // player 1 opens with a birthday card, and player 2 gets a money card by their first draw
  const seed = Array.from({ length: 5000 }, (_, i) => i + 1).find((s) => {
    const game = beginGame(2, s);
    const p2Cards = [...game.players[1].hand, ...game.deck.slice(2, 4)];
    return game.players[0].hand.some((c) => c.id.startsWith("action-birthday"))
      && p2Cards.some((c) => c.type === "money")
      && !p2Cards.some(isSayNo); // otherwise player 2 gets asked about just say no first
  });

  it("collects 2M from the other player", () => {
    cy.visit(`/?seed=${seed}`);
    drawCards();
    cy.get('[data-cy="end-turn"]').click();
    takeSeat();

    // player 2 banks some money, then hands back
    drawCards();
    cy.get('[data-cy="my-hand"] [data-card-id^="money-"]').first().click({ force: true });
    cy.get('[data-cy="action-bank"]').click();
    cy.get('[data-cy="end-turn"]').click();
    takeSeat();

    drawCards();
    cy.get('[data-cy="my-hand"] [data-card-id^="action-birthday"]').first().click({ force: true });
    cy.get('[data-cy="action-play"]').click();

    takeSeat();
    cy.get('[data-cy="payment-panel"]').should("contain.text", "Pay Player 1 2M");
    cy.get('[data-cy="pay-auto"]').click();

    takeSeat();
    cy.get('[data-cy="bank-0"]').should("have.attr", "data-count", "1");
  });
});
