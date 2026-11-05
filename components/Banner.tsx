import type { HTMLAttributes } from "react";

interface BannerProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: string;
  accent?: string; // the part in orange, after the title
  tail?: string; // anything after the accent
  "data-cy"?: string;
}

// the big line across the top of the board. the spaces are for the text itself, flex hides them on screen
export default function Banner({ title, accent, tail, children, ...props }: BannerProps) {
  return (
    <header
      {...props}
      className="flex flex-none flex-wrap items-end justify-between gap-x-8 gap-y-1 px-(--gutter) pt-[clamp(12px,1.5vw,20px)]"
    >
      <h1 className="flex max-w-full min-w-0 gap-x-[0.2em] font-heading text-[clamp(56px,8vw,116px)] leading-[0.84]">
        <span className="min-w-0 truncate">{title} </span>
        {accent && <span className="min-w-0 truncate text-highlight">{accent} </span>}
        {tail && <span className="shrink-0">{tail}</span>}
      </h1>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 pb-1 text-sm text-paper/80">{children}</div>
    </header>
  );
}
