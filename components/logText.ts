import type { Colour, LogEntry } from "@/lib/types";
import { colourName } from "./colourStyles";

const title = (colour: Colour) => colourName(colour).replace(/\b\w/g, (c) => c.toUpperCase());
const cap = (text: string) => text[0].toUpperCase() + text.slice(1);

// one log entry as a sentence, from the viewer's point of view ("you" rather than their name).
// names is indexed by player id
export function describeEntry(entry: LogEntry, viewerId: number, names: string[]): string {
  const playerCount = names.length;
  const name = (id: number) => (id === viewerId ? "you" : names[id]);
  const possessive = (id: number) => (id === viewerId ? "your" : `${names[id]}'s`);
  const who = cap(name(entry.playerId));

  switch (entry.kind) {
    case "drew":
      return `${who} drew ${entry.count} card${entry.count === 1 ? "" : "s"}`;
    case "banked":
      return `${who} banked ${entry.card.type === "money" ? entry.card.name : `${entry.card.name} (${entry.card.value}M)`}`;
    case "placed":
      return `${who} placed ${entry.card.name}${entry.card.type === "wildcard" ? ` as ${title(entry.colour)}` : ""}`;
    case "built":
      return `${who} built a ${entry.card.name} on ${title(entry.colour)}`;
    case "moved":
      return `${who} moved ${entry.card.name} to ${title(entry.colour)}`;
    case "played": {
      const everyone = playerCount > 2 && entry.targetIds.length === playerCount - 1;
      const on = everyone ? "everyone" : entry.targetIds.map(name).join(", ");
      if (entry.card.type === "rent") {
        const doubled = entry.doubled ? (entry.doubled === 1 ? ", doubled" : ", doubled twice") : "";
        return `${who} charged ${title(entry.colour!)} rent${doubled}: ${entry.amount}M from ${on}`;
      }
      if (entry.targetIds.length === 0) return `${who} played ${entry.card.name}`;
      return `${who} played ${entry.card.name} on ${on}${entry.amount ? ` (${entry.amount}M)` : ""}`;
    }
    case "said-no":
      return `${who} said Just Say No to ${name(entry.againstId)}`;
    case "cancelled":
      return `${cap(possessive(entry.playerId))} ${entry.card.name} was cancelled for ${name(entry.forId)}`;
    case "paid": {
      if (entry.cards.length === 0) return `${who} had nothing to pay ${name(entry.toId)} with`;
      const total = entry.cards.reduce((sum, c) => sum + c.value, 0);
      return `${who} paid ${name(entry.toId)} ${total}M (${entry.cards.map((c) => c.name).join(", ")})`;
    }
    case "took":
      return `${who} took ${entry.card.name} from ${name(entry.fromId)}`;
    case "swapped":
      return `${who} swapped ${entry.gave.name} for ${possessive(entry.withId)} ${entry.took.name}`;
    case "took-set":
      return `${who} took ${possessive(entry.fromId)} ${title(entry.colour)} set`;
    case "discarded":
      return `${who} discarded ${entry.card.name}`;
    case "ended-turn":
      return `${who} ended ${entry.playerId === viewerId ? "your" : "their"} turn`;
    case "won":
      return `${who} won the game!`;
  }
}

// entries worth a toast: someone else doing something to the viewer, or the game ending
export function isAimedAt(entry: LogEntry, viewerId: number): boolean {
  switch (entry.kind) {
    case "played":
      return entry.playerId !== viewerId && entry.targetIds.includes(viewerId);
    case "said-no":
      return entry.againstId === viewerId;
    case "cancelled":
      return entry.playerId === viewerId;
    case "paid":
      return entry.toId === viewerId;
    case "took":
    case "took-set":
      return entry.fromId === viewerId;
    case "swapped":
      return entry.withId === viewerId;
    case "won":
      return true;
    default:
      return false;
  }
}
