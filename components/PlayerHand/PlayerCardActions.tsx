import { useState } from "react";
import type { ActionChoice, CardAction } from "@/lib/cardActions";
import { COLOUR_STYLES, colourName } from "@/components/colourStyles";

interface PlayerCardActionsProps {
  actions: CardAction[];
  names: string[];
  side: "left" | "right"; // which side of the card the menu opens on
  onActionClick: (action: CardAction, choice?: ActionChoice) => void;
  onClose: () => void;
}

type Step = "colour" | "target" | "double";

// the questions an action asks, in order (see CardAction)
function stepsFor(action: CardAction): Step[] {
  const steps: Step[] = [];
  if (action.colours) steps.push("colour");
  if (action.targets) steps.push("target");
  if (action.doubleRentIds?.length) steps.push("double");
  return steps;
}

const answered = (step: Step, choice: ActionChoice) =>
  step === "colour" ? choice.colour !== undefined
  : step === "target" ? choice.targetId !== undefined
  : choice.doubleRentIds !== undefined;

const DOUBLE_LABELS = ["No", "Double", "Double twice"];

const optionClass = "cursor-pointer rounded px-3 py-1 text-left hover:outline hover:outline-black";

export default function PlayerCardActions({ actions, names, side, onActionClick, onClose }: PlayerCardActionsProps) {
  // the action being set up, and what's been picked for it so far
  const [active, setActive] = useState<CardAction | null>(null);
  const [choice, setChoice] = useState<ActionChoice>({});

  const steps = active ? stepsFor(active) : [];
  const step = steps.find((s) => !answered(s, choice));

  function start(action: CardAction) {
    if (stepsFor(action).length === 0) return onActionClick(action);
    setActive(action);
    setChoice({});
  }

  // record an answer, and send it off once there's nothing left to ask
  function pick(part: ActionChoice) {
    const next = { ...choice, ...part };
    if (stepsFor(active!).every((s) => answered(s, next))) onActionClick(active!, next);
    else setChoice(next);
  }

  // undo the previous answer, or leave the questions if this is the first one
  function back() {
    const previous = steps[steps.indexOf(step!) - 1];
    if (!previous) return setActive(null);
    const key = previous === "colour" ? "colour" : previous === "target" ? "targetId" : "doubleRentIds";
    setChoice((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  // rent for the chosen colour, so the double the rent step can show what it comes to
  const rent = active?.colours?.find((o) => o.colour === choice.colour)?.amount ?? 0;

  return (
    <div
      data-cy="card-actions"
      className={`absolute bottom-10 z-10 flex w-48 flex-col gap-1 rounded-md border border-black/20 bg-white p-2 text-sm text-black shadow-lg ${
        side === "right" ? "left-full ml-3" : "right-full mr-3"
      }`}
    >
      <div className="flex items-center justify-between">
        {active ? (
          <button type="button" data-cy="picker-back" onClick={back} className="cursor-pointer rounded text-xs">
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

      {step === "colour" && (
        <>
          <div className="px-1 text-xs font-semibold">{active!.id === "rent" ? "Charge rent for…" : active!.id === "add-to-set" ? "Build on…" : "Place as…"}</div>
          <div className="grid grid-cols-2 gap-1">
            {active!.colours!.map(({ colour, amount, disabled }) => (
              <button
                key={colour}
                type="button"
                data-cy={`colour-${colour}`}
                disabled={disabled}
                onClick={() => pick({ colour })}
                className={`cursor-pointer rounded px-2 py-1 text-xs capitalize hover:outline hover:outline-black disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:outline-none ${COLOUR_STYLES[colour]}`}
              >
                {colourName(colour)}
                {amount !== undefined && ` · ${amount}M`}
              </button>
            ))}
          </div>
        </>
      )}

      {step === "target" && (
        <>
          <div className="px-1 text-xs font-semibold">Choose a player…</div>
          {active!.targets!.map((targetId) => (
            <button
              key={targetId}
              type="button"
              data-cy={`target-${targetId}`}
              onClick={() => pick({ targetId })}
              className={`${optionClass} wrap-break-word`}
            >
              {names[targetId]}
            </button>
          ))}
        </>
      )}

      {step === "double" && (
        <>
          <div className="px-1 text-xs font-semibold">Double the rent?</div>
          {[0, ...active!.doubleRentIds!.map((_, i) => i + 1)].map((count) => (
            <button
              key={count}
              type="button"
              data-cy={`double-${count}`}
              onClick={() => pick({ doubleRentIds: active!.doubleRentIds!.slice(0, count) })}
              className={optionClass}
            >
              {DOUBLE_LABELS[count]} · {rent * 2 ** count}M
            </button>
          ))}
        </>
      )}

      {!active &&
        actions.map((action) => (
          <button
            key={action.id}
            type="button"
            data-cy={`action-${action.id}`}
            disabled={action.disabled}
            title={action.disabled ? action.reason : undefined}
            onClick={() => start(action)}
            className="cursor-pointer rounded px-3 py-1 text-left hover:outline hover:outline-black focus-visible:outline focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:outline-none"
          >
            {action.label}
          </button>
        ))}
    </div>
  );
}
