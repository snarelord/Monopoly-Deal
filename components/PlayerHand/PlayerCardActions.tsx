import { useState } from "react";
import type { CardAction } from "@/lib/cardActions";
import type { Colour } from "@/lib/types";
import { COLOUR_STYLES, colourName } from "@/components/colourStyles";

interface PlayerCardActionsProps {
  actions: CardAction[];
  onActionClick: (action: CardAction, colour?: Colour) => void;
  onClose: () => void;
}

export default function PlayerCardActions({ actions, onActionClick, onClose }: PlayerCardActionsProps) {
  // set when an action needs a colour first (wildcards)
  const [choosing, setChoosing] = useState<CardAction | null>(null);

  console.log('actions', actions)

  return (
    <div
      data-cy="card-actions"
      className="absolute bottom-10 left-full z-10 ml-3 flex w-44 flex-col gap-1 rounded-md border border-black/20 bg-white p-2 text-sm text-black shadow-lg"
      // the card is tilted: cancel that so the menu stays upright
      style={{ transform: "rotate(calc(var(--rot) * -1))", transformOrigin: "left center" }}
    >
      <div className="flex items-center justify-between">
        {choosing ? (
          <button
            type="button"
            data-cy="picker-back"
            onClick={() => setChoosing(null)}
            className="cursor-pointer rounded text-xs"
          >
            ← Back
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          data-cy="card-actions-close"
          aria-label="Close menu"
          onClick={onClose}
          className="cursor-pointer rounded text-xs"
        >
          ✕
        </button>
      </div>

      {choosing ? (
        <>
          <div className="px-1 text-xs font-semibold">Place as…</div>
          <div className="grid grid-cols-2 gap-1">
            {choosing.colours!.map((colour) => (
              <button
                key={colour}
                type="button"
                data-cy={`colour-${colour}`}
                onClick={() => onActionClick(choosing, colour)}
                className={`cursor-pointer rounded px-2 py-1 text-xs capitalize hover:outline hover:outline-1 hover:outline-black ${COLOUR_STYLES[colour]}`}
              >
                {colourName(colour)}
              </button>
            ))}
          </div>
        </>
      ) : (
        actions.map((action) => (
          <button
            key={action.id}
            type="button"
            data-cy={`action-${action.id}`}
            disabled={action.disabled}
            title={action.disabled ? action.reason : undefined}
            onClick={() => (action.colours ? setChoosing(action) : onActionClick(action))}
            className="cursor-pointer rounded px-3 py-1 text-left hover:outline hover:outline-1 hover:outline-black focus-visible:outline focus-visible:outline-1 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:outline-none"
          >
            {action.label}
          </button>
        ))
      )}
    </div>
  );
}