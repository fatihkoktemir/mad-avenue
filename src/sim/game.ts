import {
  APPROACHES, AUDIENCES, CHANNELS, CLIENTS, EXTRAS, FIRST_NAMES, HINTS, LAST_NAMES,
  SCALES, SMALL_JOBS, STAGES, channel, extra, researchItem, scale,
  type Objective,
} from "./content";
import {
  DAYS_PER_MONTH, DAYS_PER_WEEK, DAYS_PER_YEAR, START_YEAR, dateOf, inflation,
} from "./calendar";
import {
  applyExtra, briefDeadline, emptyAreaPoints, evaluate, normalize, productionCost, workDay,
  type DayOutput,
} from "./campaign";
import { Rng } from "./rng";
import type {
  Brief, Candidate, CampaignProject, CampaignSetup, GameState, Notice, SmallJob, Staff,
} from "./types";

export const SLICE_END_YEAR = 1981;
export const OFFICES = [
  { name: "Single Room", capacity: 1, rent: 150, cost: 0 },
  { name: "Small Office", capacity: 4, rent: 600, cost: 35000 },
];

export interface NewGameOptions {
  seed?: number;
  agencyName?: string;
  playerName?: string;
}

export function newGame(opts: NewGameOptions = {}): GameState {
  const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31);
  const state: GameState = {
    version: 1,
    seed,
    rng: seed,
    day: 0,
    agencyName: opts.agencyName ?? "Mad Avenue Advertising Co.",
    playerName: opts.playerName ?? "Don",
    cash: 8000,
    creativeRep: 0,
    businessRep: 0,
    knowledge: 0,
    office: 0,
    staff: [{ id: 1, name: opts.playerName ?? "Don", isPlayer: true, creativity: 30, strategy: 26, speed: 1, salary: 0, xp: 0 }],
    candidates: [],
    briefs: [],
    smallJobs: [],
    project: null,
    results: [],
    pendingResult: null,
    lifts: [],
    bestCore: 0,
    discovered: {},
    unlocks: {
      approaches: APPROACHES.filter((a) => a.startUnlocked).map((a) => a.id),
      channels: CHANNELS.filter((c) => c.startUnlocked).map((c) => c.id),
      audiences: AUDIENCES.filter((a) => a.startUnlocked).map((a) => a.id),
      scales: ["local"],
      extras: EXTRAS.filter((e) => e.startUnlocked).map((e) => e.id),
      research: [],
    },
    notices: [],
    nextId: 2,
    negativeMonths: 0,
    yearProfit: 0,
    over: null,
  };
  const rng = new Rng(state.rng);
  refreshOffers(state, rng);
  state.rng = rng.state;
  notify(state, `Welcome to ${state.agencyName}. One room, one typewriter, one dream. Take a brief or a small job to get started.`, "info");
  return state;
}

function nextId(s: GameState): number {
  return s.nextId++;
}

export function notify(s: GameState, text: string, tone: Notice["tone"] = "info"): void {
  s.notices.push({ id: nextId(s), day: s.day, text, tone });
  if (s.notices.length > 40) s.notices.splice(0, s.notices.length - 40);
}

/** True when the game is waiting on a player decision and time should not move. */
export function isBlocked(s: GameState): boolean {
  if (s.over || s.pendingResult !== null) return true;
  const p = s.project;
  return !!p && p.kind === "campaign" && (p.phase === "allocate" || p.phase === "extras" || p.phase === "revision");
}

export interface TickEvents {
  work: DayOutput[];
}

/** Advance one day. Returns what happened so the UI can animate it. */
export function tick(s: GameState): TickEvents {
  const events: TickEvents = { work: [] };
  if (isBlocked(s)) return events;
  const rng = new Rng(s.rng);
  s.day += 1;

  progressProject(s, rng, events);

  if (s.day % DAYS_PER_WEEK === 0) weekly(s, rng);
  if (s.day % DAYS_PER_MONTH === 0) monthly(s);
  if (s.day % DAYS_PER_YEAR === 0) yearly(s);

  s.rng = rng.state;
  return events;
}

function progressProject(s: GameState, rng: Rng, events: TickEvents): void {
  const p = s.project;
  if (!p) return;
  if (p.kind === "smallJob") {
    for (const st of s.staff) {
      const c = (st.creativity / 5) * st.speed * rng.range(0.8, 1.2) * 0.5;
      const sp = (st.strategy / 5) * st.speed * rng.range(0.8, 1.2) * 0.5;
      p.c += c;
      p.s += sp;
      events.work.push({ staffId: st.id, area: "production", c, s: sp, note: false });
    }
    if (p.c >= p.job.needC && p.s >= p.job.needS) {
      s.cash += p.job.pay;
      s.yearProfit += p.job.pay;
      s.knowledge += 1;
      s.businessRep += 0.5;
      notify(s, `${p.job.client} paid $${p.job.pay.toLocaleString("en-US")} for the ${p.job.title.toLowerCase()}.`, "good");
      gainXp(s, 4);
      s.project = null;
    } else if (s.day > p.deadlineDay) {
      s.cash -= p.job.penalty;
      s.yearProfit -= p.job.penalty;
      s.businessRep = Math.max(0, s.businessRep - 1);
      notify(s, `We missed the deadline for ${p.job.client}. Penalty: $${p.job.penalty.toLocaleString("en-US")}.`, "bad");
      s.project = null;
    }
    return;
  }

  if (p.phase === "running") {
    events.work = workDay(p, s.staff, rng);
    p.stageDay += 1;
    if (p.stageDay >= p.stageDays) {
      p.stageDay = 0;
      if (p.stage < 2) {
        const hasExtras = availableExtras(s, p).length > 0;
        p.phase = hasExtras ? "extras" : "allocate";
        p.stage += 1;
        p.stageDays = scale(p.brief.scale).stageDays;
        if (!hasExtras) p.allocs[p.stage] = defaultAlloc();
      } else {
        p.phase = "revision";
      }
    }
  } else if (p.phase === "revising") {
    const rate = s.staff.length * 0.9 + 0.3;
    p.notes = Math.max(0, p.notes - rate * rng.range(0.7, 1.3));
    for (const st of s.staff) events.work.push({ staffId: st.id, area: "production", c: 0, s: 0, note: false });
    if (p.notes <= 0.01) {
      p.notes = 0;
      p.phase = "revision";
    }
  }
}

function weekly(s: GameState, rng: Rng): void {
  // Sales Lift bonuses arrive weekly.
  for (const lift of s.lifts) {
    const amount = Math.round(lift.weeks[lift.week] * lift.bonusPct);
    s.cash += amount;
    s.yearProfit += amount;
    lift.paid += amount;
    lift.week += 1;
  }
  const done = s.lifts.filter((l) => l.week >= l.weeks.length);
  for (const l of done) notify(s, `The ${l.clientName} campaign has run its course. Bonus earned: $${l.paid.toLocaleString("en-US")}.`, "info");
  s.lifts = s.lifts.filter((l) => l.week < l.weeks.length);

  s.briefs = s.briefs.filter((b) => b.expiresDay > s.day);
  s.smallJobs = s.smallJobs.filter((j) => j.expiresDay > s.day);
  if (s.briefs.length < 2 && rng.chance(0.35)) s.briefs.push(makeBrief(s, rng));
  if (s.smallJobs.length < 3 && rng.chance(0.4)) s.smallJobs.push(makeSmallJob(s, rng));
}

function monthly(s: GameState): void {
  const salaries = s.staff.reduce((sum, st) => sum + st.salary, 0);
  const rent = Math.round(OFFICES[s.office].rent * inflation(s.day));
  const cost = salaries + rent;
  s.cash -= cost;
  s.yearProfit -= cost;
  if (s.cash < 0) {
    s.negativeMonths += 1;
    if (s.negativeMonths >= 3) {
      s.over = "bankrupt";
      notify(s, "The bank has called in our debts. The agency is closing its doors.", "bad");
    } else {
      notify(s, `We're in the red. ${3 - s.negativeMonths} more month${3 - s.negativeMonths > 1 ? "s" : ""} like this and the bank closes us down.`, "bad");
    }
  } else {
    s.negativeMonths = 0;
  }
  if (s.office > 0 && dateOf(s.day).month % 3 === 0) refreshCandidates(s, new Rng(s.rng + s.day));
}

function yearly(s: GameState): void {
  const year = dateOf(s.day).year - 1;
  const profit = Math.round(s.yearProfit);
  notify(s, `Annual report for ${year}: ${profit >= 0 ? "profit" : "loss"} of $${Math.abs(profit).toLocaleString("en-US")}.`, profit >= 0 ? "good" : "bad");
  s.yearProfit = 0;
  if (dateOf(s.day).year >= SLICE_END_YEAR) s.over = "sliceEnd";
}

export function refreshOffers(s: GameState, rng: Rng): void {
  while (s.briefs.length < 2) s.briefs.push(makeBrief(s, rng));
  while (s.smallJobs.length < 2) s.smallJobs.push(makeSmallJob(s, rng));
}

function makeBrief(s: GameState, rng: Rng): Brief {
  const scales = s.unlocks.scales;
  const scaleId = scales.length > 1 && rng.chance(0.4 + Math.min(0.3, s.businessRep / 60)) ? scales[scales.length - 1] : "local";
  const pool = CLIENTS.filter((c) => (scaleId === "local" ? c.budget === 1 : c.budget >= 2));
  const client = { ...rng.pick(pool) };
  const objectives: Objective[] = ["awareness", "consideration", "steal"];
  const objective = rng.pick(objectives);
  const audienceId = rng.pick(AUDIENCES.map((a) => a.id));
  const sc = scale(scaleId);
  const repBoost = 1 + Math.min(0.5, (s.businessRep + s.creativeRep) / 100);
  const fee = Math.round((sc.fee * inflation(s.day) * repBoost * rng.range(0.85, 1.2)) / 50) * 50;
  const hint = [rng.pick(HINTS.objective[objective]), rng.pick(HINTS.audience[audienceId])];
  if (client.risk <= 0.25) hint.push(HINTS.risk.low);
  if (client.risk >= 0.75) hint.push(HINTS.risk.high);
  return {
    id: nextId(s),
    client,
    objective,
    audience: audienceId,
    scale: scaleId,
    fee,
    bonusPct: Math.round(rng.range(0.03, 0.06) * 100) / 100,
    deadlineWeeks: Math.round((sc.stageDays * 3) / DAYS_PER_WEEK) + rng.int(2, 3),
    hint,
    expiresDay: s.day + rng.int(4, 8) * DAYS_PER_WEEK,
  };
}

function makeSmallJob(s: GameState, rng: Rng): SmallJob {
  const def = rng.pick(SMALL_JOBS);
  const size = rng.range(0.7, 1.5) * (1 + 0.15 * (s.day / DAYS_PER_YEAR));
  const weeks = rng.int(2, 3);
  const pay = Math.round((550 * size * inflation(s.day)) / 25) * 25;
  return {
    id: nextId(s),
    title: def.title,
    client: def.client,
    needC: Math.round(28 * size),
    needS: Math.round(22 * size),
    weeks,
    pay,
    penalty: Math.round(pay * 0.4 / 25) * 25,
    expiresDay: s.day + rng.int(3, 6) * DAYS_PER_WEEK,
  };
}

function refreshCandidates(s: GameState, rng: Rng): void {
  s.candidates = Array.from({ length: 3 }, () => makeCandidate(s, rng));
}

function makeCandidate(s: GameState, rng: Rng): Candidate {
  const creativity = rng.int(18, 42);
  const strategy = rng.int(18, 42);
  const speed = Math.round(rng.range(0.85, 1.2) * 100) / 100;
  const salary = Math.round(((creativity + strategy) * 9 * speed * inflation(s.day)) / 10) * 10;
  return {
    name: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
    creativity, strategy, speed, salary,
    hireFee: salary,
  };
}

function gainXp(s: GameState, amount: number): void {
  for (const st of s.staff) {
    st.xp += amount;
    while (st.xp >= 10) {
      st.xp -= 10;
      if (st.creativity <= st.strategy) st.creativity += 1;
      else st.strategy += 1;
    }
  }
}

export function defaultAlloc(): number[] {
  return [1 / 3, 1 / 3, 1 / 3];
}

// ---------- Player actions ----------

export function takeSmallJob(s: GameState, jobId: number): string | null {
  if (s.project) return "The team is busy.";
  const job = s.smallJobs.find((j) => j.id === jobId);
  if (!job) return "That job is gone.";
  s.smallJobs = s.smallJobs.filter((j) => j.id !== jobId);
  s.project = { kind: "smallJob", job, c: 0, s: 0, startDay: s.day, deadlineDay: s.day + job.weeks * DAYS_PER_WEEK };
  return null;
}

export function startCampaign(s: GameState, briefId: number, setup: CampaignSetup): string | null {
  if (s.project) return "The team is busy.";
  const brief = s.briefs.find((b) => b.id === briefId);
  if (!brief) return "That brief is gone.";
  if (!s.unlocks.approaches.includes(setup.approach)) return "Approach not available.";
  if (!s.unlocks.channels.includes(setup.channel)) return "Channel not available.";
  if (!s.unlocks.audiences.includes(setup.audience)) return "Audience not available.";
  const ch = channel(setup.channel);
  if (SCALES.findIndex((x) => x.id === brief.scale) < SCALES.findIndex((x) => x.id === ch.minScale)) {
    return `${ch.name} needs a bigger campaign.`;
  }
  const cost = productionCost(setup.channel, brief.scale, s.day);
  s.briefs = s.briefs.filter((b) => b.id !== briefId);
  s.cash -= cost;
  s.yearProfit -= cost;
  const p: CampaignProject = {
    kind: "campaign",
    brief,
    setup: { ...setup, name: setup.name.trim() || `${brief.client.name} campaign` },
    stage: 0,
    phase: "allocate",
    stageDay: 0,
    stageDays: scale(brief.scale).stageDays,
    allocs: [defaultAlloc(), defaultAlloc(), defaultAlloc()],
    areaPoints: emptyAreaPoints(),
    creativity: 0,
    strategy: 0,
    notes: 0,
    extras: [],
    cost,
    startDay: s.day,
    deadlineDay: briefDeadline(brief, s.day),
  };
  s.project = p;
  return null;
}

export function setAllocation(s: GameState, shares: number[]): void {
  const p = s.project;
  if (!p || p.kind !== "campaign" || p.phase !== "allocate") return;
  p.allocs[p.stage] = normalize(shares.map((x) => Math.max(0, x)));
  p.phase = "running";
}

export function availableExtras(s: GameState, p: CampaignProject) {
  return EXTRAS.filter((e) => e.after === p.stage && s.unlocks.extras.includes(e.id) && !p.extras.includes(e.id));
}

export function chooseExtras(s: GameState, extraIds: string[]): string | null {
  const p = s.project;
  if (!p || p.kind !== "campaign" || p.phase !== "extras") return "Nothing to choose.";
  const allowed = availableExtras(s, { ...p, stage: p.stage - 1 }).map((e) => e.id);
  for (const id of extraIds) {
    if (!allowed.includes(id)) continue;
    const before = p.cost;
    applyExtra(p, id);
    const spent = p.cost - before;
    s.cash -= spent;
    s.yearProfit -= spent;
    notify(s, `Booked: ${extra(id).name} ($${spent.toLocaleString("en-US")}).`, "info");
  }
  p.phase = "allocate";
  p.allocs[p.stage] = defaultAlloc();
  return null;
}

export function revise(s: GameState): void {
  const p = s.project;
  if (p && p.kind === "campaign" && p.phase === "revision" && p.notes > 0) p.phase = "revising";
}

export function stopRevising(s: GameState): void {
  const p = s.project;
  if (p && p.kind === "campaign" && p.phase === "revising") p.phase = "revision";
}

export function deliver(s: GameState): void {
  const p = s.project;
  if (!p || p.kind !== "campaign" || p.phase !== "revision") return;
  const rng = new Rng(s.rng);
  const result = evaluate(p, { day: s.day, bestCore: s.bestCore, rng, id: nextId(s) });
  s.rng = rng.state;
  s.results.push(result);
  s.bestCore = Math.max(s.bestCore, result.core);
  for (const d of result.discovered) s.discovered[d.key] = d.fit;
  s.cash += result.fee;
  s.yearProfit += result.fee;
  s.knowledge += result.knowledge;
  const pressAvg = result.press.reduce((a, b) => a + b.score, 0) / result.press.length;
  s.creativeRep = Math.max(0, s.creativeRep + (pressAvg - 5) * 0.8);
  s.businessRep = Math.max(0, s.businessRep + (result.satisfaction - 5) * 0.8);
  s.lifts.push({ resultId: result.id, clientName: result.clientName, weeks: result.liftWeeks, week: 0, bonusPct: result.bonusPct, paid: 0 });
  gainXp(s, 10);
  s.project = null;
  s.pendingResult = result.id;
}

export function dismissResult(s: GameState): void {
  s.pendingResult = null;
}

export function canResearch(s: GameState, id: string): string | null {
  const r = researchItem(id);
  if (s.unlocks.research.includes(id)) return "Already researched.";
  if (r.requires && !s.unlocks.research.includes(r.requires)) return `Requires ${researchItem(r.requires).name}.`;
  if (r.requiresOffice && s.office < r.requiresOffice) return `Requires the ${OFFICES[r.requiresOffice].name}.`;
  if (s.knowledge < r.kp) return `Needs ${r.kp} knowledge points.`;
  if (s.cash < r.cost) return "Not enough cash.";
  return null;
}

export function research(s: GameState, id: string): string | null {
  const err = canResearch(s, id);
  if (err) return err;
  const r = researchItem(id);
  s.knowledge -= r.kp;
  s.cash -= r.cost;
  s.yearProfit -= r.cost;
  s.unlocks.research.push(id);
  const u = r.unlock;
  if (u.approach) s.unlocks.approaches.push(u.approach);
  if (u.audience) s.unlocks.audiences.push(u.audience);
  if (u.extra) s.unlocks.extras.push(u.extra);
  if (u.scale) s.unlocks.scales.push(u.scale);
  if (u.channel) s.unlocks.channels.push(u.channel);
  notify(s, `Research complete: ${r.name}.`, "good");
  return null;
}

export function upgradeOffice(s: GameState): string | null {
  const next = OFFICES[s.office + 1];
  if (!next) return "No bigger office in this build.";
  const cost = Math.round(next.cost * inflation(s.day));
  if (s.cash < cost) return "Not enough cash.";
  if (s.project) return "Finish the current project before moving.";
  s.cash -= cost;
  s.yearProfit -= cost;
  s.office += 1;
  refreshCandidates(s, new Rng(s.rng + s.day));
  notify(s, `We moved into the ${next.name}. Time to hire some help.`, "good");
  return null;
}

export function officeUpgradeCost(s: GameState): number | null {
  const next = OFFICES[s.office + 1];
  return next ? Math.round(next.cost * inflation(s.day)) : null;
}

export function hire(s: GameState, index: number): string | null {
  const c = s.candidates[index];
  if (!c) return "Candidate gone.";
  if (s.staff.length >= OFFICES[s.office].capacity) return "No desk free. We need a bigger office.";
  if (s.project) return "Wait until the current project is finished.";
  if (s.cash < c.hireFee) return "Not enough cash for the hiring fee.";
  s.cash -= c.hireFee;
  s.yearProfit -= c.hireFee;
  const staff: Staff = { id: nextId(s), name: c.name, isPlayer: false, creativity: c.creativity, strategy: c.strategy, speed: c.speed, salary: c.salary, xp: 0 };
  s.staff.push(staff);
  s.candidates.splice(index, 1);
  notify(s, `${c.name} joined the agency.`, "good");
  return null;
}

export function fire(s: GameState, staffId: number): void {
  const st = s.staff.find((x) => x.id === staffId);
  if (!st || st.isPlayer || s.project) return;
  s.staff = s.staff.filter((x) => x.id !== staffId);
  notify(s, `${st.name} cleared out their desk.`, "info");
}

export function stageName(p: CampaignProject): string {
  return STAGES[p.stage].name;
}

export function yearOf(s: GameState): number {
  return START_YEAR + Math.floor(s.day / DAYS_PER_YEAR);
}
