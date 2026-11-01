import type { Card, Colour, Debt, GameState, LogEntry, LogEvent, Move, MoveResult, PendingAction, PendingEffect, Player, PropertySet } from "./types";
import { COLOURS, canBuild, completeColours, isComplete, openSetColours, wildcardMoves } from "./types";
import { cardData } from "./cardData";
import { cardsTotal, payableCards } from "./payment";
import { rentFor } from "./rent";
import { completeSets, looseProperties, setContaining, type StealKind } from "./steal";

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 5;
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

export const MAX_NAME_LENGTH = 20; // matches the check on room_players.display_name
export const defaultName = (id: number) => `Player ${id + 1}`;
export const defaultNames = (count: number) => Array.from({ length: count }, (_, i) => defaultName(i));

export function beginGame(players: number | string[] = 2, seed = Math.floor(Math.random() * 2 ** 32)): GameState {
  const names = typeof players === "number" ? defaultNames(players) : players;
  const deck = shuffleDeck(cardData, mulberry32(seed));
  return {
    players: names.map((name, i) => ({
      id: i,
      name,
      hand: deck.splice(0, 5), // removes 5 from the deck and returns them
      bank: [],
      properties: [],
    })),
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
    log: [],
  };
}

const logged = (game: GameState, ...events: LogEvent[]): GameState => ({
  ...game,
  log: [...game.log, ...events.map((e) => ({ ...e, turn: game.turnNumber }) as LogEntry)],
});

function checkForWinner(game: GameState): GameState {
  const winner = game.players.find((p) => completeColours(p).length >= SETS_TO_WIN);
  if (!winner) return game;
  return logged({ ...game, isGameOver: true, winnerId: winner.id, pending: null }, { kind: "won", playerId: winner.id });
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
  return ok(checkForWinner(tidySets(result.game)));
}

function tidySets(game: GameState): GameState {
  return {
    ...game,
    players: game.players.map((p) => {
      const bank = [...p.bank];
      const properties = p.properties.map((set) => {
        const keepHouse = isComplete(set) && set.house;
        const keepHotel = keepHouse && set.hotel;
        if (set.house && !keepHouse) bank.push(set.house);
        if (set.hotel && !keepHotel) bank.push(set.hotel);
        return { ...set, house: keepHouse || null, hotel: keepHotel || null };
      });
      return { ...p, bank, properties: properties.filter((set) => set.cards.length > 0) };
    }),
  };
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
      return playToActionPile(game, actorId, move);
    case "place-property":
      return playToProperties(game, actorId, move.cardId, move.colour);
    case "discard":
      return discardCard(game, actorId, move.cardId);
    case "rent":
      return chargeRent(game, actorId, move.cardId, move.colour, move.targetId, move.doubleRentIds ?? []);
    case "build":
      return build(game, actorId, move.cardId, move.colour);
    case "move-wildcard":
      return moveWildcard(game, actorId, move.cardId, move.colour);
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

const STEALS: string[] = ["sly-deal", "forced-deal", "deal-breaker"];

function playToActionPile(game: GameState, playerId: number, move: Extract<Move, { type: "play" }>): MoveResult {
  const { cardId, targetId, takeId, giveId } = move;
  const found = findPlayable(game, playerId, cardId);
  if (typeof found === "string") return fail(found);
  const { card } = found;

  if (card.type === "rent") return fail("Charge rent from the rent card's menu");
  if (card.type === "action" && card.action === "double-the-rent") {
    return fail("Double the Rent is played with a rent card");
  }

  const isDebtCollector = card.type === "action" && card.action === "debt-collector";
  const stealKind = card.type === "action" && STEALS.includes(card.action) ? (card.action as StealKind) : null;
  if (isDebtCollector || stealKind) {
    const problem = targetProblem(game, playerId, targetId)
      ?? (stealKind && stealProblem(game, stealKind, playerId, targetId!, takeId, giveId));
    if (problem) return fail(problem);
  }

  const played: GameState = {
    ...game,
    players: updatePlayer(game, playerId, (p) => ({ ...p, hand: withoutCard(p.hand, cardId) })),
    discardPile: [...game.discardPile, card],
    cardsPlayed: game.cardsPlayed + 1,
  };

  const playedOn = (targetIds: number[], amount?: number) =>
    logged(played, { kind: "played", playerId, card, targetIds, amount });

  // what the card does once it's played, the rest of the actions slot in here as they're built
  if (card.type === "action" && card.action === "pass-go") return ok(drawCards(playedOn([]), playerId, 2));
  if (isDebtCollector) {
    const owed = [{ playerId: targetId!, amount: DEBT_COLLECTOR_AMOUNT }];
    return ok(startAction(playedOn([targetId!], DEBT_COLLECTOR_AMOUNT), card, playerId, owed));
  }
  if (card.type === "action" && card.action === "birthday") {
    const owed = game.players
      .filter((p) => p.id !== playerId)
      .map((p) => ({ playerId: p.id, amount: BIRTHDAY_AMOUNT }));
    return ok(startAction(playedOn(owed.map((o) => o.playerId), BIRTHDAY_AMOUNT), card, playerId, owed));
  }
  if (stealKind) {
    const effect: PendingEffect = stealKind === "forced-deal"
      ? { kind: stealKind, takeId: takeId!, giveId: giveId! }
      : { kind: stealKind, takeId: takeId! };
    return ok(startAction(playedOn([targetId!]), card, playerId, [{ playerId: targetId!, amount: 0 }], effect));
  }
  return ok(playedOn([]));
}

// why the chosen cards can't be taken, or null if they can (see steal.ts for what's allowed)
function stealProblem(
  game: GameState,
  kind: StealKind,
  playerId: number,
  targetId: number,
  takeId: string | undefined,
  giveId: string | undefined,
): string | null {
  const theirs = game.players.find((p) => p.id === targetId)!.properties;
  const mine = game.players.find((p) => p.id === playerId)!.properties;
  const has = (cards: Card[], id: string | undefined) => cards.some((c) => c.id === id);

  if (kind === "deal-breaker") {
    return has(completeSets(theirs).flatMap((s) => s.cards), takeId) ? null : "Choose one of their complete sets";
  }
  if (!has(looseProperties(theirs), takeId)) return "Choose one of their properties that isn't in a complete set";
  if (kind === "forced-deal" && !has(looseProperties(mine), giveId)) {
    return "Choose one of your properties that isn't in a complete set to swap";
  }
  return null;
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
  const charged = logged(played, {
    kind: "played", playerId, card, targetIds: debtorIds, amount, colour, doubled: doubles.length,
  });
  return ok(startAction(charged, card, playerId, debtorIds.map((id) => ({ playerId: id, amount }))));
}

function startAction(
  game: GameState,
  card: Card,
  fromPlayerId: number,
  owed: { playerId: number; amount: number }[],
  effect: PendingEffect = { kind: "pay" },
): GameState {
  let next = game;
  const debts: Debt[] = [];
  for (const { playerId, amount } of owed) {
    const debt: Debt = { playerId, amount, status: "responding", sayNoCount: 0 };
    const target = next.players.find((p) => p.id === playerId)!;
    if (effect.kind === "pay" && payableCards(target).length === 0) {
      next = logged(next, { kind: "paid", playerId, toId: fromPlayerId, cards: [] });
      debts.push({ ...debt, status: "done" });
    } else {
      // asked even without a just say no, so the wait doesn't give away who's holding one
      debts.push(debt);
    }
  }
  return withDebts(next, { card, fromPlayerId, effect, debts });
}

// an action going ahead against one target: a payment waits for them to pick cards, a steal happens straight away
function goAhead(
  game: GameState,
  effect: PendingEffect,
  fromPlayerId: number,
  debt: Debt,
): { game: GameState; status: Debt["status"] } {
  if (effect.kind === "pay") {
    const debtor = game.players.find((p) => p.id === debt.playerId)!;
    if (payableCards(debtor).length > 0) return { game, status: "paying" };
    return { game: logged(game, { kind: "paid", playerId: debt.playerId, toId: fromPlayerId, cards: [] }), status: "done" };
  }
  return { game: steal(game, effect, fromPlayerId, debt.playerId), status: "done" };
}

// moves the cards for a steal. single cards keep the colour they were being used as,
// a deal breaker'd set moves over whole (buildings too) and stays its own set
function steal(
  game: GameState,
  effect: Exclude<PendingEffect, { kind: "pay" }>,
  thiefId: number,
  targetId: number,
): GameState {
  const thief = game.players.find((p) => p.id === thiefId)!;
  const target = game.players.find((p) => p.id === targetId)!;
  let thiefSets: PropertySet[];
  let targetSets: PropertySet[];
  let event: LogEvent;

  if (effect.kind === "deal-breaker") {
    const set = setContaining(target.properties, effect.takeId)!;
    thiefSets = [...thief.properties, set];
    targetSets = target.properties.filter((s) => s !== set);
    event = { kind: "took-set", playerId: thiefId, fromId: targetId, colour: set.colour, cards: set.cards };
  } else {
    const taken = removeProperty(target.properties, effect.takeId);
    thiefSets = addToSet(thief.properties, taken.card, taken.colour);
    targetSets = taken.sets;
    event = { kind: "took", playerId: thiefId, fromId: targetId, card: taken.card };
    if (effect.kind === "forced-deal") {
      const given = removeProperty(thiefSets, effect.giveId);
      thiefSets = given.sets;
      targetSets = addToSet(targetSets, given.card, given.colour);
      event = { kind: "swapped", playerId: thiefId, withId: targetId, took: taken.card, gave: given.card };
    }
  }

  return logged({
    ...game,
    players: game.players.map((p) =>
      p.id === thiefId ? { ...p, properties: thiefSets } : p.id === targetId ? { ...p, properties: targetSets } : p,
    ),
  }, event);
}

// takes one property out of a player's sets (an emptied set is cleared up by tidySets)
function removeProperty(sets: PropertySet[], cardId: string) {
  const set = setContaining(sets, cardId)!;
  return {
    card: set.cards.find((c) => c.id === cardId)!,
    colour: set.colour,
    sets: sets.map((s) => (s === set ? { ...s, cards: s.cards.filter((c) => c.id !== cardId) } : s)),
  };
}

// stores the pending action's debts, and clears it once every one is done so the turn carries on
function withDebts(game: GameState, pending: PendingAction): GameState {
  return { ...game, pending: pending.debts.every((d) => d.status === "done") ? null : pending };
}

const isSayNo = (card: Card) => card.type === "action" && card.action === "just-say-no";

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

  const cancelled: LogEvent = { kind: "cancelled", playerId: pending.fromPlayerId, card: pending.card, forId: debt.playerId };

  // the debtor accepts and it goes ahead, or the player who played the action lets the just say no stand
  if (move.type === "accept") {
    if (isAttacker) return update(logged(game, cancelled), "done");
    const ahead = goAhead(game, pending.effect, pending.fromPlayerId, debt);
    return update(ahead.game, ahead.status);
  }

  const actor = game.players.find((p) => p.id === actorId)!;
  const card = actor.hand.find((c) => c.id === move.cardId);
  if (!card || !isSayNo(card)) return fail("That isn't a Just Say No in your hand");

  // played on your own turn it counts as one of your plays (the official rule), so you need one left
  const isOwnTurn = actorId === game.players[game.currentPlayerIndex].id;
  if (isOwnTurn && game.cardsPlayed >= PLAYS_PER_TURN) return fail("No plays left to play Just Say No");

  const next = logged({
    ...game,
    players: updatePlayer(game, actorId, (p) => ({ ...p, hand: withoutCard(p.hand, card.id) })),
    discardPile: [...game.discardPile, card],
    cardsPlayed: game.cardsPlayed + (isOwnTurn ? 1 : 0),
  }, { kind: "said-no", playerId: actorId, againstId: isAttacker ? debt.playerId : pending.fromPlayerId });
  const sayNoCount = debt.sayNoCount + 1;

  // said no back: it's back on, and the debtor answers again
  if (isAttacker) return update(next, "responding", sayNoCount);

  // the player who played it can say no back if they have a play left, and is asked whether or not they hold one
  if (next.cardsPlayed < PLAYS_PER_TURN) return update(next, "countering", sayNoCount);
  return update(logged(next, cancelled), "done", sayNoCount);
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

  // money and buildings go into the receiver's bank, properties into their property pile
  // (wildcards keep the colour they were being used as)
  const isPaid = (c: Card | null) => !!c && cardIds.includes(c.id);
  const fromSets = payer.properties.flatMap((set) =>
    set.cards.filter(isPaid).map((card) => ({ card, colour: set.colour })),
  );
  const fromBank = payer.bank.filter(isPaid);
  const buildings = payer.properties.flatMap((set) => [set.house, set.hotel]).filter(isPaid) as Card[];

  // sets left incomplete (or empty) are sorted out by tidySets after the move
  const players = game.players.map((p) => {
    if (p.id === playerId) {
      return {
        ...p,
        bank: p.bank.filter((c) => !isPaid(c)),
        properties: p.properties.map((set) => ({
          ...set,
          cards: set.cards.filter((c) => !isPaid(c)),
          house: isPaid(set.house) ? null : set.house,
          hotel: isPaid(set.hotel) ? null : set.hotel,
        })),
      };
    }
    if (p.id === pending.fromPlayerId) {
      return {
        ...p,
        bank: [...p.bank, ...fromBank, ...buildings],
        properties: fromSets.reduce((sets, { card, colour }) => addToSet(sets, card, colour), p.properties),
      };
    }
    return p;
  });

  const debts = pending.debts.map((d) => (d === debt ? { ...d, status: "done" as const } : d));
  const paid = logged({ ...game, players }, { kind: "paid", playerId, toId: pending.fromPlayerId, cards: paying as Card[] });
  return ok(withDebts(paid, { ...pending, debts }));
}

// puts a property into the first unfinished set of that colour, or starts a new set
function addToSet(sets: PropertySet[], card: Card, colour: Colour): PropertySet[] {
  if (card.type !== "property" && card.type !== "wildcard") return sets;
  const open = sets.findIndex((s) => s.colour === colour && !isComplete(s));
  if (open < 0) return [...sets, { colour, cards: [card], house: null, hotel: null }];
  return sets.map((s, i) => (i === open ? { ...s, cards: [...s.cards, card] } : s));
}

// a house or hotel onto a complete set of that colour (see canBuild for the rules)
function build(game: GameState, playerId: number, cardId: string, colour: Colour): MoveResult {
  const found = findPlayable(game, playerId, cardId);
  if (typeof found === "string") return fail(found);
  const { player, card } = found;

  if (card.type !== "action" || (card.action !== "house" && card.action !== "hotel")) {
    return fail("Only houses and hotels can be built");
  }
  const building = card.action;
  const target = player.properties.findIndex((s) => s.colour === colour && canBuild(s, building));
  if (target < 0) {
    return fail(building === "house"
      ? "A house needs a complete set without one (not railroads or utilities)"
      : "A hotel needs a complete set with a house and no hotel");
  }

  return ok(logged({
    ...game,
    players: updatePlayer(game, playerId, (p) => ({
      ...p,
      hand: withoutCard(p.hand, cardId),
      properties: p.properties.map((s, i) => (i === target ? { ...s, [building]: card } : s)),
    })),
    cardsPlayed: game.cardsPlayed + 1,
  }, { kind: "built", playerId, card, colour }));
}

// rearranging doesn't use a play. a set it breaks loses its buildings in tidySets
function moveWildcard(game: GameState, playerId: number, cardId: string, colour: Colour): MoveResult {
  const player = game.players.find((p) => p.id === playerId)!;
  if (!wildcardMoves(player.properties, cardId).includes(colour)) return fail("That wildcard can't move there");

  const moved = removeProperty(player.properties, cardId);
  return ok(logged({
    ...game,
    players: updatePlayer(game, playerId, (p) => ({ ...p, properties: addToSet(moved.sets, moved.card, colour) })),
  }, { kind: "moved", playerId, card: moved.card, colour }));
}

function playToBank(game: GameState, playerId: number, cardId: string): MoveResult {
  const found = findPlayable(game, playerId, cardId);
  if (typeof found === "string") return fail(found);
  const { card } = found;

  // property and wild property cards can never be banked (the menu hides it, this enforces it)
  if (card.type === "property" || card.type === "wildcard") return fail("Properties can't be banked");

  return ok(logged({
    ...game,
    players: updatePlayer(game, playerId, (p) => ({
      ...p,
      hand: withoutCard(p.hand, cardId),
      bank: [...p.bank, card],
    })),
    cardsPlayed: game.cardsPlayed + 1,
  }, { kind: "banked", playerId, card }));
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

  return ok(logged({
    ...game,
    players: updatePlayer(game, playerId, (p) => ({
      ...p,
      hand: withoutCard(p.hand, cardId),
      properties: addToSet(player.properties, card, setColour),
    })),
    cardsPlayed: game.cardsPlayed + 1,
  }, { kind: "placed", playerId, card, colour: setColour }));
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
    pendingEffect: game.pending?.effect ?? null,
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
    ...logged(game, { kind: "ended-turn", playerId: game.players[game.currentPlayerIndex].id }),
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

  return logged({
    ...game,
    players: updatePlayer(game, playerId, (p) => ({ ...p, hand: [...p.hand, ...drawn] })),
    deck: deck.slice(drawn.length),
    discardPile,
  }, { kind: "drew", playerId, count: drawn.length });
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

  const next = logged({
    ...game,
    players: updatePlayer(game, playerId, (p) => ({ ...p, hand: withoutCard(p.hand, cardId) })),
    discardPile: [...game.discardPile, card],
  }, { kind: "discarded", playerId, card });

  return ok(player.hand.length - 1 <= HAND_LIMIT ? advanceTurn(next) : next);
}
