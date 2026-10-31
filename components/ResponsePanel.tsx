import type { Card, Move, Player } from "@/lib/types";

interface ResponsePanelProps {
  me: Player;
  pendingCard: Card;
  debt: { playerId: number; amount: number; toPlayerId: number; status: string; sayNoCount: number };
  onMove: (move: Move) => void;
}

/*
  shown when it's your move on a pending action and you're holding a just say no:
  - as the debtor (responding): say no, or accept and go on to pay
  - as the player who played the action (countering): say no back, or let their just say no stand
*/
export default function ResponsePanel({ me, pendingCard, debt, onMove }: ResponsePanelProps) {
  const sayNo = me.hand.find((c) => c.type === "action" && c.action === "just-say-no");
  const countering = debt.status === "countering";
  const debtorId = countering ? debt.playerId : undefined;

  const heading = countering
    ? `Player ${debt.playerId + 1} said Just Say No to your ${pendingCard.name}`
    : debt.sayNoCount > 0
      ? `Player ${debt.toPlayerId + 1} said no back! You owe ${debt.amount}M again`
      : `Player ${debt.toPlayerId + 1} played ${pendingCard.name}: you owe ${debt.amount}M`;

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
          {countering
            ? "Play your own Just Say No to cancel theirs, or let it stand."
            : "Play a Just Say No to cancel it, or accept and pay."}
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            data-cy="respond-accept"
            onClick={() => onMove({ type: "accept", debtorId })}
            className="cursor-pointer rounded border-2 border-black px-3 py-1"
          >
            {countering ? "Let it go" : "Accept"}
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
