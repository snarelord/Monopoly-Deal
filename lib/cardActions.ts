import type { ActionType, Card, CardActionId, Colour, Move, Player } from "./types";
import { openSetColours } from "./types";
import { rentOptions } from "./rent";

// a colour the player can pick, with the rent it would charge for rent cards
export interface ColourOption {
  colour: Colour;
  amount?: number;
  disabled?: boolean;
}

/*
  an option in a card's menu. some need choices first, asked in this order:
  colour (wildcards, rent), then player (debt collector, any colour rent), then double the rent
*/
export interface CardAction {
  id: CardActionId;
  label: string;
  disabled?: boolean;
  reason?: string; // shown as a tooltip when disabled
  colours?: ColourOption[];
  targets?: number[];
  doubleRentIds?: string[]; // double the rent cards that could go with it, offered as "no / double / double twice"
}

// what the player picked in the menu on top of the action itself
export interface ActionChoice {
  colour?: Colour;
  targetId?: number;
  doubleRentIds?: string[];
}

// later this grows, whose turn, phase...
export interface ActionContext {
  playBlockedReason: string | null;
  canDiscard: boolean;
  opponentIds: number[];
  me: Player;
  playsLeft: number;
}

const TARGETED: ActionType[] = ["debt-collector", "sly-deal", "forced-deal", "deal-breaker"];

function playOption(action: ActionType, opponentIds: number[]): CardAction | null {
  if (TARGETED.includes(action)) return { id: "play-on-player", label: "Play against a player", targets: opponentIds };
  if (action === "pass-go") return { id: "play", label: "Play (draw 2)" };
  if (action === "birthday") return { id: "play", label: "Play (everyone pays 2M)" };
  if (action === "house" || action === "hotel") return { id: "add-to-set", label: "Add to a set" };
  if (action === "just-say-no") return null; // only played in response, so bank or discard
  if (action === "double-the-rent") return null; // chosen from a rent card's menu instead
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
        targets: card.colours === "any" ? ctx.opponentIds : undefined,
        doubleRentIds,
      };
      // blocked outright when there's nothing to charge for
      const rentAction = options.every((o) => o.disabled)
        ? { ...charge, disabled: true, reason: "You don't have any properties in these colours" }
        : play(charge);
      return [bank, rentAction, discard];
    }
    case "action": {
      const option = playOption(card.action, ctx.opponentIds);
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
    case "rent":
      return {
        type: "rent",
        cardId,
        colour: choice.colour!, // the menu always asks for one, the game logic rejects it if not
        targetId: choice.targetId,
        doubleRentIds: choice.doubleRentIds,
      };
    case "play-on-player":
      // only debt collector so far, sly deal, forced deal and deal breaker come later
      if (card.type === "action" && card.action === "debt-collector") {
        return { type: "play", cardId, targetId: choice.targetId };
      }
      return null;
    default:
      return null;
  }
}
