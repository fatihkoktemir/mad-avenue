import { useState } from "react";
import { FIT_PAIRS, RESEARCH, nameOf } from "../sim/content";
import { formatDate } from "../sim/calendar";
import {
  OFFICES, canResearch, fire, hire, officeUpgradeCost, research, takeSmallJob, upgradeOffice,
} from "../sim/game";
import type { GameState } from "../sim/types";
import { FitTag, Modal } from "./common";
import { mood } from "../sim/campaign";
import { money, store } from "./store";

export function SmallJobsPanel({ state, onClose }: { state: GameState; onClose: () => void }) {
  return (
    <Modal title="Small jobs" onClose={onClose}>
      <p className="muted">Quick local work. Hit the points before the deadline or pay a penalty. Good for cash, not for glory.</p>
      {state.smallJobs.length === 0 && <p>Nothing on offer right now.</p>}
      <div className="cards">
        {state.smallJobs.map((j) => (
          <div key={j.id} className="card stack">
            <div>
              <h3>{j.title}</h3>
              <div className="small muted">{j.client}</div>
            </div>
            <div className="small">
              <span className="dot c" /> {j.needC} creativity · <span className="dot s" /> {j.needS} strategy<br />
              {j.weeks} weeks · pays <b>{money(j.pay)}</b> · penalty {money(j.penalty)}
            </div>
            <button className="primary" disabled={!!state.project} onClick={() => { store.act((s) => takeSmallJob(s, j.id)); onClose(); }}>Take the job</button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function StaffPanel({ state, onClose }: { state: GameState; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const capacity = OFFICES[state.office].capacity;
  return (
    <Modal title="Staff" onClose={onClose} wide>
      <table className="simple">
        <thead><tr><th>Name</th><th>Creativity</th><th>Strategy</th><th>Speed</th><th>Salary / month</th><th /></tr></thead>
        <tbody>
          {state.staff.map((s) => (
            <tr key={s.id}>
              <td><b>{s.name}</b>{s.isPlayer ? " (you)" : ""}</td>
              <td>{s.creativity}</td><td>{s.strategy}</td><td>{s.speed.toFixed(2)}</td>
              <td>{s.isPlayer ? "-" : money(s.salary)}</td>
              <td>{!s.isPlayer && <button className="link" disabled={!!state.project} onClick={() => store.act((g) => fire(g, s.id))}>Let go</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="small muted" style={{ marginTop: 12 }}>Tip: a one-person shop can handle local work. Bigger teams pay off on regional campaigns, where there is more work to do and more money to make.</p>
      <h3 style={{ marginTop: 18 }}>Hiring ({state.staff.length}/{capacity} desks)</h3>
      {state.office === 0 ? (
        <p className="muted">There is no room for anyone else in here. Move to a bigger office first.</p>
      ) : state.candidates.length === 0 ? (
        <p className="muted">No candidates right now. New résumés arrive every few months.</p>
      ) : (
        <div className="cards">
          {state.candidates.map((c, i) => (
            <div key={i} className="card stack small">
              <h3>{c.name}</h3>
              <div><span className="dot c" /> Creativity {c.creativity} · <span className="dot s" /> Strategy {c.strategy}</div>
              <div>Speed {c.speed.toFixed(2)} · Salary {money(c.salary)}/mo</div>
              <button className="primary" onClick={() => setError(store.act((s) => hire(s, i)) ?? null)}>Hire (fee {money(c.hireFee)})</button>
            </div>
          ))}
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </Modal>
  );
}

export function ResearchPanel({ state, onClose }: { state: GameState; onClose: () => void }) {
  return (
    <Modal title="Research" onClose={onClose} wide>
      <p className="muted">Spend knowledge points (earned from campaigns) and cash to unlock new tools. You have <b>{state.knowledge} knowledge</b> and <b>{money(state.cash)}</b>.</p>
      <div className="cards">
        {RESEARCH.map((r) => {
          const done = state.unlocks.research.includes(r.id);
          const why = canResearch(state, r.id);
          return (
            <div key={r.id} className={`card stack small ${done ? "selected" : ""}`}>
              <h3>{r.name}</h3>
              <div>{r.desc}</div>
              <div>{r.kp} knowledge · {money(r.cost)}</div>
              {done ? <b>Researched</b> : (
                <>
                  <button className="primary" disabled={!!why} onClick={() => store.act((s) => research(s, r.id))}>Research</button>
                  {why && <span className="muted">{why}</span>}
                </>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

export function OfficePanel({ state, onClose }: { state: GameState; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const current = OFFICES[state.office];
  const next = OFFICES[state.office + 1];
  const cost = officeUpgradeCost(state);
  return (
    <Modal title="Office" onClose={onClose}>
      <p>You are in the <b>{current.name}</b>: {current.capacity} desk{current.capacity > 1 ? "s" : ""}, rent {money(current.rent)} a month.</p>
      {next && cost !== null ? (
        <div className="card stack">
          <h3>{next.name}</h3>
          <div className="small">{next.capacity} desks so you can hire staff, unlocks regional campaign research, rent {money(next.rent)} a month.</div>
          <button className="primary" disabled={state.cash < cost || !!state.project} onClick={() => setError(store.act(upgradeOffice) ?? null)}>Move in for {money(cost)}</button>
          {state.project && <span className="small muted">Finish the current project first.</span>}
          {error && <span className="error">{error}</span>}
        </div>
      ) : (
        <p className="muted">Bigger offices arrive in a later build.</p>
      )}
    </Modal>
  );
}

export function HandbookPanel({ state, onClose }: { state: GameState; onClose: () => void }) {
  const entries = Object.entries(state.discovered);
  const groups = FIT_PAIRS.map(({ pair }) => ({
    pair,
    items: entries.filter(([k]) => k.startsWith(pair + ":")).map(([k, fit]) => {
      const [, a, b] = k.split(":");
      return { label: `${nameOf(a)} + ${nameOf(b)}`, fit };
    }),
  }));
  const titles: Record<string, string> = {
    categoryApproach: "Product × Approach",
    approachChannel: "Approach × Channel",
    categoryAudience: "Product × Audience",
    channelAudience: "Channel × Audience",
  };
  return (
    <Modal title="Agency Handbook" onClose={onClose} wide>
      <div className="memo" style={{ marginBottom: 16 }}>
        <p><b>HOW A CAMPAIGN WORKS</b></p>
        <p>1. Read the brief. Clients rarely say what they want outright; the hints tell you the goal and who to talk to.</p>
        <p>2. Pick an approach, a channel, an audience and a slogan. Some combinations work far better than others.</p>
        <p>3. Each of the three stages has three areas. Spend time where the approach and channel need it. Music is wasted on print; art is wasted on radio.</p>
        <p>4. Orange bubbles are creativity, blue are strategy, red are client notes. Clear notes in revision before you deliver.</p>
        <p>5. Three executives score the work: the CEO wants a big idea and progress, the Marketing Director wants the right work, the Finance Director wants value, deadlines and no loose ends.</p>
        <p><b>ACCOUNTS AND PITCHES</b></p>
        <p>Small companies send trial briefs. Make them happy and they sign a yearly contract, which also opens their sector.</p>
        <p>Clients on contract pay a monthly billing and expect a number of campaigns a year. Start those from the Accounts screen. At the anniversary they look back: good work raises billing, missed or weak campaigns lose the account.</p>
        <p>Medium and large clients in your sectors invite you to pitch, but only once the agency is big enough: a Regional Shop for medium clients, a Madison Avenue Agency for large ones. The Accounts screen shows what the next step needs. The pitch is the Strategy stage of a normal campaign; beat the rival agencies and the campaign carries on as their first job.</p>
        <p>An agency can't serve two rivals. Pitch for a competitor of a client and that client may hear about it and leave; win, and you have to drop them.</p>
        <p>Budget is always visible. Loyalty and Pickiness show once you've worked with a client.</p>
      </div>
      <h3>Discovered matches</h3>
      {entries.length === 0 && <p className="muted">Nothing yet. Every campaign teaches you something.</p>}
      <div className="grid2">
        {groups.filter((g) => g.items.length).map((g) => (
          <div key={g.pair}>
            <b>{titles[g.pair]}</b>
            <table className="simple"><tbody>
              {g.items.map((it) => <tr key={it.label}><td>{it.label}</td><td><FitTag fit={it.fit} /></td></tr>)}
            </tbody></table>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function ResultsPanel({ state, onClose }: { state: GameState; onClose: () => void }) {
  const [open, setOpen] = useState<number | null>(null);
  const r = state.results.find((x) => x.id === open);
  if (r) return <ReplayResult result={r} onClose={() => setOpen(null)} />;
  return (
    <Modal title="Past campaigns" onClose={onClose} wide>
      {state.results.length === 0 && <p className="muted">No campaigns yet.</p>}
      <table className="simple">
        <thead><tr><th>Date</th><th>Campaign</th><th>Setup</th><th>Satisfaction</th><th>Mood</th><th /></tr></thead>
        <tbody>
          {[...state.results].reverse().map((x) => (
            <tr key={x.id}>
              <td>{formatDate(x.day)}</td>
              <td><b>{x.name}</b></td>
              <td className="small">{nameOf(x.approach)} · {nameOf(x.channel)} · {nameOf(x.audience)}</td>
              <td>{x.satisfaction.toFixed(1)}</td>
              <td>{mood(x.satisfaction)}</td>
              <td><button className="link" onClick={() => setOpen(x.id)}>Details</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}

function ReplayResult({ result, onClose }: { result: GameState["results"][number]; onClose: () => void }) {
  return (
    <Modal title={result.name} onClose={onClose} wide>
      <ul>{result.feedback.map((f, i) => <li key={i}>{f}</li>)}</ul>
      <p className="small">
        {result.execs.map((e) => `${e.role}: ${e.score.toFixed(1)}`).join(" · ")}
      </p>
      <button className="secondary" onClick={onClose}>Back</button>
    </Modal>
  );
}

