/* Drills — all six, with your best, when you last did each, and why one is
   worth doing now. DESIGN.md → Screens; the canvas's Drills board. */

import { DRILLS, ago, drillStats, dueCards, nextInPlan, packById } from "../lib/drills.ts";
import { todayPlan } from "../lib/storage.ts";
import { Reel, scoreColor } from "../ui/parts.tsx";
import { Shell } from "../app/Shell.tsx";
import { useApp } from "../app/state.tsx";

// drills with no fixed length run as long as the passage takes
const LENGTH: Record<string, string> = { pace: "60–110 s", diction: "about 30 s", echo: "about 20 s" };

export function Drills() {
  const { record } = useApp();
  const stats = drillStats(record.sessions);
  const next = nextInPlan(todayPlan(record));
  const pack = packById(record.pack);
  const due = dueCards(record.cards, Date.now()).length;

  return (
    <Shell page="drills">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="label amber">// six drills · each trains one thing</span>
        <h1 className="h1">Pick the one you're worst at.</h1>
        <p className="muted" style={{ margin: 0 }}>practising for <b style={{ color: "var(--ink)" }}>{pack ? pack.name.toLowerCase() : "nothing special"}</b> · <a href="#/">change</a></p>
      </div>

      <ol className="grid" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {DRILLS.map((d, i) => {
          const s = stats[d.id];
          const badge = d.id === next ? ["TODAY · NEXT", "var(--ground)", "var(--amber)"]
            : d.id === "diction" && due ? [`${due} WORD${due > 1 ? "S" : ""} DUE`, "var(--cyan)", "#0E1A24"]
            : pack?.drills.some(x => x.drill === d.id) ? ["IN YOUR PACK", "var(--amber)", "#2A1F08"] : null;
          const lit = d.id === next || (!!badge && badge[0] === "IN YOUR PACK");
          return (
            <li key={d.id}>
              <a href={"#/drill/" + d.id} className="card" style={{ height: "100%", textDecoration: "none", color: "var(--ink)", borderColor: lit ? "var(--amber)" : undefined }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="label" style={{ fontSize: 11 }}>{String(i + 1).padStart(2, "0")} · {d.tag}</span>
                  {badge && <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.1em", padding: "3px 9px", borderRadius: 999, color: badge[1], background: badge[2] }}>{badge[0]}</span>}
                </div>
                <span className="h2">{d.name}</span>
                <span className="body" style={{ fontSize: 13, lineHeight: 1.6, flexGrow: 1 }}>{d.desc}</span>
                <div className="row" style={{ justifyContent: "space-between", fontSize: 12.5, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  <span className="muted">best <b style={{ color: s ? scoreColor(s.best) : "var(--faint)" }}>{s ? s.best : "new"}</b></span>
                  <span className="muted">{LENGTH[d.id] || `${d.dur} s · ${d.prep} s prep`}</span>
                  <span className="muted">{ago(s?.last)}</span>
                </div>
              </a>
            </li>
          );
        })}
      </ol>

      <a href="#/texts" className="card panel" style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 24, textDecoration: "none", color: "var(--ink)", borderStyle: "dashed", borderColor: "#3A3833" }}>
        <Reel state="read" size={130} />
        <span style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="label amber">or · your own words</span>
          <span className="h2">Rehearse a talk you actually have to give.</span>
          <span className="body" style={{ lineHeight: 1.6 }}>Paste it in; breath marks are placed for you, and it runs like Pace & Pause.</span>
          <span style={{ color: "var(--amber)", fontWeight: 700, letterSpacing: "0.08em" }}>YOUR TEXTS →</span>
        </span>
      </a>
    </Shell>
  );
}
