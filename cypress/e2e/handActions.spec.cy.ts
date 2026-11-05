import { cardData } from "../../lib/cardData";

const byId = Object.fromEntries(cardData.map((c) => [c.id, c]));

describe("Card actions", () => {
  beforeEach(() => cy.visit("/local?players=2"));

  it("shows no menu until a card is selected", () => {
    cy.get('[data-cy="card-actions"]').should("not.exist");
  });

  it("opens one menu for the clicked card and closes it on Escape", () => {
    cy.get('[data-cy="my-hand"] [data-cy="card"]').first().click({ force: true });
    cy.get('[data-cy="card-actions"]').should("have.length", 1);
    cy.get("body").type("{esc}");
    cy.get('[data-cy="card-actions"]').should("not.exist");
  });

  it("offers options that suit each card type", () => {
    cy.get('[data-cy="my-hand"] [data-cy="card"]').each(($img) => {
      const card = byId[$img.attr("data-card-id")!];
      cy.wrap($img).click({ force: true });

      cy.get('[data-cy="card-actions"]').should(($menu) => {
        const has = (id: string) => $menu.find(`[data-cy="action-${id}"]`).length > 0;

        if (card.type === "property" || card.type === "wildcard") {
          expect(has("bank"), `${card.name} must not be bankable`).to.be.false;
          expect(has("place-property"), `${card.name} goes to properties`).to.be.true;
        } else {
          expect(has("bank"), `${card.name} can be banked`).to.be.true;
        }
      });
    });
  });

  it("closes the menu with the close button", () => {
    cy.get('[data-cy="my-hand"] [data-cy="card"]').first().click({ force: true });
    cy.get('[data-cy="card-actions"]').should("exist");
    cy.get('[data-cy="card-actions-close"]').click();
    cy.get('[data-cy="card-actions"]').should("not.exist");
  });

});