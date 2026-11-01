"use client";

import { useState, type ReactNode } from "react";
import { CUSTOMISE_RULES_FEATURE } from "@/lib/featureFlag";

// PLANNED: none of these change the game yet. once they do, hot-seat passes them to beginGame and online saves them with the room
interface Rules {
  win: "three-sets" | "three-sets-eight-properties" | "four-sets";
  sayNo: "free" | "uses-a-play";
  doubleDeck: boolean;
  keepDuplicateProperties: boolean;
  noDealBreakers: boolean;
  theGamble: boolean;
  wildcardStartsSet: boolean;
  noMercy: boolean;
  auctions: boolean;
  autoEndTurn: boolean;
}

const STANDARD: Rules = {
  win: "three-sets",
  sayNo: "free",
  doubleDeck: false,
  keepDuplicateProperties: false,
  noDealBreakers: false,
  theGamble: false,
  wildcardStartsSet: false,
  noMercy: false,
  auctions: false,
  autoEndTurn: false,
};

export default function HouseRules() {
  const [rules, setRules] = useState(STANDARD);
  const change = (update: Partial<Rules>) => setRules((r) => ({ ...r, ...update }));

  return (
    <details data-cy="house-rules" className="rounded border-2 border-black/20 bg-white/60 px-3 py-2">
      <summary className="cursor-pointer text-sm font-semibold">
        House rules
        {!CUSTOMISE_RULES_FEATURE && <span className="ml-2 text-xs font-normal text-black/60">Coming soon</span>}
      </summary>

      {/* a disabled fieldset disables every control inside it */}
      <fieldset disabled={!CUSTOMISE_RULES_FEATURE} className="mt-3 flex flex-col gap-4">
        <Group title="To win">
          <Choice name="win" cy="rule-win-three-sets" checked={rules.win === "three-sets"} onPick={() => change({ win: "three-sets" })}>
            3 complete sets
          </Choice>
          <Choice
            name="win"
            cy="rule-win-eight-properties"
            checked={rules.win === "three-sets-eight-properties"}
            onPick={() => change({ win: "three-sets-eight-properties" })}
          >
            3 complete sets and at least 8 properties
          </Choice>
          <Choice name="win" cy="rule-win-four-sets" checked={rules.win === "four-sets"} onPick={() => change({ win: "four-sets" })}>
            4 complete sets
            {rules.doubleDeck && <Hint>Recommended with a double deck</Hint>}
          </Choice>
        </Group>

        <Group title="Just Say No on someone else's turn">
          <Choice name="say-no" cy="rule-say-no-free" checked={rules.sayNo === "free"} onPick={() => change({ sayNo: "free" })}>
            Doesn&apos;t cost a play
          </Choice>
          <Choice
            name="say-no"
            cy="rule-say-no-uses-a-play"
            checked={rules.sayNo === "uses-a-play"}
            onPick={() => change({ sayNo: "uses-a-play" })}
          >
            Uses one of your plays on your next turn
          </Choice>
        </Group>

        <Group title="Cards">
          <Toggle cy="rule-double-deck" checked={rules.doubleDeck} onToggle={(on) => change({ doubleDeck: on })}>
            Double the deck
            <Hint>Two decks shuffled together. Best with 4 or 5 players.</Hint>
          </Toggle>
          <div className="pl-6">
            <Toggle
              cy="rule-keep-duplicates"
              checked={rules.keepDuplicateProperties}
              disabled={!rules.doubleDeck}
              onToggle={(on) => change({ keepDuplicateProperties: on })}
            >
              Keep the duplicate properties
              <Hint>Otherwise the second deck&apos;s properties are taken out.</Hint>
            </Toggle>
          </div>
          <Toggle cy="rule-no-deal-breakers" checked={rules.noDealBreakers} onToggle={(on) => change({ noDealBreakers: on })}>
            Remove the Deal Breakers
          </Toggle>
          <Toggle cy="rule-the-gamble" checked={rules.theGamble} onToggle={(on) => change({ theGamble: on })}>
            The Gamble
            <Hint>
              One rare card that swaps your whole hand with another player&apos;s, without seeing it first. A Just Say No
              stops it.
            </Hint>
          </Toggle>
          <Toggle cy="rule-wildcard-starts-set" checked={rules.wildcardStartsSet} onToggle={(on) => change({ wildcardStartsSet: on })}>
            Any colour wildcards can start a set
            <Hint>Instead of only joining a set you&apos;ve already started.</Hint>
          </Toggle>
        </Group>

        <Group title="Turns">
          <Toggle cy="rule-no-mercy" checked={rules.noMercy} onToggle={(on) => change({ noMercy: on })}>
            No mercy
            <Hint>
              Can&apos;t cover a debt with your bank and properties? Take a debt chip, and pay it off on later turns with
              cards from your hand.
            </Hint>
          </Toggle>
          <Toggle cy="rule-auctions" checked={rules.auctions} onToggle={(on) => change({ auctions: on })}>
            Property auctions
            <Hint>Sell or auction a property card. It uses your turn, and the money goes to the seller.</Hint>
          </Toggle>
          <Toggle cy="rule-auto-end-turn" checked={rules.autoEndTurn} onToggle={(on) => change({ autoEndTurn: on })}>
            End turns automatically
            <Hint>Your turn ends by itself once your plays are used up.</Hint>
          </Toggle>
        </Group>
      </fieldset>
    </details>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-xs font-semibold tracking-wide text-black/60 uppercase">{title}</legend>
      {children}
    </fieldset>
  );
}

const option = "flex cursor-pointer items-start gap-2 text-sm has-disabled:cursor-not-allowed has-disabled:opacity-50";

function Choice(props: { name: string; cy: string; checked: boolean; onPick: () => void; children: ReactNode }) {
  return (
    <label className={option}>
      <input type="radio" name={props.name} data-cy={props.cy} checked={props.checked} onChange={props.onPick} className="mt-1" />
      <span>{props.children}</span>
    </label>
  );
}

function Toggle(props: { cy: string; checked: boolean; disabled?: boolean; onToggle: (on: boolean) => void; children: ReactNode }) {
  return (
    <label className={option}>
      <input
        type="checkbox"
        data-cy={props.cy}
        checked={props.checked}
        disabled={props.disabled}
        onChange={(event) => props.onToggle(event.target.checked)}
        className="mt-1"
      />
      <span>{props.children}</span>
    </label>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <span className="block text-xs text-black/60">{children}</span>;
}
