import { PLAYS_PER_TURN, type TurnStatus } from "../lib/gameHelpers";

export default function TurnInfo({ turn }: { turn: TurnStatus }) {
  return (
    <div
      data-cy="turn-info"
      data-player={turn.currentPlayerId}
      data-turn={turn.turnNumber}
      data-round={turn.round}
      data-plays-left={turn.playsLeft}
      className="rounded-lg border border-black/20 bg-white/70 px-3 py-2 text-sm text-black"
    >
      <div className="font-semibold">Player {turn.currentPlayerId + 1}&apos;s turn</div>
      <div>Round {turn.round} · Turn {turn.turnNumber}</div>
      <div>Plays left: {turn.playsLeft}/{PLAYS_PER_TURN}</div>
      {turn.mustDiscard && (
        <div data-cy="discard-prompt" className="mt-1 font-semibold text-red-700">
          Discard {turn.cardsToDiscard} card{turn.cardsToDiscard === 1 ? "" : "s"}
        </div>
      )}
    </div>
  );
}