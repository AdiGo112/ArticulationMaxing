/* Home — today's plan. One focal point: the headline and Start on the left,
   Reel on the right with the ASCII ripples behind him (never behind text).
   Then the path, in order, and one strip for streak, pack and privacy.
   DESIGN.md → Screens. */

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
  const why = next && plan.why[next];

  return (
    <Shell page="">
      <section aria-label="Today" className="card panel home-hero">
        <div className="home-copy">
          <span className="label amber">// today · {plan.drills.length} drills · ~{plan.drills.length * 3} min</span>
          <h1 className="h1" style={{ fontSize: "clamp(38px, 5vw, 56px)", lineHeight: 0.98 }}>Say it once.<br />Say it clearly.</h1>
          <p className="body" style={{ margin: 0, lineHeight: 1.6, maxWidth: 440 }}>
            {!next ? "All done today. Come back tomorrow, or pick any drill."
              : why ? `Picked from your weakest numbers — ${METRIC_NAME[why.metric] || "one part"} first.`
              : "Three short drills. After a few sessions the plan aims at whatever is weakest."}
          </p>
          <div className="row" style={{ gap: 16 }}>
            {next
              ? <button type="button" className="btn primary" onClick={() => go("drill/" + next)}>▶ {plan.done.length ? "CONTINUE" : "START TODAY"} · {drillById(next)!.name.toUpperCase()}</button>
              : <a className="btn ghost" href="#/drills">Pick any drill</a>}
            {next && <span className="muted" style={{ fontSize: 13 }}>{left} of {plan.drills.length} left</span>}
          </div>
          <p className="faint" style={{ margin: 0, fontSize: 13 }}><span className="amber" style={{ color: "var(--amber)" }}>psst ·</span> a pause is free. An “um” costs you authority.</p>
        </div>
        <div className="home-art">
          <pre aria-hidden="true">{RIPPLES}</pre>
          <Reel state={next ? "play" : "cheer"} size={200} />
        </div>
      </section>

      <section aria-labelledby="pathTitle" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 id="pathTitle" className="rule">── TODAY'S PATH ─────────────────────────────────────────────────</h2>
        <ol className="path">
          {plan.drills.map((id, i) => {
            const d = drillById(id)!, done = plan.done.includes(id), now = id === next, w = plan.why[id];
            return (
              <li key={id}>
                <a href={"#/drill/" + id} aria-current={now ? "step" : undefined}>
                  <span aria-hidden="true" className={"node" + (done ? " done" : now ? " now" : "")}>{done ? "✓" : now ? "▶" : i + 1}</span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                    <span className={"label" + (now ? " amber" : "")} style={{ fontSize: 11 }}>{done ? "done" : now ? "now" : "up next"}</span>
                    <span className="h2" style={{ fontSize: 22, color: done ? "var(--muted)" : undefined }}>{d.name}</span>
                    <span className="muted" style={{ fontSize: 13 }}>{w ? `weakest: ${METRIC_NAME[w.metric] || w.metric} · ${w.score}` : d.tag.toLowerCase()}</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
        <p className="faint" style={{ margin: 0, fontSize: 12.5 }}>Each drill ends on its report. Tomorrow's plan is built from today's numbers.</p>
      </section>

      <section className="home-strip" aria-label="Streak and goal">
        <div className="card" aria-labelledby="streakTitle">
          <h2 id="streakTitle" className="h2" style={{ fontSize: 18 }}>{days ? `${days} day${days > 1 ? "s" : ""} in a row` : "Start a streak today"}</h2>
          <ol aria-label="Practised this week" className="week">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <li key={i}><span aria-label={week[i] ? "practised" : "not practised"} className={week[i] ? "on" : ""} />{d}</li>
            ))}
          </ol>
        </div>
        <div className="card">
          <label className="field" style={{ fontSize: 12 }}>PRACTISING FOR
            <select value={record.pack || ""} onChange={e => pickPack(e.target.value)}>
              {[["", "Nothing special"], ...PACKS.map(p => [p.id, p.name])].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          <span className="faint" style={{ fontSize: 12 }}>{plan.done.length ? "A new choice shapes tomorrow's plan." : "Shapes today's plan."}</span>
        </div>
        <div className="card" style={{ borderStyle: "dashed", borderColor: "#3A3833" }}>
          <span className="label cyan" style={{ fontSize: 11 }}>privacy</span>
          <p className="body" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6 }}>Scoring happens on this device. Live captions in Chrome and Edge use the browser's speech service, which sends audio to Google. <a href="#/data">Details</a></p>
        </div>
      </section>
    </Shell>
  );
}
