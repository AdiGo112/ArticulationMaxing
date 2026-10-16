/* Home — today's path. DESIGN.md → Screens; the canvas's Home board. */

import { useEffect } from "react";
import { METRIC_NAME, PACKS, drillById, nextInPlan } from "../lib/drills.ts";
import { practisedThisWeek, streak, todayPlan } from "../lib/storage.ts";
import { RIPPLES } from "../ui/art.ts";
import { Reel } from "../ui/parts.tsx";
import { Shell } from "../app/Shell.tsx";
import { go, useApp } from "../app/state.tsx";

export function Home() {
  const { record, update } = useApp();
  const plan = todayPlan(record);
  // a new day builds a new plan; keep it, so what's done today stays done
  useEffect(() => { if (record.plan !== plan) update(r => ({ ...r, plan })); }, [record.plan, plan, update]);
  const next = nextInPlan(plan);
  const left = plan.drills.length - plan.done.length;
  const week = practisedThisWeek(record.sessions), days = streak(record.sessions);

  const pickPack = (id: string) => update(r => {
    // a pack rebuilds today's plan only if none of it is done yet
    const fresh = { ...r, pack: id || null };
    return todayPlan(r).done.length ? fresh : { ...fresh, plan: null };
  });

  const rail = (
    <>
      <section className="card" aria-labelledby="streakTitle">
        <h2 id="streakTitle" className="h2" style={{ fontSize: 20 }}>{days ? `${days} day${days > 1 ? "s" : ""} in a row` : "Start a streak today"}</h2>
        <ol aria-label="Practised this week" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <li key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted)" }}>
              <span aria-label={week[i] ? "practised" : "not practised"} style={{ width: 30, height: 30, borderRadius: "50%", boxSizing: "border-box",
                background: week[i] ? "var(--amber)" : "transparent", border: "2px solid " + (week[i] ? "var(--amber)" : "var(--edge)") }} />{d}
            </li>
          ))}
        </ol>
        <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>One drill keeps it alive. Miss a day and Reel falls asleep — it wakes up the next time you talk.</p>
      </section>
      <section className="card" aria-labelledby="packTitle">
        <h2 id="packTitle" className="h2" style={{ fontSize: 20 }}>Practising for</h2>
        <div role="radiogroup" aria-labelledby="packTitle" style={{ display: "flex", flexDirection: "column", fontSize: 14 }}>
          {[["", "nothing special"], ...PACKS.map(p => [p.id, p.name.toLowerCase()])].map(([id, name]) => {
            const on = (record.pack || "") === id;
            return (
              <label key={id} style={{ display: "flex", gap: 10, padding: "8px 0", cursor: "pointer", color: on ? "var(--amber)" : undefined }}>
                <input type="radio" name="pack" checked={on} onChange={() => pickPack(id)} style={{ accentColor: "var(--amber)" }} /> {name}
              </label>
            );
          })}
        </div>
        {plan.done.length > 0 && <p className="faint" style={{ margin: 0, fontSize: 12 }}>A new choice shapes tomorrow's plan.</p>}
      </section>
      <section className="card" style={{ borderStyle: "dashed", borderColor: "#3A3833", flexDirection: "row", alignItems: "center", gap: 16 }}>
        <pre aria-hidden="true" style={{ fontSize: 11, lineHeight: 1.15, color: "var(--cyan)" }}>{" .--.\n|[]|\n'--'"}</pre>
        <p className="body" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6 }}>Your voice is analysed on this device. Nothing leaves it unless you ask.</p>
      </section>
    </>
  );

  return (
    <Shell page="" rail={rail}>
      <section aria-label="Today" className="card panel hero" style={{ position: "relative", overflow: "hidden", padding: "36px 36px 32px" }}>
        <pre aria-hidden="true" style={{ position: "absolute", left: 36, top: 10, fontSize: 9.5, lineHeight: 1.12, color: "var(--amber)", opacity: 0.55, whiteSpace: "pre", pointerEvents: "none" }}>{RIPPLES}</pre>
        <div style={{ position: "relative", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "24px 48px", minHeight: 290 }}>
          <Reel state={next ? "play" : "cheer"} size={196} />
          <div style={{ flex: "1 1 360px", display: "flex", flexDirection: "column", gap: 18, alignItems: "flex-start", marginLeft: "auto", maxWidth: 520, background: "rgba(14,14,16,0.82)", padding: "20px 22px", borderRadius: 14 }}>
            <span className="label amber">// today · {plan.drills.length} drills · ~{plan.drills.length * 3} min</span>
            <h1 className="h1" style={{ fontSize: "clamp(38px, 5vw, 54px)", lineHeight: 0.98 }}>Say it once.<br />Say it clearly.</h1>
            <p className="body" style={{ margin: 0, lineHeight: 1.6 }}>
              {!next ? "All done today. Come back tomorrow, or pick any drill."
                : plan.why[plan.drills[0]] ? `Picked from your weakest numbers — ${METRIC_NAME[plan.why[plan.drills[0]].metric] || "one part"} first.`
                : "Three drills to start. After a few sessions the plan aims at whatever is weakest."}
            </p>
            {next
              ? <button type="button" className="btn primary" onClick={() => go("drill/" + next)}>▶ {plan.done.length ? "CONTINUE" : "START TODAY"}</button>
              : <a className="btn ghost" href="#/drills">Pick any drill</a>}
            {next && <span className="muted" style={{ fontSize: 12 }}>{left} of {plan.drills.length} left</span>}
          </div>
        </div>
      </section>

      <section aria-labelledby="pathTitle" style={{ display: "flex", flexWrap: "wrap", gap: 32 }}>
        <div style={{ flex: "999 1 420px", minWidth: 0 }}>
          <h2 id="pathTitle" className="rule" style={{ marginBottom: 22 }}>── TODAY'S PATH ─────────────────────────</h2>
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 14 }}>
            {plan.drills.map((id, i) => {
              const d = drillById(id)!, done = plan.done.includes(id), now = id === next, why = plan.why[id];
              return (
                <li key={id} style={{ marginLeft: [0, 72, 128][i] ?? 0 }}>
                  <a href={"#/drill/" + id} style={{ display: "flex", alignItems: "center", gap: 22, textDecoration: "none", color: "var(--ink)" }}>
                    <span aria-hidden="true" className={"node" + (done ? " done" : now ? " now" : "")}>{done ? "✓" : now ? "▶" : i + 1}</span>
                    <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span className={"label" + (now ? " amber" : "")} style={{ fontSize: 11 }}>{done ? "done" : now ? "now · start here" : i === 1 ? "next" : "then"}</span>
                      <span className="h2" style={{ fontSize: 22 }}>{d.name}</span>
                      <span className="muted" style={{ fontSize: 13 }}>{why ? `weakest: ${METRIC_NAME[why.metric] || why.metric} · ${why.score}` : d.tag.toLowerCase()}</span>
                    </span>
                  </a>
                </li>
              );
            })}
            <li style={{ marginLeft: 72, display: "flex", alignItems: "center", gap: 22 }}>
              <span aria-hidden="true" className="node check">◆</span>
              <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="label cyan" style={{ fontSize: 11 }}>checkpoint</span>
                <span className="h2" style={{ fontSize: 22 }}>Today's report</span>
                <span className="muted" style={{ fontSize: 13 }}>what moved, after each drill</span>
              </span>
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: 22 }}>
              <span aria-hidden="true" className="node later">·</span>
              <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="label" style={{ fontSize: 11 }}>tomorrow</span>
                <span className="h2 muted" style={{ fontSize: 22 }}>Built from today</span>
              </span>
            </li>
          </ol>
        </div>
        <aside aria-label="Tip" className="card" style={{ flex: "1 1 240px", alignSelf: "flex-start", marginTop: 44, borderStyle: "dashed", borderColor: "#3A3833" }}>
          <span className="label amber">psst</span>
          <p style={{ margin: 0, lineHeight: 1.6 }}>A pause is free. An “um” costs you authority.</p>
        </aside>
      </section>
    </Shell>
  );
}
