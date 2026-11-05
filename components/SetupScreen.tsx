import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import Stripe from "@/components/Stripe";

interface SetupScreenProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: ReactNode;
  fit: number; // how wide the title is in ems, so it can fill the screen
  as?: "main" | "div";
  columns?: string;
  "data-cy"?: string;
}

// a rough fit for titles with a player's name in, which can't be measured ahead of time
export const fitFor = (title: string) => title.length * 0.43;

export const PANEL = "flex min-w-0 flex-col gap-6 px-(--gutter) py-[clamp(20px,3vw,40px)]";
export const BLUE_PANEL = `${PANEL} bg-secondary max-lg:order-last`;
const ACTION_SHAPE =
  "flex min-h-52 min-w-0 flex-col justify-between gap-6 px-(--gutter) pt-[clamp(20px,3vw,40px)] pb-[clamp(12px,2vw,28px)] text-left";
export const ACTION_PANEL = `${ACTION_SHAPE} bg-highlight text-primary`;

export const LABEL = "font-heading text-2xl leading-none";
export const FIELD =
  "h-11 w-full min-w-0 bg-paper px-3 text-primary placeholder:text-primary/60 focus:outline-3 focus:outline-offset-2 focus:outline-highlight";
export const QUIET_LINK = "inline-block self-start py-3 text-sm text-paper/80 underline hover:text-highlight";
export const ERROR = "text-sm text-highlight";

export const ACTION_LABEL = "font-heading text-[clamp(76px,10.5vw,152px)] leading-[0.9]";
// the narrow orange column on the game board, pinned to the bottom of the screen on phones
export const STEP_LABEL = "shrink-0 font-heading text-[clamp(48px,5vw,84px)] leading-[0.9]";
export const STEP_PANEL =
  "flex-1 [--gutter:1rem] max-md:sticky max-md:bottom-0 max-md:z-20 max-md:min-h-0 max-md:flex-row max-md:items-center max-md:py-2";

export default function SetupScreen({
  title,
  fit,
  as: Tag = "main",
  className = "min-h-dvh overflow-clip",
  columns = "lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)_minmax(0,4fr)]",
  children,
  ...props
}: SetupScreenProps) {
  return (
    <Tag {...props} className={`@container flex flex-col bg-primary text-paper [--gutter:clamp(16px,2.5vw,36px)] ${className}`}>
      <header className="px-(--gutter) pt-[clamp(16px,2.5vw,32px)]">
        <h1
          className="font-heading leading-[0.8] whitespace-nowrap"
          style={{ fontSize: `min(calc((100cqw - 2 * var(--gutter)) / ${fit}), 50dvh)` }}
        >
          {title}
        </h1>
      </header>

      <Stripe height="clamp(10px,1.1vw,16px)" className="mt-[clamp(6px,0.8vw,12px)] flex-none" />

      <div className={`grid flex-1 ${columns}`}>{children}</div>
    </Tag>
  );
}

interface ActionPanelProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  hint: ReactNode;
  label: string;
  labelClassName?: string;
  tone?: "orange" | "paper";
  stayLit?: boolean; // keeps its colour while disabled, for a step that's yours to finish
}

const TONES = { orange: "bg-highlight text-primary", paper: "bg-paper text-primary" };

// the orange panel, where the whole block is the button
export function ActionPanel({
  hint,
  label,
  labelClassName = ACTION_LABEL,
  tone = "orange",
  stayLit = false,
  className = "",
  ...button
}: ActionPanelProps) {
  return (
    <button
      {...button}
      className={`${ACTION_SHAPE} ${TONES[tone]} cursor-pointer transition-[filter] enabled:hover:brightness-105 focus-visible:outline-3 focus-visible:-outline-offset-8 focus-visible:outline-primary disabled:cursor-not-allowed ${
        stayLit ? "" : "disabled:bg-paper/10 disabled:text-paper/60"
      } ${className}`}
    >
      <span className="leading-snug">{hint}</span>
      <span className={labelClassName}>{label}</span>
    </button>
  );
}
