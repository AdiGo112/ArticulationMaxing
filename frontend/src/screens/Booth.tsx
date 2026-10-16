/* Booth — one live run on the session engine. DESIGN.md → Screens; the
   canvas's Booth, "Before a run" and "When something is wrong" boards. */

import { useEffect, useRef, useState } from "react";
import { buildRun, buzzOn, drillById, packById, packRunOpts, type Drill, type Run } from "../lib/drills.ts";
import { recordRun } from "../lib/storage.ts";
import { tokens } from "../lib/text.ts";
import { bubble } from "../lib/ascii.ts";
import { asrProblem } from "../lib/speech.ts";
import { listener, useSession } from "../engine/useSession.ts";
import type { Live } from "../engine/session.ts";
import { Bar, Marked, Reel, Timeline, Wave } from "../ui/parts.tsx";
import { Shell } from "../app/Shell.tsx";
import { go, useApp } from "../app/state.tsx";
import type { ReelState } from "../lib/reel.ts";

const N = 90;                                       // waveform buckets across the run
const fmt = (s: number) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
const LENGTHS = [[30, "30 s"], [60, "1 min"], [90, "90 s"], [120, "2 min"]] as const;
/* The live meters each drill shows: what scoreRun() weighs for it (Projection is always on). */
const METERS: Record<string, string[]> = {
  impromptu: ["pace", "fillers", "pauses"], filler: ["fillers", "pauses"], word: ["pace", "fillers", "pauses"],
  pace: ["pace", "pauses", "acc"], diction: ["acc"], echo: ["acc"],
};
const SENS = [["strict", 0.7], ["normal", 1], ["quiet voice", 1.5]] as const;

export function Booth({ id }: { id: string }) {
  const drill = drillById(id);
  if (!drill) return <Shell page="drills"><p>No drill called “{id}”. <a href="#/drills">See all drills</a></p></Shell>;
  return <BoothFor key={id} drill={drill} />;
}

function BoothFor({ drill }: { drill: Drill }) {
  const app = useApp();
  const { record, update } = app;
  const fresh = () => buildRun(drill.id, packRunOpts(packById(record.pack), drill.id));
  const [run, setRun] = useState<Run>(() => { const a = app.again; app.setAgain(null); return a && a.drill === drill.id ? a : fresh(); });
  const [dur, setDur] = useState(run.dur);
  const sens = record.sens ?? 1;                      // remembered; also set on Your data
  const setSens = (v: number) => update(r => ({ ...r, sens: v }));
  const buzz = buzzOn(record.buzz, drill.id);
  const [short, setShort] = useState<string | null>(null);
  const levels = useRef<number[]>(new Array(N).fill(0));
  const liveRef = useRef<Live | null>(null);
  const [, redraw] = useState(0);
  const lastDraw = useRef(0);

  const s = useSession(run, drill, {
    buzz, sens,
    onTick: live => {
      liveRef.current = live;
      const total = dur || run.dur || 60, b = Math.min(N - 1, Math.floor(live.elapsed / total * N));
      levels.current[b] = Math.max(levels.current[b], live.level);
      const now = performance.now();
      if (now - lastDraw.current > 100) { lastDraw.current = now; redraw(x => x + 1); }
    },
    onFinish: r => {
      // too short to score: nothing saved, straight back to try again
      if (r.short) { s.cancel(); setShort(r.short); return; }
      const saved = recordRun(record, { session: r.session, text: r.text, target: r.run.target, promptId: r.run.promptId });
      update(() => saved.record);
      app.setLast({ result: r, retry: saved.retry });
      // once there is history worth keeping, ask the browser not to evict it
      if (saved.record.sessions.length >= 5) navigator.storage?.persist?.().catch(() => {});
      go("report");
    },
  });
  const phase = s.phase.kind, running = phase === "running", arming = phase === "calibrating" || phase === "countdown";
  const live = running ? liveRef.current : null;

  useEffect(() => { s.setDuration(dur); }, [dur, s]);
  useEffect(() => { s.setSensitivity(sens); }, [sens, s]);
  useEffect(() => { if (phase === "calibrating") levels.current = new Array(N).fill(0); }, [phase]);

  // Space starts and stops; Esc leaves without saving
  const start = () => { void s.begin(); };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches?.("input, textarea, select")) return;
      if (e.code === "Space") { e.preventDefault(); if (running) void s.finish(); else if (phase === "idle" || phase === "error") start(); }
      if (e.key === "Escape" && phase !== "idle") s.cancel();
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  });

  const total = dur || run.dur || 60;
  const reel: ReelState = !running ? "idle"
    : live && live.fillers.hard > 0 && performance.now() - live.lastFillerAt < 900 ? "um"
    : live && !live.speaking && live.elapsed > 2 ? "pause" : "record";
  const noisy = (live?.room ?? 0) >= 34;

  // the recogniser's own failures: shown as they happen, kept after the run so the report isn't a mystery
  const [asrErr, setAsrErr] = useState<string | null>(null);
  useEffect(() => {
    listener.onError = code => setAsrErr(code);
    return () => { listener.onError = null; };
  }, []);
  useEffect(() => { if (running) { setAsrErr(null); setShort(null); } }, [running]);
  // a network error retries twice before it is fatal; say so on the first one if nothing has come through yet
  const asrCode = asrErr || (running && listener.err && !listener.gotAny ? listener.err : null);
  const isBrave = !!(navigator as { brave?: unknown }).brave;

  const top = (
    <>
      <span className="chip">transcript <b style={{ color: listener.supported && !asrCode ? "var(--cyan)" : "var(--amber)" }}>{!listener.supported ? "off" : asrCode ? "failing" : running ? (listener.gotAny ? "hearing you" : listener.live ? "listening" : "starting") : "on"}</b></span>
      {running && <span className="chip" style={{ borderColor: "var(--alert)", color: "var(--alert)", fontWeight: 700 }}>● REC {fmt(live?.elapsed ?? 0)}{total ? " / " + fmt(total) : ""}</span>}
    </>
  );

  const rail = (
    <>
      <section className="card" aria-label="Meters">
        <h2 className="rule">METERS</h2>
        {/* only what this drill scores; "—" until the take starts */}
        {METERS[drill.id].includes("pace") && <Meter label="Pace" value={live?.wpm ? String(live.wpm) : "—"} unit="wpm" pct={(live?.wpm || 0) / 220 * 100} band={[63, 75]} color="var(--cyan)"
          note={listener.supported ? "the shaded band is 138–165" : "needs a transcript"} />}
        {METERS[drill.id].includes("fillers") && <Meter label="Fillers" value={live ? String(live.fillers.total) : "—"} unit="this take" pct={Math.min(100, (live?.fillers.total ?? 0) * 9)}
          color={live?.fillers.total ? "var(--alert)" : "var(--ink)"}
          note={live && live.fillers.total ? Object.entries(live.fillers.found).map(([w, n]) => `${n} ${w}`).join(" · ") : "every um and like counts"} />}
        {METERS[drill.id].includes("acc") && <Meter label="Accuracy" value={live?.acc != null ? live.acc + "%" : "—"} unit="so far" pct={live?.acc ?? 0} color="var(--amber)" note="words that came through" />}
        {METERS[drill.id].includes("pauses") && <Meter label="Pauses" value={live ? String(live.goodPauses) : "—"} unit="so far" pct={Math.min(100, (live?.goodPauses ?? 0) * 12)} color="var(--amber)" note="aim for 5–10 a minute" />}
        <Meter label="Projection" value={live ? String(live.proj) : "—"} unit="/ 100" pct={live?.proj ?? 0} band={[55, 78]} color="var(--cyan)" note="carrying, not clipping" />
      </section>
      <section aria-label="Coach" style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
        <pre aria-hidden="true" style={{ fontSize: 13, lineHeight: 1.35 }}>{bubble(running && live ? live.coach.join(" ") : drill.hint, 30)}</pre>
        <p className="sr" aria-live="polite">{running && live ? live.coach.join(" ") : drill.hint}</p>
        {/* one Reel per screen: the countdown overlay brings its own */}
        {!arming && <div style={{ marginLeft: 96 }}><Reel state={reel} size={168} /></div>}
      </section>
    </>
  );

  return (
    <>
    <Shell page="drills" sub={run.custom ? "texts" : "drill/" + drill.id} live={running} top={top} rail={rail} inert={arming}>
      {phase === "error" && (
        <section className="card" style={{ borderColor: "var(--alert)" }} role="alert">
          <span className="label alert">mic refused</span>
          <h2 className="h2">Reel can't hear you.</h2>
          <ol style={{ margin: 0, paddingLeft: 22, lineHeight: 1.9 }}>
            <li>Click the padlock or tune icon in the address bar.</li>
            <li>Set <b>Microphone</b> to <b>Allow</b>.</li>
            <li>Press <b>Try again</b>.</li>
          </ol>
          <button type="button" className="btn primary" style={{ alignSelf: "flex-start" }} onClick={start}>TRY AGAIN</button>
        </section>
      )}
      {!listener.supported && (
        <section className="card" style={{ borderColor: "var(--amber)" }}>
          <span className="label amber">no transcript in this browser · the run still scores</span>
          <p className="body" style={{ margin: 0 }}>{asrProblem(null).d}</p>
        </section>
      )}
      {short && (
        <section className="card" style={{ borderColor: "var(--amber)" }} role="alert">
          <span className="label amber">not scored · nothing saved</span>
          <h2 className="h2">Too short to score — try again.</h2>
          <p className="body" style={{ margin: 0 }}>{short}</p>
        </section>
      )}
      {asrCode && listener.supported && (
        <section className="card" style={{ borderColor: "var(--amber)" }} role="alert">
          <span className="label amber">no transcript · the run still scores what audio can measure</span>
          <h2 className="h2">{asrProblem(asrCode, isBrave).t}</h2>
          <p className="body" style={{ margin: 0, lineHeight: 1.6 }}>{asrProblem(asrCode, isBrave).d}</p>
          <span className="faint" style={{ fontSize: 12 }}>recogniser said: {asrCode}</span>
        </section>
      )}
      {noisy && running && (
        <section className="card" style={{ borderColor: "var(--amber)" }} role="status">
          <span className="label amber">your room is loud · {live?.room} / 100</span>
          <p className="body" style={{ margin: 0 }}>Quiet words may not register. A quieter room moves your numbers more than any drill — or set the mic to <b>quiet voice</b> for the next run.</p>
        </section>
      )}

      <section aria-label="Prompt" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span className="label amber">// {drill.name} · {drill.hint}</span>
        <Stage run={run} live={live} />
      </section>

      {!running && (
        <section aria-label="Before you start" style={{ display: "flex", flexWrap: "wrap", gap: "10px 20px", alignItems: "center" }}>
          {!run.target && (
            <div role="group" aria-label="Length" style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span className="label" style={{ fontSize: 11 }}>length</span>
              {LENGTHS.map(([v, l]) => <button key={v} type="button" className="pill" aria-pressed={dur === v} onClick={() => setDur(v)}>{l}</button>)}
            </div>
          )}
          <div role="group" aria-label="Mic" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span className="label" style={{ fontSize: 11 }}>mic</span>
            {SENS.map(([l, v]) => <button key={v} type="button" className="pill" aria-pressed={sens === v} onClick={() => setSens(v)}>{l}</button>)}
          </div>
          {!run.target && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span className="label" style={{ fontSize: 11 }}>tick on “um”</span>
              <button type="button" className="pill" aria-pressed={buzz} disabled={!listener.supported}
                title={listener.supported ? undefined : "Needs live transcription — Chrome or Edge"}
                onClick={() => update(r => ({ ...r, buzz: { ...r.buzz, [drill.id]: !buzz } }))}>{buzz ? "on" : "off"}</button>
            </div>
          )}
        </section>
      )}

      <section aria-label="Your voice" className="card panel" style={{ gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span className="label" style={{ fontSize: 11 }}>voice · {running ? "live" : "waiting"}</span>
          <span style={{ fontSize: 13 }}><b style={{ fontSize: 22 }}>{fmt(running && live ? live.left : total)}</b> {running ? "left" : "long"}</span>
        </div>
        <Wave levels={levels.current} at={running && live ? Math.min(1, live.elapsed / total) : 0} />
        <Timeline marks={live?.marks ?? []} dur={total} />
      </section>

      <section aria-label="What you're saying" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 className="rule">── WHAT YOU'RE SAYING ──────────────</h2>
        <p aria-live="polite" style={{ margin: 0, fontSize: 19, lineHeight: 1.7, minHeight: 64 }}>
          {live && (live.final || live.interim)
            ? <><Marked text={live.final} /> <span className="interim">{live.interim}</span></>
            : <span className="faint">{!listener.supported ? "No live words in this browser — the recording and meters still work."
                : running ? "Listening… your words appear here as you speak." : "Your words will appear here."}</span>}
        </p>
      </section>

      <div className="actionbar">
        {running
          ? <button type="button" className="btn stop" onClick={() => void s.finish()}>■ STOP</button>
          : <button type="button" className="btn primary" onClick={start}>▶ START SPEAKING</button>}
        {!running && <button type="button" className="btn ghost" onClick={() => setRun(fresh())}>new prompt</button>}
        <span className="muted" style={{ fontSize: 12 }}><kbd>space</kbd> {running ? "stop" : "start"}{running && <> · <kbd>esc</kbd> leave without saving</>}</span>
      </div>

    </Shell>
    {arming && <Overlay phase={s.phase} run={run} drill={drill} onCancel={s.cancel} />}
    </>
  );
}

function Meter({ label, value, unit, pct, color, note, band }: { label: string; value: string; unit: string; pct: number; color: string; note: string; band?: [number, number] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 13 }}>
        <span>{label}</span><span><b className="big" style={{ fontSize: 26, color }}>{value}</b> <span className="muted">{unit}</span></span>
      </div>
      <Bar pct={pct} color={color} band={band} label={label} />
      <span className="muted" style={{ fontSize: 12 }}>{note}</span>
    </div>
  );
}

/* What the drill puts in front of you: a prompt, a passage marked live, a word. */
function Stage({ run, live }: { run: Run; live: Live | null }) {
  if (run.requireWord) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <h1 className="h1">{run.requireWord}</h1>
      <p className="body" style={{ margin: 0, fontSize: 17 }}>{run.def}</p>
      <p className="faint" style={{ margin: 0 }}>e.g. “{run.example}”</p>
    </div>
  );
  if (run.target) {
    // the display text keeps Pace & Pause's "|" breath marks; they consume no match index
    let i = 0;
    return (
      <p style={{ margin: 0, fontSize: 21, lineHeight: 1.8, maxWidth: 900 }}>
        {tokens(run.display || run.target).map((w, k) => {
          if (w === "|") return <b key={k} role="img" style={{ color: "var(--amber)" }} aria-label="pause"> ‖ </b>;
          const hit = live?.hits[i++];
          return <span key={k} style={{ color: hit ? "var(--cyan)" : undefined }}>{w} </span>;
        })}
      </p>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h1 className="h1" style={{ fontSize: 38, fontWeight: 700, maxWidth: 880, lineHeight: 1.12 }}>{run.prompt || run.cd}</h1>
      {run.framework && (
        <ol aria-label={run.framework.name + " framework"} style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {run.framework.steps.map((st, k) => {
            const now = live?.step === k, done = live != null && live.step > k;
            return (
              <li key={k} aria-current={now ? "step" : undefined} style={{ flex: `${st.w} 1 120px`, border: "1px solid " + (now ? "var(--amber)" : "var(--line)"),
                background: now ? "#141210" : "transparent", borderRadius: 12, padding: "10px 12px", opacity: done ? 0.55 : 1 }}>
                <b style={{ color: now ? "var(--amber)" : undefined }}>{st.t}</b>
                <div className="muted" style={{ fontSize: 12 }}>{st.h}</div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/* Room check, then the countdown. Full-screen; Esc cancels. */
function Overlay({ phase, run, drill, onCancel }: { phase: { kind: string; n?: number | string; title?: string }; run: Run; drill: Drill; onCancel: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { cancelRef.current?.focus(); }, [phase.kind]);
  const counting = phase.kind === "countdown";
  const n = typeof phase.n === "number" ? phase.n : null;
  const ring = 628.3, done = n != null && drill.prep ? 1 - n / drill.prep : 0;
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={counting ? "Get ready" : "Measuring your room"}>
      {!counting ? (
        <>
          <span className="label cyan">step 1 · about a second</span>
          <Reel state="listen" size={220} />
          <h2 className="h1" style={{ fontSize: 36 }}>Listening to your room</h2>
          <p className="body" style={{ margin: 0, maxWidth: 420 }}>Stay quiet for a second. This is how it learns to tell you apart from the background.</p>
        </>
      ) : (
        <>
          <span className="label amber">step 2 · {drill.name}{drill.prep > 6 ? ` · ${drill.prep} s to think` : ""}</span>
          <div style={{ position: "relative", width: 220, height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="220" height="220" viewBox="0 0 220 220" aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
              <circle cx="110" cy="110" r="100" fill="none" stroke="var(--track)" strokeWidth="10" />
              <circle cx="110" cy="110" r="100" fill="none" stroke="var(--amber)" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={ring} strokeDashoffset={ring * (1 - done)} transform="rotate(-90 110 110)" />
            </svg>
            <span aria-live="assertive" className="big" style={{ fontSize: 128, color: "var(--amber)" }}>{phase.n}</span>
          </div>
          <h2 className="h1" style={{ fontSize: 34 }}>{phase.title}</h2>
          <p style={{ margin: 0, maxWidth: 520, fontSize: 16, lineHeight: 1.6 }}>{run.cd}</p>
          <Reel state={run.speak ? "listen" : "think"} size={120} />
        </>
      )}
      <button ref={cancelRef} type="button" className="btn ghost" onClick={onCancel}><kbd>esc</kbd> cancel</button>
    </div>
  );
}
