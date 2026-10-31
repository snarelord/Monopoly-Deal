import type { ActionType, Card, CardActionId, Colour, Move } from "./types";
import { COLOURS } from "./types";

export interface CardAction {
  id: CardActionId;
  label: string;
  disabled?: boolean;
  reason?: string; // shown as a tooltip when disabled
  colours?: Colour[]; // pick a colour before it happens (wildcards)
  targets?: number[]; // pick a player before it happens (debt collector...)
}

// what the player picked in the menu on top of the action itself
export interface ActionChoice {
  colour?: Colour;
  targetId?: number;
}

// later this grows, whose turn, phase, plays left...
export interface ActionContext {
  playBlockedReason: string | null;
  canDiscard: boolean;
  opponentIds: number[];
}

const TARGETED: ActionType[] = ["debt-collector", "sly-deal", "forced-deal", "deal-breaker"];

function playOption(action: ActionType, opponentIds: number[]): CardAction | null {
  if (TARGETED.includes(action)) return { id: "play-on-player", label: "Play against a player", targets: opponentIds };
  if (action === "pass-go") return { id: "play", label: "Play (draw 2)" };
  if (action === "birthday") return { id: "play", label: "Play (everyone pays 2M)" };
  if (action === "house" || action === "hotel") return { id: "add-to-set", label: "Add to a set" };
  if (action === "just-say-no") return null; // only played in response, so bank or discard
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
    case "wildcard":
      return [
        play({
          id: "place-property",
          label: "Place in property pile…",
          colours: card.colours === "any" ? COLOURS : [...card.colours],
        }),
        discard,
      ];
    case "rent":
      return [
        bank,
        play(
          card.colours === "any"
            ? { id: "play-on-player", label: "Charge a player" }
            : { id: "play", label: "Charge rent" },
        ),
        discard,
      ];
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
    case "play-on-player":
      // only debt collector so far, sly deal, forced deal, deal breaker and any colour rent come later
      if (card.type === "action" && card.action === "debt-collector") {
        return { type: "play", cardId, targetId: choice.targetId };
      }
      return null;
    default:
      return null;
  }
}