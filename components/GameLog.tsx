import type { LogEntry } from "@/lib/types";
import { describeEntry } from "./logText";

export default function GameLog({ log, viewerId, names }: { log: LogEntry[]; viewerId: number; names: string[] }) {
  const recent = log.map((entry, index) => ({ entry, index })).slice(-50).reverse(); // newest first

  return (
    <section data-cy="game-log" className="flex min-h-0 w-full flex-col border-t border-paper/35 px-3 pt-2">
      <header className="mb-1 font-heading text-xl leading-none">Game log</header>
      {recent.length === 0 ? (
        <p className="text-xs text-paper/80">Nothing yet</p>
      ) : (
        <ol className="min-h-0 flex-1 overflow-y-auto text-xs text-paper/90">
          {recent.map(({ entry, index }) => (
            <li key={index} data-cy="log-entry" data-kind={entry.kind} className="border-b border-paper/15 py-1 last:border-0">
              {describeEntry(entry, viewerId, names)}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
