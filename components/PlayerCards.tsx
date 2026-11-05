import { useEffect } from "react";
import type { OpponentView } from "@/lib/types";
import PlayerBank from "@/components/PlayerHand/PlayerBank";
import PropertyPile from "@/components/PropertyPile/PropertyPile";
import Stripe from "@/components/Stripe";

interface PlayerCardsProps {
  opponent: OpponentView;
  onClose: () => void;
}

export default function PlayerCards({ opponent, onClose }: PlayerCardsProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div data-cy="player-cards" className="fixed inset-0 z-40 grid place-items-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-pointer bg-black/60" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${opponent.name}'s cards`}
        className="relative flex max-h-full w-full max-w-5xl flex-col overflow-y-auto bg-primary text-paper"
      >
        <div className="flex items-center justify-between gap-4 px-5 py-3">
          <h2 className="truncate font-heading text-5xl leading-none">{opponent.name}&apos;s cards</h2>
          <button
            type="button"
            data-cy="player-cards-close"
            onClick={onClose}
            className="shrink-0 cursor-pointer py-2 text-sm underline hover:text-highlight"
          >
            Close
          </button>
        </div>
        <Stripe height="0.5rem" className="flex-none" />

        <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <PropertyPile playerId={opponent.id} sets={opponent.properties} title="Sets" />
          <PlayerBank playerId={opponent.id} cards={opponent.bank} />
        </div>
      </div>
    </div>
  );
}
