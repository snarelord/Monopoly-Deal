import { useState } from "react";
import type { Card as CardType, Move, Player } from "@/lib/types";
import { autoPay, cardsTotal, payableCards } from "@/lib/payment";
import Card from "@/components/Card";

interface PaymentPanelProps {
  me: Player;
  amount: number;
  toPlayerId: number;
  onMove: (move: Move) => void;
}

// shown to a player who owes money: pick cards from your bank and properties, or let it pick for you
export default function PaymentPanel({ me, amount, toPlayerId, onMove }: PaymentPanelProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const payable = payableCards(me);
  const bank = payable.filter((c) => me.bank.includes(c));
  const properties = payable.filter((c) => !me.bank.includes(c));
  const total = cardsTotal(payable.filter((c) => selected.includes(c.id)));
  // no change given, so it has to cover the amount, unless it's everything you've got
  const canPay = total >= amount || (selected.length > 0 && selected.length === payable.length);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const cardGroup = (title: string, cards: CardType[]) =>
    cards.length > 0 && (
      <section>
        <div className="mb-1 text-xs font-semibold">{title}</div>
        <ul className="flex flex-wrap gap-2">
          {cards.map((card) => {
            const isSelected = selected.includes(card.id);
            return (
              <li key={card.id}>
                <button
                  type="button"
                  data-cy="pay-card"
                  data-selected={isSelected}
                  aria-pressed={isSelected}
                  onClick={() => toggle(card.id)}
                  className={`block w-[calc(var(--card-w)*0.8)] cursor-pointer rounded-md transition-transform ${
                    isSelected ? "-translate-y-1 outline-3 outline-green-600" : "opacity-80 hover:opacity-100"
                  }`}
                >
                  <Card card={card} className="rounded-md" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    );

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4">
      <div
        data-cy="payment-panel"
        role="dialog"
        aria-label={`Pay Player ${toPlayerId + 1}`}
        className="flex max-h-full w-full max-w-2xl flex-col gap-3 rounded-lg bg-white p-4 text-black shadow-xl"
      >
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold">
            Pay Player {toPlayerId + 1} {amount}M
          </h2>
          <span data-cy="pay-total" data-total={total} className={total >= amount ? "text-green-700" : ""}>
            Selected: {total}M
          </span>
        </div>
        <p className="text-xs text-black/60">No change is given. Click cards to choose what to pay with.</p>

        <div className="flex flex-col gap-3 overflow-y-auto">
          {cardGroup("Bank", bank)}
          {cardGroup("Properties", properties)}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            data-cy="pay-auto"
            onClick={() => onMove({ type: "pay", cardIds: autoPay(me, amount) })}
            className="cursor-pointer rounded border-2 border-black px-3 py-1"
          >
            Pay automatically
          </button>
          <button
            type="button"
            data-cy="pay-submit"
            disabled={!canPay}
            onClick={() => onMove({ type: "pay", cardIds: selected })}
            className="cursor-pointer rounded bg-green-700 px-3 py-1 text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Pay {total}M
          </button>
        </div>
      </div>
    </div>
  );
}
