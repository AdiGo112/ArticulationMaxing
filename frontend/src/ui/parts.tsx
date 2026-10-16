/* parts.tsx — The small pieces every screen uses: Reel, the on-air logo,
   bars, the waveform, the filler/pause timeline, and transcript marking. */

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { ASPECT, FIXED, REEL_CORAL, SLOTS, VIEWBOX, frames, shade, type ReelState } from "../lib/reel.ts";
import { HARD } from "../lib/content.ts";
import { FILLER_RE } from "../lib/text.ts";

export const scoreColor = (v: number) => v >= 76 ? "var(--cyan)" : v >= 55 ? "var(--amber)" : "var(--alert)";

export function useReducedMotion() {
  const q = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  const [reduced, setReduced] = useState(!!q?.matches);
  useEffect(() => {
    if (!q) return;
    const on = () => setReduced(q.matches);
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, [q]);
  return reduced;
}

/* Reel. Frames swap with SVG <animate>, so React renders once per state;
   with reduced motion only the first frame is drawn. */
export function Reel({ state, size = 168, label, color = REEL_CORAL }: { state: ReelState; size?: number; label?: string; color?: string }) {
  const f = useMemo(() => frames(state), [state]);
  const still = useReducedMotion();
  const fill = (c: (typeof SLOTS)[number]) => c === "A" ? color : c === "D" ? shade(color) : FIXED[c];
  return (
    <svg width={size} height={Math.round(size * ASPECT)} viewBox={VIEWBOX} shapeRendering="crispEdges"
      role="img" aria-label={label || "Reel, " + state} style={{ flex: "none" }}>
      {SLOTS.map(c => (
        <path key={c} d={f.layers[c][0]} fill={fill(c)}>
          {!still && <animate attributeName="d" values={f.layers[c].join(";")} dur={f.dur + "s"} calcMode="discrete" repeatCount="indefinite" />}
        </path>
      ))}
      {f.acc && (
        <text x="19.5" y="-1.2" fontSize="3" fontWeight="700" fill={f.accColor} fontFamily="JetBrains Mono Variable, monospace">
          {f.acc}
          {!still && <animate attributeName="opacity" values="0.25;1;0.25" dur="1.6s" repeatCount="indefinite" />}
        </text>
      )}
    </svg>
  );
}

/* The logo: its light is lit only while a run records. */
export function OnAir({ live = false }: { live?: boolean }) {
  return (
    <a href="#/" className={"onair" + (live ? " live" : "")} aria-label={live ? "Speakeasy home — recording" : "Speakeasy home"}>
      <i aria-hidden="true" /><span>SPEAKEASY</span>
    </a>
  );
}

/* A track with a fill and an optional target band, all in percent. */
export function Bar({ pct, color, band, label, height }: { pct: number; color: string; band?: [number, number]; label: string; height?: number }) {
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div className="bar" role="meter" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} style={height ? { height } : undefined}>
      {band && <span className="band" style={{ left: band[0] + "%", width: band[1] - band[0] + "%" }} />}
      <span className="fill" style={{ width: v + "%", background: color }} />
    </div>
  );
}

/* Bars from 0..1 levels; `at` (0..1) draws a playhead and dims what lies past it. */
export function Wave({ levels, height = 120, at, dimAfter, onSeek }: {
  levels: number[]; height?: number; at?: number; dimAfter?: boolean; onSeek?: (p: number) => void;
}) {
  const n = levels.length;
  return (
    <div className="wave" aria-hidden="true" style={{ height, cursor: onSeek ? "pointer" : undefined }}
      onClick={onSeek ? e => { const r = e.currentTarget.getBoundingClientRect(); onSeek((e.clientX - r.left) / r.width); } : undefined}>
      {levels.map((v, i) => {
        const future = at != null && i / n > at;
        return <span key={i} style={{ height: Math.max(4, Math.round(v * (height - 4))),
          background: future ? (dimAfter ? "#6B4E1E" : "var(--line)") : "var(--amber)" }} />;
      })}
      {at != null && <span className="head" style={{ left: at * 100 + "%", background: dimAfter ? "var(--ink)" : "var(--cyan)",
        boxShadow: dimAfter ? undefined : "0 0 12px var(--cyan)" }} />}
    </div>
  );
}

export interface TimeMark { t: number; type: "pause" | "filler"; word?: string }

/* Fillers as pills, deliberate pauses as ticks, placed in time. */
export function Timeline({ marks, dur }: { marks: TimeMark[]; dur: number }) {
  const fillers = marks.filter(m => m.type === "filler").length, pauses = marks.length - fillers;
  const half = Math.round(dur / 2), fmt = (s: number) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
  return (
    <>
      <div className="marks" role="img" aria-label={`${fillers} filler${fillers === 1 ? "" : "s"} and ${pauses} deliberate pause${pauses === 1 ? "" : "s"}`}>
        {marks.map((m, i) => (
          <span key={i} className={m.type === "filler" ? "um" : "pause"} style={{ left: Math.min(100, m.t / dur * 100) + "%" }}>
            {m.type === "filler" ? m.word || "um" : null}
          </span>
        ))}
      </div>
      <div className="axis"><span>0:00</span><span>{fmt(half)}</span><span>{fmt(dur)}</span></div>
    </>
  );
}

/* Text with its fillers marked: hard ones solid, crutch words dashed — the
   same matcher the score counts with. */
export function Marked({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let last = 0, k = 0;
  for (const m of text.matchAll(new RegExp(FILLER_RE.source, "gi"))) {
    const i = m.index ?? 0;
    if (i > last) out.push(<Fragment key={k++}>{text.slice(last, i)}</Fragment>);
    const hard = HARD.includes(m[0].toLowerCase().replace(/\s+/g, " "));
    out.push(<mark key={k++} className={hard ? "hard" : "crutch"}>{m[0]}</mark>);
    last = i + m[0].length;
  }
  if (last < text.length) out.push(<Fragment key={k++}>{text.slice(last)}</Fragment>);
  return <>{out}</>;
}
