import { useEffect, useState } from "react";
import { nameOf } from "../sim/content";
import { dismissResult } from "../sim/game";
import type { CampaignResult } from "../sim/types";
import { FitTag, Modal } from "./common";
import { money, store } from "./store";

const STEPS = ["The verdict", "Sales Lift", "Review meeting", "The finished ad"];

export function ResultModal({ result }: { result: CampaignResult }) {
  const [step, setStep] = useState(0);
  const close = () => store.act(dismissResult);
  const last = step === STEPS.length - 1;
  return (
    <Modal title={`${result.name}: ${STEPS[step]}`} wide>
      {step === 0 && <Verdict r={result} />}
      {step === 1 && <SalesLift r={result} />}
      {step === 2 && <Review r={result} />}
      {step === 3 && <FinishedAd r={result} />}
      <div className="spread" style={{ marginTop: 18 }}>
        <span className="small muted">{step + 1} / {STEPS.length}</span>
        <div className="row">
          {step > 0 && <button className="secondary" onClick={() => setStep(step - 1)}>Back</button>}
          <button className="primary" onClick={() => (last ? close() : setStep(step + 1))}>{last ? "Back to work" : "Next"}</button>
        </div>
      </div>
    </Modal>
  );
}

function Verdict({ r }: { r: CampaignResult }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= r.execs.length) return;
    const t = setTimeout(() => setShown(shown + 1), 650);
    return () => clearTimeout(t);
  }, [shown, r.execs.length]);
  return (
    <div className="grid2">
      <div>
        <p className="muted">{r.clientName}'s executives watched the presentation.</p>
        {r.execs.map((e, i) => (
          <div key={e.role} className="exec" style={{ opacity: i < shown ? 1 : 0.15, transition: "opacity 0.4s" }}>
            <div className="score">{i < shown ? e.score.toFixed(1) : "?"}</div>
            <div>
              <div className="role">{e.role}</div>
              <div className="line">{i < shown ? `"${e.line}"` : "…"}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="stack">
        <div className="card">
          <div className="small muted">Client satisfaction</div>
          <div className="big-number">{shown >= r.execs.length ? `${r.satisfaction.toFixed(1)} / 10` : "…"}</div>
        </div>
        <div className="card">
          <div className="small muted">Trade press</div>
          {r.press.map((p) => (
            <div key={p.magazine} className="spread"><i>{p.magazine}</i><b>{shown >= r.execs.length ? `${p.score}/10` : "…"}</b></div>
          ))}
        </div>
        <div className="card small">
          Fee received: <b>{money(r.fee)}</b><br />
          Spent on production and extras: <b>{money(r.cost)}</b>
          {r.wasRecord && <div style={{ marginTop: 6, color: "var(--great)", fontWeight: 800 }}>New agency record!</div>}
        </div>
      </div>
    </div>
  );
}

function SalesLift({ r }: { r: CampaignResult }) {
  const [weeks, setWeeks] = useState(0);
  useEffect(() => {
    if (weeks >= r.liftWeeks.length) return;
    const t = setTimeout(() => setWeeks(weeks + 1), 140);
    return () => clearTimeout(t);
  }, [weeks, r.liftWeeks.length]);
  const max = Math.max(...r.liftWeeks, 1);
  const total = r.liftWeeks.reduce((a, b) => a + b, 0);
  const W = 600;
  const H = 180;
  const bw = W / r.liftWeeks.length;
  return (
    <div className="stack">
      <p className="muted">
        Sales Lift is the extra sales {r.clientName} makes because of the campaign. The agency earns {Math.round(r.bonusPct * 100)}% of it as a bonus, paid week by week.
      </p>
      <svg className="chart" viewBox={`0 0 ${W} ${H + 24}`} role="img" aria-label="Weekly sales lift">
        <line x1="0" y1={H} x2={W} y2={H} stroke="var(--wood)" strokeWidth="2" />
        {r.liftWeeks.map((v, i) => {
          const h = i < weeks ? (v / max) * (H - 10) : 0;
          return (
            <g key={i}>
              <rect x={i * bw + 6} y={H - h} width={bw - 12} height={h} fill="var(--orange)" rx="3" style={{ transition: "all 0.25s" }} />
              <text x={i * bw + bw / 2} y={H + 18} textAnchor="middle" fontSize="12" fill="var(--ink-soft)">W{i + 1}</text>
            </g>
          );
        })}
      </svg>
      <div className="grid2">
        <div className="card"><div className="small muted">Expected Sales Lift</div><div className="big-number">{money(total)}</div></div>
        <div className="card"><div className="small muted">Our bonus ({Math.round(r.bonusPct * 100)}%)</div><div className="big-number">{money(total * r.bonusPct)}</div></div>
      </div>
    </div>
  );
}

function Review({ r }: { r: CampaignResult }) {
  return (
    <div className="grid2">
      <div className="memo">
        <p><b>REVIEW MEETING</b></p>
        {r.feedback.map((line, i) => <p key={i}>• {line}</p>)}
        <p style={{ marginTop: 10 }}>Knowledge gained: <b>+{r.knowledge}</b></p>
      </div>
      <div>
        <h3>What we learned</h3>
        <p className="small muted">These matches now show on the campaign setup screen.</p>
        <table className="simple">
          <tbody>
            {r.discovered.map((d) => (
              <tr key={d.key}><td>{d.label}</td><td><FitTag fit={d.fit} /></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FinishedAd({ r }: { r: CampaignResult }) {
  return (
    <div className="stack" style={{ alignItems: "center" }}>
      <div className={`ad ${r.channel}`} style={{ width: "min(460px, 100%)" }}>
        <div className="brand">{r.clientName}</div>
        <h2 className="slogan">"{r.slogan}"</h2>
        <div className="small">{nameOf(r.approach)} · {nameOf(r.channel)} · for {nameOf(r.audience)}</div>
        {r.channel === "radio" && <div style={{ marginTop: 12 }}>♪ ♫ On air across town ♫ ♪</div>}
      </div>
      <p className="small muted">Running now on {nameOf(r.channel)}.</p>
    </div>
  );
}
