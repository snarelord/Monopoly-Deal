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
  no change is given, so it looks for the smallest total that covers the amount,
  then keeps as many properties as it can (they win the game), then uses the fewest cards.
  if everything together doesn't cover it, the player pays everything they have
*/
export function autoPay(player: Player, amount: number): string[] {
  const cards = payableCards(player);
  if (cardsTotal(cards) <= amount) return cards.map((c) => c.id);

  // best way found so far to make each exact total: fewest properties, then fewest cards
  type Pick = { ids: string[]; properties: number };
  const better = (a: Pick, b: Pick | undefined) =>
    !b || a.properties < b.properties || (a.properties === b.properties && a.ids.length < b.ids.length);

  let best = new Map<number, Pick>([[0, { ids: [], properties: 0 }]]);
  for (const card of cards) {
    const next = new Map(best);
    for (const [total, pick] of best) {
      const candidate = { ids: [...pick.ids, card.id], properties: pick.properties + (isProperty(card) ? 1 : 0) };
      const t = total + card.value;
      if (better(candidate, next.get(t))) next.set(t, candidate);
    }
    best = next;
  }

  const covering = [...best.keys()].filter((t) => t >= amount).sort((a, b) => a - b);
  return best.get(covering[0])!.ids;
}
