import { cardData } from "../../lib/cardData";

const cardNames = cardData.map((c) => c.name);

describe("Game board", () => {
  beforeEach(() => cy.visit("/?players=2"));

  it("deals me five cards", () => {
    cy.get('[data-cy="my-hand"] [data-cy="card"]').should("have.length", 5);
  });

  it("gives every card an image with a valid alt tag", () => {
    cy.get('[data-cy="my-hand"] img').each(($img) => {
      const alt = $img.attr("alt");
      expect(alt, "alt text").to.be.a("string").and.not.be.empty;
      expect(cardNames, "known card name").to.include(alt);

      cy.wrap($img).should(($i) => {
        const img = $i[0] as HTMLImageElement;
        expect(img.complete && img.naturalWidth, `${alt} image loaded`).to.be.greaterThan(0);
      });
    });
  });

});