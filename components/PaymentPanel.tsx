import { useState } from "react";
import type { Card as CardType, Move, Player } from "@/lib/types";
import { autoPay, cardsTotal, payableCards } from "@/lib/payment";
import Banner from "@/components/Banner";
import CardChoice from "@/components/CardChoice";
import MomentScreen from "@/components/MomentScreen";
import { ActionPanel, LABEL, STEP_LABEL, STEP_PANEL } from "@/components/SetupScreen";

interface PaymentPanelProps {
  me: Player;
  amount: number;
  toName: string;
  onMove: (move: Move) => void;
}

export default function PaymentPanel({ me, amount, toName, onMove }: PaymentPanelProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const payable = payableCards(me);
  const bank = payable.filter((c) => me.bank.includes(c));
  const onTable = payable.filter((c) => !me.bank.includes(c));
  const properties = onTable.filter((c) => c.type === "property" || c.type === "wildcard");
  const buildings = onTable.filter((c) => c.type === "action");
  const total = cardsTotal(payable.filter((c) => selected.includes(c.id)));
  // no change given, so it has to cover the amount, unless it's everything you've got
  const everything = selected.length > 0 && selected.length === payable.length;
  const canPay = total >= amount || everything;

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const cardGroup = (title: string, cards: CardType[]) =>
    cards.length > 0 && (
      <section>
        <h2 className={`${LABEL} mb-3`}>{title}</h2>
        <ul className="flex flex-wrap gap-3">
          {cards.map((card) => (
            <li key={card.id}>
              <CardChoice card={card} selected={selected.includes(card.id)} onClick={() => toggle(card.id)} dataCy="pay-card" />
            </li>
          ))}
        </ul>
      </section>
    );

  const note =
    total > amount
      ? `That's ${total - amount}M over, and you won't get change.`
      : everything && total < amount
        ? "That's everything you've got."
        : null;

  return (
    <MomentScreen
      data-cy="payment-panel"
      role="dialog"
      aria-modal="true"
      aria-label={`Pay ${toName}`}
      banner={
        <Banner title={`Pay ${toName}`} accent={`${amount}M`}>
          No change is given
        </Banner>
      }
    >
      <aside
        aria-label="Your payment"
        className="flex min-w-0 flex-col gap-3 bg-secondary px-(--gutter) py-4 lg:col-start-2 lg:row-start-1"
      >
        <h2 className={LABEL}>Paying</h2>
        <p data-cy="pay-total" data-total={total} className="font-heading text-7xl leading-[0.9]">
          {total}M <span className="text-3xl text-paper/80">of {amount}M</span>
        </p>
        {note && <p className="text-sm text-[#f7b36a]">{note}</p>}
        <button
          type="button"
          data-cy="pay-auto"
          onClick={() => onMove({ type: "pay", cardIds: autoPay(me, amount) })}
          className="mt-auto h-12 cursor-pointer border-2 border-paper/35 font-heading text-2xl hover:border-paper"
        >
          Pay automatically
        </button>
      </aside>

      <div className="min-w-0 px-(--gutter) pt-4 pb-2 lg:col-span-2 lg:col-start-1 lg:row-start-2 lg:pb-5">{cardGroup("Bank", bank)}</div>

      <div className="flex min-w-0 flex-col gap-5 px-(--gutter) py-4 lg:col-start-1 lg:row-start-1">
        {cardGroup("Properties", properties)}
        {cardGroup("Buildings", buildings)}
      </div>

      <ActionPanel
        type="button"
        data-cy="pay-submit"
        disabled={!canPay}
        onClick={() => onMove({ type: "pay", cardIds: selected })}
        hint={canPay ? `${selected.length} ${selected.length === 1 ? "card" : "cards"} chosen` : `Choose ${amount - total}M more`}
        label={`Pay ${total}M`}
        labelClassName={STEP_LABEL}
        className={`${STEP_PANEL} lg:col-start-3 lg:row-span-2 lg:row-start-1`}
      />
    </MomentScreen>
  );
}
