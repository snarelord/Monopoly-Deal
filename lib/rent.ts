import type { Card, Colour, Player, PropertySet, RentCard } from "./types";
import { COLOURS, SETS } from "./types";

export const HOUSE_RENT = 3;
export const HOTEL_RENT = 4;

const isAnyColourWild = (card: Card) => card.type === "wildcard" && card.colours === "any";

// rent for one set: the rent table for how many cards it has (capped at a full set), plus buildings.
// a set that's only any colour wildcards (left behind after paying with the real cards) charges nothing
export function setRent(set: PropertySet): number {
  if (set.cards.every(isAnyColourWild)) return 0;
  const { size, rent } = SETS[set.colour];
  const count = Math.min(set.cards.length, size);
  return rent[count - 1] + (set.house ? HOUSE_RENT : 0) + (set.hotel ? HOTEL_RENT : 0);
}

// what a player can charge for a colour. with two sets of the same colour, the higher rent is charged
export function rentFor(player: Player, colour: Colour): number {
  const rents = player.properties.filter((s) => s.colour === colour).map(setRent);
  return Math.max(0, ...rents);
}

// every colour a rent card can charge for, and how much (0 means nothing to charge)
export function rentOptions(player: Player, card: RentCard): { colour: Colour; amount: number }[] {
  const colours = card.colours === "any" ? COLOURS : card.colours;
  return colours.map((colour) => ({ colour, amount: rentFor(player, colour) }));
}
