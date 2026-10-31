import { drawCards, findSeed } from "../support/dealHelper";

const isMoney = (c: { type: string }) => c.type === "money";
const seed = findSeed((hand: any) => hand.filter(isMoney).length >= 3);

const info = '[data-cy="turn-info"]';
const endTurn = () => cy.get('[data-cy="end-turn"]').click();
const bankFirstCard = () => {
  cy.get('[data-cy="my-hand"] [data-cy="card"]').first().click({ force: true });
  cy.get('[data-cy="action-bank"]').click();
};

describe("Turns", () => {
  beforeEach(() => cy.visit(`/?seed=${seed}`));

  it("starts on round 1, turn 1 with three plays", () => {
    cy.get(info).should("have.attr", "data-round", "1")
      .and("have.attr", "data-turn", "1")
      .and("have.attr", "data-player", "0")
      .and("have.attr", "data-plays-left", "3");
  });

  it("makes me draw before I can play or end my turn", () => {
    cy.get('[data-cy="end-turn"]').should("be.disabled");
    cy.get('[data-cy="my-hand"] [data-cy="card"]').first().click({ force: true });
    cy.get('[data-cy="card-actions"] button[data-cy^="action-"]:not([data-cy="action-discard"])')
      .each(($button) => expect($button).to.be.disabled);
  });

  it("only lets me draw once a turn", () => {
    drawCards();
    cy.get('[data-cy="draw-pile"]').should("be.disabled");
    cy.get('[data-cy="draw-pile"]').should("have.attr", "data-count", "94");
  });

  it("counts plays and blocks a fourth (using money cards)", () => {
    drawCards();
    cy.get('[data-card-id="money-5m-1"]').click()
    cy.get('[data-cy="action-bank"]').click();
    cy.get('[data-card-id="money-1m-6"]').click()
    cy.get('[data-cy="action-bank"]').click();
    cy.get('[data-card-id="money-10m-1"]').click()
    cy.get('[data-cy="action-bank"]').click();
    cy.get(info).should("have.attr", "data-plays-left");

    cy.get('[data-cy="my-hand"] [data-cy="card"]').first().click({ force: true });
    cy.get('[data-cy="card-actions"] button[data-cy^="action-"]:not([data-cy="action-discard"])')
      .each(($button) => expect($button).to.be.disabled);
  });

  // it("passes the turn, then counts the round after everyone has played", () => {
  //   drawCards();
  //   endTurn();
  //   cy.get(info).should("have.attr", "data-player", "1")
  //     .and("have.attr", "data-turn", "2")
  //     .and("have.attr", "data-round", "1")
  //     .and("have.attr", "data-plays-left", "3");

  //   drawCards();
  //   endTurn();
  //   cy.get(info).should("have.attr", "data-player", "0")
  //     .and("have.attr", "data-turn", "3")
  //     .and("have.attr", "data-round", "2");
  // });

  // it("makes me discard down to 7 before the turn passes", () => {
  //   drawCards(); endTurn();   // player 1: 5 + 2 = 7 cards
  //   drawCards(); endTurn();   // player 2: 7 cards
  //   drawCards();              // player 1 again: 9 cards
  //   endTurn();

  //   cy.get('[data-cy="discard-prompt"]').should("contain.text", "Discard 2 cards");
  //   cy.get('[data-cy="end-turn"]').should("be.disabled");

  //   cy.get('[data-cy="my-hand"] [data-cy="card"]').first().click({ force: true });
  //   cy.get('[data-cy="action-discard"]').click();
  //   cy.get('[data-cy="discard-prompt"]').should("contain.text", "Discard 1 card");

  //   cy.get('[data-cy="my-hand"] [data-cy="card"]').first().click({ force: true });
  //   cy.get('[data-cy="action-discard"]').click();

  //   cy.get(info).should("have.attr", "data-player", "1").and("have.attr", "data-turn", "4");
  // });
});