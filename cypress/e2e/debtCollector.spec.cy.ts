import { applyMove, beginGame, waitingOn } from "../../lib/gameHelpers";
import { autoPay } from "../../lib/payment";
import { cardData } from "../../lib/cardData";
import type { Card, GameState, Move, PropertySet } from "../../lib/types";
import { drawCards, takeSeat } from "../support/dealHelper";

const card = (id: string) => cardData.find((c) => c.id === id)!;
const debtCollector = card("action-debt-collector-1");
const money = (...ids: string[]) => ids.map(card);
const set = (colour: PropertySet["colour"], ...ids: string[]): PropertySet =>
  ({ colour, cards: ids.map(card) as PropertySet["cards"], house: null, hotel: null });

// player 0 has drawn and holds a debt collector, player 1 has the given bank and properties
const setup = (bank: Card[] = [], properties: PropertySet[] = []): GameState => {
  const game = beginGame(2, 1);
  return {
    ...game,
    hasDrawnCards: true,
    players: game.players.map((p) =>
      p.id === 0 ? { ...p, hand: [debtCollector] } : { ...p, hand: [], bank, properties },
    ),
  };
};

const attempt = (game: GameState, actorId: number, move: Move) => applyMove(game, actorId, move);
const act = (game: GameState, actorId: number, move: Move) => {
  const result = attempt(game, actorId, move);
  if (!result.ok) throw new Error(result.error);
  return result.game;
};
const collect = (game: GameState) => act(game, 0, { type: "play", cardId: debtCollector.id, targetId: 1 });

describe("Debt Collector", () => {
  it("makes the chosen player owe 5M", () => {
    const after = collect(setup(money("money-5m-1")));

    expect(after.pending?.debts).to.deep.equal([{ playerId: 1, amount: 5, status: "paying", sayNoCount: 0 }]);
    expect(waitingOn(after)).to.deep.equal([1]);
    expect(after.cardsPlayed).to.equal(1);
    expect(after.discardPile.map((c) => c.id)).to.deep.equal([debtCollector.id]);
  });

  it("needs another player to aim at", () => {
    const game = setup(money("money-5m-1"));
    expect(attempt(game, 0, { type: "play", cardId: debtCollector.id }).ok).to.equal(false);
    expect(attempt(game, 0, { type: "play", cardId: debtCollector.id, targetId: 0 }).ok).to.equal(false);
  });

  it("pauses the turn until the debt is paid", () => {
    const after = collect(setup(money("money-5m-1")));
    expect(attempt(after, 0, { type: "end-turn" }).ok).to.equal(false);
    expect(attempt(after, 1, { type: "draw" }).ok).to.equal(false);
  });

  it("moves the paid money into the collector's bank", () => {
    const paid = act(collect(setup(money("money-2m-1", "money-3m-1", "money-1m-1"))), 1, {
      type: "pay",
      cardIds: ["money-2m-1", "money-3m-1"],
    });

    expect(paid.pending).to.equal(null);
    expect(waitingOn(paid)).to.deep.equal([0]);
    expect(paid.players[0].bank.map((c) => c.id)).to.deep.equal(["money-2m-1", "money-3m-1"]);
    expect(paid.players[1].bank.map((c) => c.id)).to.deep.equal(["money-1m-1"]);
  });

  it("gives no change for overpaying", () => {
    const paid = act(collect(setup(money("money-10m-1"))), 1, { type: "pay", cardIds: ["money-10m-1"] });
    expect(paid.players[0].bank.map((c) => c.id)).to.deep.equal(["money-10m-1"]);
  });

  it("refuses too little when the player has more", () => {
    const owed = collect(setup(money("money-2m-1", "money-5m-1")));
    expect(attempt(owed, 1, { type: "pay", cardIds: ["money-2m-1"] }).ok).to.equal(false);
  });

  it("accepts everything they've got when it doesn't cover the debt", () => {
    const owed = collect(setup(money("money-1m-1", "money-2m-1")));
    const paid = act(owed, 1, { type: "pay", cardIds: ["money-1m-1", "money-2m-1"] });
    expect(paid.pending).to.equal(null);
  });

  it("lets a player with nothing off straight away", () => {
    const after = collect(setup());
    expect(after.pending).to.equal(null);
    expect(waitingOn(after)).to.deep.equal([0]);
  });

  it("moves paid properties into the collector's property pile", () => {
    const owed = collect(setup([], [set("darkBlue", "property-mayfair", "property-park-lane")]));
    const paid = act(owed, 1, { type: "pay", cardIds: ["property-mayfair", "property-park-lane"] });

    expect(paid.players[0].properties.map((s) => s.colour)).to.deep.equal(["darkBlue"]);
    expect(paid.players[0].properties[0].cards).to.have.length(2);
    expect(paid.players[1].properties).to.have.length(0);
  });
});

describe("Pay automatically", () => {
  const player = (bank: Card[], properties: PropertySet[] = []) => ({ id: 1, name: "Player 2", hand: [], bank, properties });

  it("pays the exact amount when it can", () => {
    expect(autoPay(player(money("money-3m-1", "money-1m-1", "money-2m-1")), 4).sort())
      .to.deep.equal(["money-1m-1", "money-3m-1"]);
  });

  it("overpays as little as possible", () => {
    expect(autoPay(player(money("money-10m-1", "money-3m-1", "money-4m-1")), 5).sort())
      .to.deep.equal(["money-3m-1", "money-4m-1"]);
  });

  it("uses money before properties for the same total", () => {
    const p = player(money("money-4m-1"), [set("darkBlue", "property-mayfair")]); // mayfair is worth 4M
    expect(autoPay(p, 4)).to.deep.equal(["money-4m-1"]);
  });

  it("overpays with money rather than hand over a property", () => {
    const p = player(money("money-5m-1"), [set("brown", "property-old-kent-road")]); // worth 1M
    expect(autoPay(p, 1)).to.deep.equal(["money-5m-1"]);
  });

  it("uses the whole bank first, then as few properties as needed", () => {
    // owes 3M with 1M in the bank: the 1M plus pall mall (2M), not mayfair (4M)
    const p = player(money("money-1m-1"), [
      set("darkBlue", "property-mayfair"),
      set("pink", "property-pall-mall"),
    ]);
    expect(autoPay(p, 3).sort()).to.deep.equal(["money-1m-1", "property-pall-mall"].sort());
  });

  it("hands over everything when it can't cover the debt", () => {
    expect(autoPay(player(money("money-1m-1", "money-2m-1")), 5).sort())
      .to.deep.equal(["money-1m-1", "money-2m-1"]);
  });

  it("never uses the any colour wildcard, it's worth nothing", () => {
    const p = player(money("money-1m-1"), [set("brown", "wildcard-any-1")]);
    expect(autoPay(p, 5)).to.deep.equal(["money-1m-1"]);
  });
});

const isSayNo = (c: Card) => c.type === "action" && c.action === "just-say-no";

describe("Debt Collector in the game", () => {
  // player 1 opens with a debt collector, and player 2 gets a money card by their first draw
  const seed = Array.from({ length: 5000 }, (_, i) => i + 1).find((s) => {
    const game = beginGame(2, s);
    const p2Cards = [...game.players[1].hand, ...game.deck.slice(2, 4)];
    return game.players[0].hand.some((c) => c.id.startsWith("action-debt-collector"))
      && p2Cards.some((c) => c.type === "money")
      && !p2Cards.some(isSayNo); // otherwise player 2 gets asked about just say no first
  });

  it("hands over to the player who owes, then back once they've paid", () => {
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

    // player 1 collects from player 2
    drawCards();
    cy.get('[data-cy="my-hand"] [data-card-id^="action-debt-collector"]').first().click({ force: true });
    cy.get('[data-cy="action-play-on-player"]').click();
    cy.get('[data-cy="target-1"]').click();

    cy.get('[data-cy="pass-screen"]').should("contain.text", "Player 2");
    takeSeat();
    cy.get('[data-cy="payment-panel"]').should("contain.text", "Pay Player 1 5M");
    cy.get('[data-cy="pay-auto"]').click();

    cy.get('[data-cy="pass-screen"]').should("contain.text", "Player 1");
    takeSeat();
    cy.get('[data-cy="payment-panel"]').should("not.exist");
    cy.get('[data-cy="bank-0"]').should("have.attr", "data-count", "1");
    cy.get('[data-cy="toast"]').should("contain.text", "Player 2 paid you");
  });
});
