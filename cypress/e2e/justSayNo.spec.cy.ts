import { applyMove, beginGame, waitingOn } from "../../lib/gameHelpers";
import { cardData } from "../../lib/cardData";
import type { Card, GameState, Move, PropertySet } from "../../lib/types";
import { drawCards, takeSeat } from "../support/dealHelper";

const card = (id: string) => cardData.find((c) => c.id === id)!;
const debtCollector = card("action-debt-collector-1");
const birthday = card("action-birthday-1");
const brownRent = card("action-rent-brown-light-blue-1");
const doubleRent = card("double-the-rent-1");
const [no1, no2, no3] = ["action-just-say-no-1", "action-just-say-no-2", "action-just-say-no-3"].map(card);
const browns: PropertySet = {
  colour: "brown",
  cards: [card("property-old-kent-road"), card("property-whitechapel-road")] as PropertySet["cards"],
  house: null,
  hotel: null,
};

//   player 0 has drawn, holds `attacker` cards and owns a full brown set.
//   every other player has a 5M note in the bank and holds `defender` cards (3 players when asked for)
const setup = (attacker: Card[], defender: Card[], playerCount = 2): GameState => {
  const game = beginGame(playerCount, 1);
  return {
    ...game,
    hasDrawnCards: true,
    players: game.players.map((p) =>
      p.id === 0
        ? { ...p, hand: attacker, properties: [browns] }
        : { ...p, hand: p.id === 1 ? defender : [], bank: [card(`money-5m-${p.id}`)] },
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
const status = (game: GameState, playerId = 1) => game.pending?.debts.find((d) => d.playerId === playerId)?.status;

describe("Just Say No", () => {
  it("gives a player holding one the chance to say no first", () => {
    const after = collect(setup([debtCollector], [no1]));
    expect(status(after)).to.equal("responding");
    expect(waitingOn(after)).to.deep.equal([1]);
  });

  it("skips straight to paying when they're not holding one", () => {
    expect(status(collect(setup([debtCollector], [])))).to.equal("paying");
  });

  it("goes on to paying when they accept", () => {
    const after = act(collect(setup([debtCollector], [no1])), 1, { type: "accept" });
    expect(status(after)).to.equal("paying");
    expect(after.players[1].hand.map((c) => c.id)).to.deep.equal([no1.id]); // kept it
  });

  it("cancels the action when they say no", () => {
    const after = act(collect(setup([debtCollector], [no1])), 1, { type: "just-say-no", cardId: no1.id });

    expect(after.pending).to.equal(null);
    expect(waitingOn(after)).to.deep.equal([0]);
    expect(after.players[0].bank).to.have.length(0); // nothing paid
    expect(after.players[1].bank).to.have.length(1);
    expect(after.players[1].hand).to.have.length(0);
    expect(after.discardPile.map((c) => c.id)).to.deep.equal([debtCollector.id, no1.id]);
    expect(after.cardsPlayed).to.equal(1); // saying no on someone else's turn is free
  });

  it("only takes a Just Say No from your hand", () => {
    const owed = collect(setup([debtCollector], [no1]));
    expect(attempt(owed, 1, { type: "just-say-no", cardId: no2.id }).ok).to.equal(false);
  });

  it("lets the player who played the action say no back", () => {
    const saidNo = act(collect(setup([debtCollector, no2], [no1])), 1, { type: "just-say-no", cardId: no1.id });
    expect(status(saidNo)).to.equal("countering");
    expect(waitingOn(saidNo)).to.deep.equal([0]);

    const saidNoBack = act(saidNo, 0, { type: "just-say-no", cardId: no2.id });
    expect(status(saidNoBack)).to.equal("paying"); // two no's: it's back on
    expect(saidNoBack.cardsPlayed).to.equal(2); // on your own turn it uses a play
  });

  it("cancels it when the player who played the action lets the no stand", () => {
    const saidNo = act(collect(setup([debtCollector, no2], [no1])), 1, { type: "just-say-no", cardId: no1.id });
    const after = act(saidNo, 0, { type: "accept" });
    expect(after.pending).to.equal(null);
    expect(after.players[0].hand.map((c) => c.id)).to.deep.equal([no2.id]); // kept it
  });

  it("goes back and forth until someone runs out", () => {
    let game = collect(setup([debtCollector, no3], [no1, no2]));
    game = act(game, 1, { type: "just-say-no", cardId: no1.id }); // 1 no: cancelled...
    game = act(game, 0, { type: "just-say-no", cardId: no3.id }); // 2: back on...
    expect(status(game)).to.equal("responding");
    game = act(game, 1, { type: "just-say-no", cardId: no2.id }); // 3: cancelled, and player 0 has none left

    expect(game.pending).to.equal(null);
    expect(game.players[0].bank).to.have.length(0);
  });

  it("can't say no back without a play left", () => {
    const game = { ...setup([debtCollector, no2], [no1]), cardsPlayed: 2 }; // the debt collector is the 3rd play
    const after = act(collect(game), 1, { type: "just-say-no", cardId: no1.id });
    expect(after.pending).to.equal(null); // not asked, cancelled straight away
  });

  it("only gets the player who says no out of a birthday", () => {
    let game = act(setup([birthday], [no1], 3), 0, { type: "play", cardId: birthday.id });
    expect(status(game, 1)).to.equal("responding");
    expect(status(game, 2)).to.equal("paying");

    game = act(game, 1, { type: "just-say-no", cardId: no1.id });
    expect(status(game, 1)).to.equal("done");
    expect(waitingOn(game)).to.deep.equal([2]);

    game = act(game, 2, { type: "pay", cardIds: ["money-5m-2"] });
    expect(game.pending).to.equal(null);
    expect(game.players[0].bank.map((c) => c.id)).to.deep.equal(["money-5m-2"]);
  });

  it("cancels doubled rent along with the rent", () => {
    let game = act(setup([brownRent, doubleRent], [no1]), 0, {
      type: "rent", cardId: brownRent.id, colour: "brown", doubleRentIds: [doubleRent.id],
    });
    game = act(game, 1, { type: "just-say-no", cardId: no1.id });

    expect(game.pending).to.equal(null);
    expect(game.discardPile.map((c) => c.id)).to.deep.equal([brownRent.id, doubleRent.id, no1.id]);
    expect(game.cardsPlayed).to.equal(2);
  });

  it("can't be used when nothing is aimed at you", () => {
    expect(attempt(setup([no1], []), 0, { type: "just-say-no", cardId: no1.id }).ok).to.equal(false);
  });
});

describe("Just Say No in the game", () => {
  const isSayNo = (c: Card) => c.type === "action" && c.action === "just-say-no";

  // player 1 opens with a debt collector and never holds a just say no (so can't say no back),
  // player 2 gets a money card and a just say no by their first draw
  const seed = Array.from({ length: 20000 }, (_, i) => i + 1).find((s) => {
    const game = beginGame(2, s);
    const p1Cards = [...game.players[0].hand, ...game.deck.slice(0, 2), ...game.deck.slice(4, 6)];
    const p2Cards = [...game.players[1].hand, ...game.deck.slice(2, 4)];
    return game.players[0].hand.some((c) => c.id.startsWith("action-debt-collector"))
      && !p1Cards.some(isSayNo)
      && p2Cards.some((c) => c.type === "money")
      && p2Cards.some(isSayNo);
  });

  it("cancels a debt collector and hands back to the player whose turn it is", () => {
    cy.visit(`/?seed=${seed}`);
    drawCards();
    cy.get('[data-cy="end-turn"]').click();
    takeSeat();

    // player 2 banks some money so they have something to pay with
    drawCards();
    cy.get('[data-cy="my-hand"] [data-card-id^="money-"]').first().click({ force: true });
    cy.get('[data-cy="action-bank"]').click();
    cy.get('[data-cy="end-turn"]').click();
    takeSeat();

    drawCards();
    cy.get('[data-cy="my-hand"] [data-card-id^="action-debt-collector"]').first().click({ force: true });
    cy.get('[data-cy="action-play-on-player"]').click();
    cy.get('[data-cy="target-1"]').click();

    takeSeat();
    cy.get('[data-cy="response-panel"]').should("have.attr", "data-status", "responding");
    cy.get('[data-cy="respond-say-no"]').click();

    // player 1 has nothing to say no back with, so it's cancelled and their turn carries on
    cy.get('[data-cy="pass-screen"]').should("contain.text", "Player 1");
    takeSeat();
    cy.get('[data-cy="response-panel"]').should("not.exist");
    cy.get('[data-cy="owing"]').should("not.exist");
    cy.get('[data-cy="bank-0"]').should("have.attr", "data-count", "0");
    cy.get('[data-cy="action-pile-count"]').should("have.text", "2");
    cy.get('[data-cy="toast"]').should("contain.text", "Your Debt Collector was cancelled for Player 2");
  });
});
