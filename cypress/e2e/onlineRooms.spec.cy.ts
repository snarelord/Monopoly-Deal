import type { Room } from "../plugins/roomPlugins";

describe("Online rooms", () => {
  let code: string | undefined;

  // if a test fails halfway, don't leave its room behind
  afterEach(() => {
    if (code) cy.task("deleteRoom", { code });
  });

  it("saves a new room under the host, and deletes it when they close it", () => {
    cy.visit("/online");
    cy.get('[data-cy="online-name"]').type("Kit");
    cy.get('[data-cy="create-room"]').click();

    // the first visit to a room page can take a while to compile in dev
    cy.get('[data-cy="lobby-code"]', { timeout: 20000 })
      .invoke("text")
      .then((shown) => {
        code = shown;
        cy.location("pathname").should("eq", `/room/${shown}`);

        cy.task<Room>("getRoom", { code: shown }).then((room) => {
          expect(room?.code).to.equal(shown);
          expect(room?.status).to.equal("lobby");
          // the host is the only player so far, in seat 0 under the name typed in
          expect(room?.room_players).to.deep.equal([{ user_id: room?.host_id, seat: 0, display_name: "Kit" }]);
        });
        // and the page agrees that's who's signed in
        cy.get('[data-cy="lobby-player"]').should("have.length", 1).and("contain.text", "Kit (you)").and("contain.text", "host");

        cy.get('[data-cy="leave-room"]').click();
        cy.location("pathname").should("eq", "/online");
        cy.task("getRoom", { code: shown }).should("equal", null);
      });
  });
});
