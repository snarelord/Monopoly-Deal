import SetupScreen, { ActionPanel, LABEL, PANEL, fitFor } from "@/components/SetupScreen";

interface PassScreenProps {
  name: string;
  recent: string[]; // what's happened since this player last had the screen, newest first
  onReady: () => void;
}

// HOT-SEAT ONLY: covers the board when the device needs handing to another player, so they
// don't see the previous player's hand. remove this when online play arrives (everyone has their own screen)
export default function PassScreen({ name, recent, onReady }: PassScreenProps) {
  return (
    <SetupScreen
      as="div"
      data-cy="pass-screen"
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain"
      columns="lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]"
      title={
        <>
          Pass to <span className="text-highlight">{name}</span>
        </>
      }
      fit={fitFor(`Pass to ${name}`)}
    >
      <section className={PANEL}>
        <h2 className={LABEL}>Since your last turn</h2>
        {recent.length === 0 ? (
          <p className="text-paper/80">Nothing to catch up on</p>
        ) : (
          <ul className="max-w-[34em]">
            {recent.map((line, i) => (
              <li key={i} className="border-t border-paper/20 py-2 text-paper/90">
                {line}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ActionPanel
        type="button"
        data-cy="pass-continue"
        onClick={onReady}
        hint="Your hand stays hidden until you press this"
        label={`I'm ${name}`}
      />
    </SetupScreen>
  );
}
