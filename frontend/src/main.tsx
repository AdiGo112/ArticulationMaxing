import { StrictMode, useEffect, useReducer, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { DRILLS, buildRun, buzzOn, packById, packRunOpts, type Drill, type Run } from "./lib/drills.ts";
import { recordRun, todayPlan, type UserRecord } from "./lib/storage.ts";
import { loadRecord, saveRecord } from "./engine/db.ts";
import { useSession } from "./engine/useSession.ts";
import type { RunResult } from "./engine/session.ts";

/* ponytail: an unstyled test booth, so the port can be run end to end with a
   real mic before any screen exists. The real screens are built to DESIGN.md
   (D-014) and replace this file's App. */
function App() {
  const [record, setRecord] = useState<UserRecord | null>(null);
  const [drill, setDrill] = useState<Drill | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [result, setResult] = useState<{ r: RunResult; retry: string | null } | null>(null);
  const [, redraw] = useReducer((x: number) => x + 1, 0);
  const lastDraw = useRef(0);

  useEffect(() => { loadRecord().then(setRecord); }, []);

  const s = useSession(run, drill, {
    buzz: record && drill ? buzzOn(record.buzz, drill.id) : false,
    // live numbers at 4 Hz: enough to read, without re-rendering every frame
    onTick: () => { const now = performance.now(); if (now - lastDraw.current > 250) { lastDraw.current = now; redraw(); } },
    onFinish: r => {
      if (!record) return;
      const saved = recordRun(record, { session: r.session, text: r.text, target: r.run.target, promptId: r.run.promptId });
      setRecord(saved.record); void saveRecord(saved.record);
      setResult({ r, retry: saved.retry });
    },
  });

  if (!record) return <p>Loading…</p>;
  const plan = todayPlan(record);
  const pick = (d: Drill) => { setResult(null); setDrill(d); setRun(buildRun(d.id, packRunOpts(packById(record.pack), d.id))); };
  const live = s.live(), phase = s.phase;

  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 720, margin: "24px auto", padding: "0 16px" }}>
      <h1>Speakeasy — port test booth</h1>
      <p>Unstyled on purpose: the screens come with the redesign. {record.sessions.length} sessions stored ·
        today: {plan.drills.join(", ")} ({plan.done.length} done)</p>
      <p>{DRILLS.map(d => <button key={d.id} onClick={() => pick(d)} aria-pressed={drill?.id === d.id}>{d.name}</button>)}</p>
      {run && drill && <section>
        <h2>{drill.name}</h2>
        <p><b>{run.cd}</b></p>
        {run.target && <p>{run.target.split(" ").map((w, i) => <span key={i} style={{ color: live?.hits[i] ? "green" : undefined }}>{w} </span>)}</p>}
        <p>Phase: <b>{phase.kind}</b>{phase.kind === "countdown" && ` — ${phase.n} · ${phase.title}`}
          {phase.kind === "error" && " — no microphone. Allow it in the address bar and press Start again."}</p>
        {phase.kind === "running" ? <button onClick={() => s.finish()}>Stop</button>
          // a session is one run; "again" re-arms the same prompt
          : phase.kind === "done" ? <button onClick={() => { setResult(null); setRun({ ...run }); }}>Run it again</button>
          : <button onClick={() => s.begin()} disabled={phase.kind === "calibrating" || phase.kind === "countdown"}>Start speaking</button>}
        {live && phase.kind === "running" && <ul>
          <li>Time left {Math.ceil(live.left)} s · speaking {String(live.speaking)} · room {live.room}/100</li>
          <li>Pace {live.wpm || "—"} wpm · fillers {live.fillers.total} ({live.fillers.hard} hard) · projection {live.proj} · pauses {live.goodPauses}</li>
          <li>{live.coach.join(" ")}</li>
          <li><i>{live.final}</i> {live.interim}</li>
        </ul>}
      </section>}
      {result && <section>
        <h2>Score {result.r.score}</h2>
        {result.retry && <p>Retry cards: {result.retry}</p>}
        <ul>{result.r.parts.map(p => <li key={p.k}>{p.label}: {p.v}</li>)}</ul>
        {result.r.audioURL && <audio controls src={result.r.audioURL} />}
      </section>}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
