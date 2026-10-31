import type { LogEntry } from "@/lib/types";
import { describeEntry } from "./logText";

export default function GameLog({ log, viewerId, names }: { log: LogEntry[]; viewerId: number; names: string[] }) {
  const recent = log.map((entry, index) => ({ entry, index })).slice(-50).reverse(); // newest first

  return (
    <section data-cy="game-log" className="flex h-full min-h-0 w-full flex-col rounded-lg border border-black/20 bg-white/60 text-black">
      <header className="border-b border-black/10 px-3 py-1.5 text-sm font-semibold">Game log</header>
      {recent.length === 0 ? (
        <p className="p-3 text-xs text-black/50">Nothing yet</p>
      ) : (
        <ol className="min-h-0 flex-1 overflow-y-auto px-3 py-1 text-xs">
          {recent.map(({ entry, index }) => (
            <li key={index} data-cy="log-entry" data-kind={entry.kind} className="border-b border-black/5 py-1 last:border-0">
              {describeEntry(entry, viewerId, names)}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
