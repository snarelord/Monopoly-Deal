import type { HTMLAttributes, ReactNode } from "react";
import Stripe from "@/components/Stripe";

interface MomentScreenProps extends HTMLAttributes<HTMLDivElement> {
  banner: ReactNode;
  columns?: string;
  "data-cy"?: string;
}

// takes over the board for a moment: the banner says what's happening, the orange panel finishes it
export default function MomentScreen({
  banner,
  columns = "lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)_minmax(0,2fr)] lg:grid-rows-[minmax(0,1fr)_auto]",
  children,
  ...props
}: MomentScreenProps) {
  return (
    <div {...props} className="fixed inset-0 z-40 flex flex-col overflow-y-auto overscroll-contain bg-primary text-paper">
      {banner}
      <Stripe height="clamp(8px,1vw,12px)" className="mt-2 flex-none" />
      <div className={`grid flex-1 ${columns}`}>{children}</div>
    </div>
  );
}
