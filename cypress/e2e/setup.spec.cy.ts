import { drawCards, takeSeat } from "../support/dealHelper";
import { CUSTOMISE_RULES_FEATURE } from "../../lib/featureFlag";

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

  it("uses the names typed in, and the default for any left blank", () => {
    cy.visit("/");
    cy.get('[data-cy="players-3"]').click();
    cy.get('[data-cy="name-0"]').type("Alex");
    cy.get('[data-cy="name-1"]').type("  Sam  ");
    cy.get('[data-cy="deal"]').click();

    cy.get('[data-cy="turn-info"]').should("contain.text", "Alex's turn");
    cy.get('[data-cy="opponent-1"]').should("contain.text", "Sam");
    cy.get('[data-cy="opponent-2"]').should("contain.text", "Player 3");

    cy.get('[data-cy="new-game"]').click();
    cy.get('[data-cy="name-0"]').should("have.value", "Alex");
    cy.get('[data-cy="name-1"]').should("have.value", "Sam");
    cy.get('[data-cy="name-2"]').should("have.value", "");
  });

  it("keeps typed names when the player count changes", () => {
    cy.visit("/");
    cy.get('[data-cy="players-3"]').click();
    cy.get('[data-cy="name-2"]').type("Jo");
    cy.get('[data-cy="players-2"]').click();
    cy.get('[data-cy="name-2"]').should("not.exist");
    cy.get('[data-cy="players-3"]').click();
    cy.get('[data-cy="name-2"]').should("have.value", "Jo");
  });

  it("won't deal when two players have the same name", () => {
    cy.visit("/");
    cy.get('[data-cy="name-0"]').type("Alex");
    cy.get('[data-cy="name-1"]').type("alex");
    cy.get('[data-cy="same-name"]').should("exist");
    cy.get('[data-cy="deal"]').should("be.disabled");

    cy.get('[data-cy="name-1"]').clear();
    cy.get('[data-cy="deal"]').should("not.be.disabled");
  });

  it("skips the pass screens with ?hotseat=open", () => {
    cy.visit("/?players=2&hotseat=open");
    drawCards();
    cy.get('[data-cy="end-turn"]').click();
    cy.get('[data-cy="pass-screen"]').should("not.exist");
    cy.get('[data-cy="turn-info"]').should("have.attr", "data-player", "1");
  });
});

describe("House rules", () => {
  it("lists the options, greyed out until the feature is turned on", () => {
    cy.visit("/");
    cy.get('[data-cy="house-rules"] summary').click();
    cy.get('[data-cy="rule-win-three-sets"]').should("be.checked");
    cy.get('[data-cy="house-rules"] input').should("have.length", 13);
    if (CUSTOMISE_RULES_FEATURE) {
      cy.get('[data-cy="rule-no-mercy"]').should("be.enabled");
      cy.get('[data-cy="rule-keep-duplicates"]').should("be.disabled"); // until the deck is doubled
      cy.get('[data-cy="rule-double-deck"]').check();
      cy.get('[data-cy="rule-keep-duplicates"]').should("be.enabled");
    } else {
      cy.get('[data-cy="house-rules"] input').each((input) => cy.wrap(input).should("be.disabled"));
    }
  });
});
