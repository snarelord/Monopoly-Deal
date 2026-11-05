describe("Opponent panel", () => {
  beforeEach(() => cy.visit("/local?players=3&hotseat=open"));

  it("shows a player's cards when tapped, then closes", () => {
    cy.get('[data-cy="opponent-1"] [data-cy="view-cards"]').click();
    cy.get('[data-cy="player-cards"]').should("contain.text", "Player 2's cards");
    cy.get('[data-cy="player-cards-close"]').click();
    cy.get('[data-cy="player-cards"]').should("not.exist");
  });
});
