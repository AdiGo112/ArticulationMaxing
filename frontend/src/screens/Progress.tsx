/* Progress — headline numbers, facts (F2), the score chart, what is moving,
   recent sessions. DESIGN.md → Screens; the canvas's Progress board. No ASCII
   here: numbers and charts are drawn for real. */

import { useState } from "react";
import { METRIC_NAME, ago, drillById, facts, headline, trendFor } from "../lib/drills.ts";
import { streak } from "../lib/storage.ts";
import { Reel, scoreColor } from "../ui/parts.tsx";
import { Shell } from "../app/Shell.tsx";
import { useApp } from "../app/state.tsx";

const time = (t: number) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function Progress() {
  const { record } = useApp();
  const all = record.sessions;
  const h = headline(all);
  const [only, setOnly] = useState("");

  const head = (
    <div className="page-head">
      <span className="label amber">// your record · stored in this browser only</span>
      <h1 className="h1">What's actually changed.</h1>
    </div>
  );
  if (!h) return (
    <Shell page="progress">
      {head}
      <section className="card panel" style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 24 }}>
        <Reel state="think" size={140} />
        <div style={{ flex: "1 1 260px", display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
          <h2 className="h2">Nothing here yet.</h2>
          <p className="body" style={{ margin: 0, lineHeight: 1.6 }}>One drill and this page starts filling. Real trends need about six sessions over a few days.</p>
          <a className="btn primary" href="#/">▶ TODAY'S PLAN</a>
        </div>
      </section>
    </Shell>
  );

  const stats: [string, string, string][] = [
    [String(h.sessions), "sessions", "var(--ink)"],
    [String(streak(all)), "day streak", "var(--amber)"],
    [String(h.avg), "average score /100, last 30", scoreColor(h.avg)],
    [String(h.best), "best score /100", scoreColor(h.best)],
    [h.pace ? String(h.pace) : "—", "recent pace, wpm", "var(--cyan)"],
  ];
  const found = facts(all, 3);
  const drills = [...new Set(all.map(s => s.drill))];
  const pts = all.filter(s => !only || s.drill === only).slice(-30);
  const trends = Object.keys(METRIC_NAME).map(k => [k, trendFor(all, k)] as const).filter(([, t]) => t);

  // the chart: 0–100 up the side, sessions left to right
  const W = 960, H = 240, X = (i: number) => pts.length < 2 ? W / 2 : 8 + i / (pts.length - 1) * (W - 16), Y = (v: number) => H - 8 - v / 100 * (H - 16);
  const line = pts.map((s, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(s.score).toFixed(1)).join(" ");
  const best = pts.reduce((b, s, i) => s.score > pts[b].score ? i : b, 0);

  return (
    <Shell page="progress">
      {head}

      <section aria-label="Headline numbers" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 14 }}>
        {stats.map(([v, k, c]) => (
          <div key={k} className="card stat">
            <b className="big" style={{ fontSize: 40, color: c }}>{v}</b>
            <span className="muted" style={{ fontSize: 12.5 }}>{k}</span>
          </div>
        ))}
      </section>

      <section aria-label="Facts" className="card panel" style={{ flexDirection: "row", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, flex: "1 1 360px", display: "flex", flexDirection: "column", gap: 16 }}>
          {found.length ? found.map(f => {
            const d = f.drill ? drillById(f.drill) : null;
            return (
              <li key={f.metric} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className={"label sm " + (f.kind === "better" ? "cyan" : "amber")}>{f.kind === "better" ? "better" : "slipping"}</span>
                <span className="h2" style={{ fontSize: 20 }}>{f.text}</span>
                {d && <a href={"#/drill/" + d.id} style={{ fontSize: 13 }}>Train it: {d.name} →</a>}
              </li>
            );
          }) : <li className="body" style={{ lineHeight: 1.6 }}>No clear change yet. Facts appear once there are six measured sessions spread over three days — medians, so one good or bad day can't fake one.</li>}
        </ul>
        <Reel state={found.some(f => f.kind === "better") ? "cheer" : "think"} size={140} />
      </section>

      <section aria-labelledby="histTitle" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 id="histTitle" className="rule">── SCORE, LAST 30 SESSIONS ──────────────────────────────────────</h2>
        <div className="row" role="group" aria-label="Which drill">
          {["", ...drills].map(id => (
            <button key={id} type="button" className="pill" aria-pressed={only === id} onClick={() => setOnly(id)}>{id ? drillById(id)?.name || id : "all drills"}</button>
          ))}
        </div>
        <div className="card" style={{ padding: 16 }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Scores of the last ${pts.length} sessions, from ${pts[0]?.score} to ${pts[pts.length - 1]?.score}; best ${pts[best]?.score}`} style={{ display: "block", height: "auto" }}>
            {[25, 50, 75].map(v => <g key={v}><line x1="28" x2={W} y1={Y(v)} y2={Y(v)} stroke="var(--line)" strokeDasharray="4 6" /><text x="0" y={Y(v) + 4} fill="var(--faint)" fontSize="13" fontFamily="var(--mono)">{v}</text></g>)}
            {pts.length > 2 && <path d={line + ` L${X(pts.length - 1)} ${H} L${X(0)} ${H} Z`} fill="var(--amber)" opacity="0.08" />}
            {pts.length > 2 && <path d={line} fill="none" stroke="var(--amber)" strokeWidth="3" strokeLinejoin="round" />}
            {pts.map((s, i) => <circle key={s.at} cx={X(i)} cy={Y(s.score)} r={i === best ? 7 : 4} fill={i === best ? "var(--cyan)" : "var(--amber)"} />)}
          </svg>
          <div className="axis"><span>{pts.length ? ago(pts[0].at) : ""}</span><span>score out of 100 · <span style={{ color: "var(--cyan)" }}>●</span> best {pts[best]?.score}</span><span>{ago(pts[pts.length - 1]?.at)}</span></div>
        </div>
      </section>

      {trends.length > 0 && (
        <section aria-labelledby="moveTitle" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 id="moveTitle" className="rule">── WHAT IS MOVING · RECENT HALF AGAINST EARLIER HALF ─────────────</h2>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))" }}>
            {trends.map(([k, t]) => {
              const up = t!.delta > 2, down = t!.delta < -2, c = down ? "var(--amber)" : "var(--cyan)";
              const v = t!.values.slice(-12), lo = Math.min(...v), sp = Math.max(...v) - lo || 1;
              return (
                <div key={k} className="card stat">
                  <span className="label sm">{METRIC_NAME[k]}</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <b className="big" style={{ fontSize: 32 }}>{Math.round(t!.now)}</b>
                    <b style={{ color: c, fontSize: 14 }}>{up ? "↑" : down ? "↓" : "→"} {t!.delta > 0 ? "+" : t!.delta < 0 ? "−" : ""}{Math.abs(t!.delta)}</b>
                  </div>
                  <svg viewBox="0 0 140 34" width="100%" height="34" preserveAspectRatio="none" aria-hidden="true">
                    <polyline fill="none" stroke={c} strokeWidth="2" vectorEffect="non-scaling-stroke"
                      points={v.map((x, i) => (4 + i / Math.max(1, v.length - 1) * 132).toFixed(1) + "," + (30 - (x - lo) / sp * 26).toFixed(1)).join(" ")} />
                  </svg>
                  <span className="faint" style={{ fontSize: 11.5 }}>{t!.n} sessions</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section aria-labelledby="recentTitle" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 id="recentTitle" className="rule">── RECENT SESSIONS ──────────────────────────────────────────────</h2>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead><tr><th scope="col">WHEN</th><th scope="col">DRILL</th><th scope="col">SCORE</th><th scope="col">PACE</th><th scope="col">FILLERS</th></tr></thead>
            <tbody>
              {all.slice(-8).reverse().map(s => (
                <tr key={s.at + s.drill}>
                  <td className="muted">{ago(s.at)} {time(s.at)}</td>
                  <td>{s.name}</td>
                  <td><b style={{ color: scoreColor(s.score) }}>{s.score}</b></td>
                  <td>{s.wpm ? Math.round(s.wpm) + " wpm" : "—"}</td>
                  <td>{s.fillers ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Shell>
  );
}
