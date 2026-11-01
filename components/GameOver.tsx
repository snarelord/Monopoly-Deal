import { useState } from "react";
import type { Card as CardType, PropertySet } from "@/lib/types";
import { isComplete } from "@/lib/types";
import CardPreview from "@/components/PlayerHand/CardPreview";
import MiniSet from "@/components/MiniSet";

interface GameOverProps {
  players: { id: number; name: string; properties: PropertySet[]; bank: CardType[] }[];
  winnerId: number;
  onPlayAgain?: () => void; // PLANNED: online, a rematch in the same room
  onClose: () => void; // hide this to look at the final board
}

export default function GameOver({ players, winnerId, onPlayAgain, onClose }: GameOverProps) {
  const [preview, setPreview] = useState<{ card: CardType; flipped: boolean } | null>(null);
  const winner = players.find((p) => p.id === winnerId)!;

  const standings = players
    .map((p) => ({
      id: p.id,
      name: p.name,
      sets: new Set(p.properties.filter(isComplete).map((s) => s.colour)).size, // different colours, like the win
      properties: p.properties.reduce((n, s) => n + s.cards.length, 0),
      bank: p.bank.reduce((sum, c) => sum + c.value, 0),
    }))
    .sort((a, b) => Number(b.id === winnerId) - Number(a.id === winnerId) || b.sets - a.sets || b.bank - a.bank);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div
        data-cy="game-over"
        data-winner={winnerId}
        role="dialog"
        aria-label={`${winner.name} wins`}
        className="flex max-h-full w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-lg bg-white p-5 text-black shadow-xl"
      >
        <h2 className="text-2xl font-bold wrap-break-word">{winner.name} wins!</h2>

        <section>
          <div className="mb-1 text-xs font-semibold">Winning sets</div>
          <ul className="flex flex-wrap gap-3 [--mini:calc(var(--card-w)*0.7)]">
            {winner.properties.filter(isComplete).map((set) => (
              <li key={set.cards[0].id} data-cy="winning-set" data-colour={set.colour} className="w-(--mini)">
                <MiniSet set={set} onPreview={(card, flipped) => setPreview({ card, flipped })} />
              </li>
            ))}
          </ul>
        </section>

        <div className="overflow-x-auto">
          <table data-cy="standings" className="w-full text-left text-sm">
            <thead className="text-xs text-black/60">
              <tr>
                <th className="py-1 font-semibold">Player</th>
                <th className="py-1 font-semibold">Complete sets</th>
                <th className="py-1 font-semibold">Properties</th>
                <th className="py-1 font-semibold">Bank</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s) => (
                <tr key={s.id} data-cy="standing" data-player={s.id} className="border-t border-black/10">
                  <td className="py-1 font-semibold">
                    {s.name}
                    {s.id === winnerId && " 🏆"}
                  </td>
                  <td className="py-1">{s.sets}</td>
                  <td className="py-1">{s.properties}</td>
                  <td className="py-1">{s.bank}M</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            data-cy="game-over-close"
            onClick={onClose}
            className="cursor-pointer rounded border-2 border-black px-3 py-1"
          >
            View the board
          </button>
          {onPlayAgain && (
            <button
              type="button"
              data-cy="play-again"
              onClick={onPlayAgain}
              className="cursor-pointer rounded bg-green-700 px-3 py-1 text-white"
            >
              Play again
            </button>
          )}
        </div>
      </div>

      <CardPreview card={preview?.card ?? null} flipped={preview?.flipped} onClose={() => setPreview(null)} />
    </div>
  );
}
