import { shade } from "./iso";

export interface Look {
  skin: string;
  hair: string;
  hairStyle: "side" | "shaggy" | "afro" | "bob" | "bald";
  jacket: string;
  shirt: string;
  tie: string | null;
  mustache: boolean;
  glasses: boolean;
}

const SKINS = ["#f2c9a0", "#e8b48a", "#c98e62", "#a86f47", "#7a4c30"];
const HAIRS = ["#2b1c12", "#4a2c17", "#8a5a2b", "#c79a4a", "#1b1714", "#6b3b1e"];
const JACKETS = ["#8a5a2b", "#5b6b3a", "#3f5a6b", "#9c4a2a", "#6b4a7a", "#7a6a50"];
const SHIRTS = ["#f6ead2", "#e9d7a8", "#d8e2e8", "#f2d0b8"];
const TIES = ["#a83a2a", "#d9a520", "#2e7d7a", "#6b3b1e"];

/** A stable look for a staff member, picked from their id. */
export function lookFor(id: number, isPlayer: boolean): Look {
  const r = (n: number) => Math.abs(Math.sin(id * 9301 + n * 49297)) % 1;
  const pick = <T,>(list: T[], n: number) => list[Math.floor(r(n) * list.length)];
  const styles: Look["hairStyle"][] = ["side", "shaggy", "afro", "bob", "side", "shaggy", "bald"];
  const hairStyle = isPlayer ? "side" : pick(styles, 1);
  return {
    skin: isPlayer ? SKINS[0] : pick(SKINS, 2),
    hair: isPlayer ? HAIRS[1] : pick(HAIRS, 3),
    hairStyle,
    jacket: isPlayer ? "#8a5a2b" : pick(JACKETS, 4),
    shirt: pick(SHIRTS, 5),
    tie: hairStyle === "bob" ? null : pick(TIES, 6),
    mustache: isPlayer || (hairStyle !== "bob" && r(7) > 0.6),
    glasses: !isPlayer && r(8) > 0.7,
  };
}

/**
 * A seated, big-headed character seen at three-quarters, facing the lower
 * left. The origin is the hip point; the desk is drawn after this, so only
 * the head and shoulders show above it.
 */
export function Character({ look, working }: { look: Look; working: boolean }) {
  const outline = "#3a2516";
  const skinDark = shade(look.skin, -0.18);
  return (
    <g className={working ? "char working" : "char"}>
      {/* shadow on the chair */}
      <ellipse cx="2" cy="4" rx="26" ry="8" fill="rgba(0,0,0,0.18)" />
      {/* torso */}
      <path d="M -22 -2 Q -25 -30 -14 -40 L 14 -40 Q 25 -30 22 -2 Z" fill={look.jacket} stroke={outline} strokeWidth="2" />
      <path d="M -9 -40 L 0 -22 L 9 -40 Z" fill={look.shirt} stroke={outline} strokeWidth="1.5" />
      {look.tie && <path d="M -2.5 -36 L 2.5 -36 L 4 -20 L 0 -15 L -4 -20 Z" fill={look.tie} stroke={outline} strokeWidth="1" />}
      <path d="M -9 -40 L -4 -30 M 9 -40 L 4 -30" stroke={shade(look.jacket, -0.3)} strokeWidth="2" />
      {/* upper arms reaching toward the desk */}
      <path d="M -18 -34 Q -30 -26 -30 -12" fill="none" stroke={outline} strokeWidth="11" strokeLinecap="round" />
      <path d="M -18 -34 Q -30 -26 -30 -12" fill="none" stroke={look.jacket} strokeWidth="8" strokeLinecap="round" />
      <path d="M 18 -34 Q 12 -24 2 -14" fill="none" stroke={outline} strokeWidth="11" strokeLinecap="round" />
      <path d="M 18 -34 Q 12 -24 2 -14" fill="none" stroke={shade(look.jacket, -0.15)} strokeWidth="8" strokeLinecap="round" />
      {/* head */}
      <g className="head">
        <rect x="-6" y="-48" width="12" height="10" fill={skinDark} />
        {look.hairStyle === "shaggy" && <path d="M -24 -70 Q -30 -44 -18 -40 L 24 -42 Q 32 -60 22 -82 Z" fill={look.hair} stroke={outline} strokeWidth="2" />}
        {look.hairStyle === "bob" && <path d="M -27 -72 Q -30 -42 -16 -42 L 22 -44 Q 34 -52 26 -84 Z" fill={look.hair} stroke={outline} strokeWidth="2" />}
        {look.hairStyle === "afro" && <circle cx="2" cy="-74" r="33" fill={look.hair} stroke={outline} strokeWidth="2" />}
        <circle cx="0" cy="-66" r="25" fill={look.skin} stroke={outline} strokeWidth="2" />
        {/* ear on the far side */}
        <ellipse cx="21" cy="-64" rx="5" ry="7" fill={look.skin} stroke={outline} strokeWidth="1.8" />
        {/* hair on top */}
        {look.hairStyle === "side" && <path d="M -25 -68 Q -26 -95 2 -93 Q 28 -92 26 -64 Q 20 -76 6 -80 Q -10 -84 -25 -68 Z" fill={look.hair} stroke={outline} strokeWidth="2" />}
        {look.hairStyle === "shaggy" && <path d="M -26 -64 Q -28 -96 2 -94 Q 30 -92 27 -60 Q 22 -72 10 -76 Q -6 -72 -14 -82 Q -18 -70 -26 -64 Z" fill={look.hair} stroke={outline} strokeWidth="2" />}
        {look.hairStyle === "bob" && <path d="M -27 -62 Q -30 -96 2 -95 Q 30 -94 28 -60 Q 20 -74 0 -78 Q -16 -76 -27 -62 Z" fill={look.hair} stroke={outline} strokeWidth="2" />}
        {look.hairStyle === "afro" && <path d="M -24 -72 Q -14 -84 6 -82 Q 22 -80 26 -70 Q 34 -90 2 -104 Q -32 -96 -24 -72 Z" fill={look.hair} />}
        {look.hairStyle === "bald" && <path d="M 12 -70 Q 22 -72 26 -60 Q 24 -52 22 -54 Q 20 -62 12 -70 Z" fill={look.hair} />}
        {/* sideburns */}
        {(look.hairStyle === "side" || look.hairStyle === "shaggy") && <path d="M 14 -70 L 16 -54 L 12 -54 L 10 -68 Z" fill={look.hair} />}
        {/* face, turned toward the lower left */}
        <ellipse cx="-13" cy="-63" rx="2.8" ry="3.6" fill="#2b1c12" />
        <ellipse cx="2" cy="-64" rx="2.6" ry="3.4" fill="#2b1c12" />
        <circle cx="-12" cy="-64.5" r="0.9" fill="#fff" />
        <circle cx="3" cy="-65.5" r="0.9" fill="#fff" />
        <path d="M -17 -70 L -9 -71 M -1 -71 L 6 -70" stroke={look.hairStyle === "bald" ? skinDark : look.hair} strokeWidth="2" strokeLinecap="round" />
        <path d="M -7 -61 Q -10 -55 -6 -55" fill="none" stroke={skinDark} strokeWidth="1.8" strokeLinecap="round" />
        <ellipse cx="-17" cy="-57" rx="4" ry="2.5" fill="#e88a6a" opacity="0.35" />
        {look.mustache
          ? <path d="M -15 -51 Q -7 -55 1 -51 Q -7 -48 -15 -51 Z" fill={look.hair} />
          : <path d="M -12 -50 Q -7 -47 -2 -50" fill="none" stroke={outline} strokeWidth="1.6" strokeLinecap="round" />}
        {look.glasses && (
          <g fill="none" stroke="#2b1c12" strokeWidth="1.6">
            <circle cx="-13" cy="-63" r="6" />
            <circle cx="3" cy="-64" r="6" />
            <path d="M -7 -64 L -3 -64 M 9 -64 L 20 -66" />
          </g>
        )}
      </g>
    </g>
  );
}

/** Hands resting on the typewriter keys, drawn after the desk. */
export function Hands({ look, working }: { look: Look; working: boolean }) {
  return (
    <g className={working ? "hands working" : "hands"} stroke="#3a2516" strokeWidth="1.8">
      <ellipse className="hand-l" cx="-32" cy="-8" rx="7" ry="5" fill={look.skin} />
      <ellipse className="hand-r" cx="0" cy="-10" rx="7" ry="5" fill={look.skin} />
    </g>
  );
}
