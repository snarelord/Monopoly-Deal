import type { Card, Colour, Debt, GameState, Move, MoveResult, PendingAction, Player, PropertySet } from "./types";
import { COLOURS, completeColours, isComplete, openSetColours } from "./types";
import { cardData } from "./cardData";
import { cardsTotal, payableCards } from "./payment";
import { rentFor } from "./rent";

export const PLAYS_PER_TURN = 3;
export const SETS_TO_WIN = 3;
export const HAND_LIMIT = 7;
export const DEBT_COLLECTOR_AMOUNT = 5;
export const BIRTHDAY_AMOUNT = 2;

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
    winnerId: null,
    pending: null,
    hasDrawnCards: false,
    turnNumber: 1,
    mustDiscard: false,
    seed,
  };
}

function checkForWinner(game: GameState): GameState {
  const winner = game.players.find((p) => completeColours(p).length >= SETS_TO_WIN);
  if (!winner) return game;
  return { ...game, isGameOver: true, winnerId: winner.id, pending: null };
}

const ok = (game: GameState): MoveResult => ({ ok: true, game });
const fail = (error: string): MoveResult => ({ ok: false, error });

export function waitingOn(game: GameState): number[] {
  if (game.pending) {
    const { debts, fromPlayerId } = game.pending;
    const ids = debts.flatMap((d) =>
      d.status === "done" ? [] : d.status === "countering" ? [fromPlayerId] : [d.playerId],
    );
    return [...new Set(ids)];
  }
  return [game.players[game.currentPlayerIndex].id];
}

export function applyMove(game: GameState, actorId: number, move: Move): MoveResult {
  if (game.isGameOver) return fail("The game is over!");
  const result = runMove(game, actorId, move);
  if (!result.ok) return result;
  return ok(checkForWinner(result.game));
}

// works out what a move does, applyMove wraps this
function runMove(game: GameState, actorId: number, move: Move): MoveResult {
  if (!waitingOn(game).includes(actorId)) {
    return fail(game.pending ? "Waiting for other players to pay" : "It's not your turn");
  }

  // while something is pending, the only thing to do is respond to it
  if (game.pending) {
    if (move.type === "pay") return payDebt(game, actorId, move.cardIds);
    if (move.type === "just-say-no" || move.type === "accept") return respond(game, actorId, move);
    return fail("Deal with the action in front of you first");
  }

  switch (move.type) {
    case "draw":
      return drawForTurn(game);
    case "end-turn":
      return endTurn(game);
    case "bank":
      return playToBank(game, actorId, move.cardId);
    case "play":
      return playToActionPile(game, actorId, move.cardId, move.targetId);
    case "place-property":
      return playToProperties(game, actorId, move.cardId, move.colour);
    case "discard":
      return discardCard(game, actorId, move.cardId);
    case "rent":
      return chargeRent(game, actorId, move.cardId, move.colour, move.targetId, move.doubleRentIds ?? []);
    case "pay":
      return fail("There's nothing to pay");
    case "just-say-no":
    case "accept":
      return fail("There's nothing to respond to");
  }
}

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

function playToActionPile(game: GameState, playerId: number, cardId: string, targetId?: number): MoveResult {
  const found = findPlayable(game, playerId, cardId);
  if (typeof found === "string") return fail(found);
  const { card } = found;

  if (card.type === "rent") return fail("Charge rent from the rent card's menu");
  if (card.type === "action" && card.action === "double-the-rent") {
    return fail("Double the Rent is played with a rent card");
  }

  const isDebtCollector = card.type === "action" && card.action === "debt-collector";
  if (isDebtCollector) {
    const problem = targetProblem(game, playerId, targetId);
    if (problem) return fail(problem);
  }

  const played: GameState = {
    ...game,
    players: updatePlayer(game, playerId, (p) => ({ ...p, hand: withoutCard(p.hand, cardId) })),
    discardPile: [...game.discardPile, card],
    cardsPlayed: game.cardsPlayed + 1,
  };

  // what the card does once it's played, the rest of the actions slot in here as they're built
  if (card.type === "action" && card.action === "pass-go") return ok(drawCards(played, playerId, 2));
  if (isDebtCollector) {
    return ok(startPayment(played, card, playerId, [{ playerId: targetId!, amount: DEBT_COLLECTOR_AMOUNT }]));
  }
  if (card.type === "action" && card.action === "birthday") {
    const owed = game.players
      .filter((p) => p.id !== playerId)
      .map((p) => ({ playerId: p.id, amount: BIRTHDAY_AMOUNT }));
    return ok(startPayment(played, card, playerId, owed));
  }
  return ok(played);
}

// why targetId isn't a player you can aim a card at, or null if it's fine
function targetProblem(game: GameState, playerId: number, targetId: number | undefined): string | null {
  if (targetId === undefined) return "Choose a player";
  if (targetId === playerId || !game.players.some((p) => p.id === targetId)) return "Choose another player";
  return null;
}

function chargeRent(
  game: GameState,
  playerId: number,
  cardId: string,
  colour: Colour,
  targetId: number | undefined,
  doubleRentIds: string[],
): MoveResult {
  const found = findPlayable(game, playerId, cardId);
  if (typeof found === "string") return fail(found);
  const { player, card } = found;

  if (card.type !== "rent") return fail("That isn't a rent card");
  const colours = card.colours === "any" ? COLOURS : card.colours;
  if (!colours.includes(colour)) return fail("This rent card can't charge for that colour");

  const rent = rentFor(player, colour);
  if (rent === 0) return fail("You don't have any properties of that colour to charge rent on");

  if (new Set(doubleRentIds).size !== doubleRentIds.length) return fail("You picked the same card twice");
  const doubles = doubleRentIds.map((id) => player.hand.find((c) => c.id === id));
  if (doubles.some((c) => c?.type !== "action" || c.action !== "double-the-rent")) {
    return fail("Double the Rent cards have to come from your hand");
  }
  if (1 + doubles.length > PLAYS_PER_TURN - game.cardsPlayed) {
    return fail("Not enough plays left to double the rent");
  }

  let debtorIds: number[];
  if (card.colours === "any") {
    const problem = targetProblem(game, playerId, targetId);
    if (problem) return fail(problem);
    debtorIds = [targetId!];
  } else {
    debtorIds = game.players.filter((p) => p.id !== playerId).map((p) => p.id);
  }

  const amount = rent * 2 ** doubles.length;
  const used = [cardId, ...doubleRentIds];
  const played: GameState = {
    ...game,
    players: updatePlayer(game, playerId, (p) => ({ ...p, hand: p.hand.filter((c) => !used.includes(c.id)) })),
    discardPile: [...game.discardPile, card, ...(doubles as Card[])],
    cardsPlayed: game.cardsPlayed + used.length,
  };
  return ok(startPayment(played, card, playerId, debtorIds.map((id) => ({ playerId: id, amount }))));
}

/*
  sets up an action that other players have to pay for. each debt starts as:
  - done, if the debtor has nothing to pay with (the rules forgive what you can't cover, and nobody gets stuck)
  - responding, if they're holding a just say no, so they get the chance to play it
  - paying, otherwise (no point asking someone who can't say no)
*/
function startPayment(
  game: GameState,
  card: Card,
  fromPlayerId: number,
  owed: { playerId: number; amount: number }[],
): GameState {
  const debts = owed.map(({ playerId, amount }): Debt => {
    const debtor = game.players.find((p) => p.id === playerId)!;
    const status = payableCards(debtor).length === 0 ? "done" : holdsSayNo(debtor) ? "responding" : "paying";
    return { playerId, amount, status, sayNoCount: 0 };
  });
  return withDebts(game, { card, fromPlayerId, debts });
}

// stores the pending action's debts, and clears it once every one is done so the turn carries on
function withDebts(game: GameState, pending: PendingAction): GameState {
  return { ...game, pending: pending.debts.every((d) => d.status === "done") ? null : pending };
}

const isSayNo = (card: Card) => card.type === "action" && card.action === "just-say-no";
const holdsSayNo = (player: Player) => player.hand.some(isSayNo);

/*
  answering a pending action, back and forth on one debt:
  the debtor plays just say no (or accepts and pays), then the player who played the action can say no
  back (or let it go), then the debtor again... each side only gets asked if they're holding a just say no.
  an odd number of just say nos cancels the debt, an even number means it's paid after all.
  each debt is separate, so on a birthday one player saying no doesn't let anyone else off
*/
function respond(
  game: GameState,
  actorId: number,
  move: Extract<Move, { type: "just-say-no" | "accept" }>,
): MoveResult {
  const pending = game.pending!;
  const isAttacker = actorId === pending.fromPlayerId;
  const debt = isAttacker
    ? pending.debts.find((d) => d.status === "countering" && (move.debtorId === undefined || d.playerId === move.debtorId))
    : pending.debts.find((d) => d.playerId === actorId && d.status === "responding");
  if (!debt) return fail("There's nothing for you to respond to");

  const update = (next: GameState, status: Debt["status"], sayNoCount = debt.sayNoCount) =>
    ok(withDebts(next, {
      ...pending,
      debts: pending.debts.map((d) => (d === debt ? { ...d, status, sayNoCount } : d)),
    }));

  // the debtor accepts and pays, or the player who played the action lets the just say no stand
  if (move.type === "accept") return isAttacker ? update(game, "done") : update(game, payingOrLetOff(game, debt));

  const actor = game.players.find((p) => p.id === actorId)!;
  const card = actor.hand.find((c) => c.id === move.cardId);
  if (!card || !isSayNo(card)) return fail("That isn't a Just Say No in your hand");

  // played on your own turn it counts as one of your plays (the official rule), so you need one left
  const isOwnTurn = actorId === game.players[game.currentPlayerIndex].id;
  if (isOwnTurn && game.cardsPlayed >= PLAYS_PER_TURN) return fail("No plays left to play Just Say No");

  const next: GameState = {
    ...game,
    players: updatePlayer(game, actorId, (p) => ({ ...p, hand: withoutCard(p.hand, card.id) })),
    discardPile: [...game.discardPile, card],
    cardsPlayed: game.cardsPlayed + (isOwnTurn ? 1 : 0),
  };
  const sayNoCount = debt.sayNoCount + 1;

  if (isAttacker) {
    // said no back: the debtor owes again, unless they have another just say no to answer with
    const debtor = next.players.find((p) => p.id === debt.playerId)!;
    return update(next, holdsSayNo(debtor) ? "responding" : payingOrLetOff(next, debt), sayNoCount);
  }

  const attacker = next.players.find((p) => p.id === pending.fromPlayerId)!;
  const canCounter = holdsSayNo(attacker) && next.cardsPlayed < PLAYS_PER_TURN;
  return update(next, canCounter ? "countering" : "done", sayNoCount);
}

function payingOrLetOff(game: GameState, debt: Debt): Debt["status"] {
  const debtor = game.players.find((p) => p.id === debt.playerId)!;
  return payableCards(debtor).length === 0 ? "done" : "paying";
}

function payDebt(game: GameState, playerId: number, cardIds: string[]): MoveResult {
  const pending = game.pending!;
  const debt = pending.debts.find((d) => d.playerId === playerId && d.status === "paying");
  if (!debt) return fail("You don't owe anything");

  const payer = game.players.find((p) => p.id === playerId)!;
  const payable = payableCards(payer);
  if (new Set(cardIds).size !== cardIds.length) return fail("You picked the same card twice");
  const paying = cardIds.map((id) => payable.find((c) => c.id === id));
  if (paying.some((c) => !c)) return fail("You can only pay with cards from your bank or properties");

  // no change is given, so it has to cover the debt, unless it's everything you have
  const total = cardsTotal(paying as Card[]);
  if (total < debt.amount && cardIds.length < payable.length) {
    return fail(`That's ${total}M, you owe ${debt.amount}M`);
  }

  // money goes into the receiver's bank, properties into their property pile
  // (wildcards keep the colour they were being used as)
  const fromSets = payer.properties.flatMap((set) =>
    set.cards.filter((c) => cardIds.includes(c.id)).map((card) => ({ card, colour: set.colour })),
  );
  const fromBank = payer.bank.filter((c) => cardIds.includes(c.id));

  const players = game.players.map((p) => {
    if (p.id === playerId) {
      return {
        ...p,
        bank: p.bank.filter((c) => !cardIds.includes(c.id)),
        properties: p.properties
          .map((set) => ({ ...set, cards: set.cards.filter((c) => !cardIds.includes(c.id)) }))
          .filter((set) => set.cards.length > 0),
        // TODO: houses and hotels on a set that's no longer complete
      };
    }
    if (p.id === pending.fromPlayerId) {
      return {
        ...p,
        bank: [...p.bank, ...fromBank],
        properties: fromSets.reduce((sets, { card, colour }) => addToSet(sets, card, colour), p.properties),
      };
    }
    return p;
  });

  const debts = pending.debts.map((d) => (d === debt ? { ...d, status: "done" as const } : d));
  return ok(withDebts({ ...game, players }, { ...pending, debts }));
}

// puts a property into the first unfinished set of that colour, or starts a new set
function addToSet(sets: PropertySet[], card: Card, colour: Colour): PropertySet[] {
  if (card.type !== "property" && card.type !== "wildcard") return sets;
  const open = sets.findIndex((s) => s.colour === colour && !isComplete(s));
  if (open < 0) return [...sets, { colour, cards: [card], houses: 0, hotels: 0 }];
  return sets.map((s, i) => (i === open ? { ...s, cards: [...s.cards, card] } : s));
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
    // house rule: the any colour wildcard can't start a set, it has to join one you've already started
    if (card.colours === "any" && !openSetColours(player.properties).includes(colour)) {
      return fail("The any colour wildcard has to join a set you've already started");
    }
    setColour = colour;
  } else {
    return fail("Only property cards go in your property pile");
  }

  return ok({
    ...game,
    players: updatePlayer(game, playerId, (p) => ({
      ...p,
      hand: withoutCard(p.hand, cardId),
      properties: addToSet(player.properties, card, setColour),
    })),
    cardsPlayed: game.cardsPlayed + 1,
  });
}

export function getTurnStatus(game: GameState) {
  const player = game.players[game.currentPlayerIndex];
  const playsLeft = Math.max(0, PLAYS_PER_TURN - game.cardsPlayed);

  let playBlockedReason: string | null = null;
  if (game.isGameOver) playBlockedReason = 'The game is over!';
  else if (game.pending) playBlockedReason = 'Waiting on other players';
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
    canEndTurn: game.hasDrawnCards && !game.mustDiscard && !game.isGameOver && !game.pending,
    mustDiscard: game.mustDiscard,
    cardsToDiscard: Math.max(0, player.hand.length - HAND_LIMIT),
    winnerId: game.winnerId, // null until someone has SETS_TO_WIN complete sets of different colours
    // the card behind the pending action, and each debt still being dealt with (empty when nothing is pending)
    pendingCard: game.pending?.card ?? null,
    owing: (game.pending?.debts ?? [])
      .filter((d) => d.status !== "done")
      .map((d) => ({
        playerId: d.playerId,
        amount: d.amount,
        toPlayerId: game.pending!.fromPlayerId,
        status: d.status,
        sayNoCount: d.sayNoCount,
      })),
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

  return ok({
    ...drawCards(game, player.id, count),
    hasDrawnCards: true, // set even if both piles are empty, so the turn can still continue
  });
}

// moves cards from the top of the deck into a player's hand (start of turn, pass go...)
function drawCards(game: GameState, playerId: number, count: number): GameState {
  // not enough to draw, shuffle the discard pile in underneath what's left
  let { deck, discardPile } = game;
  if (deck.length < count && discardPile.length > 0) {
    // seed + turn number so each reshuffle is different but still replays the same
    deck = [...deck, ...shuffleDeck(discardPile, mulberry32(game.seed + game.turnNumber))];
    discardPile = [];
  }
  const drawn = deck.slice(0, count);

  return {
    ...game,
    players: updatePlayer(game, playerId, (p) => ({ ...p, hand: [...p.hand, ...drawn] })),
    deck: deck.slice(drawn.length),
    discardPile,
  };
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
