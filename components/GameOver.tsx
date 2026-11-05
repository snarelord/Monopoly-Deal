import { useState } from "react";
import Link from "next/link";
import type { Card as CardType, PropertySet } from "@/lib/types";
import { isComplete } from "@/lib/types";
import CardPreview from "@/components/PlayerHand/CardPreview";
import MiniSet from "@/components/MiniSet";
import SetupScreen, { ACTION_LABEL, ACTION_PANEL, ActionPanel, BLUE_PANEL, LABEL, PANEL, QUIET_LINK, fitFor } from "@/components/SetupScreen";

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
    <SetupScreen
      as="div"
      data-cy="game-over"
      data-winner={winnerId}
      role="dialog"
      aria-modal="true"
      aria-label={`${winner.name} wins`}
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain"
      columns="lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,3fr)]"
      title={
        <>
          <span className="text-highlight">{winner.name}</span> wins
        </>
      }
      fit={fitFor(`${winner.name} wins`)}
    >
      <section className={PANEL}>
        <h2 className={LABEL}>Winning sets</h2>
        <ul className="flex flex-wrap gap-3 [--mini:calc(var(--card-w)*0.9)]">
          {winner.properties.filter(isComplete).map((set) => (
            <li key={set.cards[0].id} data-cy="winning-set" data-colour={set.colour} className="w-(--mini)">
              <MiniSet set={set} onPreview={(card, flipped) => setPreview({ card, flipped })} />
            </li>
          ))}
        </ul>
        <button type="button" data-cy="game-over-close" onClick={onClose} className={`mt-auto cursor-pointer ${QUIET_LINK}`}>
          View the board
        </button>
      </section>

      <section className={BLUE_PANEL}>
        <h2 className={LABEL}>Standings</h2>
        <div className="overflow-x-auto">
          <table data-cy="standings" className="w-full text-left text-sm">
            <thead className="text-xs text-paper/80">
              <tr>
                <th className="py-1 font-normal">Player</th>
                <th className="py-1 font-normal">Sets</th>
                <th className="py-1 font-normal">Properties</th>
                <th className="py-1 font-normal">Bank</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s) => (
                <tr key={s.id} data-cy="standing" data-player={s.id} className="border-t border-paper/35">
                  <td className="py-2 font-heading text-2xl leading-none">{s.name}</td>
                  <td className="py-2">{s.sets}</td>
                  <td className="py-2">{s.properties}</td>
                  <td className="py-2">{s.bank}M</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {onPlayAgain ? (
        <ActionPanel type="button" data-cy="play-again" onClick={onPlayAgain} hint="Same players, new deal" label="Play again" />
      ) : (
        <Link href="/" data-cy="back-to-menu" className={`${ACTION_PANEL} transition-[filter] hover:brightness-105`}>
          <span className="leading-snug">This game is finished</span>
          <span className={ACTION_LABEL}>Back to menu</span>
        </Link>
      )}

      <CardPreview card={preview?.card ?? null} flipped={preview?.flipped} onClose={() => setPreview(null)} />
    </SetupScreen>
  );
}
