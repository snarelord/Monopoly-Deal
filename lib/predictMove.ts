import { addToSet } from "./gameHelpers";
import type { PlayerView } from "./playerView";
import type { Move } from "./types";

// how the board will look once a move is saved, for moves whose result can't surprise anyone.
// the rest depend on the hidden deck or another player, so they wait for the server.
// runs again on each new view while the move is saving, so a card that's already moved is left alone
export function predictMove(view: PlayerView, move: Move): PlayerView {
  if (move.type !== "bank" && move.type !== "place-property") return view;

  const { me, turn } = view;
  const card = me.hand.find((c) => c.id === move.cardId);
  if (!card || turn.playBlockedReason) return view;

  const hand = me.hand.filter((c) => c.id !== card.id);
  const playsLeft = turn.playsLeft - 1;
  const played = {
    ...view,
    turn: { ...turn, playsLeft, playBlockedReason: playsLeft === 0 ? "No plays left this turn" : null },
  };

  if (move.type === "bank") return { ...played, me: { ...me, hand, bank: [...me.bank, card] } };

  const colour = card.type === "property" ? card.colour : card.type === "wildcard" ? move.colour : undefined;
  if (!colour) return view;
  return { ...played, me: { ...me, hand, properties: addToSet(me.properties, card, colour) } };
}
