import type { Colour } from "@/lib/types";

// for tailwind
export const COLOUR_STYLES: Record<Colour, string> = {
  brown: "bg-amber-900 text-white",
  lightBlue: "bg-sky-300",
  pink: "bg-pink-400",
  orange: "bg-orange-500",
  red: "bg-red-600 text-white",
  yellow: "bg-yellow-300",
  green: "bg-green-600 text-white",
  darkBlue: "bg-blue-800 text-white",
  railroad: "bg-neutral-800 text-white",
  utility: "bg-lime-200",
};

export const colourName = (colour: Colour) => colour.replace(/([A-Z])/g, " $1");