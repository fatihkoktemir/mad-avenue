import { useMemo, useState } from "react";
import {
  AREAS, AUDIENCES, APPROACHES, CHANNELS, SCALES, SLOGANS, STAGES,
  channel as channelDef, nameOf, type FitPair,
} from "../sim/content";
import { extraCost, fitKey, productionCost } from "../sim/campaign";
import {
  availableExtras, channelBlocked, chooseExtras, deliver, revise, setAllocation, startCampaign, stopRevising,
} from "../sim/game";
import { formatDate } from "../sim/calendar";
import type { Brief, CampaignProject, GameState } from "../sim/types";
import { FitTag, Modal, Stars } from "./common";
import { money, store } from "./store";

const OBJECTIVE_NAMES: Record<string, string> = {
  awareness: "Awareness",
  consideration: "Consideration",
  steal: "Steal customers",
};

export function BriefMemo({ brief }: { brief: Brief }) {
  return (
    <div className="memo">
      <p><b>FROM:</b> {brief.client.name}</p>
      <p><b>RE:</b> {nameOf(brief.scale)} campaign for {nameOf(brief.client.category)}</p>
      <p><b>GOAL:</b> {OBJECTIVE_NAMES[brief.objective]}</p>
      {brief.hint.map((h, i) => <p key={i}>"{h}"</p>)}
    </div>
  );
}

const KIND_LABEL: Record<Brief["kind"], string> = { trial: "New client", account: "Account", rfp: "Pitch" };

/** What the brief pays, in words. */
export function payLine(brief: Brief): string {
  const bonus = `${Math.round(brief.bonusPct * 100)}% of the Sales Lift`;
  if (brief.kind === "trial") return `Fee ${money(brief.fee)} on delivery + ${bonus}. Do it well and they may sign a contract.`;
  if (brief.kind === "rfp") return `Win the pitch after the Strategy stage and they sign. Bonus: ${bonus}.`;
  return `Covered by their yearly billing. Bonus: ${bonus}.`;
}

export function ClientStars({ state, brief }: { state: GameState; brief: Brief }) {
  const known = state.known.includes(brief.client.name);
  return (
    <>
      <div>Budget <Stars n={brief.client.budget} /></div>
      <div>Loyalty <Stars n={brief.client.loyalty} hidden={!known} /></div>
      <div>Pickiness <Stars n={brief.client.pickiness} hidden={!known} /></div>
    </>
  );
}

export function BriefsPanel({ state, onClose }: { state: GameState; onClose: () => void }) {
  const [selected, setSelected] = useState<Brief | null>(null);
  if (selected) return <SetupModal state={state} brief={selected} onBack={() => setSelected(null)} onDone={onClose} />;
  return (
    <Modal title="Briefs on the desk" onClose={onClose}>
      {state.briefs.length === 0 && <p className="muted">No briefs right now. New clients call every few weeks; small jobs keep the lights on in the meantime.</p>}
      <div className="cards">
        {state.briefs.map((b) => (
          <div key={b.id} className="card stack">
            <div>
              <span className={`tag ${b.kind}`}>{KIND_LABEL[b.kind]}</span>
              <h3>{b.client.name}</h3>
              <div className="small muted">{nameOf(b.client.category)} · {nameOf(b.scale)}</div>
            </div>
            <div className="small"><ClientStars state={state} brief={b} /></div>
            <div className="small">
              {payLine(b)}<br />
              Deadline {b.deadlineWeeks} weeks · Offer ends {formatDate(b.expiresDay)}
            </div>
            <button className="primary" onClick={() => setSelected(b)}>Read the brief</button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function Choice<T extends string>(props: {
  options: { id: T; name: string; locked?: boolean; tag?: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="choices">
      {props.options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`choice${props.value === o.id ? " on" : ""}`}
          disabled={o.locked}
          onClick={() => props.onChange(o.id)}
          title={o.locked ? "Locked. Unlock it through research." : undefined}
        >
          {o.locked ? "🔒 " : ""}{o.name} {o.tag}
        </button>
      ))}
    </div>
  );
}

export function SetupModal({ state, brief, onBack, onDone }: { state: GameState; brief: Brief; onBack: () => void; onDone: () => void }) {
  const u = state.unlocks;
  const cat = brief.client.category;
  const scaleIdx = SCALES.findIndex((s) => s.id === brief.scale);
  const channelOk = (id: string) => u.channels.includes(id) && SCALES.findIndex((s) => s.id === channelDef(id).minScale) <= scaleIdx && !channelBlocked(state, brief, id);

  const [approach, setApproach] = useState(u.approaches[0]);
  const [channel, setChannel] = useState(CHANNELS.find((c) => channelOk(c.id))!.id);
  const [audience, setAudience] = useState(u.audiences[0]);
  const slogans = SLOGANS[cat];
  const [sloganIdx, setSloganIdx] = useState(0);
  const [custom, setCustom] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const known = (pair: FitPair, a: string, b: string) => state.discovered[fitKey(pair, a, b)];
  const cost = productionCost(channel, brief.scale, state.day);

  const go = () => {
    const usingCustom = sloganIdx === -1;
    const err = store.act((s) => startCampaign(s, brief.id, {
      name, approach, channel, audience,
      slogan: usingCustom ? custom.trim() || "Just buy it." : slogans[sloganIdx].text,
      sloganTag: usingCustom ? null : slogans[sloganIdx].tag,
    }));
    if (err) setError(err);
    else onDone();
  };

  return (
    <Modal title={`New campaign: ${brief.client.name}`} onClose={onDone} wide>
      <div className="grid2">
        <div className="stack">
          <BriefMemo brief={brief} />
          <div className="small">
            <div className="row"><ClientStars state={state} brief={brief} /></div>
            <div>{payLine(brief)}</div>
            <div>Deadline: {brief.deadlineWeeks} weeks from today.</div>
          </div>
          <label className="stack small">
            <b>Campaign name (optional)</b>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`${brief.client.name} campaign`} />
          </label>
        </div>
        <div className="stack">
          <div>
            <h3>Approach</h3>
            <Choice
              value={approach}
              onChange={setApproach}
              options={APPROACHES.map((a) => ({
                id: a.id, name: a.name, locked: !u.approaches.includes(a.id),
                tag: <FitTag fit={known("categoryApproach", cat, a.id)} />,
              }))}
            />
          </div>
          <div>
            <h3>Channel</h3>
            <Choice
              value={channel}
              onChange={setChannel}
              options={CHANNELS.map((c) => ({
                id: c.id, name: c.name, locked: !channelOk(c.id),
                tag: <FitTag fit={known("approachChannel", approach, c.id)} />,
              }))}
            />
          </div>
          <div>
            <h3>Audience</h3>
            <Choice
              value={audience}
              onChange={setAudience}
              options={AUDIENCES.map((a) => ({
                id: a.id, name: a.name, locked: !u.audiences.includes(a.id),
                tag: <FitTag fit={known("categoryAudience", cat, a.id)} />,
              }))}
            />
          </div>
          <div>
            <h3>Slogan</h3>
            <select value={sloganIdx} onChange={(e) => setSloganIdx(Number(e.target.value))} style={{ width: "100%" }}>
              {slogans.map((sl, i) => <option key={i} value={i}>{sl.text}</option>)}
              <option value={-1}>Write my own…</option>
            </select>
            {sloganIdx === -1 && (
              <input style={{ width: "100%", marginTop: 8 }} maxLength={60} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Your slogan" />
            )}
          </div>
        </div>
      </div>
      <div className="spread" style={{ marginTop: 18 }}>
        <button className="secondary" onClick={onBack}>Back</button>
        <div className="row">
          {error && <span className="error">{error}</span>}
          <span className="small">Production cost: <b>{money(cost)}</b></span>
          <button className="primary" disabled={state.cash < cost} onClick={go}>Start campaign</button>
        </div>
      </div>
    </Modal>
  );
}

/** The modal shown while a campaign is waiting on the player. */
export function CampaignDecision({ state }: { state: GameState }) {
  const p = state.project;
  if (!p || p.kind !== "campaign") return null;
  if (p.phase === "allocate") return <AllocateModal key={p.stage} p={p} />;
  if (p.phase === "extras") return <ExtrasModal state={state} p={p} />;
  if (p.phase === "revision") return <RevisionModal p={p} />;
  return null;
}

function AllocateModal({ p }: { p: CampaignProject }) {
  const stage = STAGES[p.stage];
  const ch = channelDef(p.setup.channel);
  const [values, setValues] = useState([50, 50, 50]);
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const days = p.stageDays;

  return (
    <Modal title={`Stage ${p.stage + 1} of 3: ${stage.name}`}>
      <p className="muted">
        {p.setup.name} · {nameOf(p.setup.approach)} on {ch.name} for {nameOf(p.setup.audience)}.
        Decide where the team spends its time for the next {days} days.
      </p>
      {stage.areas.map((area, i) => (
        <div key={area} className="slider-row">
          <div>
            <b>{AREAS[area].name}</b>
            <span className={`kind-tag ${AREAS[area].kind}`}>{AREAS[area].kind === "c" ? "Creativity" : AREAS[area].kind === "s" ? "Strategy" : "Both"}</span>
            {ch.useful[area] === 0 && <div className="wasted">Barely matters on {ch.name}</div>}
          </div>
          <input
            type="range" min={0} max={100} value={values[i]}
            onChange={(e) => setValues(values.map((v, j) => (j === i ? Number(e.target.value) : v)))}
          />
          <span className="pct">{Math.round((values[i] / total) * 100)}%</span>
        </div>
      ))}
      <div className="spread">
        <span className="small muted">Deadline {formatDate(p.deadlineDay)}</span>
        <button className="primary" onClick={() => store.act((s) => setAllocation(s, values))}>Start {stage.name.toLowerCase()}</button>
      </div>
    </Modal>
  );
}

function ExtrasModal({ state, p }: { state: GameState; p: CampaignProject }) {
  const options = useMemo(() => availableExtras(state, { ...p, stage: p.stage - 1 }), [state, p]);
  const [picked, setPicked] = useState<string[]>([]);
  const total = picked.reduce((sum, id) => sum + extraCost(id, p), 0);
  const ch = p.setup.channel;
  return (
    <Modal title={`${STAGES[p.stage - 1].name} done. Any extras?`}>
      <p className="muted">Extras cost money and add a few days, but they lift the work. Only some suit {channelDef(ch).name}.</p>
      <div className="stack">
        {options.map((e) => {
          const on = picked.includes(e.id);
          const suits = e.channels.includes(ch);
          return (
            <label key={e.id} className={`card row ${on ? "selected" : ""}`} style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={on} onChange={() => setPicked(on ? picked.filter((x) => x !== e.id) : [...picked, e.id])} />
              <div style={{ flex: 1 }}>
                <b>{e.name}</b> <span className="small muted">boosts {AREAS[e.area].name}, +{e.days} days</span>
                {!suits && <div className="wasted">Won't help on {channelDef(ch).name}</div>}
              </div>
              <b>{money(extraCost(e.id, p))}</b>
            </label>
          );
        })}
      </div>
      <div className="spread" style={{ marginTop: 16 }}>
        <span className="small">Cash: {money(state.cash)}</span>
        <button className="primary" disabled={total > state.cash} onClick={() => store.act((s) => chooseExtras(s, picked))}>
          {picked.length ? `Book extras (${money(total)})` : "Skip extras"}
        </button>
      </div>
    </Modal>
  );
}

function RevisionModal({ p }: { p: CampaignProject }) {
  const notes = Math.ceil(p.notes);
  const late = store.state!.day > p.deadlineDay;
  return (
    <Modal title="Ready for the client?">
      <p>
        The work is done. {notes > 0 ? <>There {notes === 1 ? "is" : "are"} still <b>{notes} client note{notes === 1 ? "" : "s"}</b> open (typos, wrong logo size, the CEO's wife hates the color).</> : "Every client note has been dealt with."}
      </p>
      <p className="muted small">
        A revision round clears notes but takes time. Deadline: {formatDate(p.deadlineDay)}{late ? " (already late)" : ""}.
      </p>
      <div className="row" style={{ justifyContent: "flex-end" }}>
        {notes > 0 && <button className="secondary" onClick={() => store.act(revise)}>Revise</button>}
        <button className="primary" onClick={() => store.act(deliver)}>Deliver to client</button>
      </div>
    </Modal>
  );
}

export function RevisingBar() {
  return <button className="secondary" onClick={() => store.act(stopRevising)}>Stop revising</button>;
}
