import type { AreaId, Fit, FitPair, Objective } from "./content";

export interface Staff {
  id: number;
  name: string;
  isPlayer: boolean;
  creativity: number;
  strategy: number;
  speed: number; // 0.8 - 1.3 multiplier
  salary: number; // per month
  xp: number;
}

export interface Candidate extends Omit<Staff, "id" | "isPlayer" | "xp"> {
  hireFee: number;
}

export type ClientSize = "small" | "medium" | "large";

export interface Client {
  name: string;
  category: string;
  size: ClientSize;
  budget: number; // 1-3 stars
  loyalty: number; // 1-3 stars
  pickiness: number; // 1-3 stars
  risk: number; // hidden 0-1 risk appetite
  fromYear?: number;
}

/** A client on contract: pays a yearly billing and expects campaigns. */
export interface Account {
  client: Client;
  billing: number; // per contract year, paid monthly
  expected: number; // campaigns per contract year
  done: number;
  free: number; // extra unpaid campaigns promised this year
  sats: number[]; // satisfaction of this year's campaigns
  goodwill: number; // event bonuses and penalties, added at renewal
  sinceDay: number;
  renewDay: number;
}

export interface Rival {
  name: string;
  strength: number; // 1-10
}

/** An open pitch: win it and the client becomes an account. */
export interface Rfp {
  id: number;
  client: Client;
  billing: number;
  expected: number;
  rivals: Rival[];
  expiresDay: number;
  accepted: boolean;
  pitchBonus: number;
}

export interface PitchResult {
  clientName: string;
  score: number;
  rivals: Rival[];
  won: boolean;
  lines: string[];
}

export interface Modifier {
  kind: "approach" | "budget" | "speed" | "quality" | "rfp";
  id?: string;
  categories?: string[];
  mult: number;
  until: number;
}

export interface ActiveEvent {
  id: string;
  target: string | null; // client name for client events
}

export interface Loan {
  payment: number;
  monthsLeft: number;
}

export type BriefKind = "trial" | "account" | "rfp";

export interface Brief {
  id: number;
  kind: BriefKind; // trial briefs pay a fee; account and pitch work is covered by billing
  client: Client;
  objective: Objective;
  audience: string; // what the client is really after, hinted in text
  scale: string;
  fee: number;
  bonusPct: number;
  deadlineWeeks: number;
  hint: string[];
  expiresDay: number;
}

export interface SmallJob {
  id: number;
  title: string;
  client: string;
  needC: number;
  needS: number;
  weeks: number;
  pay: number;
  penalty: number;
  expiresDay: number;
}

export interface CampaignSetup {
  name: string;
  approach: string;
  channel: string;
  audience: string;
  slogan: string;
  sloganTag: string | null; // null when the player wrote their own
}

export type CampaignPhase = "allocate" | "running" | "extras" | "revision" | "revising";

export interface CampaignProject {
  kind: "campaign";
  brief: Brief;
  setup: CampaignSetup;
  stage: number; // 0-2
  phase: CampaignPhase;
  stageDay: number;
  stageDays: number;
  allocs: number[][]; // per stage, three shares summing to 1
  areaPoints: Record<AreaId, number>;
  creativity: number;
  strategy: number;
  notes: number;
  extras: string[];
  cost: number;
  startDay: number;
  deadlineDay: number;
}

export interface SmallJobProject {
  kind: "smallJob";
  job: SmallJob;
  c: number;
  s: number;
  startDay: number;
  deadlineDay: number;
}

export type Project = CampaignProject | SmallJobProject;

export interface ExecScore {
  role: "CEO" | "Marketing Director" | "Finance Director";
  score: number; // 1-10
  line: string;
  factors: { label: string; value: number }[];
}

export interface CampaignResult {
  id: number;
  day: number;
  name: string;
  clientName: string;
  category: string;
  approach: string;
  channel: string;
  audience: string;
  slogan: string;
  scale: string;
  core: number;
  wasRecord: boolean;
  execs: ExecScore[];
  satisfaction: number; // 1-10
  liftWeeks: number[]; // expected sales lift per week, $
  bonusPct: number;
  fee: number;
  cost: number;
  feedback: string[];
  discovered: { key: string; label: string; fit: Fit }[];
  knowledge: number;
}

export interface ActiveLift {
  resultId: number;
  name: string;
  clientName: string;
  weeks: number[];
  week: number; // weeks already on air
  bonusPct: number;
  pending: number; // bonus earned this month, paid at month end
  paid: number;
}

export interface Notice {
  id: number;
  day: number;
  text: string;
  tone: "info" | "good" | "bad";
}

export interface Unlocks {
  approaches: string[];
  channels: string[];
  audiences: string[];
  scales: string[];
  extras: string[];
  research: string[];
}

export interface GameState {
  version: 3;
  seed: number;
  rng: number;
  day: number;
  agencyName: string;
  playerName: string;
  cash: number;
  reputation: number;
  knowledge: number;
  office: number; // 0 = single room, 1 = small office
  staff: Staff[];
  candidates: Candidate[];
  briefs: Brief[];
  smallJobs: SmallJob[];
  project: Project | null;
  results: CampaignResult[];
  pendingResult: number | null; // result id the UI should present
  lifts: ActiveLift[];
  bestCore: number;
  discovered: Record<string, Fit>; // key: `${pair}:${a}:${b}`
  unlocks: Unlocks;
  notices: Notice[];
  nextId: number;
  negativeMonths: number;
  yearProfit: number;
  accounts: Account[];
  sectors: string[]; // categories opened by winning a first client there
  known: string[]; // clients whose Loyalty and Pickiness we have seen
  lostClients: string[]; // former accounts; they won't come back as trial briefs
  rfp: Rfp | null;
  pitch: PitchResult | null; // pitch outcome the UI should present
  event: ActiveEvent | null;
  eventQueue: ActiveEvent[];
  eventLog: Record<string, number>; // event id -> last day it fired
  flags: string[];
  mods: Modifier[];
  loans: Loan[];
  over: null | "bankrupt" | "sliceEnd";
}

export type { FitPair };
