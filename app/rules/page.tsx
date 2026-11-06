import type { ReactNode } from "react";
import BackLink from "@/components/BackLink";
import SetupScreen, { PANEL } from "@/components/SetupScreen";
import { COLOUR_STYLES, colourName } from "@/components/colourStyles";
import { BIRTHDAY_AMOUNT, DEBT_COLLECTOR_AMOUNT, HAND_LIMIT, PLAYS_PER_TURN, SETS_TO_WIN } from "@/lib/gameHelpers";
import { HOTEL_RENT, HOUSE_RENT } from "@/lib/rent";
import { COLOURS, SETS, type Colour } from "@/lib/types";

const HEADING = "font-heading text-[clamp(36px,4vw,60px)] leading-none";
const BAND = "flex min-w-0 flex-col gap-6 px-(--gutter) py-[clamp(28px,4vw,56px)] lg:col-span-full";

const SET_NAMES: Partial<Record<Colour, string>> = { railroad: "Stations", utility: "Utilities" };

const TURN = [
  { term: "Draw", text: "Draw 2 cards. If your hand is empty, draw 5 instead." },
  { term: "Play", text: `Play up to ${PLAYS_PER_TURN} cards, or none at all.` },
  { term: "End", text: `End your turn. With more than ${HAND_LIMIT} cards, you discard down to ${HAND_LIMIT} first.` },
];

const PLACES = [
  { term: "Your bank", text: "Money, action and rent cards, used to pay what you owe. Once banked, they only count as money." },
  { term: "Your property pile", text: "Properties and wild properties, sorted into sets. They can't be banked." },
  { term: "The action pile", text: "Action and rent cards played for what they do. It's shuffled back in when the draw pile runs out." },
];

const CARDS = [
  {
    group: "Money and wilds",
    cards: [
      { image: "5m", name: "Money", text: "Goes in your bank. Notes run from 1M to 10M." },
      {
        image: "orange-pink-wild-property",
        name: "Wild property",
        text: "Counts as either of its two colours. You choose when you place it, and can switch it on your turn without using a play.",
      },
      {
        image: "wild-property",
        name: "Any colour wild",
        text: "Joins a set you've already started, but can't start one. It's worth nothing, so it can't be used to pay.",
      },
    ],
  },
  {
    group: "Get paid",
    cards: [
      {
        image: "rent-red-or-yellow",
        name: "Rent",
        text: "Every other player pays rent on one of the card's two colours. You need a property in that colour placed in your property pile.",
      },
      { image: "rent-any-colour", name: "Any colour rent", text: "One player of your choice pays rent on any chosen colour you have placed in your property pile." },
      {
        image: "double-rent",
        name: "Double the Rent",
        text: "Played with a rent card, and uses a play of its own. Two of them charge four times the rent.",
      },
      { image: "debt-collector", name: "Debt Collector", text: `One player of your choice pays you ${DEBT_COLLECTOR_AMOUNT}M.` },
      { image: "birthday", name: "It's Your Birthday", text: `Every other player pays you ${BIRTHDAY_AMOUNT}M.` },
    ],
  },
  {
    group: "Take",
    cards: [
      { image: "sly-deal", name: "Sly Deal", text: "Take one property from another player, as long as it isn't part of a complete set." },
      {
        image: "forced-deal",
        name: "Forced Deal",
        text: "Swap one of your properties with one of another player's. Neither can be part of a complete set.",
      },
      { image: "deal-breaker", name: "Deal Breaker", text: "Take a complete set from another player, with any buildings on it." },
    ],
  },
  {
    group: "Build",
    cards: [
      { image: "house", name: "House", text: `Goes on a complete set and adds ${HOUSE_RENT}M to its rent. Cannot be placed on stations or utilities.` },
      { image: "hotel", name: "Hotel", text: `Goes on a complete set with a house and adds ${HOTEL_RENT}M to its rent.` },
    ],
  },
  {
    group: "And two more",
    cards: [
      { image: "pass-go", name: "Pass Go", text: "Draw 2 more cards." },
      {
        image: "just-say-no",
        name: "Just Say No",
        text: "Stops an action aimed at you. The player who played it can say no back with their own. On your own turn it uses a play.",
      },
    ],
  },
];

const OWING = [
  "You pay from your bank and the properties and buildings in front of you, never from your hand.",
  "No change is given, so you might have to overpay.",
  "If you can't cover it, you hand over everything you can. If you have nothing to pay with, you're let off.",
  "Money and buildings go to the other player's bank, and properties go to their property pile.",
  "If a set stops being complete, any buildings on it drop into your bank.",
];

function Terms({ items }: { items: { term: string; text: string }[] }) {
  return (
    <dl className="flex flex-col gap-4">
      {items.map(({ term, text }) => (
        <div key={term}>
          <dt className="font-heading text-2xl leading-none">{term}</dt>
          <dd className="mt-1 leading-snug">{text}</dd>
        </div>
      ))}
    </dl>
  );
}

function Panel({ title, className, children }: { title: string; className: string; children: ReactNode }) {
  return (
    <section className={`${PANEL} ${className}`}>
      <h2 className={HEADING}>{title}</h2>
      {children}
    </section>
  );
}

export default function Rules() {
  return (
    <SetupScreen
      data-cy="rules"
      fit={6.25}
      back="/"
      title={
        <>
          How to play <span className="text-highlight">[</span>Deal<span className="text-highlight">]</span>
        </>
      }
    >
      <Panel title="The goal" className="">
        <p className="leading-snug text-paper/80">
          Be the first player to collect {SETS_TO_WIN} complete sets in different colours. The game ends the moment
          someone does. This is the vanilla win objective, custom rules can alter this.
        </p>
        <p className="leading-snug text-paper/80">Each player is dealt 5 cards to begin, then takes turns.</p>
      </Panel>

      <Panel title="Your turn" className="bg-secondary">
        <Terms items={TURN} />
      </Panel>

      <Panel title="Where cards go" className="bg-highlight text-primary">
        <Terms items={PLACES} />
      </Panel>

      <section className={BAND}>
        <div>
          <h2 className={HEADING}>The sets</h2>
          <p className="mt-2 max-w-[60ch] leading-snug text-paper/80">
            The more of a set you have, the higher the rent. With two sets of one colour, you charge for the higher one,
            and they only count once towards winning.
          </p>
        </div>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,14.5rem),1fr))] gap-3">
          {COLOURS.map((colour) => (
            <li key={colour} data-cy="rules-set" className="border-2 border-paper/20">
              <div className={`flex items-baseline justify-between gap-2 px-3 py-2 font-heading text-xl leading-none ${COLOUR_STYLES[colour]}`}>
                <span className="capitalize">{SET_NAMES[colour] ?? colourName(colour)}</span>
                <span>{SETS[colour].size} cards</span>
              </div>
              <ol className="flex">
                {SETS[colour].rent.map((rent, i) => (
                  <li key={i} className="flex-1 px-3 py-2">
                    <span className="block text-xs whitespace-nowrap text-paper/70">{i + 1} card{i === 0 ? "" : "s"}</span>
                    <span className="font-heading text-2xl leading-none">{rent}M</span>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${BAND} border-t border-paper/20`}>
        <h2 className={HEADING}>The cards</h2>
        {CARDS.map(({ group, cards }) => (
          <div key={group}>
            <h3 className="font-heading text-3xl leading-none text-highlight">{group}</h3>
            <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-x-8 gap-y-6">
              {cards.map(({ image, name, text }) => (
                <li key={name} data-cy="rules-card" className="flex items-start gap-4">
                  <img src={`/cards/${image}.webp`} alt="" loading="lazy" className="aspect-(--card-ratio) w-24 flex-none" />
                  <div>
                    <h4 className="font-heading text-2xl leading-none">{name}</h4>
                    <p className="mt-1 text-sm leading-snug text-paper/80">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className={`${BAND} bg-secondary`}>
        <h2 className={HEADING}>When you owe</h2>
        <ul className="flex max-w-[70ch] flex-col divide-y divide-paper/25 leading-snug">
          {OWING.map((line) => (
            <li key={line} className="py-2">{line}</li>
          ))}
        </ul>
        <BackLink />
      </section>
    </SetupScreen>
  );
}
