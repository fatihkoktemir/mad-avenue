import { useState } from "react";
import type { GameState } from "../sim/types";
import { LAYOUTS, Room, headPoint, viewBoxFor } from "./scene/Room";
import { PAINTED_H, PAINTED_HEAD, PAINTED_W, PaintedRoom } from "./scene/PaintedRoom";
import { store } from "./store";

export type MenuAction =
  | "briefs" | "accounts" | "smallJobs" | "staff" | "research" | "office" | "handbook" | "results";

export function Office({ state, onMenu }: { state: GameState; onMenu: (a: MenuAction) => void }) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const busy = !!state.project;
  const layout = LAYOUTS[Math.min(state.office, LAYOUTS.length - 1)];
  // The painted art covers the single room so far; bigger offices still use the vector scene.
  const painted = state.office === 0;

  const openMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setMenu({ x: Math.min(e.clientX - r.left, r.width - 210), y: Math.min(e.clientY - r.top, r.height - 330) });
  };
  const pick = (a: MenuAction) => { setMenu(null); onMenu(a); };

  return (
    <div className="office" onClick={(e) => (menu ? setMenu(null) : openMenu(e))}>
      {painted ? (
        <svg viewBox={`0 0 ${PAINTED_W} ${PAINTED_H}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label="The office">
          <PaintedRoom seated={state.staff.length > 0} working={busy} />
          <Bubbles state={state} at={() => PAINTED_HEAD} scale={2} />
        </svg>
      ) : (
        <svg viewBox={viewBoxFor(layout)} preserveAspectRatio="xMidYMid meet" role="img" aria-label="The office">
          <Room office={state.office} staff={state.staff} working={busy} />
          <Bubbles state={state} at={(i) => headPoint(layout, i)} scale={1} />
        </svg>
      )}
      {store.paused && <div className="paused-badge">Paused</div>}
      {menu && (
        <div className="context-menu" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          <button disabled={busy} onClick={() => pick("briefs")}>Briefs</button>
          <button onClick={() => pick("accounts")}>Accounts</button>
          <button disabled={busy} onClick={() => pick("smallJobs")}>Small Jobs</button>
          <button onClick={() => pick("staff")}>Staff</button>
          <button onClick={() => pick("research")}>Research</button>
          <button onClick={() => pick("office")}>Office</button>
          <button onClick={() => pick("results")}>Past Campaigns</button>
          <button onClick={() => pick("handbook")}>Agency Handbook</button>
        </div>
      )}
    </div>
  );
}

function Bubbles({ state, at, scale }: { state: GameState; at: (i: number) => [number, number]; scale: number }) {
  const layout = LAYOUTS[Math.min(state.office, LAYOUTS.length - 1)];
  return (
    <g>
      {store.bubbles.map((b) => {
        const i = state.staff.findIndex((s) => s.id === b.staffId);
        if (i < 0 || i >= layout.desks.length) return null;
        const [x, y] = at(i);
        const dx = (b.kind === "c" ? -16 : b.kind === "s" ? 16 : 0) * scale;
        return (
          <g key={b.id} transform={`translate(${x + dx} ${y}) scale(${scale})`}>
            <g className={`svg-bubble ${b.kind}`}>
              {b.kind === "note" ? (
                <>
                  <rect x="-13" y="-13" width="26" height="26" rx="6" fill="var(--note)" stroke="#fff" strokeWidth="3" />
                  <text y="6" textAnchor="middle" fontSize="17" fontWeight="900" fill="#fff">!</text>
                </>
              ) : (
                <>
                  <circle r="14" fill={b.kind === "c" ? "var(--creative)" : "var(--strategy)"} stroke="#fff" strokeWidth="3" />
                  <text y="5" textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff">{b.kind === "c" ? "C" : "S"}</text>
                </>
              )}
            </g>
          </g>
        );
      })}
    </g>
  );
}
