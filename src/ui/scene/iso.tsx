// Isometric helpers for the office scene. World units: x runs to the screen's
// lower right, y to the lower left, z straight up. One unit is S pixels.
export const S = 46;
const CX = Math.cos(Math.PI / 6);

export type Pt = [number, number];

export function iso(x: number, y: number, z = 0): Pt {
  return [(x - y) * S * CX, (x + y) * S * 0.5 - z * S];
}

export function pts(...p: Pt[]): string {
  return p.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
}

/** Lighten (amt > 0) or darken (amt < 0) a #rrggbb color. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => {
    const out = amt >= 0 ? v + (255 - v) * amt : v * (1 + amt);
    return Math.max(0, Math.min(255, Math.round(out)));
  };
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export interface BoxProps {
  x: number; y: number; z?: number;
  w: number; d: number; h: number;
  color: string;
  top?: string;
  stroke?: string;
}

/** A solid box showing its top, +y (left) and +x (right) faces. */
export function Box({ x, y, z = 0, w, d, h, color, top, stroke }: BoxProps) {
  const t = z + h;
  const line = stroke ?? shade(color, -0.45);
  return (
    <g stroke={line} strokeWidth={1.2} strokeLinejoin="round">
      <polygon points={pts(iso(x, y + d, z), iso(x + w, y + d, z), iso(x + w, y + d, t), iso(x, y + d, t))} fill={shade(color, -0.12)} />
      <polygon points={pts(iso(x + w, y, z), iso(x + w, y + d, z), iso(x + w, y + d, t), iso(x + w, y, t))} fill={shade(color, -0.3)} />
      <polygon points={pts(iso(x, y, t), iso(x + w, y, t), iso(x + w, y + d, t), iso(x, y + d, t))} fill={top ?? shade(color, 0.12)} />
    </g>
  );
}

/** A flat rectangle lying on the plane x = const (the back-left wall). */
export function OnLeftWall({ x = 0, y1, y2, z1, z2, fill, stroke, sw = 1.5 }: { x?: number; y1: number; y2: number; z1: number; z2: number; fill: string; stroke?: string; sw?: number }) {
  return <polygon points={pts(iso(x, y1, z1), iso(x, y2, z1), iso(x, y2, z2), iso(x, y1, z2))} fill={fill} stroke={stroke} strokeWidth={stroke ? sw : 0} />;
}

/** A flat rectangle lying on the plane y = const (the back-right wall). */
export function OnRightWall({ y = 0, x1, x2, z1, z2, fill, stroke, sw = 1.5 }: { y?: number; x1: number; x2: number; z1: number; z2: number; fill: string; stroke?: string; sw?: number }) {
  return <polygon points={pts(iso(x1, y, z1), iso(x2, y, z1), iso(x2, y, z2), iso(x1, y, z2))} fill={fill} stroke={stroke} strokeWidth={stroke ? sw : 0} />;
}

/** A flat rectangle on the floor (or any horizontal plane at height z). */
export function OnFloor({ x1, y1, x2, y2, z = 0, fill, stroke, sw = 1.5 }: { x1: number; y1: number; x2: number; y2: number; z?: number; fill: string; stroke?: string; sw?: number }) {
  return <polygon points={pts(iso(x1, y1, z), iso(x2, y1, z), iso(x2, y2, z), iso(x1, y2, z))} fill={fill} stroke={stroke} strokeWidth={stroke ? sw : 0} />;
}
