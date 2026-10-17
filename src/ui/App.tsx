import { useEffect, useState } from "react";
import { STAGES, nameOf } from "../sim/content";
import { dateOf, formatDate } from "../sim/calendar";
import { SLICE_END_YEAR } from "../sim/game";
import type { GameState } from "../sim/types";
import { BriefsPanel, CampaignDecision, RevisingBar } from "./CampaignFlow";
import { Modal } from "./common";
import { Office, type MenuAction } from "./Office";
import { HandbookPanel, OfficePanel, ResearchPanel, ResultsPanel, SmallJobsPanel, StaffPanel } from "./Panels";
import { ResultModal } from "./Results";
import { money, store, useGame } from "./store";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function App() {
  const state = useGame();
  if (!state) return <TitleScreen />;
  return <Game state={state} />;
}

function Game({ state }: { state: GameState }) {
  const [panel, setPanel] = useState<MenuAction | null>(null);
  const close = () => setPanel(null);
  useEffect(() => {
    store.hold = panel !== null;
  }, [panel]);
  const result = state.pendingResult !== null ? state.results.find((r) => r.id === state.pendingResult) : undefined;

  return (
    <div className="game">
      <TopBar state={state} onMenu={setPanel} />
      <div className="main">
        <div className="office-wrap">
          <Office state={state} onMenu={setPanel} />
        </div>
        <aside className="sidebar">
          <h3>News</h3>
          <div className="notices">
            {[...state.notices].reverse().map((n) => (
              <div key={n.id} className={`notice ${n.tone}`}>
                <span className="when">{formatDate(n.day)}</span>
                {n.text}
              </div>
            ))}
          </div>
        </aside>
      </div>
      <BottomBar state={state} onMenu={setPanel} />

      {panel === "briefs" && <BriefsPanel state={state} onClose={close} />}
      {panel === "smallJobs" && <SmallJobsPanel state={state} onClose={close} />}
      {panel === "staff" && <StaffPanel state={state} onClose={close} />}
      {panel === "research" && <ResearchPanel state={state} onClose={close} />}
      {panel === "office" && <OfficePanel state={state} onClose={close} />}
      {panel === "handbook" && <HandbookPanel state={state} onClose={close} />}
      {panel === "results" && <ResultsPanel state={state} onClose={close} />}

      {!panel && <CampaignDecision state={state} />}
      {result && <ResultModal key={result.id} result={result} />}
      {state.over && <GameOver state={state} />}
    </div>
  );
}

function TopBar({ state, onMenu }: { state: GameState; onMenu: (a: MenuAction) => void }) {
  const d = dateOf(state.day);
  return (
    <header className="topbar">
      <div className="brand">{state.agencyName}</div>
      <div className="stat"><b>{MONTHS[d.month - 1]} {d.year}</b><span>Week {d.week}</span></div>
      <div className="stat"><b style={{ color: state.cash < 0 ? "#ff9b85" : undefined }}>{money(state.cash)}</b><span>Cash</span></div>
      <div className="stat"><b>{Math.round(state.creativeRep)} / {Math.round(state.businessRep)}</b><span>Creative / Business rep</span></div>
      <div className="stat"><b>{state.knowledge}</b><span>Knowledge</span></div>
      <button onClick={() => store.togglePause()}>{store.paused ? "▶ Resume" : "❚❚ Pause"}</button>
      <button className="secondary" onClick={() => onMenu("handbook")}>Handbook</button>
    </header>
  );
}

function BottomBar({ state, onMenu }: { state: GameState; onMenu: (a: MenuAction) => void }) {
  const p = state.project;
  if (!p) {
    return (
      <footer className="bottombar">
        <span className="muted">The team is free. Click the office or pick something:</span>
        <button className="primary" onClick={() => onMenu("briefs")}>New Campaign ({state.briefs.length})</button>
        <button onClick={() => onMenu("smallJobs")}>Small Jobs ({state.smallJobs.length})</button>
        <button className="secondary" onClick={() => onMenu("research")}>Research</button>
        <button className="secondary" onClick={() => onMenu("staff")}>Staff</button>
        <button className="secondary" onClick={() => onMenu("office")}>Office</button>
      </footer>
    );
  }
  if (p.kind === "smallJob") {
    const pct = Math.min(1, (Math.min(p.c / p.job.needC, 1) + Math.min(p.s / p.job.needS, 1)) / 2);
    return (
      <footer className="bottombar">
        <b>{p.job.title}</b>
        <div className="progress"><div style={{ width: `${pct * 100}%` }} /></div>
        <span className="counter"><span className="dot c" />{Math.floor(p.c)}/{p.job.needC}</span>
        <span className="counter"><span className="dot s" />{Math.floor(p.s)}/{p.job.needS}</span>
        <span className="small muted">Due {formatDate(p.deadlineDay)}</span>
      </footer>
    );
  }
  const stageLabel = p.phase === "revising" || p.phase === "revision" ? "Revision" : STAGES[p.stage].name;
  const pct = p.phase === "running" ? (p.stage + p.stageDay / p.stageDays) / 3 : p.phase === "revising" || p.phase === "revision" ? 1 : p.stage / 3;
  return (
    <footer className="bottombar">
      <div>
        <b>{p.setup.name}</b>
        <div className="small muted">{nameOf(p.setup.approach)} · {nameOf(p.setup.channel)} · {stageLabel}</div>
      </div>
      <div className="progress"><div style={{ width: `${pct * 100}%` }} /></div>
      <span className="counter" title="Creativity"><span className="dot c" />{Math.floor(p.creativity)}</span>
      <span className="counter" title="Strategy"><span className="dot s" />{Math.floor(p.strategy)}</span>
      <span className="counter" title="Client notes"><span className="dot note" />{Math.ceil(p.notes)}</span>
      {p.phase === "revising" && <RevisingBar />}
      <span className="small muted">Due {formatDate(p.deadlineDay)}</span>
    </footer>
  );
}

function TitleScreen() {
  const [agency, setAgency] = useState("Mad Avenue Advertising Co.");
  const [player, setPlayer] = useState("Don");
  return (
    <div className="title-screen">
      <div className="title-card stack">
        <div>
          <h1>Mad Avenue</h1>
          <div className="sub">Advertising Tycoon</div>
          <p className="muted">January 1970. You have a rented room above a deli, a typewriter and $8,000. Build an agency the whole country talks about.</p>
        </div>
        <label>Your name<input value={player} maxLength={24} onChange={(e) => setPlayer(e.target.value)} /></label>
        <label>Agency name<input value={agency} maxLength={40} onChange={(e) => setAgency(e.target.value)} /></label>
        <button className="primary" onClick={() => store.start({ agencyName: agency.trim() || "Mad Avenue Advertising Co.", playerName: player.trim() || "Don" })}>
          Open the doors
        </button>
        <p className="small muted">Alpha build: 1970 to {SLICE_END_YEAR - 1}, the campaign loop only. Accounts, pitches and events come next.</p>
      </div>
    </div>
  );
}

function GameOver({ state }: { state: GameState }) {
  const avg = state.results.length ? state.results.reduce((a, r) => a + r.satisfaction, 0) / state.results.length : 0;
  const best = [...state.results].sort((a, b) => b.satisfaction - a.satisfaction)[0];
  return (
    <Modal title={state.over === "bankrupt" ? "Bankrupt" : "End of the alpha"}>
      <p>{state.over === "bankrupt"
        ? "The bank padlocked the door. Every great adman has gone broke at least once."
        : `It's ${SLICE_END_YEAR}. That's the end of this build. Thanks for playing!`}</p>
      <table className="simple"><tbody>
        <tr><td>Campaigns delivered</td><td><b>{state.results.length}</b></td></tr>
        <tr><td>Average satisfaction</td><td><b>{avg.toFixed(1)}</b></td></tr>
        <tr><td>Best campaign</td><td><b>{best ? `${best.name} (${best.satisfaction.toFixed(1)})` : "-"}</b></td></tr>
        <tr><td>Cash</td><td><b>{money(state.cash)}</b></td></tr>
        <tr><td>Staff</td><td><b>{state.staff.length}</b></td></tr>
      </tbody></table>
      <div className="row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
        <button className="primary" onClick={() => store.quit()}>New game</button>
      </div>
    </Modal>
  );
}
