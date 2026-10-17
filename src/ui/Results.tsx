import { useEffect, useState } from "react";
import { nameOf } from "../sim/content";
import { dismissResult } from "../sim/game";
import { mood } from "../sim/campaign";
import type { CampaignResult } from "../sim/types";
import { FitTag, Modal } from "./common";
import { money, store } from "./store";

const STEPS = ["The verdict", "Review meeting", "The finished ad"];

export function ResultModal({ result }: { result: CampaignResult }) {
  const [step, setStep] = useState(0);
  const close = () => store.act(dismissResult);
  const last = step === STEPS.length - 1;
  return (
    <Modal title={`${result.name}: ${STEPS[step]}`} wide>
      {step === 0 && <Verdict r={result} />}
      {step === 1 && <Review r={result} />}
      {step === 2 && <FinishedAd r={result} />}
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
              {i < shown && (
                <div className="factors">
                  {e.factors.map((f) => (
                    <div key={f.label} className="factor">
                      <span>{f.label}</span>
                      <span className="bar"><span className={f.value >= 0.75 ? "hi" : f.value >= 0.5 ? "mid" : "lo"} style={{ width: `${Math.max(4, f.value * 100)}%` }} /></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="stack">
        <div className="card">
          <div className="small muted">Client satisfaction</div>
          <div className="big-number">{shown >= r.execs.length ? `${r.satisfaction.toFixed(1)} / 10` : "…"}</div>
          {shown >= r.execs.length && <div className="mood">{mood(r.satisfaction)}</div>}
        </div>
        <div className="card small">
          Fee received: <b>{money(r.fee)}</b><br />
          Spent on production and extras: <b>{money(r.cost)}</b><br />
          Now on air for {r.liftWeeks.length} weeks. Our {Math.round(r.bonusPct * 100)}% of the Sales Lift is paid monthly; follow it under On Air.
          {r.wasRecord && <div style={{ marginTop: 6, color: "var(--great)", fontWeight: 800 }}>New agency record!</div>}
        </div>
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
