import { EVENTS, eventDef, type EventDef, type EventEffect } from "./content";
import { DAYS_PER_MONTH, DAYS_PER_WEEK, dateOf, inflation } from "./calendar";
import { accountOf, forceRfp, loseAccount, renewAccount } from "./accounts";
import { Rng } from "./rng";
import type { GameState, Modifier, Staff } from "./types";
import { OFFICES, nextId, notify } from "./util";

/** Rough odds of a random event in any given week (about three a year). */
const WEEKLY_EVENT_CHANCE = 0.07;

function bestStaff(s: GameState): Staff | undefined {
  return s.staff.filter((x) => !x.isPlayer).sort((a, b) => b.creativity + b.strategy - (a.creativity + a.strategy))[0];
}

export function eventText(s: GameState, text: string, target: string | null): string {
  return text
    .replaceAll("{client}", target ?? "a client")
    .replaceAll("{agency}", s.agencyName)
    .replaceAll("{staff}", bestStaff(s)?.name ?? "our best hire");
}

/** Returns the target client name, null for no target, or false when the event can't fire now. */
function eligible(s: GameState, ev: EventDef, rng: Rng): string | null | false {
  const t = ev.trigger;
  const year = dateOf(s.day).year;
  if (t.minYear && year < t.minYear) return false;
  if (t.minStaff && s.staff.length < t.minStaff) return false;
  if (t.minResults && s.results.length < t.minResults) return false;
  if (t.flag && !s.flags.includes(t.flag)) return false;
  if (t.clientNotAccount && accountOf(s, t.clientNotAccount)) return false;
  if (t.rfpOpen) return s.rfp ? s.rfp.client.name : false;
  if (t.goodResult) {
    const r = [...s.results].reverse().find((x) => x.satisfaction >= 8 && s.day - x.day < DAYS_PER_MONTH * 12);
    return r ? r.clientName : false;
  }
  if (t.category) {
    const accs = s.accounts.filter((a) => a.client.category === t.category);
    return accs.length ? rng.pick(accs).client.name : false;
  }
  if (t.anyAccount) return s.accounts.length ? rng.pick(s.accounts).client.name : false;
  return null;
}

/** Weekly: queue dated events whose month has come, and sometimes a random one. */
export function weeklyEvents(s: GameState, rng: Rng): void {
  const d = dateOf(s.day);
  for (const ev of EVENTS) {
    if (!ev.trigger.date || s.eventLog[ev.id] !== undefined) continue;
    const [y, m] = ev.trigger.date;
    if (d.year > y || (d.year === y && d.month >= m)) {
      s.eventLog[ev.id] = s.day;
      const target = eligible(s, ev, rng);
      if (target !== false) s.eventQueue.push({ id: ev.id, target });
    }
  }
  if (!s.event && !s.eventQueue.length && rng.chance(WEEKLY_EVENT_CHANCE)) {
    const options: { ev: EventDef; target: string | null; weight: number }[] = [];
    for (const ev of EVENTS) {
      if (ev.trigger.date || ev.trigger.system) continue;
      const last = s.eventLog[ev.id];
      if (last !== undefined && s.day - last < (ev.trigger.cooldownWeeks ?? 52) * DAYS_PER_WEEK) continue;
      const target = eligible(s, ev, rng);
      if (target !== false) options.push({ ev, target, weight: ev.trigger.weight ?? 1 });
    }
    if (options.length) {
      let r = rng.next() * options.reduce((a, o) => a + o.weight, 0);
      const pick = options.find((o) => (r -= o.weight) <= 0) ?? options[options.length - 1];
      s.eventLog[pick.ev.id] = s.day;
      s.eventQueue.push({ id: pick.ev.id, target: pick.target });
    }
  }
  activateNext(s, rng);
}

export function queueEvent(s: GameState, id: string, target: string | null): void {
  s.eventLog[id] = s.day;
  s.eventQueue.push({ id, target });
}

/** Show the next queued event, applying its own effects as it opens. */
export function activateNext(s: GameState, rng: Rng): void {
  if (s.event || !s.eventQueue.length) return;
  s.event = s.eventQueue.shift()!;
  const ev = eventDef(s.event.id);
  if (ev.effects) applyEffects(s, rng, ev.effects, s.event.target);
}

export function chooseEventOption(s: GameState, index: number): void {
  const active = s.event;
  if (!active) return;
  const ev = eventDef(active.id);
  const opt = ev.options[index];
  if (!opt) return;
  const rng = new Rng(s.rng);
  const texts = applyEffects(s, rng, opt.effects, active.target);
  if (opt.result) texts.unshift(opt.result);
  s.event = null;
  for (const t of texts) notify(s, eventText(s, t, active.target), "info");
  activateNext(s, rng);
  s.rng = rng.state;
}

function num(x: unknown): number {
  return typeof x === "number" ? x : 0;
}

/** Apply effects in order; returns outcome lines for chance effects. */
function applyEffects(s: GameState, rng: Rng, effects: EventEffect[], target: string | null): string[] {
  const out: string[] = [];
  const acc = target ? accountOf(s, target) : undefined;
  for (const e of effects) {
    if ("cash" in e) {
      const amount = Math.round(num(e.cash) * inflation(s.day));
      s.cash += amount;
      s.yearProfit += amount;
    }
    if ("reputation" in e) s.reputation = Math.max(0, s.reputation + num(e.reputation));
    if ("knowledge" in e) s.knowledge = Math.max(0, s.knowledge + num(e.knowledge));
    if ("flag" in e && !s.flags.includes(String(e.flag))) s.flags.push(String(e.flag));
    if ("loyalty" in e && acc) acc.goodwill += num(e.loyalty);
    if ("loyaltyCategory" in e) {
      for (const a of s.accounts) if (a.client.category === e.loyaltyCategory) a.goodwill += num(e.amount);
    }
    if ("dropCategory" in e) {
      for (const a of [...s.accounts]) if (a.client.category === e.dropCategory) loseAccount(s, a.client.name, "is no longer our client");
    }
    if ("mod" in e) {
      const m = e.mod as Omit<Modifier, "until"> & { weeks: number };
      s.mods.push({ kind: m.kind, id: m.id, categories: m.categories, mult: m.mult, until: s.day + m.weeks * DAYS_PER_WEEK });
    }
    if ("forceRfp" in e) forceRfp(s, rng, String(e.forceRfp));
    if ("salary" in e) {
      for (const st of s.staff) if (!st.isPlayer) st.salary = Math.round((st.salary * num(e.salary)) / 10) * 10;
    }
    if ("loan" in e) {
      const amount = Math.round(num(e.loan) * inflation(s.day));
      s.cash += amount;
      s.loans.push({ payment: Math.round((amount * 1.12) / 12), monthsLeft: 12 });
    }
    if ("hireNephew" in e && s.staff.length < OFFICES[s.office].capacity) {
      const last = target?.split(" ")[0] ?? "Junior";
      s.staff.push({ id: nextId(s), name: `Chip ${last}`, isPlayer: false, creativity: 16, strategy: 12, speed: 0.85, salary: Math.round(200 * inflation(s.day)), xp: 0 });
    }
    if ("bestStaffRaise" in e) {
      const st = bestStaff(s);
      if (st) st.salary = Math.round((st.salary * (1 + num(e.bestStaffRaise))) / 10) * 10;
    }
    if ("bestStaffLeaves" in e) {
      const st = bestStaff(s);
      if (st) s.staff = s.staff.filter((x) => x !== st);
    }
    if ("pitchBonus" in e && s.rfp) s.rfp.pitchBonus += num(e.pitchBonus);
    if ("keepAccount" in e && acc && acc.renewDay - s.day <= 4 * DAYS_PER_WEEK) {
      renewAccount(acc, 1);
      notify(s, `${acc.client.name} stays with us for another year.`, "good");
    }
    if ("freeCampaign" in e && acc) acc.free += 1;
    if ("loseAccount" in e && target) loseAccount(s, target, "has left the agency");
    if ("chance" in e) {
      const p = e.chance === "loyalty" ? 0.2 + 0.2 * (acc?.client.loyalty ?? 1) : num(e.chance);
      const won = rng.chance(p);
      out.push(...applyEffects(s, rng, (won ? e.win : e.lose) as EventEffect[], target));
      const text = won ? e.winText : e.loseText;
      if (typeof text === "string") out.unshift(text);
    }
  }
  return out;
}

