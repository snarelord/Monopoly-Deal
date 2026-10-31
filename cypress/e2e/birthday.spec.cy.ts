import { applyMove, beginGame, waitingOn } from "../../lib/gameHelpers";
import { cardData } from "../../lib/cardData";
import { autoPay } from "../../lib/payment";
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

describe("Birthday paid automatically from a big bank", () => {
  const money = (...ids: string[]) => ids.map(card);
  const payAutomatically = (bank: Card[]) => {
    const owed = celebrate(setup({ 1: bank }));
    const paid = act(owed, 1, { type: "pay", cardIds: autoPay(owed.players[1], 2) });
    return paid.players[0].bank.map((c) => c.id).sort();
  };

  it("hands over a 2M note rather than anything bigger", () => {
    expect(payAutomatically(money("money-10m-1", "money-2m-1", "money-1m-1", "money-1m-2"))).to.deep.equal(["money-2m-1"]);
  });

  it("makes 2M out of smaller notes rather than breaking a big one", () => {
    expect(payAutomatically(money("money-10m-1", "money-1m-1", "money-1m-2", "money-1m-3", "money-1m-4")))
      .to.deep.equal(["money-1m-1", "money-1m-2"]);
  });

  it("overpays with the smallest note when there's no exact 2M", () => {
    expect(payAutomatically(money("money-10m-1", "money-4m-1"))).to.deep.equal(["money-4m-1"]);
    expect(payAutomatically(money("money-10m-1", "money-3m-1", "money-1m-1"))).to.deep.equal(["money-3m-1"]);
  });

  it("only gives up the 10M when it's all they have", () => {
    expect(payAutomatically(money("money-10m-1"))).to.deep.equal(["money-10m-1"]);
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

describe("Birthday paid automatically in the game", () => {
  // player 1 opens with a birthday, player 2 gets a 10M and at least two other notes by their first draw
  const found = Array.from({ length: 50000 }, (_, i) => i + 1).map((seed) => {
    const game = beginGame(2, seed);
    const p2Cards = [...game.players[1].hand, ...game.deck.slice(2, 4)];
    const notes = p2Cards.filter((c) => c.type === "money").slice(0, 3); // 3 plays to bank them
    const fits = game.players[0].hand.some((c) => c.id.startsWith("action-birthday"))
      && notes.some((c) => c.value === 10) && notes.length === 3 && !p2Cards.some(isSayNo);
    return fits ? { seed, notes } : null;
  }).find(Boolean)!;

  // smallest total of the banked notes that covers 2M (no change is given)
  const cheapest = Math.min(
    ...[1, 2, 3, 4, 5, 6, 7]
      .map((mask) => found.notes.filter((_, i) => mask & (1 << i)).reduce((sum, c) => sum + c.value, 0))
      .filter((total) => total >= 2),
  );

  it("only takes what covers 2M, not the big note", () => {
    cy.visit(`/?seed=${found.seed}`);
    drawCards();
    cy.get('[data-cy="end-turn"]').click();
    takeSeat();

    drawCards();
    for (const note of found.notes) {
      cy.get(`[data-cy="my-hand"] [data-card-id="${note.id}"]`).click({ force: true });
      cy.get('[data-cy="action-bank"]').click();
    }
    cy.get('[data-cy="end-turn"]').click();
    takeSeat();

    drawCards();
    cy.get('[data-cy="my-hand"] [data-card-id^="action-birthday"]').first().click({ force: true });
    cy.get('[data-cy="action-play"]').click();
    takeSeat();
    cy.get('[data-cy="pay-auto"]').click();
    takeSeat();

    cy.get('[data-cy="bank-0"]').should("have.attr", "data-total", String(cheapest));
    cy.get('[data-cy="bank-0"] [data-card-id="money-10m-1"]').should("not.exist");
  });
});
