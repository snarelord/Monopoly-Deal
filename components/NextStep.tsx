import { useState } from "react";
import { ActionPanel, STEP_LABEL, STEP_PANEL } from "@/components/SetupScreen";
import type { TurnStatus } from "@/lib/gameHelpers";
import type { Move } from "@/lib/types";

interface NextStepProps {
  turn: TurnStatus;
  myId: number;
  names: string[];
  moveError: string | null;
  discardIds: string[];
  onDiscard: () => void;
  onMove: (move: Move) => void;
}

const plays = (count: number) => (count === 1 ? "1 play left" : `${count} plays left`);
const cards = (count: number) => (count === 1 ? "1 card" : `${count} cards`);

// the orange block always shows what happens next: draw, end the turn, discard, or why you're waiting
export default function NextStep({ turn, myId, names, moveError, discardIds, onDiscard, onMove }: NextStepProps) {
  const isMine = myId === turn.currentPlayerId;
  // the plays left when End turn was pressed, so playing a card drops the warning by itself
  const [warnedAt, setWarnedAt] = useState<number | null>(null);
  const warning = warnedAt === turn.playsLeft && turn.canEndTurn && turn.cardsToDiscard > 0;

  // over the hand limit, ending the turn means a forced discard, so check first if there are plays to use
  function endTurn() {
    if (turn.playsLeft > 0 && turn.cardsToDiscard > 0) setWarnedAt(turn.playsLeft);
    else onMove({ type: "end-turn" });
  }

  const hasNote = turn.winnerId !== null || turn.mustDiscard || turn.owing.length > 0 || moveError !== null;

  const usual = turn.canDraw
    ? "Start of your turn"
    : turn.canEndTurn
      ? turn.playsLeft > 0
        ? `${plays(turn.playsLeft)}, or finish here`
        : "No plays left"
      : isMine
        ? "Waiting on the other players"
        : `${names[turn.currentPlayerId]} is playing`;

  const hint = (
    <span className="flex flex-col gap-1">
      {!hasNote && <span>{usual}</span>}
      {turn.winnerId !== null && <span data-cy="winner">{names[turn.winnerId]} wins!</span>}
      {turn.mustDiscard && (
        <>
          <span data-cy="discard-prompt">
            Discard {turn.cardsToDiscard} card{turn.cardsToDiscard === 1 ? "" : "s"}
          </span>
          <span>
            {discardIds.length} of {turn.cardsToDiscard} chosen, then your turn ends
          </span>
        </>
      )}
      {turn.owing.map((debt) => (
        <span key={debt.playerId} data-cy="owing" data-status={debt.status}>
          {/* the same words whether or not anyone holds a just say no */}
          {debt.status === "countering"
            ? `${names[debt.playerId]} said no. Waiting on ${names[debt.toPlayerId]}`
            : debt.status === "responding"
              ? `Waiting on ${names[debt.playerId]} to answer the ${turn.pendingCard?.name}`
              : `${names[debt.playerId]} owes ${names[debt.toPlayerId]} ${debt.amount}M`}
        </span>
      ))}
      {moveError && <span data-cy="move-error">{moveError}</span>}
    </span>
  );

  if (warning) {
    return (
      <div className="flex flex-1 flex-col max-md:sticky max-md:bottom-0 max-md:z-20">
        <button
          type="button"
          data-cy="confirm-end-turn"
          onClick={() => {
            setWarnedAt(null);
            onMove({ type: "end-turn" });
          }}
          className="min-h-11 cursor-pointer border-2 border-paper/35 bg-primary px-4 py-2 text-left font-heading text-xl leading-none text-paper hover:border-paper focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-highlight"
        >
          End turn and discard
        </button>
        <ActionPanel
          type="button"
          data-cy="keep-playing"
          onClick={() => setWarnedAt(null)}
          hint={
            <span data-cy="discard-warning">
              {plays(turn.playsLeft)}. End now and you&apos;ll discard {cards(turn.cardsToDiscard)}
            </span>
          }
          label="Keep playing"
          labelClassName={STEP_LABEL}
          className={STEP_PANEL}
        />
      </div>
    );
  }

  if (turn.canDraw) {
    return (
      <ActionPanel
        type="button"
        data-cy="draw-step"
        onClick={() => onMove({ type: "draw" })}
        hint={hint}
        label="Draw"
        labelClassName={STEP_LABEL}
        className={STEP_PANEL}
      />
    );
  }

  if (turn.mustDiscard) {
    return (
      <ActionPanel
        type="button"
        data-cy="discard-step"
        disabled={discardIds.length !== turn.cardsToDiscard}
        stayLit
        onClick={onDiscard}
        hint={hint}
        label="Discard"
        labelClassName={STEP_LABEL}
        className={STEP_PANEL}
      />
    );
  }

  return (
    <ActionPanel
      type="button"
      data-cy="end-turn"
      disabled={!turn.canEndTurn}
      onClick={endTurn}
      hint={hint}
      label={turn.winnerId !== null ? "Game over" : turn.canEndTurn ? "End turn" : "Waiting"}
      labelClassName={STEP_LABEL}
      className={STEP_PANEL}
    />
  );
}
