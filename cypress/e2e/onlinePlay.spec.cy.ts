import { beginGame } from "../../lib/gameHelpers";
import { cardData } from "../../lib/cardData";
import type { GameState } from "../../lib/types";

const isProperty = (c: { type: string }) => c.type === "property";
const canBank = (c: { type: string }) => c.type !== "property" && c.type !== "wildcard";

const seed = Array.from({ length: 2000 }, (_, i) => i + 1).find((s) => {
  const game = beginGame(2, s);
  const testCards = [...game.players[1].hand, ...game.deck.slice(2, 4)]; // draws the 2 cards before
  return testCards.some(isProperty) && testCards.some(canBank);
})!;

describe("Online play", { defaultCommandTimeout: 10000 }, () => {
  let code: string | undefined;

  afterEach(() => {
    if (code) cy.task("deleteRoom", { code });
  });

  it("shows the other players moves without a refresh", () => {
    cy.visit("/online");
    cy.get('[data-cy="online-name"]').type("Kit");
    cy.get('[data-cy="create-room"]').click();

    cy.get('[data-cy="lobby-code"]', { timeout: 20000 })
      .invoke("text")
      .then((shown) => {
        code = shown;
        cy.task("joinRoom", { code: shown, name: "Test" });
        cy.get('[data-cy="lobby-player"]').should("have.length", 2);
        cy.get('[data-cy="start-game"]').click();
        cy.get('[data-cy="game-board"]', { timeout: 20000 }).should("exist");
        cy.task("dealGame", { code: shown, seed });
        cy.task("drawCards", { code: shown, seat: 0 });
        cy.get('[data-cy="my-hand"] [data-cy="card"]').should("have.length", 7);
        cy.task("endTurn", { code: shown, seat: 0 });
        cy.get('[data-cy="opponent-1"]').should("have.attr", "data-their-turn", "true");
        cy.task("drawCards", { code: shown, seat: 1 });
        cy.get('[data-cy="opponent-1"]').should("have.attr", "data-hand-count", "7");
        cy.task<string>("bankCard", { code: shown, seat: 1 }).then((banked) => {
          const value = cardData.find((c) => c.id === banked)!.value;
          cy.get('[data-cy="opponent-1"]')
            .should("have.attr", "data-hand-count", "6")
            .and("have.attr", "data-bank-total", String(value));
        });

        cy.task<string>("placeProperty", { code: shown, seat: 1 }).then((placed) => {
          cy.get('[data-cy="opponent-1"] [data-cy="opponent-set"]').should("have.length", 1);
          cy.get('[data-cy="opponent-1"]').should("have.attr", "data-hand-count", "5");
          cy.task<GameState>("getGame", { code: shown }).then((game) => {
            const test = game.players[1];
            expect(test.properties.flatMap((set) => set.cards.map((c) => c.id))).to.deep.equal([placed]);
            expect(test.bank).to.have.length(1);
          });
        });
      });
  });
});
