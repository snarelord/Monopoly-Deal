import { useState } from "react";
import type { ReactNode } from "react";
import type { Card as CardType, OpponentView, Player, PropertySet } from "@/lib/types";
import { SETS, isComplete } from "@/lib/types";
import { completeSets, looseProperties, type StealKind } from "@/lib/steal";
import Banner from "@/components/Banner";
import Card from "@/components/Card";
import CardChoice from "@/components/CardChoice";
import { COLOUR_STYLES, colourName } from "@/components/colourStyles";
import MomentScreen from "@/components/MomentScreen";
import { ActionPanel, LABEL, QUIET_LINK, STEP_LABEL, STEP_PANEL } from "@/components/SetupScreen";

interface StealPickerProps {
  kind: StealKind;
  target: OpponentView;
  me: Player;
  onConfirm: (takeId: string, giveId?: string) => void;
  onCancel: () => void;
}

const TITLES: Record<StealKind, string> = {
  "sly-deal": "Take from",
  "forced-deal": "Swap with",
  "deal-breaker": "Take a set from",
};

const CONFIRM: Record<StealKind, string> = {
  "sly-deal": "Take it",
  "forced-deal": "Swap",
  "deal-breaker": "Take this set",
};

const PICK: Record<StealKind, string> = {
  "sly-deal": "Pick a property to take",
  "forced-deal": "Pick one to take and one to give",
  "deal-breaker": "Pick a complete set",
};

function SetGroup({ set, faded = false, children }: { set: PropertySet; faded?: boolean; children: ReactNode }) {
  return (
    <div className={faded ? "opacity-40" : ""}>
      <div className={`mb-2 flex justify-between gap-3 px-2 pt-0.5 font-heading text-base leading-tight ${COLOUR_STYLES[set.colour]}`}>
        <span className="capitalize">{colourName(set.colour)}</span>
        <span>
          {set.cards.length}/{SETS[set.colour].size}
        </span>
      </div>
      <ul className="flex gap-2">{children}</ul>
    </div>
  );
}

// a card that's on show but can't be picked
const Locked = ({ card }: { card: CardType }) => (
  <li className="w-[calc(var(--card-w)*0.9)]">
    <Card card={card} className="rounded-lg" />
  </li>
);

export default function StealPicker({ kind, target, me, onConfirm, onCancel }: StealPickerProps) {
  const [takeId, setTakeId] = useState<string | null>(null);
  const [giveId, setGiveId] = useState<string | null>(null);
  const ready = takeId !== null && (kind !== "forced-deal" || giveId !== null);

  const allCards = [...target.properties, ...me.properties].flatMap((set) => set.cards);
  const nameOf = (id: string | null) => allCards.find((card) => card.id === id)?.name;

  const looseGroups = (sets: PropertySet[], picked: string | null, pick: (id: string) => void, dataCy: string) => {
    const loose = looseProperties(sets);
    return sets.map((set) => (
      <SetGroup key={set.cards[0].id} set={set} faded={isComplete(set)}>
        {set.cards.map((card) =>
          loose.some((c) => c.id === card.id) ? (
            <li key={card.id}>
              <CardChoice card={card} selected={picked === card.id} onClick={() => pick(card.id)} dataCy={dataCy} />
            </li>
          ) : (
            <Locked key={card.id} card={card} />
          ),
        )}
      </SetGroup>
    ));
  };

  return (
    <MomentScreen
      data-cy="steal-picker"
      data-kind={kind}
      role="dialog"
      aria-modal="true"
      aria-label={`${TITLES[kind]} ${target.name}`}
      columns="lg:grid-cols-[minmax(0,10fr)_minmax(0,2fr)]"
      banner={
        <Banner title={TITLES[kind]} accent={target.name}>
          <button type="button" data-cy="steal-cancel" onClick={onCancel} className={`cursor-pointer ${QUIET_LINK}`}>
            Cancel
          </button>
        </Banner>
      }
    >
      <div className="flex min-w-0 flex-col lg:col-start-1 lg:row-start-1">
        <section className="flex-1 px-(--gutter) py-4">
          {kind === "deal-breaker" ? (
            <>
              <h2 className={`${LABEL} mb-3`}>{target.name}&apos;s complete sets</h2>
              <div className="flex flex-wrap gap-5">
                {completeSets(target.properties).map((set) => {
                  const id = set.cards[0].id;
                  return (
                    <button
                      key={id}
                      type="button"
                      data-cy="steal-set"
                      data-colour={set.colour}
                      aria-pressed={takeId === id}
                      onClick={() => setTakeId(id)}
                      className={`cursor-pointer rounded-lg p-1 text-left ${takeId === id ? "outline-3 outline-highlight" : "hover:bg-paper/10"}`}
                    >
                      <SetGroup set={set}>
                        {[...set.cards, set.house, set.hotel].map((card) => card && <Locked key={card.id} card={card} />)}
                      </SetGroup>
                    </button>
                  );
                })}
                {target.properties
                  .filter((set) => !isComplete(set))
                  .map((set) => (
                    <SetGroup key={set.cards[0].id} set={set} faded>
                      {set.cards.map((card) => (
                        <Locked key={card.id} card={card} />
                      ))}
                    </SetGroup>
                  ))}
              </div>
            </>
          ) : (
            <>
              <h2 className={`${LABEL} mb-3`}>Take one from {target.name}</h2>
              <div className="flex flex-wrap gap-5">{looseGroups(target.properties, takeId, setTakeId, "steal-take")}</div>
            </>
          )}
        </section>

        {kind === "forced-deal" && (
          <section className="flex-1 bg-secondary px-(--gutter) py-4">
            <h2 className={`${LABEL} mb-3`}>Give one of yours</h2>
            <div className="flex flex-wrap gap-5">{looseGroups(me.properties, giveId, setGiveId, "steal-give")}</div>
          </section>
        )}
      </div>

      <ActionPanel
        type="button"
        data-cy="steal-confirm"
        disabled={!ready}
        onClick={() => onConfirm(takeId!, giveId ?? undefined)}
        hint={
          !ready
            ? PICK[kind]
            : kind === "forced-deal"
              ? `Their ${nameOf(takeId)} for your ${nameOf(giveId)}`
              : kind === "sly-deal"
                ? `Take ${nameOf(takeId)}`
                : "The whole set, buildings too"
        }
        label={CONFIRM[kind]}
        labelClassName={STEP_LABEL}
        className={`${STEP_PANEL} lg:col-start-2 lg:row-start-1`}
      />
    </MomentScreen>
  );
}
