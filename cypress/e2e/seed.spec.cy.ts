import { dealtHand } from "../support/dealHelper";

describe("Seeded deal", () => {
  it("deals exactly the hand the seed predicts", () => {
    const expected = dealtHand(5).map((c) => c.id);
    cy.visit("/?seed=5");

    cy.get('[data-cy="my-hand"] [data-cy="card"]').should(($cards) => {
      const dealt = $cards.toArray().map((el) => el.getAttribute("data-card-id"));
      expect(dealt).to.deep.equal(expected);
    });
  });

  it("deals a different hand for a different seed", () => {
    cy.visit("/?seed=5");
    cy.get('[data-cy="my-hand"] [data-card-id]').first().invoke("attr", "data-card-id").then((a) => {
      cy.visit("/?seed=6");
      cy.get('[data-cy="my-hand"] [data-card-id]').first().invoke("attr", "data-card-id").should("not.eq", a);
    });
  });
});