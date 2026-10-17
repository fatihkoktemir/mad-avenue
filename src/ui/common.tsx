import type { ReactNode } from "react";
import type { Fit } from "../sim/content";

export function Modal(props: { title: ReactNode; onClose?: () => void; wide?: boolean; children: ReactNode }) {
  return (
    <div className="backdrop" onClick={props.onClose}>
      <div className={`modal${props.wide ? " wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{props.title}</h2>
          {props.onClose && <button className="close" onClick={props.onClose} aria-label="Close">✕</button>}
        </div>
        {props.children}
      </div>
    </div>
  );
}

export function Stars({ n, max = 3, hidden }: { n: number; max?: number; hidden?: boolean }) {
  if (hidden) return <span className="stars muted">?</span>;
  return (
    <span className="stars" aria-label={`${n} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < n ? "" : "off"}>★</span>
      ))}
    </span>
  );
}

export function FitTag({ fit }: { fit?: Fit }) {
  if (!fit) return null;
  return <span className={`fit ${fit}`}>{fit}</span>;
}
