import { useSyncExternalStore } from "react";
import { isBlocked, newGame, tick, type NewGameOptions } from "../sim/game";
import type { GameState } from "../sim/types";
import type { DayOutput } from "../sim/campaign";

const SAVE_KEY = "mad-avenue-save-v2";
// Roughly 4.5 real seconds per in-game week while the team works; dialogs pause the clock.
const BASE_MS_PER_DAY = 4500 / 7;

export interface Bubble {
  id: number;
  staffId: number;
  kind: "c" | "s" | "note";
  born: number;
}

function speedFromUrl(): number {
  try {
    const v = Number(new URLSearchParams(window.location.search).get("speed"));
    return v > 0 ? v : 1;
  } catch {
    return 1;
  }
}

class GameStore {
  state: GameState | null = null;
  paused = false;
  /** Set while a menu panel is open: time stops, like GDT's dialogs. */
  hold = false;
  bubbles: Bubble[] = [];
  private version = 0;
  private listeners = new Set<() => void>();
  private acc = 0;
  private last = 0;
  private bubbleId = 0;
  private speed = speedFromUrl();

  constructor() {
    this.state = this.load();
    requestAnimationFrame(this.frame);
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getVersion = () => this.version;

  emit() {
    this.version++;
    for (const fn of this.listeners) fn();
  }

  /** Run a sim action and re-render. Returns the action's error text, if any. */
  act<T>(fn: (s: GameState) => T): T | undefined {
    if (!this.state) return undefined;
    const out = fn(this.state);
    this.save();
    this.emit();
    return out;
  }

  start(opts: NewGameOptions) {
    this.state = newGame(opts);
    this.paused = false;
    this.save();
    this.emit();
  }

  quit() {
    this.state = null;
    try { localStorage.removeItem(SAVE_KEY); } catch { /* storage unavailable */ }
    this.emit();
  }

  togglePause() {
    this.paused = !this.paused;
    this.emit();
  }

  private frame = (now: number) => {
    const dt = this.last ? Math.min(250, now - this.last) : 0;
    this.last = now;
    const s = this.state;
    let changed = false;
    if (s && !this.paused && !this.hold && !isBlocked(s)) {
      this.acc += dt * this.speed;
      while (this.acc >= BASE_MS_PER_DAY && !isBlocked(s)) {
        this.acc -= BASE_MS_PER_DAY;
        const ev = tick(s);
        this.addBubbles(ev.work, now);
        changed = true;
        if (s.day % 7 === 0) this.save();
      }
    } else {
      this.acc = 0;
    }
    const before = this.bubbles.length;
    this.bubbles = this.bubbles.filter((b) => now - b.born < 1600);
    if (changed || before !== this.bubbles.length) this.emit();
    requestAnimationFrame(this.frame);
  };

  private addBubbles(work: DayOutput[], now: number) {
    for (const w of work) {
      if (w.c > 0.5) this.bubbles.push({ id: ++this.bubbleId, staffId: w.staffId, kind: "c", born: now });
      if (w.s > 0.5) this.bubbles.push({ id: ++this.bubbleId, staffId: w.staffId, kind: "s", born: now });
      if (w.note) this.bubbles.push({ id: ++this.bubbleId, staffId: w.staffId, kind: "note", born: now });
    }
  }

  private save() {
    if (!this.state) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.state)); } catch { /* storage unavailable */ }
  }

  private load(): GameState | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as GameState;
      return s.version === 2 ? s : null;
    } catch {
      return null;
    }
  }
}

export const store = new GameStore();

export function useGame(): GameState | null {
  useSyncExternalStore(store.subscribe, store.getVersion);
  return store.state;
}

export const money = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

// Handy for playtesting from the browser console.
(globalThis as unknown as { madAvenue: GameStore }).madAvenue = store;
