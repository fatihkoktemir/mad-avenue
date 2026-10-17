import {
  AREAS, FIT_PAIRS, FIT_VALUE, STAGES,
  approach, channel, extra, fitOf, nameOf, scale,
  type AreaId, type Fit, type FitPair,
} from "./content";
import { inflation, DAYS_PER_WEEK } from "./calendar";
import type { Rng } from "./rng";
import type { Brief, CampaignProject, CampaignResult, ExecScore, Staff } from "./types";

export const LIFT_WEEKS = 24;
export const ALL_AREAS = STAGES.flatMap((s) => s.areas);

export function emptyAreaPoints(): Record<AreaId, number> {
  return Object.fromEntries(ALL_AREAS.map((a) => [a, 0])) as Record<AreaId, number>;
}

/** Ideal shares for a stage: the approach's weights, with areas the channel ignores zeroed out. */
export function idealShares(approachId: string, channelId: string, stage: number): number[] {
  const w = approach(approachId).weights[stage];
  const useful = channel(channelId).useful;
  const raw = STAGES[stage].areas.map((a, i) => w[i] * useful[a]);
  const sum = raw.reduce((x, y) => x + y, 0) || 1;
  return raw.map((x) => x / sum);
}

export function normalize(shares: number[]): number[] {
  const sum = shares.reduce((x, y) => x + y, 0);
  if (sum <= 0) return shares.map(() => 1 / shares.length);
  return shares.map((x) => x / sum);
}

export interface DayOutput {
  staffId: number;
  area: AreaId;
  c: number;
  s: number;
  note: boolean;
}

/** One day of work by the whole team on the current stage. Mutates the project. */
export function workDay(p: CampaignProject, staff: Staff[], rng: Rng): DayOutput[] {
  const stage = STAGES[p.stage];
  const shares = p.allocs[p.stage];
  const out: DayOutput[] = [];
  for (const st of staff) {
    const i = pickWeighted(shares, rng);
    const area = stage.areas[i];
    const kind = AREAS[area].kind;
    const skill = kind === "c" ? st.creativity : kind === "s" ? st.strategy : (st.creativity + st.strategy) / 2;
    const amount = (skill / 10) * st.speed * rng.range(0.8, 1.2);
    const c = kind === "c" ? amount : kind === "both" ? amount / 2 : 0;
    const s = kind === "s" ? amount : kind === "both" ? amount / 2 : 0;
    p.areaPoints[area] += amount;
    p.creativity += c;
    p.strategy += s;
    const avgSkill = (st.creativity + st.strategy) / 2;
    const note = rng.chance(0.2 * (1 - avgSkill / 140));
    if (note) p.notes += 1;
    out.push({ staffId: st.id, area, c, s, note });
  }
  return out;
}

function pickWeighted(weights: number[], rng: Rng): number {
  let r = rng.next() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

export function applyExtra(p: CampaignProject, extraId: string): void {
  const ex = extra(extraId);
  const sc = scale(p.brief.scale);
  p.extras.push(extraId);
  p.cost += Math.round(ex.cost * sc.costMult * inflation(p.startDay));
  p.stageDays += ex.days;
  if (ex.channels.includes(p.setup.channel)) {
    p.areaPoints[ex.area] += sc.target * ex.boost * 0.35;
  }
}

export function extraCost(extraId: string, p: CampaignProject): number {
  return Math.round(extra(extraId).cost * scale(p.brief.scale).costMult * inflation(p.startDay));
}

export function productionCost(channelId: string, scaleId: string, day: number): number {
  return Math.round(channel(channelId).cost * scale(scaleId).costMult * inflation(day));
}

export function fitKey(pair: FitPair, a: string, b: string): string {
  return `${pair}:${a}:${b}`;
}

export function pairArgs(pair: FitPair, cat: string, appr: string, chan: string, aud: string): [string, string] {
  switch (pair) {
    case "categoryApproach": return [cat, appr];
    case "approachChannel": return [appr, chan];
    case "categoryAudience": return [cat, aud];
    case "channelAudience": return [chan, aud];
  }
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const toTen = (x: number) => Math.round(clamp(1 + 9 * Math.pow(clamp(x, 0, 1), 1.4), 1, 10) * 10) / 10;

export interface EvalContext {
  day: number;
  bestCore: number;
  rng: Rng;
  id: number;
}

export function evaluate(p: CampaignProject, ctx: EvalContext): CampaignResult {
  const { brief, setup } = p;
  const sc = scale(brief.scale);
  const ch = channel(setup.channel);
  const appr = approach(setup.approach);
  const cat = brief.client.category;
  const years = ctx.day / (DAYS_PER_WEEK * 48);
  const target = sc.target * (1 + 0.04 * years);

  // Quality: useful points against what the scale demands.
  const useful = ALL_AREAS.reduce((sum, a) => sum + p.areaPoints[a] * ch.useful[a], 0);
  const total = ALL_AREAS.reduce((sum, a) => sum + p.areaPoints[a], 0) || 1;
  const quality = useful / target;

  // Slider fit per stage (1 = perfect).
  const stageFits = STAGES.map((_, i) => {
    const ideal = idealShares(setup.approach, setup.channel, i);
    const d = p.allocs[i].reduce((sum, x, j) => sum + Math.abs(x - ideal[j]), 0);
    return 1 - d / 2;
  });
  const sliderFit = stageFits.reduce((a, b) => a + b, 0) / stageFits.length;

  // Hidden matrices.
  const fits = FIT_PAIRS.map(({ pair, weight }) => {
    const [a, b] = pairArgs(pair, cat, setup.approach, setup.channel, setup.audience);
    return { pair, a, b, weight, fit: fitOf(pair, a, b) };
  });
  const matrixFit = fits.reduce((sum, f) => sum + f.weight * FIT_VALUE[f.fit], 0);

  const sloganBonus = setup.sloganTag === setup.approach ? 1.05 : 1;
  const notesPenalty = 1 - clamp(p.notes / (target * 0.15), 0, 0.3);
  const core = quality * (0.25 + 0.75 * matrixFit) * (0.4 + 0.6 * sliderFit) * sloganBonus * notesPenalty;

  const wasRecord = ctx.bestCore > 0 && core > ctx.bestCore;
  const late = Math.max(0, Math.ceil((ctx.day - p.deadlineDay) / DAYS_PER_WEEK));

  // CEO: big idea, record, boldness vs risk appetite.
  const bigIdea = clamp(p.areaPoints.bigIdea / total / 0.2, 0, 1) * clamp(quality, 0, 1);
  const record = clamp(core / Math.max(ctx.bestCore, 0.55), 0, 1.1) / 1.1;
  const boldness = 1 - Math.abs(appr.boldness - brief.client.risk);

  // Marketing Director: did we do the right work?
  const objectiveAreas: Record<string, AreaId[]> = {
    awareness: ["bigIdea", "copy", "media"],
    consideration: ["research", "positioning", "copy"],
    steal: ["research", "positioning", "media"],
  };
  const objShare = objectiveAreas[brief.objective].reduce((sum, a) => sum + p.areaPoints[a], 0) / total;
  let objectiveFit = clamp(objShare / 0.4, 0, 1);
  if (brief.objective === "steal") objectiveFit *= setup.approach === "comparative" ? 1 : 0.6;
  const audienceFit = setup.audience === brief.audience ? 1 : 0.35;
  const craft = clamp(quality, 0, 1);

  // Finance Director: value for the fee, delivery, leftover notes.
  const feeRatio = brief.fee / (sc.fee * inflation(p.startDay));
  const vfm = clamp(core / feeRatio, 0, 1);
  const onTime = clamp(1 - 0.3 * late, 0, 1);
  const notesOk = 1 - clamp(p.notes / (target * 0.08), 0, 1);

  const execs: ExecScore[] = [
    scoreExec("CEO", [
      { label: "Big idea", value: bigIdea, weight: 0.35, good: "the big idea is strong", bad: "I can't find the big idea" },
      { label: "Better than last time", value: record, weight: 0.4, good: "it beats your previous work", bad: "I've seen you do better" },
      { label: "Risk level", value: boldness, weight: 0.25, good: "it's exactly as daring as we like", bad: appr.boldness > brief.client.risk ? "it's far too risky for us" : "it plays it far too safe" },
    ]),
    scoreExec("Marketing Director", [
      { label: "Effort in the right places", value: sliderFit, weight: 0.3, good: "the effort went into the right places", bad: "the effort went into the wrong places" },
      { label: "Approach, channel and audience", value: matrixFit, weight: 0.3, good: "the approach suits our product", bad: "the approach doesn't suit our product" },
      { label: "Right audience", value: audienceFit, weight: 0.2, good: "you talked to the right people", bad: "you were talking to the wrong people" },
      { label: "Brief goal", value: objectiveFit * (0.5 + 0.5 * craft), weight: 0.2, good: "it does what the brief asked", bad: "it doesn't do what the brief asked" },
    ]),
    scoreExec("Finance Director", [
      { label: "Value for the fee", value: vfm, weight: 0.5, good: "it's worth every penny", bad: "for what we pay you, I expected more" },
      { label: "On time", value: onTime, weight: 0.3, good: "it came in on time", bad: `it came in ${late} week${late === 1 ? "" : "s"} late` },
      { label: "Loose ends", value: notesOk, weight: 0.2, good: "there were no loose ends", bad: "we were still sending corrections at launch" },
    ]),
  ];
  const avg = execs.reduce((s, e) => s + e.score, 0) / 3;
  const satisfaction = Math.round(clamp(avg - (brief.client.pickiness - 2) * 0.5, 1, 10) * 10) / 10;

  // Sales Lift: extra client sales in dollars over the run, rising then decaying weekly.
  const market = sc.market * inflation(ctx.day);
  const liftTotal = market * Math.pow(satisfaction / 10, 2) * (0.4 + clamp(core, 0, 1.5));
  const shape = Array.from({ length: LIFT_WEEKS }, (_, i) => (i < 3 ? 0.5 + i * 0.25 : Math.pow(0.88, i - 2)));
  const shapeSum = shape.reduce((a, b) => a + b, 0);
  const liftWeeks = shape.map((x) => Math.round((liftTotal * x) / shapeSum));

  const knowledge = Math.round(2 + 3 * clamp(core, 0, 1.2) + (wasRecord ? 1 : 0));

  return {
    id: ctx.id,
    day: ctx.day,
    name: setup.name,
    clientName: brief.client.name,
    category: cat,
    approach: setup.approach,
    channel: setup.channel,
    audience: setup.audience,
    slogan: setup.slogan,
    scale: brief.scale,
    core,
    wasRecord,
    execs,
    satisfaction,
    liftWeeks,
    bonusPct: brief.bonusPct,
    fee: brief.fee,
    cost: p.cost,
    feedback: feedbackLines(p, stageFits, wasRecord, late),
    discovered: fits.map((f) => ({ key: fitKey(f.pair, f.a, f.b), label: fitLabel(f.pair, f.a, f.b), fit: f.fit })),
    knowledge,
  };
}

export function fitLabel(_pair: FitPair, a: string, b: string): string {
  return `${nameOf(a)} + ${nameOf(b)}`;
}

interface Factor {
  label: string;
  value: number; // 0-1
  weight: number;
  good: string;
  bad: string;
}

/** Score an executive and phrase the reaction so the words always match the number. */
function scoreExec(role: ExecScore["role"], factors: Factor[]): ExecScore {
  const x = factors.reduce((s, f) => s + f.value * f.weight, 0);
  const score = toTen(x);
  const best = [...factors].sort((a, b) => b.value - a.value)[0];
  const worst = [...factors].sort((a, b) => a.value - b.value)[0];
  let line: string;
  if (score >= 8.5) line = `Outstanding. ${cap(best.good)}.`;
  else if (score >= 7) line = worst.value < 0.6 ? `Good work. ${cap(best.good)}, though ${worst.bad}.` : `Good work. ${cap(best.good)}.`;
  else if (score >= 5) line = `It's acceptable, but ${worst.bad}.`;
  else line = `I'm disappointed. ${cap(worst.bad)}.`;
  return {
    role,
    score,
    line,
    factors: factors.map((f) => ({ label: f.label, value: Math.round(f.value * 100) / 100 })),
  };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function mood(satisfaction: number): string {
  if (satisfaction >= 8.5) return "Delighted";
  if (satisfaction >= 7) return "Happy";
  if (satisfaction >= 5.5) return "Satisfied";
  if (satisfaction >= 4) return "Disappointed";
  return "Furious";
}

function feedbackLines(p: CampaignProject, stageFits: number[], wasRecord: boolean, late: number): string[] {
  const lines: string[] = [];
  const { setup, brief } = p;
  const ch = channel(setup.channel);
  const cat = brief.client.category;

  const ca = fitOf("categoryApproach", cat, setup.approach);
  lines.push(`${nameOf(setup.approach)} for ${nameOf(cat)}: ${fitWords(ca)}.`);
  const ac = fitOf("approachChannel", setup.approach, setup.channel);
  if (ac === "great" || ac === "bad") lines.push(`${nameOf(setup.approach)} on ${ch.name}: ${fitWords(ac)}.`);
  if (setup.audience !== brief.audience) lines.push(`Reading the brief again, ${brief.client.name} really wanted to reach ${nameOf(brief.audience)}.`);

  // Biggest slider mistake.
  let worst: { stage: number; area: AreaId; diff: number } | null = null;
  STAGES.forEach((stage, i) => {
    const ideal = idealShares(setup.approach, setup.channel, i);
    stage.areas.forEach((area, j) => {
      const diff = p.allocs[i][j] - ideal[j];
      if (!worst || Math.abs(diff) > Math.abs(worst.diff)) worst = { stage: i, area, diff };
    });
  });
  const w = worst as { stage: number; area: AreaId; diff: number } | null;
  if (w && Math.abs(w.diff) > 0.15) {
    const area = AREAS[w.area].name;
    if (w.diff > 0 && ch.useful[w.area] === 0) lines.push(`We spent time on ${area}, but it barely matters on ${ch.name}.`);
    else if (w.diff > 0) lines.push(`We may have overdone ${area} for a ${nameOf(setup.approach)} campaign.`);
    else lines.push(`${area} needed more attention for a ${nameOf(setup.approach)} campaign.`);
  } else if (stageFits.every((f) => f > 0.85)) {
    lines.push("The team spent its time in all the right places.");
  }

  if (p.notes > 3) lines.push("The client was still finding typos at launch. A revision round would have helped.");
  if (late > 0) lines.push("We missed the deadline. Clients remember that.");
  if (setup.sloganTag === setup.approach) lines.push("The slogan matched the approach perfectly.");
  if (wasRecord) lines.push("This is the best work this agency has ever done.");
  return lines;
}

export function fitWords(f: Fit): string {
  return { great: "a great match", good: "a good match", ok: "it worked, barely", bad: "a poor match" }[f];
}

export function briefDeadline(brief: Brief, startDay: number): number {
  return startDay + brief.deadlineWeeks * DAYS_PER_WEEK;
}
