export type Colour =
  | "brown" | "lightBlue" | "pink" | "orange" | "red"
  | "yellow" | "green" | "darkBlue" | "railroad" | "utility";

export const SETS: Record<Colour, { size: number; rent: number[]; buildable: boolean }> = {
  brown:     { size: 2, rent: [1, 2],       buildable: true },
  lightBlue: { size: 3, rent: [1, 2, 3],    buildable: true },
  pink:      { size: 3, rent: [1, 2, 4],    buildable: true },
  orange:    { size: 3, rent: [1, 3, 5],    buildable: true },
  red:       { size: 3, rent: [2, 3, 6],    buildable: true },
  yellow:    { size: 3, rent: [2, 4, 6],    buildable: true },
  green:     { size: 3, rent: [2, 4, 7],    buildable: true },
  darkBlue:  { size: 2, rent: [3, 8],       buildable: true },
  railroad:  { size: 4, rent: [1, 2, 3, 4], buildable: false },
  utility:   { size: 2, rent: [1, 2],       buildable: false },
};

export const COLOURS = Object.keys(SETS) as Colour[];

export type ActionType =
  | "pass-go" | "debt-collector" | "birthday" | "deal-breaker" | "sly-deal"
  | "forced-deal" | "just-say-no" | "double-the-rent" | "house" | "hotel";

export type CardActionId =
  | "bank" | "play" | "play-on-player" | "add-to-set"
  | "place-property" | "pay-player" | "discard" | "rent";

interface CardBase {
  id: string;
  name: string;
  value: number;
  image: string;
}

export interface MoneyCard    extends CardBase { type: "money" }
export interface PropertyCard extends CardBase { type: "property"; colour: Colour }
export interface WildCard     extends CardBase { type: "wildcard"; colours: [Colour, Colour] | "any" }
export interface RentCard     extends CardBase { type: "rent"; colours: [Colour, Colour] | "any" }
export interface ActionCard   extends CardBase { type: "action"; action: ActionType }

export type Card = MoneyCard | PropertyCard | WildCard | RentCard | ActionCard;

export interface PropertySet {
  colour: Colour;
  cards: (PropertyCard | WildCard)[];
  // buildings only sit on complete sets, and a hotel only with a house (anything else goes to the bank)
  house: ActionCard | null;
  hotel: ActionCard | null;
}

export const isComplete = (set: PropertySet) =>
  set.cards.length >= SETS[set.colour].size;

// colours with a set that's started but not finished, the any colour wildcard can only join one of these
export const openSetColours = (sets: PropertySet[]): Colour[] =>
  [...new Set(sets.filter((s) => !isComplete(s)).map((s) => s.colour))];

// a complete set (not railroads or utilities) can take one house, then one hotel on top
export const canBuild = (set: PropertySet, building: "house" | "hotel") =>
  isComplete(set) && SETS[set.colour].buildable && (building === "house" ? !set.house : !!set.house && !set.hotel);

export const buildableColours = (sets: PropertySet[], building: "house" | "hotel"): Colour[] =>
  [...new Set(sets.filter((s) => canBuild(s, building)).map((s) => s.colour))];

// a two colour wildcard played as its second colour is shown upside down, so that colour is at the top
export const isFlipped = (card: Card, setColour: Colour) =>
  card.type === "wildcard" && card.colours !== "any" && card.colours[1] === setColour;

// colours a wildcard in your pile can be moved to: a two colour one to its other colour,
// the any colour one only into another set you've started
export function wildcardMoves(sets: PropertySet[], cardId: string): Colour[] {
  const from = sets.find((s) => s.cards.some((c) => c.id === cardId));
  const card = from?.cards.find((c) => c.id === cardId);
  if (!from || card?.type !== "wildcard") return [];
  if (card.colours !== "any") return card.colours.filter((c) => c !== from.colour);
  const others = sets.filter((s) => s !== from);
  return openSetColours(others).filter((c) => c !== from.colour);
}

// colours a player has a complete set of. two complete sets of the same colour only count once
export const completeColours = (player: Player): Colour[] =>
  [...new Set(player.properties.filter(isComplete).map((s) => s.colour))];

export interface Player {
  id: number;
  name: string;
  hand: Card[];
  bank: Card[];
  properties: PropertySet[];
}

/*
  one player's share of a pending action, e.g. 5M owed from a debt collector.
  status is whose move it is on this debt:
  - responding: the debtor can play a just say no, or accept. everyone is asked, so nobody can tell who's holding one
  - countering: the debtor said no, the player who played the action can say no back, or let it go
  - paying: the debtor is picking cards to pay with
  - done: paid, let off, or cancelled (an odd sayNoCount means it was cancelled)
*/
export interface Debt {
  playerId: number;
  amount: number;
  status: "responding" | "countering" | "paying" | "done";
  sayNoCount: number; // just say nos played on this debt so far
}

// an action that's waiting on other players before the turn can carry on
/*
  what happens to each target if the action goes ahead:
  - pay: they pay their debt's amount
  - sly-deal: takeId moves from the target to the player who played it
  - forced-deal: takeId and giveId swap between them
  - deal-breaker: the target's complete set with takeId in it moves over, buildings and all
  the steals happen straight away when they go ahead, the debt's amount is 0 for them
*/
export type PendingEffect =
  | { kind: "pay" }
  | { kind: "sly-deal"; takeId: string }
  | { kind: "forced-deal"; takeId: string; giveId: string }
  | { kind: "deal-breaker"; takeId: string };

export interface PendingAction {
  card: Card;
  fromPlayerId: number; // who gets paid, or who's doing the taking
  effect: PendingEffect;
  debts: Debt[];
}

export interface GameState {
  players: Player[];
  deck: Card[];
  currentPlayerIndex: number;
  cardsPlayed: number;
  isGameOver: boolean;
  winnerId: number | null;
  pending: PendingAction | null; // while set, the game waits on the players who still owe
  hasDrawnCards: boolean;
  log: LogEntry[]; // everything that's happened, oldest first
  discardPile: Card[], // played actions and discards, reshuffled into the deck when it runs out
  seed: number; // drives every shuffle, so a seeded game replays exactly
  turnNumber: number;
  mustDiscard: boolean;
}

// everything a player can do, this is what gets sent to the server later
export type Move =
  | { type: "draw" }
  | { type: "end-turn" }
  | { type: "bank"; cardId: string }
  // targetId for cards aimed at one player. takeId is the card to take (for deal breaker, any card in the set),
  // giveId is your card to swap for it (forced deal)
  | { type: "play"; cardId: string; targetId?: number; takeId?: string; giveId?: string }
  | { type: "place-property"; cardId: string; colour?: Colour }
  | { type: "discard"; cardId: string }
  | { type: "pay"; cardIds: string[] } // bank and property cards chosen to pay a debt
  // targetId only for the any colour rent card, doubleRentIds are double the rent cards played with it
  | { type: "rent"; cardId: string; colour: Colour; targetId?: number; doubleRentIds?: string[] }
  // answering a pending action. debtorId says which debt, the player who played the action needs it
  // when several players have said no to them (birthday, two colour rent)
  | { type: "just-say-no"; cardId: string; debtorId?: number }
  | { type: "accept"; debtorId?: number }
  | { type: "build"; cardId: string; colour: Colour }
  | { type: "move-wildcard"; cardId: string; colour: Colour }; // free, on your turn

export type MoveResult = { ok: true; game: GameState } | { ok: false; error: string };

// one thing that happened, for the game log and toasts. never anything hidden: draws are just a count
export type LogEvent = { playerId: number } & (
  | { kind: "drew"; count: number }
  | { kind: "banked"; card: Card }
  | { kind: "placed"; card: Card; colour: Colour }
  | { kind: "built"; card: Card; colour: Colour }
  | { kind: "moved"; card: Card; colour: Colour }
  | { kind: "played"; card: Card; targetIds: number[]; amount?: number; colour?: Colour; doubled?: number }
  | { kind: "said-no"; againstId: number }
  | { kind: "cancelled"; card: Card; forId: number } // playerId's action is off for forId
  | { kind: "paid"; toId: number; cards: Card[] } // no cards: they had nothing to pay with
  | { kind: "took"; fromId: number; card: Card }
  | { kind: "swapped"; withId: number; took: Card; gave: Card }
  | { kind: "took-set"; fromId: number; colour: Colour; cards: Card[] }
  | { kind: "discarded"; card: Card }
  | { kind: "ended-turn" }
  | { kind: "won" }
);

export type LogEntry = LogEvent & { turn: number };

export interface OpponentView {
  id: number;
  name: string;
  handCount: number;
  bank: Card[];
  properties: PropertySet[];
}