import type { Card, Player } from "./types";

// everything a player could hand over: their bank and the properties in front of them, never their hand.
// cards worth nothing (the any colour wildcards) can't be used to pay
export function payableCards(player: Player): Card[] {
  const properties = player.properties.flatMap((set) => set.cards);
  return [...player.bank, ...properties].filter((card) => card.value > 0);
}
// TODO: houses and hotels count as payment too, once they're cards on a set rather than counts

export const cardsTotal = (cards: Card[]) => cards.reduce((sum, card) => sum + card.value, 0);

const isProperty = (card: Card) => card.type === "property" || card.type === "wildcard";

/*
  the "pay automatically" shortcut: picks the cards to pay `amount` with.
  properties win the game, so they're only handed over when the bank cant cover the debt:
  - bank covers it: pay from the bank alone, overpaying as little as possible
  - bank doesn't: hand over the whole bank, then as few properties as needed for the rest
  if everything together doesn't cover it, the player pays everything they have
*/
export function autoPay(player: Player, amount: number): string[] {
  const payable = payableCards(player);
  const money = payable.filter((c) => !isProperty(c));
  const properties = payable.filter(isProperty);

  if (cardsTotal(money) >= amount) return cheapestCover(money, amount);
  return [...money.map((c) => c.id), ...cheapestCover(properties, amount - cardsTotal(money))];
}

// the cards whose total covers `amount` with the least overpaid, then the fewest cards.
// all of them if even that isn't enough
function cheapestCover(cards: Card[], amount: number): string[] {
  if (cardsTotal(cards) <= amount) return cards.map((c) => c.id);

  // fewest cards found so far to make each exact total
  let best = new Map<number, string[]>([[0, []]]);
  for (const card of cards) {
    const next = new Map(best);
    for (const [total, ids] of best) {
      const t = total + card.value;
      if (!next.has(t) || ids.length + 1 < next.get(t)!.length) next.set(t, [...ids, card.id]);
    }
    best = next;
  }

  const covering = [...best.keys()].filter((t) => t >= amount).sort((a, b) => a - b);
  return best.get(covering[0])!;
}
