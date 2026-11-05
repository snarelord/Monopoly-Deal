import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfo } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import MenuCard from "@/components/MenuCard";

// on desktop these sit below the screen edge, rising on hover like a card picked out of a hand
const SIDE_CARD =
  "[--w:min(42vw,220px)] lg:[--w:clamp(150px,16.4vw,236px)] lg:mb-[calc(var(--w)*-0.52)] lg:hover:translate-y-[calc(var(--w)*-0.54)] lg:focus-visible:translate-y-[calc(var(--w)*-0.54)]";

export default function Landing() {
  return (
    <main
      data-cy="landing"
      className="grid min-h-dvh gap-x-[clamp(24px,4vw,56px)] overflow-clip bg-primary px-[clamp(20px,5vw,72px)] text-paper lg:grid-cols-[minmax(0,1fr)_auto] lg:grid-rows-[1fr_auto]"
    >
      <div className="pt-[clamp(32px,7vh,72px)]">
        <h1 className="font-heading text-[clamp(72px,13vw,190px)] leading-[0.92]">
          <span className="text-highlight">[</span>Deal<span className="text-highlight">]</span>
        </h1>
        <p className="mt-7 max-w-[21em] text-[clamp(17px,1.5vw,20px)] leading-normal text-paper/80">
          A card game for 2 to 5 players. Be the first to collect three complete sets.
        </p>
      </div>

      <nav
        aria-label="Main"
        className="grid grid-cols-2 justify-items-center gap-4 py-10 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:flex lg:items-end lg:gap-5 lg:py-0"
      >
        <MenuCard
          href="/online"
          label="Play now: start an online room"
          title={["Play", "now"]}
          blurb="Start a room and send your friends the link."
          colour="bg-highlight"
          badge="2–5"
          tag="Online"
          dataCy="play-now"
          className="col-span-2 [--w:min(72vw,300px)] lg:mb-[clamp(32px,7vh,72px)] lg:[--w:clamp(220px,23.6vw,340px)]"
        />
        <MenuCard
          href="/rules"
          label="Rules"
          title={["Rules"]}
          blurb="How a turn works and what every card does."
          colour="bg-secondary"
          badge="?"
          dataCy="rules-link"
          className={SIDE_CARD}
        />
        <MenuCard
          href="/about"
          label="About"
          title={["About"]}
          blurb="Who made this, and why."
          colour="bg-primary"
          badge={<FontAwesomeIcon icon={faInfo} />}
          dataCy="about-link"
          className={SIDE_CARD}
        />
      </nav>

      <p className="pb-[clamp(32px,7vh,72px)] text-center text-sm text-paper/65 lg:text-left">
        Sharing one device?{" "}
        <Link
          href="/local"
          data-cy="play-local"
          className="inline-block py-3 text-paper/80 underline hover:text-highlight focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-highlight"
        >
          Play local
        </Link>
      </p>
    </main>
  );
}
