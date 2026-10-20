/* Report — the run you just finished. DESIGN.md → Screens; the canvas's Report board. */

import { useMemo, useRef, useState } from "react";
import { drillById, facts, nextInPlan } from "../lib/drills.ts";
import { coachNotes, verdict } from "../lib/scoring.ts";
import { todayPlan } from "../lib/storage.ts";
import { Bar, Marked, Reel, Timeline, Wave, scoreColor } from "../ui/parts.tsx";
import { Shell } from "../app/Shell.tsx";
import { go, useApp } from "../app/state.tsx";
import { Coach } from "./Coach.tsx";

const fmt = (s: number) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");

/* The take's 20 Hz loudness, reduced to `n` bars by the loudest moment in each. */
const buckets = (tape: number[], n: number) =>
  Array.from({ length: n }, (_, i) => Math.max(0, ...tape.slice(Math.floor(i * tape.length / n), Math.floor((i + 1) * tape.length / n))));

export function Report() {
  const app = useApp();
  const { record, last } = app;
  const audio = useRef<HTMLAudioElement>(null);
  const [pos, setPos] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const r = last?.result;
  const bars = useMemo(() => r ? buckets(r.tape, 90) : [], [r]);

  if (!r) return (
    <Shell page="drills">
      <div className="card" style={{ alignItems: "flex-start" }}>
        <Reel state="think" size={140} />
        <h1 className="h2">No report yet.</h1>
        <p className="body" style={{ margin: 0 }}>Finish a drill and its report lands here.</p>
        <a className="btn primary" href="#/">▶ TODAY'S PLAN</a>
      </div>
    </Shell>
  );

  const [title, sub] = verdict(r.score);
  const plan = todayPlan(record), next = nextInPlan(plan), nextDrill = next ? drillById(next) : null;
  const fix = coachNotes(r.m, r.run)[0];
  const since = facts(record.sessions, 3);
  const prev = record.sessions.filter(s => s.drill === r.drill.id).slice(-2, -1)[0];

  const seek = (p: number) => {
    const a = audio.current;
    if (!a) return;
    a.currentTime = p * r.elapsed; setPos(a.currentTime);
    void a.play();
  };
  const toggle = () => { const a = audio.current; if (!a) return; if (a.paused) void a.play(); else a.pause(); };

  return (
    <Shell page="drills" sub={r.run.custom ? "texts" : "drill/" + r.drill.id}>
      <span className="label">{r.drill.name} · {fmt(r.elapsed)} · {plan.done.length} of {plan.drills.length} done today</span>

      <section aria-label="Score" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "28px 56px" }}>
        <div aria-label={`Score ${r.score} out of 100`} style={{ display: "flex", alignItems: "baseline", gap: 6, color: scoreColor(r.score) }}>
          <span className="big" style={{ fontSize: "clamp(110px, 14vw, 168px)", letterSpacing: "-0.04em", lineHeight: 0.85 }}>{r.score}</span>
          <span className="big muted" style={{ fontSize: 28, fontWeight: 600 }}>/100</span>
        </div>
        <div style={{ flex: "1 1 360px", display: "flex", flexDirection: "column", gap: 10 }}>
          {prev && <span className="label">{r.score >= prev.score ? "up" : "down"} {Math.abs(r.score - prev.score)} on last time</span>}
          <h1 className="h1" style={{ fontSize: 52 }}>{title}</h1>
          <p className="body" style={{ margin: 0, fontSize: 15, lineHeight: 1.6, maxWidth: 520 }}>{sub}</p>
          {last.retry && <p style={{ margin: 0, color: "var(--cyan)" }}>{last.retry}</p>}
        </div>
        <Reel state={r.score >= 62 ? "cheer" : "think"} size={180} />
      </section>

      <section aria-label="Each part" className="card">
        <h2 className="rule">── EACH PART, OUT OF 100 ──────────────</h2>
        {r.parts.map(p => (
          <div key={p.k} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 18px" }}>
            <span style={{ flex: "0 0 120px" }}>{p.label}</span>
            <div style={{ flex: "1 1 260px", maxWidth: 420 }}><Bar pct={p.v} color={scoreColor(p.v)} label={p.label} height={14} /></div>
            <b className="big" style={{ fontSize: 24, color: scoreColor(p.v), minWidth: 40 }}>{p.v}</b>
          </div>
        ))}
        {r.parts.length === 0 && <p className="muted" style={{ margin: 0 }}>Too little to score — try a longer take.</p>}
      </section>

      <section aria-label="The take" className="card panel">
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <h2 className="rule">── THE TAKE ──{r.audioURL ? " click to jump" : ""}</h2>
          {r.audioURL && <button type="button" className="btn ghost" style={{ padding: "10px 18px", borderRadius: 999 }} onClick={toggle}>
            {playing ? "❚❚ pause" : "▶ play"} · {fmt(r.elapsed)}</button>}
        </div>
        <Wave levels={bars} height={110} at={pos != null ? pos / r.elapsed : 0} dimAfter onSeek={r.audioURL ? seek : undefined} />
        <Timeline marks={r.marks} dur={r.elapsed || 1} />
        {r.text
          ? <p style={{ margin: 0, fontSize: 17, lineHeight: 1.75, maxWidth: 940 }}><Marked text={r.text} /></p>
          : <p className="faint" style={{ margin: 0 }}>No transcript for this take — the recording and the audio scores are all here.</p>}
        {r.audioURL && <audio ref={audio} src={r.audioURL} preload="metadata"
          onTimeUpdate={e => setPos(e.currentTarget.currentTime)} onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />}
      </section>

      {(fix || since.length > 0) && <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
        {fix && (
          <section aria-label="Fix next" className="card amber" style={{ flex: "1 1 420px" }}>
            <span className="label amber">the one thing to fix</span>
            <h2 className="h2" style={{ fontSize: 26 }}>{fix[0]}</h2>
            <p className="body" style={{ margin: 0, lineHeight: 1.65 }}>{fix[1]}</p>
          </section>
        )}
        {since.length > 0 && (
          <section aria-label="Since you started" className="card" style={{ flex: "1 1 320px" }}>
            <span className="label cyan">since you started</span>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>{since.map(f => <li key={f.metric} style={{ color: f.kind === "better" ? "var(--cyan)" : "var(--amber)" }}><span style={{ color: "var(--ink)" }}>{f.text}</span></li>)}</ul>
          </section>
        )}
      </div>}

      <Coach r={r} />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
        {nextDrill
          ? <a className="btn primary" href={"#/drill/" + nextDrill.id}>NEXT: {nextDrill.name.toUpperCase()} ▶</a>
          : <a className="btn primary" href="#/">BACK TO TODAY</a>}
        <button type="button" className="btn ghost" onClick={() => { app.setAgain(r.run); go("drill/" + r.drill.id); }}>↻ same prompt again</button>
      </div>
    </Shell>
  );
}
