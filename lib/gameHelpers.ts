import type { Card, GameState } from "@/lib/types";
import { cardData } from "@/lib/cardData";

export function shuffleDeck(cards: Card[]): Card[] {
  const deck = [...cards]; // copy, so cardData itself is never reordered
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function beginGame(playerCount = 2): GameState {
  const deck = shuffleDeck(cardData);
  const players = Array.from({ length: playerCount }, (_, i) => ({
    id: i,
    hand: deck.splice(0, 5), // removes 5 from the deck and returns them
    bank: [],
    properties: [],
  }));
  return {
    players,
    deck,
    discardPile: [],
    currentPlayerIndex: 0,
    cardsPlayed: 0,
    isGameOver: false,
    winner: null,
    actionInProgress: null,
    hasDrawnCards: false,
    actionCards: [],
  };
}
