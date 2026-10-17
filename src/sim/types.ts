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

export interface Client {
  name: string;
  category: string;
  budget: number; // 1-3 stars
  pickiness: number; // 1-3 stars
  risk: number; // hidden 0-1 risk appetite
}

export interface Brief {
  id: number;
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
  press: { magazine: string; score: number }[];
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
  clientName: string;
  weeks: number[];
  week: number;
  bonusPct: number;
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
  version: 1;
  seed: number;
  rng: number;
  day: number;
  agencyName: string;
  playerName: string;
  cash: number;
  creativeRep: number;
  businessRep: number;
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
  over: null | "bankrupt" | "sliceEnd";
}

export type { FitPair };
