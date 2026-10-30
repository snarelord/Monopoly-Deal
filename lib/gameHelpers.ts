import type { Card } from "@/lib/types";
import { cardData } from "@/lib/cardData";

export function shuffleDeck(cards: Card[]): Card[] {
  const deck = [...cards]; // copy, so cardData itself is never reordered
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function beginGame() {
  const deck = shuffleDeck(cardData);
  return {
    hand: deck.slice(0, 5), // first five cards
    deck: deck.slice(5),    // the rest is the draw pile
  };
}