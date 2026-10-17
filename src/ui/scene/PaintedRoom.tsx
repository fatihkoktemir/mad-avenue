import bg from "../../assets/office-70s/bg.webp";
import fg from "../../assets/office-70s/fg.webp";
import man from "../../assets/office-70s/man.webp";

// Painted 1970s single room. Layers: background, the seated worker, then the
// desk and typewriter on top so they hide his lower body and hands.
export const PAINTED_W = 1920;
export const PAINTED_H = 1072;
const SEAT = { x: 873.5, y: 330, w: 236, h: 303 };
const FG_Y = 540;

/** Screen point the work bubbles rise from. */
export const PAINTED_HEAD: [number, number] = [SEAT.x + SEAT.w / 2, SEAT.y - 20];

export function PaintedRoom({ seated, working }: { seated: boolean; working: boolean }) {
  return (
    <g>
      <image href={bg} x={0} y={0} width={PAINTED_W} height={PAINTED_H} />
      {seated && (
        <g className={working ? "painted-worker working" : "painted-worker"}>
          <image href={man} x={SEAT.x} y={SEAT.y} width={SEAT.w} height={SEAT.h} />
        </g>
      )}
      <image href={fg} x={0} y={FG_Y} width={PAINTED_W} height={PAINTED_H - FG_Y} />
    </g>
  );
}
