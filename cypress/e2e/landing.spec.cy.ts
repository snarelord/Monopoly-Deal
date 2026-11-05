describe("Landing page", () => {
  beforeEach(() => cy.visit("/"));

  const links = [
    ["play-now", "/online"],
    ["play-local", "/local"],
    ["rules-link", "/rules"],
    ["about-link", "/about"],
  ];

  links.forEach(([link, href]) => {
    it(`links ${link} to ${href}`, () => {
      cy.get(`[data-cy="${link}"]`).should("have.attr", "href", href);
    });
  });

  it("opens game setup from play local", () => {
    cy.get('[data-cy="play-local"]').click();
    cy.get('[data-cy="game-setup"]').should("exist");
  });
});
