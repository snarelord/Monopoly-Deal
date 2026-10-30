import { cardData } from "../../lib/cardData";
import type { Card } from "../../lib/types";

const tally = (cards: Card[], key: (c: Card) => string) =>
  cards.reduce<Record<string, number>>((acc, c) => {
    const k = key(c);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

const ofType = (t: Card["type"]) => cardData.filter((c) => c.type === t);

const pair = (c: Card) =>
  "colours" in c ? (c.colours === "any" ? "any" : [...c.colours].sort().join("/")) : "";

describe("cardData", () => {
  it("has 106 cards with unique ids", () => {
    expect(cardData).to.have.length(106);
    expect(new Set(cardData.map((c) => c.id)).size).to.equal(106);
  });

  it("has the right number of each card type", () => {
    expect(tally(cardData, (c) => c.type)).to.deep.equal({
      money: 20, property: 28, wildcard: 11, rent: 13, action: 34,
    });
  });

  it("has the right number of each action", () => {
    expect(tally(ofType("action"), (c) => (c as any).action)).to.deep.equal({
      "pass-go": 10, "debt-collector": 3, birthday: 3, "sly-deal": 3,
      "forced-deal": 3, "just-say-no": 3, house: 3, "deal-breaker": 2,
      "double-the-rent": 2, hotel: 2,
    });
  });

  it("has the right money denominations", () => {
    expect(tally(ofType("money"), (c) => String(c.value))).to.deep.equal({
      "1": 6, "2": 5, "3": 3, "4": 3, "5": 2, "10": 1,
    });
  });

  it("has the right properties per colour", () => {
    expect(tally(ofType("property"), (c) => (c as any).colour)).to.deep.equal({
      brown: 2, lightBlue: 3, pink: 3, orange: 3, red: 3,
      yellow: 3, green: 3, darkBlue: 2, railroad: 4, utility: 2,
    });
  });

  it("has the right wildcards", () => {
    expect(tally(ofType("wildcard"), pair)).to.deep.equal({
      any: 2, "orange/pink": 2, "red/yellow": 2, "darkBlue/green": 1,
      "green/railroad": 1, "lightBlue/railroad": 1, "railroad/utility": 1,
      "brown/lightBlue": 1,
    });
  });

  it("has the right rent cards", () => {
    expect(tally(ofType("rent"), pair)).to.deep.equal({
      any: 3, "brown/lightBlue": 2, "orange/pink": 2, "red/yellow": 2,
      "darkBlue/green": 2, "railroad/utility": 2,
    });
  });
});