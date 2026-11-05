import Link from "next/link";
import Banner from "@/components/Banner";
import { QUIET_LINK } from "@/components/SetupScreen";
import { PLAYS_PER_TURN, type TurnStatus } from "../lib/gameHelpers";

interface TurnInfoProps {
  turn: TurnStatus;
  title: string;
  accent?: string;
  tail?: string;
  onNewGame?: () => void;
}

export default function TurnInfo({ turn, title, accent, tail, onNewGame }: TurnInfoProps) {
  const pips = Array.from({ length: PLAYS_PER_TURN }, (_, i) => i < turn.playsLeft);

  return (
    <Banner
      data-cy="turn-info"
      data-player={turn.currentPlayerId}
      data-turn={turn.turnNumber}
      data-round={turn.round}
      data-plays-left={turn.playsLeft}
      title={title}
      accent={accent}
      tail={tail}
    >
      <span>
        Round {turn.round} · Turn {turn.turnNumber}
      </span>
      <span className="flex items-center gap-2">
        {pips.map((left, i) => (
          <span key={i} className={`size-4 border-2 ${left ? "border-highlight bg-highlight" : "border-paper/35"}`} />
        ))}
        <span className="ml-1">{turn.playsLeft === 1 ? "1 play left" : `${turn.playsLeft} plays left`}</span>
      </span>
      {onNewGame && (
        <button type="button" data-cy="new-game" onClick={onNewGame} className="cursor-pointer py-2 underline hover:text-highlight">
          Deal again
        </button>
      )}
      {!onNewGame && turn.winnerId !== null && (
        <Link href="/" className={QUIET_LINK}>
          Back to menu
        </Link>
      )}
    </Banner>
  );
}
