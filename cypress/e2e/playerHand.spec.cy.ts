describe("Player hand", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("starts with five cards", () => {
    cy.get('[data-cy="my-hand"] [data-cy="card"]').should("have.length", 5);
  });

  it("draws two cards when clicking the draw pile", () => {
    cy.get('[data-cy="my-hand"] [data-cy="card"]').should("have.length", 5);
    cy.get('[data-cy="draw-pile"]').click();
    cy.get('[data-cy="my-hand"] [data-cy="card"]').should("have.length", 7);
  });

  it("reduces the draw pile count by two", () => {
    cy.get('[data-cy="draw-pile-count"]')
      .invoke("text")
      .then((initialCount) => {
        const initial = Number(initialCount);
        cy.get('[data-cy="draw-pile"]').click();
        cy.get('[data-cy="draw-pile-count"]').should(
          "have.text",
          String(initial - 2),
        );
      });
  });

  it("prevents drawing more than once per turn", () => {
    cy.get('[data-cy="draw-pile"]').click();
    cy.get('[data-cy="my-hand"] [data-cy="card"]').should("have.length", 7);
    cy.get('[data-cy="draw-pile"]').should("be.disabled");
    cy.get('[data-cy="my-hand"] [data-cy="card"]').should("have.length", 7);
  });
});
