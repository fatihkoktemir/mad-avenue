import type { ReactNode } from "react";
import type { Staff } from "../../sim/types";
import { Character, Hands, lookFor } from "./Character";
import { Box, OnFloor, OnLeftWall, OnRightWall, iso, pts, shade } from "./iso";

export interface RoomLayout {
  w: number;
  d: number;
  h: number;
  /** Desk origins (back-left corner of the desk top) in world units. */
  desks: { x: number; y: number }[];
}

export const LAYOUTS: RoomLayout[] = [
  { w: 7, d: 7, h: 5, desks: [{ x: 2.4, y: 3.6 }] },
  { w: 11, d: 10, h: 5, desks: [{ x: 1.8, y: 3.4 }, { x: 6.4, y: 3.4 }, { x: 1.8, y: 7.4 }, { x: 6.4, y: 7.4 }] },
];

const DESK_W = 2.4;
const DESK_D = 1.2;
const DESK_H = 1.6;

/** Screen point the bubbles of a desk's worker rise from. */
export function headPoint(layout: RoomLayout, i: number): [number, number] {
  const d = layout.desks[i];
  const [x, y] = iso(d.x + 1.1, d.y - 0.45, 1.1);
  return [x, y - 100];
}

export function viewBoxFor(layout: RoomLayout): string {
  const top = iso(0, 0, layout.h)[1] - 40;
  const left = iso(0, layout.d, 0)[0] - 40;
  const right = iso(layout.w, 0, 0)[0] + 40;
  const bottom = iso(layout.w, layout.d, 0)[1] + 110;
  return `${left} ${top} ${right - left} ${bottom - top}`;
}

export function Room({ office, staff, working }: { office: number; staff: Staff[]; working: boolean }) {
  const L = LAYOUTS[Math.min(office, LAYOUTS.length - 1)];
  return (
    <g>
      <Walls L={L} office={office} />
      <Floor L={L} />
      <BackFurniture L={L} office={office} />
      {L.desks.map((d, i) => (
        <Workstation key={i} x={d.x} y={d.y} staff={staff[i]} working={working} />
      ))}
      <FrontFurniture L={L} office={office} />
    </g>
  );
}

function Walls({ L, office }: { L: RoomLayout; office: number }) {
  const { w, d, h } = L;
  const panel = "#9a6236";
  const paper = "#e3b25a";
  const strips: ReactNode[] = [];
  for (let y = 0.5; y < d; y += 0.5) {
    strips.push(<polyline key={y} points={pts(iso(0, y, 0.3), iso(0, y, h))} stroke={shade(panel, -0.25)} strokeWidth="1.5" />);
  }
  const stripes: ReactNode[] = [];
  for (let x = 0.2; x < w; x += 0.9) {
    stripes.push(<OnRightWall key={x} y={0.005} x1={x} x2={x + 0.22} z1={0.3} z2={h} fill="#cf8a3a" />);
    stripes.push(<OnRightWall key={`t${x}`} y={0.005} x1={x + 0.32} x2={x + 0.4} z1={0.3} z2={h} fill="#b8642a" />);
  }
  const winY2 = office === 0 ? 4.8 : 7.2;
  return (
    <g>
      {/* Left wall: wood panelling */}
      <polygon points={pts(iso(0, 0, 0), iso(0, d, 0), iso(0, d, h), iso(0, 0, h))} fill={panel} />
      {strips}
      {/* Right wall: 70s wallpaper */}
      <polygon points={pts(iso(0, 0, 0), iso(w, 0, 0), iso(w, 0, h), iso(0, 0, h))} fill={paper} />
      {stripes}
      {/* Corner shadow */}
      <polygon points={pts(iso(0, 0, 0), iso(0.6, 0, 0), iso(0.6, 0, h), iso(0, 0, h))} fill="rgba(0,0,0,0.12)" />
      {/* Baseboards */}
      <OnLeftWall x={0.01} y1={0} y2={d} z1={0} z2={0.3} fill="#5a3519" />
      <OnRightWall y={0.01} x1={0} x2={w} z1={0} z2={0.3} fill="#a8703f" />
      {/* Wall tops (thickness) */}
      <polygon points={pts(iso(0, 0, h), iso(0, d, h), iso(-0.3, d, h), iso(-0.3, -0.3, h), iso(w, -0.3, h), iso(w, 0, h))} fill="#3b2414" />
      <polygon points={pts(iso(-0.3, d, h), iso(0, d, h), iso(0, d, 0), iso(-0.3, d, 0))} fill="#4a2c17" />
      <polygon points={pts(iso(w, -0.3, h), iso(w, 0, h), iso(w, 0, 0), iso(w, -0.3, 0))} fill="#7a4a26" />
      <Window y1={1.6} y2={winY2} />
      {/* Poster and calendar on the right wall */}
      <OnRightWall y={0.02} x1={1.2} x2={2.6} z1={2} z2={4} fill="#f6ead2" stroke="#3b2414" sw={3} />
      <Poster />
      <OnRightWall y={0.02} x1={3.4} x2={4.2} z1={2.6} z2={3.7} fill="#fffaf0" stroke="#3b2414" sw={2} />
      <OnRightWall y={0.03} x1={3.4} x2={4.2} z1={3.4} z2={3.7} fill="#a83a2a" />
      {office > 0 && <Clock />}
    </g>
  );
}

function Window({ y1, y2 }: { y1: number; y2: number }) {
  const z1 = 1.9;
  const z2 = 4.1;
  const buildings: ReactNode[] = [];
  let y = y1 + 0.05;
  let i = 0;
  while (y < y2 - 0.3) {
    const bw = 0.35 + ((i * 37) % 5) * 0.08;
    const top = z1 + 0.5 + ((i * 53) % 7) * 0.22;
    buildings.push(<OnLeftWall key={i} x={0.02} y1={y} y2={Math.min(y + bw, y2 - 0.05)} z1={z1} z2={top} fill={i % 2 ? "#a0664a" : "#8a5440"} />);
    y += bw + 0.08;
    i++;
  }
  return (
    <g>
      <OnLeftWall x={0.01} y1={y1 - 0.15} y2={y2 + 0.15} z1={z1 - 0.2} z2={z2 + 0.15} fill="#3b2414" />
      <OnLeftWall x={0.02} y1={y1} y2={y2} z1={z1} z2={z2} fill="#f7c27a" />
      <OnLeftWall x={0.02} y1={y1} y2={y2} z1={z1} z2={z1 + 0.9} fill="#efa25e" />
      {buildings}
      <OnLeftWall x={0.03} y1={(y1 + y2) / 2 - 0.06} y2={(y1 + y2) / 2 + 0.06} z1={z1} z2={z2} fill="#3b2414" />
      <OnLeftWall x={0.03} y1={y1} y2={y2} z1={(z1 + z2) / 2 + 0.3} z2={(z1 + z2) / 2 + 0.4} fill="#3b2414" />
      {/* sill */}
      <Box x={0} y={y1 - 0.2} z={z1 - 0.28} w={0.25} d={y2 - y1 + 0.4} h={0.08} color="#7a4a26" />
    </g>
  );
}

function Poster() {
  const [cx, cy] = iso(1.9, 0.03, 3.1);
  return (
    <g transform={`translate(${cx} ${cy}) skewY(-30)`}>
      <circle r="16" fill="#d9661f" />
      <circle r="10" fill="#d9a520" />
      <rect x="-20" y="26" width="40" height="7" fill="#5e6b22" />
    </g>
  );
}

function Clock() {
  const [cx, cy] = iso(6, 0.03, 3.9);
  return (
    <g transform={`translate(${cx} ${cy}) skewY(-30)`}>
      <circle r="17" fill="#fffaf0" stroke="#3b2414" strokeWidth="4" />
      <path d="M 0 0 L 0 -11 M 0 0 L 8 3" stroke="#3b2414" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  );
}

function Floor({ L }: { L: RoomLayout }) {
  const { w, d } = L;
  const lines: ReactNode[] = [];
  for (let x = 1; x < w; x++) lines.push(<polyline key={`x${x}`} points={pts(iso(x, 0), iso(x, d))} stroke="#b95f22" strokeWidth="1.2" />);
  for (let y = 1; y < d; y++) lines.push(<polyline key={`y${y}`} points={pts(iso(0, y), iso(w, y))} stroke="#b95f22" strokeWidth="1.2" />);
  return (
    <g>
      <polygon points={pts(iso(0, 0), iso(w, 0), iso(w, d), iso(0, d))} fill="#cf6d28" />
      {lines}
      {/* shadow from the walls */}
      <polygon points={pts(iso(0, 0), iso(w, 0), iso(w, 0.6), iso(0.6, 0.6), iso(0.6, d), iso(0, d))} fill="rgba(60,25,5,0.18)" />
      {/* floor front edge */}
      <polygon points={pts(iso(0, d), iso(w, d), iso(w, d, -0.35), iso(0, d, -0.35))} fill="#7a3c14" />
      <polygon points={pts(iso(w, 0), iso(w, d), iso(w, d, -0.35), iso(w, 0, -0.35))} fill="#5e2c0e" />
    </g>
  );
}

function Plant({ x, y }: { x: number; y: number }) {
  const [cx, cy] = iso(x + 0.35, y + 0.35, 1.0);
  return (
    <g>
      <Box x={x} y={y} w={0.7} d={0.7} h={1} color="#a83a2a" />
      <g transform={`translate(${cx} ${cy})`} stroke="#3b4a12" strokeWidth="1.5">
        <ellipse cx="-14" cy="-26" rx="10" ry="28" fill="#6b7a2a" transform="rotate(-28 -14 -26)" />
        <ellipse cx="14" cy="-26" rx="10" ry="28" fill="#7d8a2e" transform="rotate(28 14 -26)" />
        <ellipse cx="0" cy="-36" rx="10" ry="32" fill="#5e6b22" />
        <ellipse cx="-4" cy="-18" rx="8" ry="20" fill="#8a9a34" transform="rotate(-60 -4 -18)" />
      </g>
    </g>
  );
}

function BackFurniture({ L, office }: { L: RoomLayout; office: number }) {
  return (
    <g>
      <Plant x={L.w - 3.1} y={0.25} />
      {/* Filing cabinet with a radio on top */}
      <Box x={L.w - 1.8} y={0.15} w={1} d={0.8} h={2.4} color="#8c8c78" />
      {[0.5, 1.2, 1.9].map((z) => (
        <polygon key={z} points={pts(iso(L.w - 1.6, 0.95, z), iso(L.w - 1.0, 0.95, z), iso(L.w - 1.0, 0.95, z + 0.12), iso(L.w - 1.6, 0.95, z + 0.12))} fill="#5a5a4a" />
      ))}
      <Box x={L.w - 1.65} y={0.3} z={2.4} w={0.7} d={0.45} h={0.45} color="#7a4a26" />
      <OnFloor x1={L.w - 1.6} y1={0.75} x2={L.w - 1.1} y2={0.75} z={2.6} fill="none" />
      {office > 0 && (
        <>
          {/* Water cooler */}
          <Box x={L.w - 4.4} y={0.2} w={0.7} d={0.7} h={1.6} color="#e8e2d0" />
          <Box x={L.w - 4.25} y={0.35} z={1.6} w={0.4} d={0.4} h={0.8} color="#9cc7d4" />
          {/* Sofa */}
          <Box x={L.w - 1.1} y={3} w={0.9} d={2.6} h={0.6} color="#7d8a2e" />
          <Box x={L.w - 0.4} y={3} z={0.6} w={0.25} d={2.6} h={0.8} color="#6b7a2a" />
        </>
      )}
    </g>
  );
}

function FrontFurniture({ L, office }: { L: RoomLayout; office: number }) {
  return (
    <g>
      {/* Coat rack */}
      <Box x={0.4} y={L.d - 1.2} w={0.15} d={0.15} h={3.2} color="#5a3519" />
      <Box x={0.2} y={L.d - 1.4} w={0.55} d={0.55} h={0.1} color="#5a3519" />
      {(() => {
        const [hx, hy] = iso(0.47, L.d - 1.12, 3.0);
        return <path d={`M ${hx - 16} ${hy + 4} Q ${hx} ${hy - 12} ${hx + 16} ${hy + 4} Z`} fill="#6b3b1e" stroke="#3b2414" strokeWidth="1.5" />;
      })()}
      {office > 0 && <Plant x={L.w - 0.9} y={L.d - 0.9} />}
      {/* Wastebasket */}
      <Box x={L.w - 2.2} y={L.d - 1} w={0.45} d={0.45} h={0.55} color="#8c8c78" />
    </g>
  );
}

function Workstation({ x, y, staff, working }: { x: number; y: number; staff?: Staff; working: boolean }) {
  const look = staff ? lookFor(staff.id, staff.isPlayer) : null;
  const [hx, hy] = iso(x + 1.15, y - 0.5, 1.1);
  const active = working && !!staff;
  const [nx, ny] = iso(x + 1.2, y + DESK_D + 0.3, 0);
  return (
    <g>
      {/* Rug under the desk */}
      <OnFloor x1={x - 0.4} y1={y - 1.6} x2={x + DESK_W + 0.4} y2={y + DESK_D + 0.4} fill="#a8703f" stroke="#7a4a26" sw={2} />
      {/* Chair */}
      <Box x={x + 0.7} y={y - 1.2} w={0.9} d={0.15} z={1.1} h={1.3} color="#3b2414" />
      <Box x={x + 0.7} y={y - 1.1} w={0.9} d={0.9} z={0.85} h={0.25} color="#4a2c17" />
      <Box x={x + 1.1} y={y - 0.75} w={0.12} d={0.12} h={0.85} color="#2b1c12" />
      {look && (
        <g transform={`translate(${hx} ${hy})`}>
          <g transform="scale(1.3)"><Character look={look} working={active} /></g>
        </g>
      )}
      {/* Desk */}
      <Box x={x} y={y} z={DESK_H - 0.15} w={DESK_W} d={DESK_D} h={0.15} color="#a8703f" top="#c08a52" />
      <Box x={x + 0.05} y={y + 0.05} w={0.5} d={DESK_D - 0.1} h={DESK_H - 0.15} color="#7a4a26" />
      <Box x={x + DESK_W - 0.55} y={y + 0.05} w={0.5} d={DESK_D - 0.1} h={DESK_H - 0.15} color="#7a4a26" />
      <Box x={x + 0.55} y={y + DESK_D - 0.12} z={0.6} w={DESK_W - 1.1} d={0.05} h={0.85} color="#6b3b1e" />
      {/* Typewriter (we see its back) */}
      <Box x={x + 0.6} y={y + 0.15} z={DESK_H} w={1.0} d={0.6} h={0.3} color="#2e7d7a" />
      <Box x={x + 0.6} y={y + 0.2} z={DESK_H + 0.3} w={1.0} d={0.18} h={0.12} color="#1f5f5c" />
      <polygon points={pts(iso(x + 0.75, y + 0.28, DESK_H + 0.42), iso(x + 1.45, y + 0.28, DESK_H + 0.42), iso(x + 1.45, y + 0.28, DESK_H + 0.95), iso(x + 0.75, y + 0.28, DESK_H + 0.95))} fill="#fffaf0" stroke="#c9b48a" strokeWidth="1" />
      {/* Lamp, mug, paper pile, ashtray */}
      <Box x={x + 0.12} y={y + 0.15} z={DESK_H} w={0.3} d={0.3} h={0.08} color="#d9a520" />
      <Box x={x + 0.23} y={y + 0.26} z={DESK_H + 0.08} w={0.08} d={0.08} h={0.75} color="#b98a18" />
      <Box x={x + 0.02} y={y + 0.05} z={DESK_H + 0.8} w={0.5} d={0.5} h={0.25} color="#d9a520" />
      <Box x={x + 0.2} y={y + 0.75} z={DESK_H} w={0.28} d={0.28} h={0.3} color="#f6ead2" />
      <Box x={x + 1.8} y={y + 0.55} z={DESK_H} w={0.45} d={0.5} h={0.14} color="#fffaf0" />
      <Box x={x + 1.9} y={y + 0.12} z={DESK_H} w={0.3} d={0.3} h={0.06} color="#9c9c9c" />
      {look && (
        <g transform={`translate(${hx} ${hy})`}>
          <g transform="scale(1.3)"><Hands look={look} working={active} /></g>
        </g>
      )}
      {staff && (
        <g transform={`translate(${nx} ${ny})`}>
          <rect x={-staff.name.length * 3.8 - 10} y="-12" width={staff.name.length * 7.6 + 20} height="22" rx="11" fill="rgba(43,29,18,0.72)" />
          <text y="4" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fffaf0" fontFamily="Nunito, sans-serif">{staff.name}</text>
        </g>
      )}
    </g>
  );
}
