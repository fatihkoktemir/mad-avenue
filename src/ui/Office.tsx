import { useState } from "react";
import type { GameState, Staff } from "../sim/types";
import { store } from "./store";

// Desk spots in the 1000x600 scene, front row first.
const DESKS = [
  { x: 330, y: 400 },
  { x: 620, y: 400 },
  { x: 210, y: 300 },
  { x: 740, y: 300 },
];

const SUIT_COLORS = ["#7a4a26", "#3d5a6c", "#6b7a2a", "#8c3b2e"];
const HAIR_COLORS = ["#3b2414", "#1f1a17", "#8a5a2b", "#c79a4a"];

export type MenuAction =
  | "briefs" | "smallJobs" | "staff" | "research" | "office" | "handbook" | "results";

export function Office({ state, onMenu }: { state: GameState; onMenu: (a: MenuAction) => void }) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const busy = !!state.project;

  const openMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setMenu({ x: Math.min(e.clientX - r.left, r.width - 200), y: Math.min(e.clientY - r.top, r.height - 300) });
  };
  const pick = (a: MenuAction) => { setMenu(null); onMenu(a); };

  return (
    <div className="office" onClick={(e) => (menu ? setMenu(null) : openMenu(e))}>
      <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" role="img" aria-label="The office">
        <Room office={state.office} />
        {state.staff.map((st, i) => (
          <Desk key={st.id} staff={st} spot={DESKS[i]} index={i} working={busy} />
        ))}
        <Bubbles state={state} />
      </svg>
      {store.paused && <div className="paused-badge">PAUSED</div>}
      {menu && (
        <div className="context-menu" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          <button disabled={busy} onClick={() => pick("briefs")}>New Campaign</button>
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

function Bubbles({ state }: { state: GameState }) {
  return (
    <g>
      {store.bubbles.map((b) => {
        const i = state.staff.findIndex((s) => s.id === b.staffId);
        if (i < 0) return null;
        const d = DESKS[i];
        const dx = b.kind === "c" ? -18 : b.kind === "s" ? 18 : 0;
        return (
          <g key={b.id} transform={`translate(${d.x + dx} ${d.y - 110})`}>
            <g className={`svg-bubble ${b.kind}`}>
              {b.kind === "note" ? (
                <rect x="-12" y="-12" width="24" height="24" rx="4" fill="var(--note)" stroke="#fff" strokeWidth="3" />
              ) : (
                <circle r="13" fill={b.kind === "c" ? "var(--creative)" : "var(--strategy)"} stroke="#fff" strokeWidth="3" />
              )}
              {b.kind === "note" && <text y="6" textAnchor="middle" fontSize="16" fontWeight="900" fill="#fff">!</text>}
            </g>
          </g>
        );
      })}
    </g>
  );
}

function Room({ office }: { office: number }) {
  const wallTop = office === 0 ? 40 : 0;
  return (
    <g>
      {/* Wall: 70s wood panelling */}
      <rect x="0" y="0" width="1000" height="600" fill="#5a3519" />
      <rect x="0" y={wallTop} width="1000" height="330" fill="#8a5630" />
      {Array.from({ length: 26 }, (_, i) => (
        <rect key={i} x={i * 40} y={wallTop} width="3" height="330" fill="#6e4122" opacity="0.7" />
      ))}
      {/* Window with a fictional skyline */}
      <g transform={office === 0 ? "translate(380 70)" : "translate(300 50)"}>
        <rect width={office === 0 ? 240 : 400} height="150" fill="#f4c27a" stroke="#3b2414" strokeWidth="8" />
        <rect y="95" width={office === 0 ? 240 : 400} height="55" fill="#e9a35a" />
        {[20, 60, 95, 140, 180, 230, 270, 320, 350].filter((x) => x < (office === 0 ? 230 : 390)).map((x, i) => (
          <rect key={x} x={x} y={60 - (i % 3) * 22} width={28 + (i % 2) * 10} height={150 - 60 + (i % 3) * 22} fill="#8b5a3c" opacity="0.75" />
        ))}
        <line x1={office === 0 ? 120 : 200} y1="0" x2={office === 0 ? 120 : 200} y2="150" stroke="#3b2414" strokeWidth="6" />
      </g>
      {/* Poster */}
      <g transform="translate(110 90)">
        <rect width="110" height="140" fill="#f0e2c0" stroke="#3b2414" strokeWidth="5" />
        <circle cx="55" cy="60" r="32" fill="#d9661f" />
        <circle cx="55" cy="60" r="20" fill="#d9a520" />
        <rect x="18" y="108" width="74" height="10" fill="#7d8a2e" />
      </g>
      {office > 0 && (
        <g transform="translate(790 110)">
          <rect width="120" height="90" fill="#f0e2c0" stroke="#3b2414" strokeWidth="5" />
          <text x="60" y="52" textAnchor="middle" fontFamily="Georgia" fontWeight="900" fontSize="20" fill="#a83a2a">CLIO?</text>
        </g>
      )}
      {/* Carpet */}
      <rect x="0" y={wallTop + 330} width="1000" height="300" fill="#c8641e" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={i * 90 - 20} y={wallTop + 330} width="40" height="300" fill="#b9581a" opacity="0.5" />
      ))}
      <rect x="0" y={wallTop + 322} width="1000" height="12" fill="#3b2414" />
      {/* Plant */}
      <g transform="translate(905 400)">
        <rect x="-22" y="40" width="44" height="50" fill="#a83a2a" />
        <ellipse cx="-14" cy="20" rx="14" ry="30" fill="#6b7a2a" transform="rotate(-25)" />
        <ellipse cx="14" cy="20" rx="14" ry="30" fill="#7d8a2e" transform="rotate(25)" />
        <ellipse cx="0" cy="8" rx="12" ry="34" fill="#5e6b22" />
      </g>
    </g>
  );
}

function Desk({ staff, spot, index, working }: { staff: Staff; spot: { x: number; y: number }; index: number; working: boolean }) {
  const suit = SUIT_COLORS[index % SUIT_COLORS.length];
  const hair = HAIR_COLORS[(staff.id * 7) % HAIR_COLORS.length];
  return (
    <g transform={`translate(${spot.x} ${spot.y})`}>
      {/* Chair */}
      <rect x="-30" y="-40" width="60" height="70" rx="10" fill="#3b2414" />
      {/* Person */}
      <g className={working ? "typing" : ""}>
        <rect x="-26" y="-38" width="52" height="56" rx="16" fill={suit} />
        <polygon points="-8,-38 8,-38 0,-14" fill="#f6ead2" />
        <rect x="-3" y="-34" width="6" height="18" fill="#a83a2a" />
        <circle cx="0" cy="-62" r="22" fill="#e8b98a" />
        <path d="M -23 -66 Q -22 -92 0 -90 Q 22 -92 23 -66 Q 12 -78 -23 -66 Z" fill={hair} />
        {staff.isPlayer && <path d="M -10 -50 Q 0 -44 10 -50 Q 0 -47 -10 -50 Z" fill={hair} />}
        <rect x="-26" y="-64" width="6" height="16" fill={hair} />
        <rect x="20" y="-64" width="6" height="16" fill={hair} />
      </g>
      {/* Desk */}
      <rect x="-80" y="4" width="160" height="16" fill="#a8703f" stroke="#3b2414" strokeWidth="3" />
      <rect x="-74" y="20" width="148" height="56" fill="#7a4a26" stroke="#3b2414" strokeWidth="3" />
      {/* Typewriter */}
      <rect x="-30" y="-14" width="60" height="20" rx="4" fill="#2e7d7a" stroke="#1d4f4d" strokeWidth="2" />
      <rect x="-20" y="-28" width="40" height="16" fill="#fffaf0" stroke="#c9b48a" strokeWidth="1" />
      {/* Ashtray and coffee */}
      <ellipse cx="55" cy="2" rx="14" ry="5" fill="#8c8c8c" />
      <rect x="-64" y="-12" width="14" height="16" rx="2" fill="#f6ead2" stroke="#3b2414" strokeWidth="2" />
      <text x="0" y="98" textAnchor="middle" fontSize="16" fontWeight="700" fill="#fffaf0" fontFamily="Helvetica">{staff.name}</text>
    </g>
  );
}
