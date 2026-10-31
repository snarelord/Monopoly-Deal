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
  | "place-property" | "pay-player" | "discard";

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
  houses: number;
  hotels: number;
}

export const isComplete = (set: PropertySet) =>
  set.cards.length >= SETS[set.colour].size;

export interface Player {
  id: number;
  hand: Card[];
  bank: Card[];
  properties: PropertySet[];
}

export interface ActionInProgress {
  type: string;
  sourcePlayer: number;
  targetPlayer?: number;
  card: Card;
}

export interface GameState {
  players: Player[];
  deck: Card[];
  currentPlayerIndex: number;
  cardsPlayed: number;
  isGameOver: boolean;
  winner: Player | null;
  actionInProgress: ActionInProgress | null;
  hasDrawnCards: boolean;
  actionCards: Card[];
  message?: string;
  discardPile: Card[],
  turnNumber: number;
  mustDiscard: boolean;
}

export interface OpponentView {
  id: number;
  handCount: number;
  bank: Card[];
  properties: PropertySet[];
}