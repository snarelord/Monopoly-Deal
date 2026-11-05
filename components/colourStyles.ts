import type { Colour } from "@/lib/types";

// for tailwind
export const COLOUR_STYLES: Record<Colour, string> = {
  brown: "bg-[#8B4A22] text-white",
  lightBlue: "bg-[#A8DAF0]",
  pink: "bg-[#D6398A] text-white",
  orange: "bg-[#F28A1E]",
  red: "bg-[#E02A2E] text-white",
  yellow: "bg-[#F5D317]",
  green: "bg-[#1F9D4B] text-white",
  darkBlue: "bg-[#1E4C9C] text-white",
  railroad: "bg-[#1E1E1E] text-white",
  utility: "bg-[#BFE3C2]",
};

export const colourName = (colour: Colour) => colour.replace(/([A-Z])/g, " $1");