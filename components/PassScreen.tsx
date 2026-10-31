// HOT-SEAT ONLY: covers the board when the device needs handing to another player, so they
// don't see the previous player's hand. remove this when online play arrives (everyone has their own screen)
//
// PLANNED (cheap, since this goes away online):
// - show what's happened since this player last had the screen, from GameState.log (see types.ts),
//   e.g. "Player 1 played Debt Collector on you (5M)", so it's a catch up rather than just a blocker
export default function PassScreen({ playerId, onReady }: { playerId: number; onReady: () => void }) {
  return (
    <div data-cy="pass-screen" className="fixed inset-0 z-50 grid place-items-center bg-neutral-800 p-4 text-white">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-2xl font-semibold">Pass to Player {playerId + 1}</p>
        <button
          type="button"
          data-cy="pass-continue"
          onClick={onReady}
          className="cursor-pointer rounded border-2 border-white px-4 py-2"
        >
          I&apos;m Player {playerId + 1}
        </button>
      </div>
    </div>
  );
}
