import type { Card as CardType, Move, PendingEffect, Player } from "@/lib/types";
import { cardData } from "@/lib/cardData";
import { setContaining } from "@/lib/steal";
import Banner from "@/components/Banner";
import Card from "@/components/Card";
import { colourName } from "@/components/colourStyles";
import MomentScreen from "@/components/MomentScreen";
import { ActionPanel, LABEL, STEP_LABEL } from "@/components/SetupScreen";

const ANSWER = "flex-1 [--gutter:1rem] max-md:min-h-0 max-md:py-2";

interface ResponsePanelProps {
  me: Player;
  pendingCard: CardType;
  effect: PendingEffect;
  debt: { playerId: number; amount: number; toPlayerId: number; status: string; sayNoCount: number };
  names: string[];
  onMove: (move: Move) => void;
}

const cardName = (id: string) => cardData.find((c) => c.id === id)?.name ?? "a property";

function stakes(effect: PendingEffect, me: Player, amount: number): string {
  switch (effect.kind) {
    case "pay":
      return `you owe ${amount}M`;
    case "sly-deal":
      return `they want to take your ${cardName(effect.takeId)}`;
    case "forced-deal":
      return `they want to swap their ${cardName(effect.giveId)} for your ${cardName(effect.takeId)}`;
    case "deal-breaker": {
      const set = setContaining(me.properties, effect.takeId);
      return `they want to take your complete ${set ? colourName(set.colour) : ""} set`;
    }
  }
}

// what they're after, for the banner and the stakes panel
function target(effect: PendingEffect, me: Player, amount: number): string {
  switch (effect.kind) {
    case "pay":
      return `${amount}M`;
    case "sly-deal":
      return cardName(effect.takeId);
    case "forced-deal":
      return cardName(effect.takeId);
    case "deal-breaker": {
      const set = setContaining(me.properties, effect.takeId);
      return `${set ? colourName(set.colour) : "complete"} set`;
    }
  }
}

export default function ResponsePanel({ me, pendingCard, effect, debt, names, onMove }: ResponsePanelProps) {
  const sayNo = me.hand.find((c) => c.type === "action" && c.action === "just-say-no");
  const countering = debt.status === "countering";
  const debtorId = countering ? debt.playerId : undefined;
  const from = names[debt.toPlayerId];
  const isPay = effect.kind === "pay";
  const wanted = target(effect, me, debt.amount);
  const bankTotal = me.bank.reduce((sum, card) => sum + card.value, 0);

  const heading = countering
    ? `${names[debt.playerId]} said Just Say No to your ${pendingCard.name}`
    : debt.sayNoCount > 0
      ? `${from} said no back! Again, ${stakes(effect, me, debt.amount)}`
      : `${from} played ${pendingCard.name}: ${stakes(effect, me, debt.amount)}`;

  const explain = !sayNo
    ? `You don't have a Just Say No, so ${countering ? "theirs stands" : isPay ? "you'll have to pay" : "it goes ahead"}.`
    : countering
      ? "Play your own Just Say No to cancel theirs, or let it stand."
      : `Play a Just Say No to cancel it, or accept and ${isPay ? "pay" : "let it happen"}.`;

  const banner = countering ? (
    <Banner title={names[debt.playerId]} accent="said no" />
  ) : debt.sayNoCount > 0 ? (
    <Banner title={from} accent="said no back" />
  ) : (
    <Banner title={`${from} wants${isPay ? "" : " your"}`} accent={wanted} />
  );

  return (
    <MomentScreen data-cy="response-panel" data-status={debt.status} role="dialog" aria-modal="true" aria-label="Just Say No?" banner={banner}>
      <section className="flex min-w-0 flex-wrap items-center gap-[clamp(20px,3vw,44px)] px-(--gutter) py-5 lg:col-start-1 lg:row-start-1">
        <div className="w-[calc(var(--card-w)*1.7)] flex-none">
          <Card card={pendingCard} className="rounded-xl shadow-lg" />
        </div>
        <div className="max-w-[34em] min-w-0 flex-[1_1_16rem]">
          <p className="mb-3 font-heading text-4xl leading-none wrap-break-word">{heading}</p>
          <p className="text-paper/80">{explain}</p>
        </div>
      </section>

      <aside aria-label="At stake" className="flex min-w-0 flex-col gap-2 bg-secondary px-(--gutter) py-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <h2 className={LABEL}>At stake</h2>
        <p className="font-heading text-6xl leading-[0.95] wrap-break-word">{wanted}</p>
        <p className="text-sm text-paper/80">Your bank: {bankTotal}M</p>
      </aside>

      <div className="flex min-w-0 flex-col max-md:sticky max-md:bottom-0 max-md:z-20 max-md:flex-row max-lg:order-last lg:col-start-3 lg:row-span-2 lg:row-start-1">
        <ActionPanel
          type="button"
          data-cy="respond-accept"
          onClick={() => onMove({ type: "accept", debtorId })}
          tone={sayNo ? "paper" : "orange"}
          hint={isPay && !countering ? `Pay ${from} ${debt.amount}M` : "Let it happen"}
          label={!sayNo ? "OK" : countering ? "Let it go" : "Accept"}
          labelClassName={STEP_LABEL}
          className={ANSWER}
        />
        <ActionPanel
          type="button"
          data-cy="respond-say-no"
          disabled={!sayNo}
          onClick={() => sayNo && onMove({ type: "just-say-no", cardId: sayNo.id, debtorId })}
          hint={sayNo ? "Cancels it and uses your card" : "You don't have one"}
          label="Just say no"
          labelClassName={STEP_LABEL}
          className={ANSWER}
        />
      </div>

      <section aria-label="Your hand" className="flex min-w-0 justify-center gap-2 px-(--gutter) pt-6 pb-5 lg:col-start-1 lg:row-start-2">
        {me.hand.map((card) => (
          <div
            key={card.id}
            className={`max-w-[calc(var(--card-w)*0.9)] min-w-0 flex-1 ${card.id === sayNo?.id ? "-translate-y-3 rounded-lg outline-3 outline-offset-1 outline-highlight" : "opacity-45"}`}
          >
            <Card card={card} className="rounded-lg" />
          </div>
        ))}
      </section>
    </MomentScreen>
  );
}
