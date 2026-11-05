import { useLayoutEffect, useRef, useState } from "react";
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
const EDGE_GAP = 8;

const FOCUS = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-highlight";
const OPTION = `cursor-pointer border-t border-paper/15 first:border-t-0 px-3 py-2.5 text-left font-heading text-xl leading-none enabled:hover:bg-highlight enabled:hover:text-primary disabled:cursor-not-allowed disabled:text-paper/40 ${FOCUS}`;
const STEP_TITLE = "px-3 pb-2 font-heading text-xl leading-none text-paper/80";
const CORNER = `cursor-pointer p-1 text-sm text-paper/80 hover:text-highlight ${FOCUS}`;

export default function PlayerCardActions({ actions, names, side, onActionClick, onClose }: PlayerCardActionsProps) {
  // the action being set up, and what's been picked for it so far
  const [active, setActive] = useState<CardAction | null>(null);
  const [choice, setChoice] = useState<ActionChoice>({});
  const menuRef = useRef<HTMLDivElement>(null);

  // on a phone the menu can be wider than the space beside the card, so it slides back on screen
  useLayoutEffect(() => {
    const menu = menuRef.current!;
    menu.style.translate = ""; // effects run twice in dev, so measure from where it started
    const { left, right } = menu.getBoundingClientRect();
    const overRight = right - (document.documentElement.clientWidth - EDGE_GAP);
    const overLeft = EDGE_GAP - left;
    menu.style.translate = overRight > 0 ? `${-overRight}px` : overLeft > 0 ? `${overLeft}px` : "";
  }, []);

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
      ref={menuRef}
      data-cy="card-actions"
      className={`absolute bottom-10 z-10 flex w-52 flex-col border-2 border-paper/35 bg-primary text-paper shadow-[0_12px_32px_rgb(0_0_0/50%)] ${
        side === "right" ? "left-full ml-3" : "right-full mr-3"
      }`}
    >
      {active && (
        <button type="button" data-cy="picker-back" onClick={back} className={`mx-2 my-1.5 self-start ${CORNER}`}>
          Back
        </button>
      )}

      {step === "colour" && (
        <>
          <div className={STEP_TITLE}>{active!.id === "rent" ? "Charge rent for…" : active!.id === "add-to-set" ? "Build on…" : "Place as…"}</div>
          <div className="grid grid-cols-2 gap-1 p-1">
            {active!.colours!.map(({ colour, amount, disabled }) => (
              <button
                key={colour}
                type="button"
                data-cy={`colour-${colour}`}
                disabled={disabled}
                onClick={() => pick({ colour })}
                className={`cursor-pointer px-2 py-2 font-heading text-lg leading-none capitalize enabled:hover:outline-2 enabled:hover:-outline-offset-2 enabled:hover:outline-paper disabled:cursor-not-allowed disabled:opacity-30 ${FOCUS} ${COLOUR_STYLES[colour]}`}
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
          <div className={STEP_TITLE}>Choose a player…</div>
          {active!.targets!.map((targetId) => (
            <button
              key={targetId}
              type="button"
              data-cy={`target-${targetId}`}
              onClick={() => pick({ targetId })}
              className={`${OPTION} wrap-break-word`}
            >
              {names[targetId]}
            </button>
          ))}
        </>
      )}

      {step === "double" && (
        <>
          <div className={STEP_TITLE}>Double the rent?</div>
          {[0, ...active!.doubleRentIds!.map((_, i) => i + 1)].map((count) => (
            <button
              key={count}
              type="button"
              data-cy={`double-${count}`}
              onClick={() => pick({ doubleRentIds: active!.doubleRentIds!.slice(0, count) })}
              className={OPTION}
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
            className={OPTION}
          >
            {action.label}
          </button>
        ))}

      <button
        type="button"
        data-cy="card-actions-close"
        aria-label="Close menu"
        onClick={onClose}
        className={`absolute -right-0.5 bottom-full flex size-9 items-center justify-center border-2 border-b-0 border-paper/35 bg-primary ${CORNER}`}
      >
        ✕
      </button>
    </div>
  );
}
