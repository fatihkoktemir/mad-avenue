import { useState } from "react";
import { AGENCY_TIERS, CATEGORIES, CLIENTS, LOGOS, eventDef, nameOf } from "../sim/content";
import { dateOf, formatDate } from "../sim/calendar";
import { SIZE_TIER, accountOf, agencyTier, canRequestCampaign, conflicts, renewThreshold, tierChecks, yearScore } from "../sim/accounts";
import { eventText } from "../sim/events";
import { acceptPitch, chooseEvent, declinePitch, dismissPitch, requestCampaign } from "../sim/game";
import type { Brief, GameState, Rfp } from "../sim/types";
import { SetupModal } from "./CampaignFlow";
import { Modal, Stars } from "./common";
import { money, store } from "./store";

const SIZE_NAME = { small: "Small", medium: "Medium", large: "Large" };

export function Logo({ name, hidden }: { name: string; hidden?: boolean }) {
  const svg = LOGOS[name];
  if (!svg || hidden) return <div className="logo blank" />;
  return <div className="logo" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function AccountsPanel({ state, onClose }: { state: GameState; onClose: () => void }) {
  const [selected, setSelected] = useState<Brief | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (selected) return <SetupModal state={state} brief={selected} onBack={() => setSelected(null)} onDone={onClose} />;

  const open = (briefId: number | string | undefined) => {
    if (typeof briefId !== "number") return setError(briefId ?? null);
    const b = store.state?.briefs.find((x) => x.id === briefId);
    if (b) setSelected(b);
  };
  const yearly = state.accounts.reduce((a, x) => a + x.billing, 0);
  const year = dateOf(state.day).year;
  const tier = agencyTier(state);

  return (
    <Modal title="Accounts" onClose={onClose} wide>
      <p className="muted small">
        {state.accounts.length} client{state.accounts.length === 1 ? "" : "s"} on contract, billing {money(yearly)} a year.
        Win a small client in a sector to open it; bigger clients there will then invite you to pitch.
      </p>
      <TierCard state={state} tier={tier} />
      {state.rfp && <RfpCard state={state} rfp={state.rfp} onPitch={() => open(state.rfp?.accepted ? state.briefs.find((b) => b.kind === "rfp")?.id : store.act(acceptPitch))} />}
      {error && <p className="error">{error}</p>}
      <div className="sectors">
        {CATEGORIES.map((cat) => {
          const unlocked = state.sectors.includes(cat.id);
          return (
            <section key={cat.id} className={`sector${unlocked ? "" : " locked"}`}>
              <h3>{unlocked ? "" : "🔒 "}{cat.name}</h3>
              {CLIENTS.filter((c) => c.category === cat.id).map((c) => {
                const acc = accountOf(state, c.name);
                const known = state.known.includes(c.name);
                const notYet = c.fromYear && year < c.fromYear;
                const banned = c.category === "tobacco" && state.flags.includes("noTobacco");
                const waiting = state.briefs.find((b) => b.client.name === c.name && b.kind === "account");
                const blocked = acc ? canRequestCampaign(state, c.name) : null;
                return (
                  <div key={c.name} className={`company${acc ? " client" : ""}`}>
                    <Logo name={c.name} hidden={!!notYet} />
                    <div className="info">
                      <div className="spread">
                        <b>{notYet ? "???" : c.name}</b>
                        <span className="small muted">{SIZE_NAME[c.size]}</span>
                      </div>
                      {!notYet && (
                        <div className="small stars-row">
                          <span title="Budget">B <Stars n={c.budget} /></span>
                          <span title="Loyalty">L <Stars n={c.loyalty} hidden={!known} /></span>
                          <span title="Pickiness">P <Stars n={c.pickiness} hidden={!known} /></span>
                        </div>
                      )}
                      {acc ? (
                        <div className="small stack-tight">
                          <div>{money(acc.billing)}/yr · campaigns {acc.done}/{acc.expected + acc.free}</div>
                          <div className="muted">
                            Renews {formatDate(acc.renewDay)} · score {acc.sats.length ? yearScore(acc).toFixed(1) : "-"}, needs {renewThreshold(acc).toFixed(1)}
                          </div>
                          {waiting ? (
                            <button className="primary small-btn" onClick={() => setSelected(waiting)}>Open their brief</button>
                          ) : (
                            <button className="primary small-btn" disabled={!!blocked || !!state.project} title={blocked ?? (state.project ? "The team is busy." : undefined)}
                              onClick={() => open(store.act((s) => requestCampaign(s, c.name)))}>
                              New campaign
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="small muted">
                          {notYet ? `Founded later` : banned ? "We don't work for tobacco." : state.lostClients.includes(c.name) ? "Former client" : c.size === "small" ? "Sends trial briefs" : tier < SIZE_TIER[c.size] ? `Pitch only, for a ${AGENCY_TIERS[SIZE_TIER[c.size]].name}` : "Pitch only"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
      <p className="small muted" style={{ marginTop: 12 }}>
        We can't serve two rivals: winning a pitch in a sector means dropping the clients we already have there.
      </p>
    </Modal>
  );
}

function TierCard({ state, tier }: { state: GameState; tier: number }) {
  const next = AGENCY_TIERS[tier + 1];
  return (
    <div className="card tier">
      <div className="spread">
        <div>
          <span className="small muted">Our standing</span>
          <h3>{AGENCY_TIERS[tier].name}</h3>
        </div>
        <div className="small muted">{tier === 0 ? "Small clients only" : tier === 1 ? "Small and medium clients" : "Every client in America"}</div>
      </div>
      {next && (
        <div className="small">
          To become a <b>{next.name}</b>:
          <ul className="checks">
            {tierChecks(state, tier + 1).map((c) => <li key={c.label} className={c.ok ? "ok" : ""}>{c.ok ? "✓" : "○"} {c.label}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function RfpCard({ state, rfp, onPitch }: { state: GameState; rfp: Rfp; onPitch: () => void }) {
  const c = rfp.client;
  const known = state.known.includes(c.name);
  const rivalsHere = conflicts(state, c).map((a) => a.client.name);
  return (
    <div className="card rfp stack">
      <div className="spread">
        <div className="row">
          <Logo name={c.name} />
          <div>
            <span className="tag rfp">Invitation to pitch</span>
            <h3>{c.name}</h3>
            <div className="small muted">{nameOf(c.category)} · {SIZE_NAME[c.size]} · answer by {formatDate(rfp.expiresDay)}</div>
          </div>
        </div>
        <div className="small">
          <div>Budget <Stars n={c.budget} /></div>
          <div>Loyalty <Stars n={c.loyalty} hidden={!known} /></div>
          <div>Pickiness <Stars n={c.pickiness} hidden={!known} /></div>
        </div>
      </div>
      <div className="small">
        Contract: <b>{money(rfp.billing)}</b> a year for {rfp.expected} campaign{rfp.expected > 1 ? "s" : ""}. You pitch with the Strategy stage of a normal campaign; if you win, the campaign carries on as their first job.
      </div>
      {rivalsHere.length > 0 && (
        <div className="small conflict">
          ⚠ {rivalsHere.join(" and ")} {rivalsHere.length > 1 ? "are" : "is"} our client. If they hear about this pitch they'll leave, and if we win we have to drop them.
        </div>
      )}
      <div className="small">
        Competing: {rfp.rivals.map((r) => <span key={r.name} className="rival">{r.name} <b>{r.strength.toFixed(1)}</b></span>)}
      </div>
      <div className="row">
        <button className="primary" disabled={!!state.project} onClick={onPitch}>{rfp.accepted ? "Open the pitch brief" : "Prepare the pitch"}</button>
        {!rfp.accepted && <button className="secondary" onClick={() => store.act(declinePitch)}>Decline</button>}
      </div>
    </div>
  );
}

export function PitchModal({ state }: { state: GameState }) {
  const p = state.pitch;
  if (!p) return null;
  const all = [{ name: state.agencyName, strength: p.score, us: true }, ...p.rivals.map((r) => ({ ...r, us: false }))].sort((a, b) => b.strength - a.strength);
  return (
    <Modal title={p.won ? `We won ${p.clientName}!` : `${p.clientName} went elsewhere`}>
      <div className="stack">
        {all.map((r) => (
          <div key={r.name} className="pitchrow">
            <div className="spread small"><span>{r.us ? <b>{r.name}</b> : r.name}</span><b>{r.strength.toFixed(1)}</b></div>
            <div className="bar"><div style={{ width: `${r.strength * 10}%`, background: r.us ? "var(--orange)" : "var(--wood-light)" }} /></div>
          </div>
        ))}
        <ul className="small">{p.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
        <p>{p.won ? "They signed the contract. The campaign carries on as their first job." : "The work stops here. We learned something about this client, at least."}</p>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="primary" onClick={() => store.act(dismissPitch)}>Continue</button>
        </div>
      </div>
    </Modal>
  );
}

export function EventModal({ state, onOpen }: { state: GameState; onOpen: (panel: string) => void }) {
  const active = state.event;
  if (!active) return null;
  const ev = eventDef(active.id);
  return (
    <Modal title={ev.title}>
      <div className="stack event">
        <p className="small muted">{formatDate(state.day)}</p>
        <p>{eventText(state, ev.text, active.target)}</p>
        <div className="stack">
          {ev.options.map((o, i) => (
            <button key={i} className={i === 0 ? "primary" : "secondary"} onClick={() => { store.act((s) => chooseEvent(s, i)); if (o.open) onOpen(o.open); }}>
              {eventText(state, o.label, active.target)}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
