import type { Colour } from "@/lib/types";

// for tailwind
export const COLOUR_STYLES: Record<Colour, string> = {
  brown: "bg-[#8B4A22] text-white",
  lightBlue: "bg-[#A8DAF0] text-primary",
  pink: "bg-[#D6398A] text-white",
  orange: "bg-[#F28A1E] text-primary",
  red: "bg-[#E02A2E] text-white",
  yellow: "bg-[#F5D317] text-primary",
  green: "bg-[#1F9D4B] text-white",
  darkBlue: "bg-[#1E4C9C] text-white",
  railroad: "bg-[#1E1E1E] text-white",
  utility: "bg-[#BFE3C2] text-primary",
};

export const colourName = (colour: Colour) => colour.replace(/([A-Z])/g, " $1");