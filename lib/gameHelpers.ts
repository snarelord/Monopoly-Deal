import type { Card, Colour, GameState, Move, MoveResult, Player } from "./types";
import { isComplete } from "./types";
import { cardData } from "./cardData";

export const PLAYS_PER_TURN = 3;
export const HAND_LIMIT = 7;

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

export function beginGame(playerCount = 2, seed = Math.floor(Math.random() * 2 ** 32)): GameState {
  const deck = shuffleDeck(cardData, mulberry32(seed));
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
    turnNumber: 1,
    mustDiscard: false,
    seed,
  };
}

const ok = (game: GameState): MoveResult => ({ ok: true, game });
const fail = (error: string): MoveResult => ({ ok: false, error });

// the single way into the game logic: who is acting, and what they want to do
export function applyMove(game: GameState, actorId: number, move: Move): MoveResult {
  // TODO: just say no and paying debts happen on other players' turns, they'll need their own check
  if (game.players[game.currentPlayerIndex].id !== actorId) return fail("It's not your turn");

  switch (move.type) {
    case "draw":
      return drawForTurn(game);
    case "end-turn":
      return endTurn(game);
    case "bank":
      return playToBank(game, actorId, move.cardId);
    case "play":
      return playToActionPile(game, actorId, move.cardId);
    case "place-property":
      return playToProperties(game, actorId, move.cardId, move.colour);
    case "discard":
      return discardCard(game, actorId, move.cardId);
  }
}

// checks shared by every card played from the hand, returns the reason if it can't be played
function findPlayable(game: GameState, playerId: number, cardId: string) {
  const reason = getTurnStatus(game).playBlockedReason;
  if (reason) return reason;
  const player = game.players.find((p) => p.id === playerId);
  const card = player?.hand.find((c) => c.id === cardId);
  if (!player || !card) return "That card isn't in your hand";
  return { player, card };
}

const withoutCard = (cards: Card[], cardId: string) => cards.filter((c) => c.id !== cardId);

function updatePlayer(game: GameState, playerId: number, change: (p: Player) => Player): Player[] {
  return game.players.map((p) => (p.id === playerId ? change(p) : p));
}

function playToActionPile(game: GameState, playerId: number, cardId: string): MoveResult {
  const found = findPlayable(game, playerId, cardId);
  if (typeof found === "string") return fail(found);
  const { card } = found;

  return ok({
    ...game,
    players: updatePlayer(game, playerId, (p) => ({ ...p, hand: withoutCard(p.hand, cardId) })),
    discardPile: [...game.discardPile, card],
    cardsPlayed: game.cardsPlayed + 1,
  });
}

function playToBank(game: GameState, playerId: number, cardId: string): MoveResult {
  const found = findPlayable(game, playerId, cardId);
  if (typeof found === "string") return fail(found);
  const { card } = found;

  // property and wild property cards can never be banked (the menu hides it, this enforces it)
  if (card.type === "property" || card.type === "wildcard") return fail("Properties can't be banked");

  return ok({
    ...game,
    players: updatePlayer(game, playerId, (p) => ({
      ...p,
      hand: withoutCard(p.hand, cardId),
      bank: [...p.bank, card],
    })),
    cardsPlayed: game.cardsPlayed + 1,
  });
}

function playToProperties(game: GameState, playerId: number, cardId: string, colour?: Colour): MoveResult {
  const found = findPlayable(game, playerId, cardId);
  if (typeof found === "string") return fail(found);
  const { player, card } = found;

  let setColour: Colour;
  if (card.type === "property") {
    setColour = card.colour;
  } else if (card.type === "wildcard") {
    if (!colour) return fail("Choose a colour for this wildcard");
    if (card.colours !== "any" && !card.colours.includes(colour)) {
      return fail("This wildcard can't be played as that colour");
    }
    setColour = colour;
  } else {
    return fail("Only property cards go in your property pile");
  }

  const sets = [...player.properties];
  const open = sets.findIndex((s) => s.colour === setColour && !isComplete(s));

  if (open >= 0) {
    sets[open] = { ...sets[open], cards: [...sets[open].cards, card] };
  } else {
    sets.push({ colour: setColour, cards: [card], houses: 0, hotels: 0 });
  }

  return ok({
    ...game,
    players: updatePlayer(game, playerId, (p) => ({
      ...p,
      hand: withoutCard(p.hand, cardId),
      properties: sets,
    })),
    cardsPlayed: game.cardsPlayed + 1,
  });
}

export function getTurnStatus(game: GameState) {
  const player = game.players[game.currentPlayerIndex];
  const playsLeft = Math.max(0, PLAYS_PER_TURN - game.cardsPlayed);

  let playBlockedReason: string | null = null;
  if (game.isGameOver) playBlockedReason = 'The game is over!';
  else if (!game.hasDrawnCards) playBlockedReason = 'Draw your cards first';
  else if (game.mustDiscard) playBlockedReason = 'Discard down to 7 cards first';
  else if (playsLeft === 0) playBlockedReason = 'No plays left this turn';

  return {
    currentPlayerId: player.id,
    turnNumber: game.turnNumber,
    round: Math.floor((game.turnNumber -1) / game.players.length) + 1,
    playsLeft,
    canDraw: !game.hasDrawnCards && !game.isGameOver,
    playBlockedReason, // null means a card can be played right now
    canEndTurn: game.hasDrawnCards && !game.mustDiscard && !game.isGameOver,
    mustDiscard: game.mustDiscard,
    cardsToDiscard: Math.max(0, player.hand.length - HAND_LIMIT),

  }
}

export type TurnStatus = ReturnType<typeof getTurnStatus>;

function advanceTurn(game: GameState): GameState {
  return {
    ...game,
    currentPlayerIndex: (game.currentPlayerIndex + 1 ) % game.players.length,
    turnNumber: game.turnNumber + 1,
    cardsPlayed: 0,
    hasDrawnCards: false,
    mustDiscard: false,
  };
}

function drawForTurn(game: GameState): MoveResult {
  if (game.isGameOver) return fail("The game is over!");
  if (game.hasDrawnCards) return fail("You've already drawn this turn");

  const player = game.players[game.currentPlayerIndex];
  const count = player.hand.length === 0 ? 5 : 2;

  // not enough to draw: shuffle the discard pile in underneath what's left
  let { deck, discardPile } = game;
  if (deck.length < count && discardPile.length > 0) {
    // seed + turn number so each reshuffle is different but still replays the same
    deck = [...deck, ...shuffleDeck(discardPile, mulberry32(game.seed + game.turnNumber))];
    discardPile = [];
  }
  const drawn = deck.slice(0, count);

  return ok({
    ...game,
    players: updatePlayer(game, player.id, (p) => ({ ...p, hand: [...p.hand, ...drawn] })),
    deck: deck.slice(drawn.length),
    discardPile,
    hasDrawnCards: true, // set even if both piles are empty, so the turn can still continue
  });
}

function endTurn(game: GameState): MoveResult {
  if (game.isGameOver) return fail("The game is over!");
  if (!game.hasDrawnCards) return fail("Draw your cards first");
  if (game.mustDiscard) return fail("Discard down to 7 cards first");

  const player = game.players[game.currentPlayerIndex];
  if (player.hand.length > HAND_LIMIT) return ok({ ...game, mustDiscard: true });
  return ok(advanceTurn(game));
}

function discardCard(game: GameState, playerId: number, cardId: string): MoveResult {
  if (!game.mustDiscard) return fail("You only discard when you end your turn with more than 7 cards");

  const player = game.players[game.currentPlayerIndex];
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) return fail("That card isn't in your hand");

  const next: GameState = {
    ...game,
    players: updatePlayer(game, playerId, (p) => ({ ...p, hand: withoutCard(p.hand, cardId) })),
    discardPile: [...game.discardPile, card],
  };

  return ok(player.hand.length - 1 <= HAND_LIMIT ? advanceTurn(next) : next);
}
