import type { GameState, Modifier, Notice } from "./types";

export const OFFICES = [
  { name: "Single Room", capacity: 1, rent: 150, cost: 0 },
  { name: "Small Office", capacity: 4, rent: 600, cost: 35000 },
];

export function nextId(s: GameState): number {
  return s.nextId++;
}

export function notify(s: GameState, text: string, tone: Notice["tone"] = "info"): void {
  s.notices.push({ id: nextId(s), day: s.day, text, tone });
  if (s.notices.length > 40) s.notices.splice(0, s.notices.length - 40);
}

export function money(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

/** Product of the active modifiers of a kind that apply to an approach id or a category. */
export function modMult(s: GameState, kind: Modifier["kind"], match: { id?: string; category?: string } = {}): number {
  let m = 1;
  for (const mod of s.mods) {
    if (mod.kind !== kind || mod.until <= s.day) continue;
    if (mod.id && mod.id !== match.id) continue;
    if (mod.categories && (!match.category || !mod.categories.includes(match.category))) continue;
    m *= mod.mult;
  }
  return m;
}
