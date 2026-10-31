import type { Card, GameState } from "../lib/types";
import { isComplete } from "./types";
import { cardData } from "../lib/cardData";

// Small deterministic random generator (mulberry32): same seed, same sequence
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleDeck(cards: Card[], random: () => number = Math.random): Card[] {
  const deck = [...cards];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function beginGame(playerCount = 2, seed?: number): GameState {
  const random = seed === undefined ? Math.random : mulberry32(seed);
  const deck = shuffleDeck(cardData, random);
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

export function playToBank(game: GameState, playerId: number, cardId: string): GameState {
  const player = game.players.find((p) => p.id === playerId);
  const card = player?.hand.find((c) => c.id === cardId);
  if (!player || !card) return game;

  // property and wild property cards can never be banked (the menu hides it, this enforces it)
  if (card.type === "property" || card.type === "wildcard") return game;

  return {
    ...game,
    players: game.players.map((p) =>
      p.id === playerId
        ? { ...p, hand: p.hand.filter((c) => c.id !== cardId), bank: [...p.bank, card] }
        : p
    ),
    cardsPlayed: game.cardsPlayed + 1,
  };
}

export function playToProperties(game: GameState, playerId: number, cardId: string): GameState {
  const player = game.players.find((p) => p.id === playerId);
  const card = player?.hand.find((c) => c.id === cardId);
  if (!player || !card) return game;

  // TODO: wild cards need a colour chosen first, which isn't built yet
  if (card.type !== "property") return game;

  const sets = [...player.properties];
  const open = sets.findIndex((s) => s.colour === card.colour && !isComplete(s));

  if (open >= 0) {
    sets[open] = { ...sets[open], cards: [...sets[open].cards, card] };
  } else {
    sets.push({ colour: card.colour, cards: [card], houses: 0, hotels: 0 });
  }

  return {
    ...game,
    players: game.players.map((p) =>
      p.id === playerId
        ? { ...p, hand: p.hand.filter((c) => c.id !== cardId), properties: sets }
        : p
    ),
    cardsPlayed: game.cardsPlayed + 1,
  };
}