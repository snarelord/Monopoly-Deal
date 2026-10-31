import type { ActionType, Card, Colour } from "./types";
import { COLOURS } from "./types";

export type CardActionId =
  | "bank" | "play" | "play-on-player" | "add-to-set"
  | "place-property" | "pay-player" | "discard";

export interface CardAction {
  id: CardActionId;
  label: string;
  disabled?: boolean;
  reason?: string; // shown as a tooltip when disabled
  colours?: Colour[];
}

// later this grows, whose turn, phase, plays left...
export interface ActionContext {
  playBlockedReason: string | null;
  canDiscard: boolean;
}

const TARGETED: ActionType[] = ["debt-collector", "sly-deal", "forced-deal", "deal-breaker"];

function playOption(action: ActionType): CardAction | null {
  if (TARGETED.includes(action)) return { id: "play-on-player", label: "Play against a player" };
  if (action === "pass-go") return { id: "play", label: "Play (draw 2)" };
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
        card.colours === "any"
          ? { id: "play-on-player", label: "Charge a player" }
          : { id: "play", label: "Charge rent" },
        discard,
      ];
    case "action": {
      const option = playOption(card.action);
      return [bank, ...(option ? [option] : []), discard];
    }
  }
}