import campaign from "../content/campaign.json";
import clients from "../content/clients.json";

export type AreaId =
  | "research" | "positioning" | "bigIdea"
  | "copy" | "art" | "music"
  | "casting" | "production" | "media";

export type Fit = "great" | "good" | "ok" | "bad";
export type PointKind = "c" | "s" | "both";
export type Objective = "awareness" | "consideration" | "steal";

export interface StageDef {
  id: string;
  name: string;
  areas: [AreaId, AreaId, AreaId];
}

export const STAGES: StageDef[] = [
  { id: "strategy", name: "Strategy", areas: ["research", "positioning", "bigIdea"] },
  { id: "creative", name: "Creative", areas: ["copy", "art", "music"] },
  { id: "production", name: "Production", areas: ["casting", "production", "media"] },
];

export const AREAS: Record<AreaId, { name: string; kind: PointKind }> = {
  research: { name: "Research", kind: "s" },
  positioning: { name: "Positioning", kind: "s" },
  bigIdea: { name: "Big Idea", kind: "c" },
  copy: { name: "Copywriting", kind: "c" },
  art: { name: "Art Direction", kind: "c" },
  music: { name: "Music & Sound", kind: "c" },
  casting: { name: "Casting", kind: "c" },
  production: { name: "Production Quality", kind: "both" },
  media: { name: "Media Plan", kind: "s" },
};

export const FIT_VALUE: Record<Fit, number> = { great: 1, good: 0.75, ok: 0.5, bad: 0.2 };

export interface Category { id: string; name: string }
export interface Approach {
  id: string; name: string; boldness: number; startUnlocked: boolean;
  weights: number[][];
}
export interface Channel {
  id: string; name: string; startUnlocked: boolean; minScale: string;
  useful: Record<AreaId, number>; cost: number;
}
export interface Audience { id: string; name: string; startUnlocked: boolean }
export interface Scale {
  id: string; name: string; stageDays: number; target: number;
  fee: number; market: number; costMult: number;
}
export interface Extra {
  id: string; name: string; after: number; cost: number; days: number;
  area: AreaId; boost: number; channels: string[]; startUnlocked: boolean;
}
export interface ResearchItem {
  id: string; name: string; desc: string; kp: number; cost: number;
  unlock: { approach?: string; audience?: string; extra?: string; scale?: string; channel?: string };
  requires?: string; requiresOffice?: number;
}
export interface ClientDef {
  name: string; category: string; budget: number; pickiness: number; risk: number;
}
export interface Slogan { text: string; tag: string }

export const CATEGORIES = campaign.categories as Category[];
export const APPROACHES = campaign.approaches as Approach[];
export const CHANNELS = campaign.channels as Channel[];
export const AUDIENCES = campaign.audiences as Audience[];
export const SCALES = campaign.scales as Scale[];
export const EXTRAS = campaign.extras as Extra[];
export const RESEARCH = campaign.research as ResearchItem[];

const fits = campaign.fits as Record<string, Record<string, Record<string, Fit>>>;

export const CLIENTS = clients.clients as ClientDef[];
export const HINTS = clients.hints as {
  audience: Record<string, string[]>;
  objective: Record<Objective, string[]>;
  risk: { low: string; high: string };
};
export const SLOGANS = clients.slogans as Record<string, Slogan[]>;
export const SMALL_JOBS = clients.smallJobs as { title: string; client: string }[];
export const FIRST_NAMES = clients.firstNames;
export const LAST_NAMES = clients.lastNames;
export const MAGAZINES = clients.magazines;

function byId<T extends { id: string }>(list: T[], id: string): T {
  const found = list.find((x) => x.id === id);
  if (!found) throw new Error(`Unknown id: ${id}`);
  return found;
}

export const category = (id: string) => byId(CATEGORIES, id);
export const approach = (id: string) => byId(APPROACHES, id);
export const channel = (id: string) => byId(CHANNELS, id);
export const audience = (id: string) => byId(AUDIENCES, id);
export const scale = (id: string) => byId(SCALES, id);
export const extra = (id: string) => byId(EXTRAS, id);
export const researchItem = (id: string) => byId(RESEARCH, id);

export type FitPair = "categoryApproach" | "approachChannel" | "categoryAudience" | "channelAudience";

export const FIT_PAIRS: { pair: FitPair; weight: number }[] = [
  { pair: "categoryApproach", weight: 0.4 },
  { pair: "approachChannel", weight: 0.25 },
  { pair: "categoryAudience", weight: 0.2 },
  { pair: "channelAudience", weight: 0.15 },
];

export function fitOf(pair: FitPair, a: string, b: string): Fit {
  return fits[pair]?.[a]?.[b] ?? "ok";
}

export function nameOf(id: string): string {
  const all: { id: string; name: string }[] = [
    ...CATEGORIES, ...APPROACHES, ...CHANNELS, ...AUDIENCES, ...SCALES,
  ];
  return all.find((x) => x.id === id)?.name ?? id;
}
