import { AGENCY_TIERS, AUDIENCES, CLIENTS, HINTS, RIVALS, scale, type Objective } from "./content";
import { DAYS_PER_WEEK, DAYS_PER_YEAR, dateOf, inflation } from "./calendar";
import type { Rng } from "./rng";
import type { Account, Brief, Client, ClientSize, GameState, Rfp } from "./types";
import { modMult, money, nextId, notify } from "./util";

/** Billing per expected campaign, in 1970 dollars. */
const BILLING_PER_CAMPAIGN: Record<ClientSize, number> = { small: 1200, medium: 4500, large: 6000 };
const SIZE_SCALE: Record<ClientSize, string> = { small: "local", medium: "regional", large: "regional" };
/** The agency tier a client of each size wants to see before it invites us to pitch. */
export const SIZE_TIER: Record<ClientSize, number> = { small: 0, medium: 1, large: 2 };
/** Chance, each week a conflicting pitch is in progress, that our current client hears about it. */
const LEAK_CHANCE = 0.1;

// ---------- Agency tier ----------

export function tierChecks(s: GameState, tier: number): { label: string; ok: boolean }[] {
  const t = AGENCY_TIERS[tier];
  const out: { label: string; ok: boolean }[] = [];
  if (t.office) out.push({ label: "A real office", ok: s.office >= t.office });
  if (t.reputation) out.push({ label: `★ ${t.reputation} reputation (now ${Math.floor(s.reputation)})`, ok: s.reputation >= t.reputation });
  if (t.scale) out.push({ label: "Regional Campaigns research", ok: s.unlocks.scales.includes(t.scale) });
  if (t.staff) out.push({ label: `${t.staff} people on staff (now ${s.staff.length})`, ok: s.staff.length >= t.staff });
  if (t.renewedMedium) out.push({ label: "Renewed a medium or large client once", ok: s.flags.includes("renewedMedium") });
  return out;
}

/** The highest tier whose conditions (and every lower tier's) we meet right now. */
export function agencyTier(s: GameState): number {
  let tier = 0;
  while (tier + 1 < AGENCY_TIERS.length && tierChecks(s, tier + 1).every((c) => c.ok)) tier++;
  return tier;
}

/** Weekly: celebrate the first time we reach each tier. */
export function checkTier(s: GameState, queue: (id: string) => void): void {
  const tier = agencyTier(s);
  for (let t = 1; t <= tier; t++) {
    if (s.flags.includes(`tier${t}`)) continue;
    s.flags.push(`tier${t}`);
    queue(`tier_${t}`);
  }
}

/** Our accounts that compete with a client: same sector. */
export function conflicts(s: GameState, c: Client): Account[] {
  return s.accounts.filter((a) => a.client.category === c.category && a.client.name !== c.name);
}

/** Things on the Accounts page waiting for the player: an unanswered pitch, accounts behind on campaigns. */
export function accountAlerts(s: GameState): number {
  let n = s.rfp && !s.rfp.accepted ? 1 : 0;
  for (const acc of s.accounts) {
    const busy = s.briefs.some((b) => b.client.name === acc.client.name)
      || (s.project?.kind === "campaign" && s.project.brief.client.name === acc.client.name);
    if (!busy && acc.done < acc.expected + acc.free && acc.renewDay - s.day <= 8 * DAYS_PER_WEEK) n++;
  }
  return n;
}

export function clientAvailable(s: GameState, c: Client): boolean {
  if (c.fromYear && dateOf(s.day).year < c.fromYear) return false;
  if (c.category === "tobacco" && s.flags.includes("noTobacco")) return false;
  return true;
}

export function accountOf(s: GameState, name: string): Account | undefined {
  return s.accounts.find((a) => a.client.name === name);
}

export function contractTerms(s: GameState, c: Client): { billing: number; expected: number } {
  const expected = c.budget;
  const per = BILLING_PER_CAMPAIGN[c.size] * inflation(s.day) * modMult(s, "budget", { category: c.category });
  return { billing: Math.round((per * expected) / 50) * 50, expected };
}

export function signAccount(s: GameState, c: Client, terms = contractTerms(s, c)): Account {
  const acc: Account = {
    client: { ...c },
    billing: terms.billing,
    expected: terms.expected,
    done: 0,
    free: 0,
    sats: [],
    goodwill: 0,
    sinceDay: s.day,
    renewDay: s.day + DAYS_PER_YEAR,
  };
  s.accounts.push(acc);
  if (!s.sectors.includes(c.category)) s.sectors.push(c.category);
  if (!s.known.includes(c.name)) s.known.push(c.name);
  s.lostClients = s.lostClients.filter((n) => n !== c.name);
  notify(s, `${c.name} signed with us: ${money(acc.billing)} a year for ${acc.expected} campaign${acc.expected > 1 ? "s" : ""}.`, "good");
  return acc;
}

export function loseAccount(s: GameState, name: string, why = "has taken its business elsewhere"): void {
  const acc = accountOf(s, name);
  if (!acc) return;
  s.accounts = s.accounts.filter((a) => a !== acc);
  s.lostClients.push(name);
  notify(s, `${name} ${why}.`, "bad");
}

/** Score a contract year: missed campaigns count as a 1. */
export function yearScore(acc: Account): number {
  const missing = Math.max(0, acc.expected + acc.free - acc.done);
  const scores = [...acc.sats, ...Array(missing).fill(1)];
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 7;
  return avg + acc.goodwill;
}

/** Loyal clients forgive more: the score they need to renew. */
export function renewThreshold(acc: Account): number {
  return 7.5 - acc.client.loyalty;
}

export function renewAccount(s: GameState, acc: Account, raise: number): void {
  if (acc.client.size !== "small" && !s.flags.includes("renewedMedium")) s.flags.push("renewedMedium");
  acc.billing = Math.round((acc.billing * raise) / 50) * 50;
  acc.done = 0;
  acc.free = 0;
  acc.sats = [];
  acc.goodwill = 0;
  acc.renewDay += DAYS_PER_YEAR;
}

/** Weekly: contracts that reached their anniversary renew, go under review, or end. */
export function checkRenewals(s: GameState, queueReview: (name: string) => void): void {
  for (const acc of [...s.accounts]) {
    if (acc.renewDay > s.day) continue;
    // A campaign for this client is in progress: wait for it.
    if (s.project?.kind === "campaign" && s.project.brief.client.name === acc.client.name) continue;
    const score = yearScore(acc);
    const need = renewThreshold(acc);
    if (score >= need) {
      const raise = score >= 8 ? 1.12 : score >= need + 1 ? 1.05 : 1;
      renewAccount(s, acc, raise);
      notify(s, `${acc.client.name} renewed for another year${raise > 1 ? `, and raised billing to ${money(acc.billing)}` : ""}.`, "good");
    } else if (score >= need - 1.5) {
      acc.renewDay = s.day + 4 * DAYS_PER_WEEK; // decided by the review event
      queueReview(acc.client.name);
    } else {
      loseAccount(s, acc.client.name, "won't renew. They were unhappy with this year's work");
    }
  }
}

export function monthlyBilling(s: GameState): number {
  return Math.round(s.accounts.reduce((sum, a) => sum + a.billing / 12, 0));
}

// ---------- Briefs ----------

function pickObjective(rng: Rng): Objective {
  return rng.pick<Objective>(["awareness", "consideration", "steal"]);
}

function makeHints(c: Client, objective: Objective, audienceId: string, rng: Rng): string[] {
  const hint = [rng.pick(HINTS.objective[objective]), rng.pick(HINTS.audience[audienceId])];
  if (c.risk <= 0.25) hint.push(HINTS.risk.low);
  if (c.risk >= 0.75) hint.push(HINTS.risk.high);
  return hint;
}

function briefFor(s: GameState, rng: Rng, c: Client, kind: Brief["kind"], fee: number): Brief {
  const objective = pickObjective(rng);
  const audienceId = rng.pick(AUDIENCES.map((a) => a.id));
  const scaleId = SIZE_SCALE[c.size];
  const sc = scale(scaleId);
  return {
    id: nextId(s),
    kind,
    client: { ...c },
    objective,
    audience: audienceId,
    scale: scaleId,
    fee,
    bonusPct: Math.round(rng.range(0.06, 0.1) * 100) / 100,
    deadlineWeeks: Math.round((sc.stageDays * 3) / DAYS_PER_WEEK) + rng.int(2, 3),
    hint: makeHints(c, objective, audienceId, rng),
    expiresDay: s.day + (kind === "trial" ? rng.int(4, 8) : 12) * DAYS_PER_WEEK,
  };
}

/** A one-off brief from a small company that isn't a client yet. Do it well and they sign. */
export function makeTrialBrief(s: GameState, rng: Rng): Brief | null {
  const taken = new Set([...s.accounts.map((a) => a.client.name), ...s.briefs.map((b) => b.client.name), ...s.lostClients]);
  // Small clients don't ask for trial work from an agency that already serves a rival.
  const pool = CLIENTS.filter((c) => c.size === "small" && clientAvailable(s, c) && !taken.has(c.name) && !conflicts(s, c).length);
  if (!pool.length) return null;
  const c = rng.pick(pool);
  const repBoost = 1 + Math.min(0.5, s.reputation / 60);
  const fee = Math.round((scale("local").fee * inflation(s.day) * repBoost * modMult(s, "budget", { category: c.category }) * rng.range(0.85, 1.2)) / 50) * 50;
  return briefFor(s, rng, c, "trial", fee);
}

export function canRequestCampaign(s: GameState, name: string): string | null {
  const acc = accountOf(s, name);
  if (!acc) return "Not a client.";
  if (acc.done >= acc.expected + acc.free) return "They've had every campaign they pay for this year.";
  if (s.briefs.some((b) => b.client.name === name)) return "Their brief is already waiting.";
  if (acc.client.size !== "small" && !s.unlocks.scales.includes("regional")) return "Needs Regional Campaigns research.";
  return null;
}

/** The player starts one of an account's yearly campaigns; returns the new brief id. */
export function requestAccountCampaign(s: GameState, rng: Rng, name: string): number | string {
  const err = canRequestCampaign(s, name);
  if (err) return err;
  const acc = accountOf(s, name)!;
  const brief = briefFor(s, rng, acc.client, "account", Math.round(acc.billing / acc.expected));
  s.briefs.push(brief);
  return brief.id;
}

// ---------- RFPs ----------

function rivalsFor(s: GameState, c: Client, rng: Rng): { name: string; strength: number }[] {
  const base = c.size === "large" ? 6.2 : 5.2;
  const growth = (s.day / DAYS_PER_YEAR) * 0.12;
  const names = [...RIVALS];
  return [0, 1].map(() => {
    const name = names.splice(rng.int(0, names.length - 1), 1)[0];
    return { name, strength: Math.round(Math.min(9.5, base + growth + rng.range(-0.8, 0.9)) * 10) / 10 };
  });
}

/** Clients that would invite us to pitch right now. */
export function rfpPool(s: GameState, category?: string): Client[] {
  if (!s.unlocks.scales.includes("regional")) return [];
  return CLIENTS.filter((c) => {
    if (c.size === "small" || !clientAvailable(s, c) || accountOf(s, c.name)) return false;
    if (category ? c.category !== category : !s.sectors.includes(c.category)) return false;
    if (agencyTier(s) < SIZE_TIER[c.size]) return false;
    return true;
  });
}

export function openRfp(s: GameState, rng: Rng, c: Client): Rfp {
  const terms = contractTerms(s, c);
  const rfp: Rfp = {
    id: nextId(s),
    client: { ...c },
    billing: terms.billing,
    expected: terms.expected,
    rivals: rivalsFor(s, c, rng),
    expiresDay: s.day + 6 * DAYS_PER_WEEK,
    accepted: false,
    pitchBonus: 0,
  };
  s.rfp = rfp;
  s.eventLog.rfp_invite = s.day;
  s.eventQueue.push({ id: "rfp_invite", target: c.name });
  return rfp;
}

/** Monthly: maybe a client in a sector we work in invites us to pitch. */
export function maybeOpenRfp(s: GameState, rng: Rng): void {
  if (s.rfp) {
    const name = s.rfp.client.name;
    const inProgress = s.briefs.some((b) => b.kind === "rfp" && b.client.name === name)
      || (s.project?.kind === "campaign" && s.project.brief.kind === "rfp" && s.project.brief.client.name === name);
    if (s.rfp.expiresDay <= s.day && !inProgress) {
      notify(s, `${name} picked another agency without us.`, "info");
      s.rfp = null;
    }
    return;
  }
  const pool = rfpPool(s);
  if (!pool.length) return;
  const weights = pool.map((c) => modMult(s, "rfp", { category: c.category }));
  const chance = Math.min(0.6, (0.12 + s.reputation / 300) * Math.max(...weights));
  if (!rng.chance(chance)) return;
  let r = rng.next() * weights.reduce((a, b) => a + b, 0);
  const c = pool.find((_, i) => (r -= weights[i]) <= 0) ?? pool[pool.length - 1];
  openRfp(s, rng, c);
}

export function forceRfp(s: GameState, rng: Rng, category: string): void {
  if (s.rfp) return;
  const pool = rfpPool(s, category);
  if (pool.length) openRfp(s, rng, rng.pick(pool));
}

export function acceptRfp(s: GameState, rng: Rng): number | string {
  const rfp = s.rfp;
  if (!rfp || rfp.accepted) return "No open pitch.";
  if (s.project) return "Finish the current project first.";
  rfp.accepted = true;
  const brief = briefFor(s, rng, rfp.client, "rfp", Math.round(rfp.billing / rfp.expected));
  brief.expiresDay = rfp.expiresDay;
  s.briefs.push(brief);
  return brief.id;
}

/** Weekly: a client we already serve may hear we're pitching for its rival, and leave. */
export function checkPitchLeak(s: GameState, rng: Rng, queue: (name: string) => void): void {
  if (!s.rfp?.accepted || s.event?.id === "pitch_leak" || s.eventQueue.some((e) => e.id === "pitch_leak")) return;
  const rivals = conflicts(s, s.rfp.client);
  if (rivals.length && rng.chance(LEAK_CHANCE)) queue(rng.pick(rivals).client.name);
}

/** We won a pitch: accounts competing with the new client have to go. */
export function dropConflicts(s: GameState, c: Client): void {
  for (const acc of conflicts(s, c)) loseAccount(s, acc.client.name, `is no longer our client now that we work for ${c.name}`);
}

export function declineRfp(s: GameState): void {
  if (!s.rfp) return;
  s.briefs = s.briefs.filter((b) => !(b.kind === "rfp" && b.client.name === s.rfp!.client.name));
  s.rfp = null;
}
