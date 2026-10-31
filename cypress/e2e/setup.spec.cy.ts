import { drawCards, takeSeat } from "../support/dealHelper";

const opponents = '[data-cy^="opponent-"]:not([data-cy="opponent-set"])';

describe("Choosing the number of players", () => {
  it("opens on the setup screen and deals for the number chosen", () => {
    cy.visit("/");
    cy.get('[data-cy="game-setup"]').should("exist");
    cy.get('[data-cy="players-4"]').click();
    cy.get('[data-cy="deal"]').click();

    cy.get('[data-cy="game-setup"]').should("not.exist");
    cy.get(opponents).should("have.length", 3);
    cy.get('[data-cy="my-hand"] [data-cy="card"]').should("have.length", 5);
  });

  it("deals straight away with ?players=", () => {
    cy.visit("/?players=3");
    cy.get('[data-cy="game-setup"]').should("not.exist");
    cy.get(opponents).should("have.length", 2);
  });

  it("keeps the last choice when dealing again", () => {
    cy.visit("/?players=3");
    cy.get('[data-cy="new-game"]').click();
    cy.get('[data-cy="players-3"]').should("have.attr", "aria-pressed", "true");
  });

  it("passes the turn round everyone before the next round", () => {
    cy.visit("/?players=3&seed=1");
    for (const next of ["1", "2", "0"]) {
      drawCards();
      cy.get('[data-cy="end-turn"]').click();
      takeSeat();
      cy.get('[data-cy="turn-info"]').should("have.attr", "data-player", next);
    }
    cy.get('[data-cy="turn-info"]').should("have.attr", "data-round", "2");
  });

  it("skips the pass screens when they're turned off, and remembers that", () => {
    cy.visit("/");
    cy.get('[data-cy="pass-screens"]').should("be.checked").uncheck();
    cy.get('[data-cy="deal"]').click();

    drawCards();
    cy.get('[data-cy="end-turn"]').click();
    cy.get('[data-cy="pass-screen"]').should("not.exist");
    cy.get('[data-cy="turn-info"]').should("have.attr", "data-player", "1");

    cy.get('[data-cy="new-game"]').click();
    cy.get('[data-cy="pass-screens"]').should("not.be.checked");
  });

  it("skips the pass screens with ?hotseat=open", () => {
    cy.visit("/?players=2&hotseat=open");
    drawCards();
    cy.get('[data-cy="end-turn"]').click();
    cy.get('[data-cy="pass-screen"]').should("not.exist");
    cy.get('[data-cy="turn-info"]').should("have.attr", "data-player", "1");
  });
});
