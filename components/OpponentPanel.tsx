import { useState } from "react";
import type { OpponentView } from "@/lib/types";
import { SETS_TO_WIN } from "@/lib/gameHelpers";
import PlayerCards from "@/components/PlayerCards";
import SetMeter, { completeCount } from "@/components/SetMeter";

interface OpponentPanelProps {
  opponent: OpponentView;
  isTheirTurn: boolean;
  compact?: boolean; // tighter rows when there are more players to fit in
}

export default function OpponentPanel({ opponent, isTheirTurn, compact = false }: OpponentPanelProps) {
  const [open, setOpen] = useState(false);
  const bankTotal = opponent.bank.reduce((sum, card) => sum + card.value, 0);
  const complete = completeCount(opponent.properties);
  const nearlyWon = complete === SETS_TO_WIN - 1;
  const stats = `Bank ${bankTotal}M, ${opponent.handCount} ${opponent.handCount === 1 ? "card" : "cards"}`;

  return (
    <section
      data-cy={`opponent-${opponent.id}`}
      data-bank-total={bankTotal}
      data-hand-count={opponent.handCount}
      data-their-turn={isTheirTurn}
      className="min-w-0"
    >
      <button
        type="button"
        data-cy="view-cards"
        onClick={() => setOpen(true)}
        className={`block w-full cursor-pointer px-3 text-left hover:bg-primary/40 ${compact ? "py-1" : "py-2"} ${isTheirTurn ? "bg-primary hover:bg-primary" : ""}`}
      >
        <span className="flex items-baseline justify-between gap-3">
          <span className={`min-w-0 truncate font-heading leading-none ${compact ? "text-xl" : "text-2xl"}`}>{opponent.name}</span>
          <span className={`shrink-0 text-xs ${nearlyWon ? "text-[#f7b36a]" : "text-paper/80"}`}>
            {nearlyWon ? "1 set from winning" : isTheirTurn ? "Their turn" : compact ? stats : `${complete} complete`}
          </span>
        </span>

        <span className={`block ${compact ? "my-1" : "mt-1.5 mb-1"}`}>
          <SetMeter sets={opponent.properties} compact={compact} />
        </span>

        {(!compact || nearlyWon || isTheirTurn) && <span className="block text-xs text-paper/80">{stats}</span>}
      </button>

      {open && <PlayerCards opponent={opponent} onClose={() => setOpen(false)} />}
    </section>
  );
}
