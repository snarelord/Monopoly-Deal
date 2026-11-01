import type { Card, Move, PendingEffect, Player } from "@/lib/types";
import { cardData } from "@/lib/cardData";
import { setContaining } from "@/lib/steal";
import { colourName } from "@/components/colourStyles";

interface ResponsePanelProps {
  me: Player;
  pendingCard: Card;
  effect: PendingEffect;
  debt: { playerId: number; amount: number; toPlayerId: number; status: string; sayNoCount: number };
  names: string[];
  onMove: (move: Move) => void;
}

function stakes(effect: PendingEffect, me: Player, amount: number): string {
  const name = (id: string) => cardData.find((c) => c.id === id)?.name ?? "a property";
  switch (effect.kind) {
    case "pay":
      return `you owe ${amount}M`;
    case "sly-deal":
      return `they want to take your ${name(effect.takeId)}`;
    case "forced-deal":
      return `they want to swap their ${name(effect.giveId)} for your ${name(effect.takeId)}`;
    case "deal-breaker": {
      const set = setContaining(me.properties, effect.takeId);
      return `they want to take your complete ${set ? colourName(set.colour) : ""} set`;
    }
  }
}

export default function ResponsePanel({ me, pendingCard, effect, debt, names, onMove }: ResponsePanelProps) {
  const sayNo = me.hand.find((c) => c.type === "action" && c.action === "just-say-no");
  const countering = debt.status === "countering";
  const debtorId = countering ? debt.playerId : undefined;

  const heading = countering
    ? `${names[debt.playerId]} said Just Say No to your ${pendingCard.name}`
    : debt.sayNoCount > 0
      ? `${names[debt.toPlayerId]} said no back! Again, ${stakes(effect, me, debt.amount)}`
      : `${names[debt.toPlayerId]} played ${pendingCard.name}: ${stakes(effect, me, debt.amount)}`;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4">
      <div
        data-cy="response-panel"
        data-status={debt.status}
        role="dialog"
        aria-label="Just Say No?"
        className="flex w-full max-w-md flex-col gap-3 rounded-lg bg-white p-4 text-black shadow-xl"
      >
        <h2 className="text-lg font-semibold">{heading}</h2>
        <p className="text-sm text-black/70">
          {!sayNo
            ? `You don't have a Just Say No, so ${countering ? "theirs stands" : effect.kind === "pay" ? "you'll have to pay" : "it goes ahead"}.`
            : countering
              ? "Play your own Just Say No to cancel theirs, or let it stand."
              : `Play a Just Say No to cancel it, or accept and ${effect.kind === "pay" ? "pay" : "let it happen"}.`}
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            data-cy="respond-accept"
            onClick={() => onMove({ type: "accept", debtorId })}
            className="cursor-pointer rounded border-2 border-black px-3 py-1"
          >
            {!sayNo ? "OK" : countering ? "Let it go" : "Accept"}
          </button>
          <button
            type="button"
            data-cy="respond-say-no"
            disabled={!sayNo}
            onClick={() => sayNo && onMove({ type: "just-say-no", cardId: sayNo.id, debtorId })}
            className="cursor-pointer rounded bg-red-700 px-3 py-1 text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Just Say No!
          </button>
        </div>
      </div>
    </div>
  );
}
