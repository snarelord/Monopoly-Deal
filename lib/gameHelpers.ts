import type { Card, GameState } from "@/lib/types";
import { cardData } from "../lib/cardData";

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

export function endTurn() {
  return console.log('Turn ended')
}

export function playToActionPile(game: GameState, playerId: number, cardId: string): GameState {
  const player = game.players.find((p) => p.id === playerId);
  const card = player?.hand.find((c) => c.id === cardId);
  if (!player || !card) return game;

  return {
    ...game,
    players: game.players.map((p) =>
      p.id === playerId ? { ...p, hand: p.hand.filter((c) => c.id !== cardId) } : p
    ),
    actionCards: [...game.actionCards, card],
    cardsPlayed: game.cardsPlayed + 1, // the three plays limit isn't enforced yet
  };
}
