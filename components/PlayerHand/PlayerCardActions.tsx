import type { CardAction, CardActionId } from "@/lib/cardActions";

interface PlayerCardActionsProps {
  actions: CardAction[];
  onActionClick: (id: CardActionId) => void;
  onClose: () => void;
}

export default function PlayerCardActions({ actions, onActionClick, onClose }: PlayerCardActionsProps) {
  return (
    <div
      data-cy="card-actions"
      className="absolute bottom-10 left-full z-10 ml-3 flex w-44 flex-col gap-1 rounded-md border border-black/20 bg-white p-2 text-sm text-black shadow-lg"
      // the card is tilted: cancel that so the menu stays upright
      style={{ transform: "rotate(calc(var(--rot) * -1))", transformOrigin: "left center" }}
    >
      <div className="flex justify-end">
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

      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          data-cy={`action-${action.id}`}
          disabled={action.disabled}
          title={action.disabled ? action.reason : undefined}
          onClick={() => onActionClick(action.id)}
          className="cursor-pointer rounded px-2 py-1 text-left hover:outline-1 hover:outline-black focus-visible:outline-1 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:outline-none"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}