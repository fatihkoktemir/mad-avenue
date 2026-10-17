import { describe, expect, it } from "vitest";
import {
  availableExtras, chooseExtras, deliver, dismissResult, hire, isBlocked, newGame,
  research, revise, setAllocation, startCampaign, takeSmallJob, tick, upgradeOffice,
} from "../game";
import { idealShares } from "../campaign";
import { RESEARCH, SLOGANS } from "../content";
import { Rng } from "../rng";
import type { GameState } from "../types";

/** A simple bot that plays the way a decent player would. */
function playBot(s: GameState, rng: Rng, skill: "good" | "random"): void {
  if (s.pendingResult !== null) dismissResult(s);
  const p = s.project;
  if (!p) {
    for (const r of RESEARCH) if (s.cash - r.cost > 8000) research(s, r.id);
    if (s.office === 0 && s.cash > 45000) upgradeOffice(s);
    const cap = s.unlocks.scales.includes("regional") ? 4 : 2;
    if (s.candidates.length && s.staff.length < cap && s.cash > 6000) hire(s, 0);
    const brief = s.briefs[0];
    if (brief) {
      const approaches = s.unlocks.approaches;
      const channels = s.unlocks.channels.filter((c) => c !== "tv" || brief.scale !== "local");
      const approach = skill === "good" ? approaches[0] : rng.pick(approaches);
      const slogan = SLOGANS[brief.client.category].find((x) => x.tag === approach) ?? SLOGANS[brief.client.category][0];
      const err = startCampaign(s, brief.id, {
        name: "", approach, channel: rng.pick(channels),
        audience: skill === "good" && s.unlocks.audiences.includes(brief.audience) ? brief.audience : rng.pick(s.unlocks.audiences),
        slogan: slogan.text, sloganTag: slogan.tag,
      });
      if (err) throw new Error(err);
    } else if (s.smallJobs[0]) {
      takeSmallJob(s, s.smallJobs[0].id);
    }
    return;
  }
  if (p.kind !== "campaign") return;
  if (p.phase === "allocate") {
    setAllocation(s, skill === "good" ? idealShares(p.setup.approach, p.setup.channel, p.stage) : [rng.next(), rng.next(), rng.next()]);
  } else if (p.phase === "extras") {
    chooseExtras(s, skill === "good" && s.cash > 15000 ? availableExtras(s, { ...p, stage: p.stage - 1 }).map((e) => e.id) : []);
  } else if (p.phase === "revision") {
    if (p.notes > 2 && skill === "good") revise(s);
    else deliver(s);
  }
}

function run(seed: number, skill: "good" | "random") {
  const s = newGame({ seed });
  const rng = new Rng(seed + 1);
  let guard = 0;
  while (!s.over && guard++ < 200000) {
    if (isBlocked(s) || !s.project) playBot(s, rng, skill);
    tick(s);
  }
  return s;
}

describe("simulation", () => {
  it("is deterministic for a seed", () => {
    const a = run(42, "good");
    const b = run(42, "good");
    expect(a.cash).toBe(b.cash);
    expect(a.results.length).toBe(b.results.length);
  });

  it("a good player survives the 1970s and grows", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const s = run(seed, "good");
      expect(s.over).toBe("sliceEnd");
      expect(s.results.length).toBeGreaterThan(20);
      expect(s.office).toBe(1);
    }
  });

  it("good play scores better than random play", () => {
    const avg = (s: GameState) => s.results.reduce((a, r) => a + r.satisfaction, 0) / s.results.length;
    let good = 0;
    let random = 0;
    for (const seed of [11, 12, 13]) {
      good += avg(run(seed, "good"));
      random += avg(run(seed, "random"));
    }
    expect(good).toBeGreaterThan(random + 1);
  });

  it("scores stay within 1-10", () => {
    const s = run(7, "random");
    for (const r of s.results) {
      expect(r.satisfaction).toBeGreaterThanOrEqual(1);
      expect(r.satisfaction).toBeLessThanOrEqual(10);
      for (const e of r.execs) expect(e.score).toBeGreaterThanOrEqual(1);
    }
  });
});
