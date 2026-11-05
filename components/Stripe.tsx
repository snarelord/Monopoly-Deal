import { COLOUR_STYLES } from "@/components/colourStyles";
import { COLOURS } from "@/lib/types";

interface StripeProps {
  height?: string;
  className?: string;
}

// every set colour in a row, like the header on the any colour wildcard
export default function Stripe({ height = "0.75rem", className = "" }: StripeProps) {
  return (
    <div aria-hidden="true" data-cy="stripe" className={`grid grid-cols-10 ${className}`} style={{ height }}>
      {COLOURS.map((colour) => (
        <div key={colour} className={COLOUR_STYLES[colour]} />
      ))}
    </div>
  );
}
