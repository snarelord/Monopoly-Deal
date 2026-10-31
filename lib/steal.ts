import type { Card, PropertySet } from "./types";
import { isComplete } from "./types";

export const looseProperties = (sets: PropertySet[]): Card[] => sets.filter((s) => !isComplete(s)).flatMap((s) => s.cards);
export const completeSets = (sets: PropertySet[]): PropertySet[] => sets.filter(isComplete);
export const setContaining = (sets: PropertySet[], cardId: string) => sets.find((s) => s.cards.some((c) => c.id === cardId));

export type StealKind = "sly-deal" | "forced-deal" | "deal-breaker";

export function canSteal(kind: StealKind, theirs: PropertySet[], mine: PropertySet[]): boolean {
  if (kind === "deal-breaker") return completeSets(theirs).length > 0;
  if (kind === "forced-deal") return looseProperties(theirs).length > 0 && looseProperties(mine).length > 0;
  return looseProperties(theirs).length > 0;
}
