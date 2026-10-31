import type { ActionType, Card, CardActionId, Colour, Move, OpponentView, Player } from "./types";
import { buildableColours, openSetColours } from "./types";
import { rentOptions } from "./rent";
import { canSteal, type StealKind } from "./steal";

// a colour the player can pick, with the rent it would charge for rent cards
export interface ColourOption {
  colour: Colour;
  amount?: number;
  disabled?: boolean;
}

export interface CardAction {
  id: CardActionId;
  label: string;
  disabled?: boolean;
  reason?: string;
  colours?: ColourOption[];
  targets?: number[];
  doubleRentIds?: string[];
  pick?: StealKind;
}

// what the player picked in the menu on top of the action itself
export interface ActionChoice {
  colour?: Colour;
  targetId?: number;
  doubleRentIds?: string[];
  takeId?: string;
  giveId?: string;
}

export interface ActionContext {
  playBlockedReason: string | null;
  canDiscard: boolean;
  opponents: OpponentView[];
  me: Player;
  playsLeft: number;
}

const STEAL_OPTIONS: Record<StealKind, { label: string; reason: string }> = {
  "sly-deal": { label: "Take a property…", reason: "Nobody has a property you can take (not in a complete set)" },
  "forced-deal": { label: "Swap a property…", reason: "You both need a property that isn't in a complete set" },
  "deal-breaker": { label: "Take a complete set…", reason: "Nobody has a complete set" },
};

function playOption(action: ActionType, opponentIds: number[]): CardAction | null {
  if (action === "debt-collector") return { id: "play-on-player", label: "Play against a player", targets: opponentIds };
  if (action === "pass-go") return { id: "play", label: "Play (draw 2)" };
  if (action === "birthday") return { id: "play", label: "Play (everyone pays 2M)" };
  if (action === "just-say-no") return null;
  if (action === "double-the-rent") return null;
  return { id: "play", label: "Play" };
}

export function getCardActions(card: Card, ctx: ActionContext): CardAction[] {
  const play = (a: CardAction): CardAction =>
    ctx.playBlockedReason ? { ...a, disabled: true, reason: ctx.playBlockedReason } : a;

  const bank = play({ id: "bank", label: "Place in bank" });

  const discard: CardAction = {
    id: "discard",
    label: "Discard",
    // TODO: also require "my turn is over" once turn phases exist
    disabled: !ctx.canDiscard,
    reason: "Only when you have to discard down to 7 at the end of your turn",
  };

  switch (card.type) {
    case "money":
      // pay a player makes sense as a player will action this towards you, and you will choose what cards to pay
      return [bank, { id: "pay-player", label: "Pay a player", disabled: true}, discard];
    case "property":
      return [play({ id: "place-property", label: "Place in property pile" }), discard];
    case "wildcard": {
      // the any colour wildcard can only join a set you've already started
      const colours = card.colours === "any" ? openSetColours(ctx.me.properties) : card.colours;
      const place: CardAction = {
        id: "place-property",
        label: "Place in property pile…",
        colours: colours.map((colour) => ({ colour })),
      };
      if (colours.length === 0) {
        return [{ ...place, disabled: true, reason: "Start a set first, this wildcard can't go down on its own" }, discard];
      }
      return [play(place), discard];
    }
    case "rent": {
      const options = rentOptions(ctx.me, card).map((o) => ({ ...o, disabled: o.amount === 0 }));
      // each double the rent is a play on top of the rent card, so only offer as many as there are plays for
      const doubleRentIds = ctx.me.hand
        .filter((c) => c.type === "action" && c.action === "double-the-rent")
        .map((c) => c.id)
        .slice(0, Math.max(0, ctx.playsLeft - 1));
      const charge: CardAction = {
        id: "rent",
        label: card.colours === "any" ? "Charge one player rent…" : "Charge everyone rent…",
        colours: options,
        targets: card.colours === "any" ? ctx.opponents.map((o) => o.id) : undefined,
        doubleRentIds,
      };
      // blocked outright when there's nothing to charge for
      const rentAction = options.every((o) => o.disabled)
        ? { ...charge, disabled: true, reason: "You don't have any properties in these colours" }
        : play(charge);
      return [bank, rentAction, discard];
    }
    case "action": {
      if (card.action === "house" || card.action === "hotel") {
        const colours = buildableColours(ctx.me.properties, card.action);
        const buildOn: CardAction = {
          id: "add-to-set",
          label: "Build on a set…",
          colours: colours.map((colour) => ({ colour })),
        };
        const reason = card.action === "house"
          ? "You need a complete set to build on (not railroads or utilities)"
          : "You need a complete set with a house on it";
        return [bank, colours.length ? play(buildOn) : { ...buildOn, disabled: true, reason }, discard];
      }
      if (card.action in STEAL_OPTIONS) {
        // only offer players who have something to take
        const kind = card.action as StealKind;
        const targets = ctx.opponents
          .filter((o) => canSteal(kind, o.properties, ctx.me.properties))
          .map((o) => o.id);
        const steal: CardAction = { id: "play-on-player", label: STEAL_OPTIONS[kind].label, targets, pick: kind };
        return [bank, targets.length ? play(steal) : { ...steal, disabled: true, reason: STEAL_OPTIONS[kind].reason }, discard];
      }
      const option = playOption(card.action, ctx.opponents.map((o) => o.id));
      return [bank, ...(option ? [play(option)] : []), discard];
    }
  }
}

// turns a menu choice into a move, null means that action isn't built yet
export function toMove(card: Card, actionId: CardActionId, choice: ActionChoice = {}): Move | null {
  const cardId = card.id;
  switch (actionId) {
    case "bank":
    case "play":
    case "discard":
      return { type: actionId, cardId };
    case "place-property":
      return { type: "place-property", cardId, colour: choice.colour };
    case "add-to-set":
      return { type: "build", cardId, colour: choice.colour! };
    case "rent":
      return {
        type: "rent",
        cardId,
        colour: choice.colour!, // the menu always asks for one, the game logic rejects it if not
        targetId: choice.targetId,
        doubleRentIds: choice.doubleRentIds,
      };
    case "play-on-player":
      return { type: "play", cardId, targetId: choice.targetId, takeId: choice.takeId, giveId: choice.giveId };
    default:
      return null;
  }
}
