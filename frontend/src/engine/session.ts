/* session.ts — One run, end to end: arm the mic, measure the room, count
   down, run the frame loop, finish with measurements. Ported from the old app's run.js
   with every DOM write replaced by a callback, so any UI can mount it.

   Nothing starts until begin(), and dispose() stops everything, so React's
   StrictMode double mount is harmless. The engine never touches storage:
   onFinish hands back a RunResult and the caller saves it (recordRun).
   The audio, recogniser and clock come in as ports, which is what lets
   session.test.ts drive a whole run without a microphone.               */

import { buzz, coachLine, countdownTitle, frameworkStep, type BuzzState, type Drill, type Run, type Session } from "../lib/drills.ts";
import { band, scoreRun, SCORING_VERSION, tooShort, type Measurements, type Part } from "../lib/scoring.ts";
import { FILLER_RE, countFillers, matchTarget, norm, projFromRms, readStats, tokens, usedWord, variety, words, type FillerCount } from "../lib/text.ts";
import { makeVAD } from "../lib/vad.ts";
import type { Listener } from "../lib/speech.ts";

export interface Probe { rms: number; level: number; ratio: number }
export interface AudioPort {
  open(): Promise<void>;                         // throws when the mic is refused
  probe(): Probe;
  startRecording(): void;
  stopRecording(): Promise<string | null>;       // an object URL, or null
  tick(): void;                                  // the filler buzzer's sound
}
export interface ClockPort {
  now(): number;                                 // ms, monotonic
  frame(cb: () => void): number;
  cancelFrame(id: number): void;
  wait(ms: number): Promise<void>;
}
export interface SpeakerPort { say(text: string): Promise<void>; cancel(): void }

export type Phase =
  | { kind: "idle" }
  | { kind: "error"; reason: "mic" }
  | { kind: "calibrating" }
  | { kind: "countdown"; n: number | string; title: string }
  | { kind: "running" }
  | { kind: "done" };

export interface Mark { t: number; type: "pause" | "filler"; word?: string }

/* What the booth shows, updated every frame. One object, mutated in place:
   read it in onTick and copy what you draw. */
export interface Live {
  elapsed: number; left: number;                 // seconds; left counts up when the run is open-ended
  level: number; speaking: boolean;
  proj: number; wpm: number; goodPauses: number;
  fillers: FillerCount; lastFillerAt: number;    // ms on the session clock; flash while recent
  hits: boolean[]; acc: number | null;           // live marking of a set passage
  final: string; interim: string; wordCount: number;
  step: number;                                  // framework step, -1 without one
  coach: [string, string];
  room: number;                                  // 0–100, measured before the run
  marks: Mark[];                                 // fillers and deliberate pauses so far
}

export interface RunResult {
  session: Session;                              // what goes into history
  short: string | null;                          // why this take is too short to score, if it is
  run: Run; drill: Drill;
  text: string; m: Measurements; parts: Part[]; score: number;
  elapsed: number; tape: number[]; tapeV: number[]; marks: Mark[]; wordTimes: number[];
  audioURL: string | null;
}

export interface SessionOpts {
  run: Run; drill: Drill;
  audio: AudioPort; listener: Listener; clock: ClockPort; speaker?: SpeakerPort;
  sens?: number; buzz?: boolean;
  onTick?: (live: Live) => void;
  onPhase?: (p: Phase) => void;
  onFinish?: (r: RunResult) => void;
}

const NO_FILLERS: FillerCount = { hard: 0, crutch: 0, total: 0, found: {} };

export function createSession(o: SessionOpts) {
  const { run, drill, audio, listener, clock } = o;
  const vad = makeVAD(o.sens || 1);
  let dur = run.dur;
  let token = 0;                                 // bumped to orphan everything in flight
  let phase: Phase["kind"] = "idle";
  let raf = 0, t0 = 0, lastFrame = 0, lastSample = 0, coachAt = 0;
  let voiced = false, silentSince = 0, speakTime = 0, rmsSum = 0, rmsN = 0;
  let goodPauses = 0, longPause = 0, lastFillers = 0;
  let tape: number[] = [], tapeV: number[] = [], marks: Mark[] = [], wordTimes: number[] = [];
  let buzzState: BuzzState = { count: 0, at: -Infinity };

  const live: Live = { elapsed: 0, left: dur, level: 0, speaking: false, proj: 0, wpm: 0, goodPauses: 0,
    fillers: NO_FILLERS, lastFillerAt: -Infinity, hits: [], acc: null, final: "", interim: "", wordCount: 0,
    step: -1, coach: ["", drill.hint], room: 0, marks: [] };

  const setPhase = (p: Phase) => { phase = p.kind; o.onPhase?.(p); };

  async function begin() {
    if (phase !== "idle" && phase !== "error") return;   // a second Space must not start a second run
    const tok = ++token, dead = () => tok !== token;
    setPhase({ kind: "calibrating" });
    try { await audio.open(); }
    catch { if (!dead()) setPhase({ kind: "error", reason: "mic" }); return; }
    if (dead()) return;

    /* Measure the room before every run: the speech gate is set relative to
       what silence sounds like here, today, on this mic. */
    vad.calib = [];
    for (let t = 0; t < 1100; t += 40) {
      vad.sample(audio.probe().rms);
      await clock.wait(40);
      if (dead()) return;
    }
    vad.commit();
    live.room = vad.roomLevel();

    if (run.speak && o.speaker) {
      // Echo: the line is read aloud first; a timeout backs up a lost onend
      setPhase({ kind: "countdown", n: "♪", title: "Listen" });
      await Promise.race([o.speaker.say(run.speak), clock.wait(9000)]);
      if (dead()) return;
      setPhase({ kind: "countdown", n: "Go", title: "Listen" });
      await clock.wait(550);
    } else {
      for (let n = drill.prep; n > 0; n--) {
        setPhase({ kind: "countdown", n, title: countdownTitle(drill.prep, n) });
        await clock.wait(1000);
        if (dead()) return;
      }
    }
    if (dead()) return;
    start();
  }

  function start() {
    t0 = clock.now(); lastFrame = t0; lastSample = 0; coachAt = 0;
    speakTime = 0; rmsSum = 0; rmsN = 0; goodPauses = 0; longPause = 0;
    tape = []; tapeV = []; marks = []; wordTimes = [];
    live.marks = marks;
    voiced = false; silentSince = t0; lastFillers = 0;
    buzzState = { count: 0, at: -Infinity };
    live.coach = ["Go.", ""];
    setPhase({ kind: "running" });
    audio.startRecording();
    if (listener.supported) {
      listener.onUpdate = onTranscript;
      listener.start();
    }
    raf = clock.frame(loop);
  }

  function loop() {
    if (phase !== "running") return;
    raf = clock.frame(loop);
    const now = clock.now(), dt = (now - lastFrame) / 1000; lastFrame = now;
    const elapsed = (now - t0) / 1000;
    live.elapsed = elapsed;

    const p = audio.probe();
    const on = vad.step(p.rms, p.ratio, now);
    live.level = p.level; live.speaking = on;

    if (now - lastSample > 50) { lastSample = now; tape.push(p.level); tapeV.push(on ? 1 : 0); }   // 20 Hz

    if (on) {
      speakTime += dt;
      rmsSum += p.rms; rmsN++;                   // projection measures you, not the room
      if (!voiced) {
        // measure the gap between real voice, not between hangover edges
        const gap = (vad.aboveSince - silentSince) / 1000;
        if (gap > 0.35 && silentSince > t0 + 500) {
          longPause = Math.max(longPause, gap);
          if (gap >= 0.4 && gap <= 2.2) { goodPauses++; marks.push({ t: elapsed, type: "pause" }); }
        }
        voiced = true;
      }
    } else if (voiced) { voiced = false; silentSince = vad.lastVoiced; }

    live.left = dur ? Math.max(0, dur - elapsed) : elapsed;
    live.proj = rmsN ? projFromRms(rmsSum / rmsN) : 0;
    live.goodPauses = goodPauses;
    live.step = run.framework && dur ? frameworkStep(run.framework, elapsed / dur) : -1;
    if (now - coachAt > 3400) {
      coachAt = now;
      live.coach = coachLine({ supported: listener.supported, text: listener.text(), elapsed, framework: !!run.framework });
    }
    o.onTick?.(live);

    if (dur && elapsed >= dur) void finish();
  }

  function onTranscript(final: string, interim: string) {
    if (phase !== "running") return;
    const all = (final + " " + interim).trim();
    const f = countFillers(all), w = words(all).length;
    /* Stamp each new word with the moment it appeared, so playback can follow
       the text. Only ever grows: Chrome revises interim text, and a shrinking
       count must not rewrite times already recorded. */
    const seen = tokens(all).length;
    while (wordTimes.length < seen) wordTimes.push(live.elapsed);
    // hold pace until there is enough speech to mean anything
    live.wpm = (w >= 8 && live.elapsed > 5) ? Math.round(w / (live.elapsed / 60)) : 0;
    live.fillers = f; live.final = final; live.interim = interim; live.wordCount = w;

    if (o.buzz) {
      const b = buzz(buzzState, f, clock.now(), { reading: !!run.target });
      buzzState = b.state;
      if (b.fire) audio.tick();
    }
    if (f.total > lastFillers) {
      live.lastFillerAt = clock.now();
      // one result can bring several fillers at once; each gets its own mark
      for (const m of [...norm(all).matchAll(FILLER_RE)].slice(lastFillers, f.total))
        marks.push({ t: live.elapsed, type: "filler", word: m[0].replace(/\s+/g, " ") });
      lastFillers = f.total;
    }
    if (run.target) {
      live.hits = matchTarget(all, run.target);
      const n = live.hits.length;
      live.acc = n ? Math.round(100 * live.hits.filter(Boolean).length / n) : 0;
    }
  }

  async function finish(): Promise<RunResult | null> {
    if (phase !== "running") return null;
    phase = "done";
    clock.cancelFrame(raf);
    listener.stop();
    const audioURL = await audio.stopRecording();
    const elapsed = live.elapsed;

    const text = listener.supported ? listener.text() : "";
    const f = countFillers(text);
    const wCount = words(text).length;
    const mins = Math.max(elapsed, 1) / 60;
    const longEnough = elapsed >= 5 && wCount >= 8;   // below this, wpm is noise

    const m: Measurements = {
      wpm: listener.supported && longEnough ? Math.round(wCount / mins) : null,
      artic: speakTime > 3 && longEnough ? Math.round(wCount / (speakTime / 60)) : null,
      f, words: wCount,
      proj: rmsN ? projFromRms(rmsSum / rmsN) : 0,
      // floored like projFromRms: a run with frames but no signal gave -Infinity dB
      snr: rmsN ? Math.round(20 * Math.log10(Math.max(rmsSum / rmsN, 1e-5) / Math.max(vad.floor, 1e-5))) : null,
      acc: null, coverage: null,
      var: listener.supported ? variety(text) : null,
      goodPauses, longPause,
      pauseScore: Math.round(band(goodPauses / Math.max(mins, .2), 5, 10, 11)),   // 5–10 deliberate pauses a minute
      usedWord: run.requireWord ? usedWord(text, run.requireWord) : null,
      quiet: elapsed > 0 ? Math.round(100 * (1 - speakTime / elapsed)) : 0,
      room: vad.roomLevel()
    };
    if (run.target && listener.supported) {
      const st = readStats(text, run.target);
      m.acc = st.acc;                 // diction over the words you reached
      m.coverage = st.coverage;       // how much of the passage you got through
    }
    if (m.usedWord === true) m.acc = 100;                          // used it in a real sentence
    if (m.usedWord === false) m.acc = Math.min(m.acc ?? 100, 40);  // the whole point of the drill

    const { score, parts } = scoreRun(m, run, drill.id);
    const at = Date.now();
    const session: Session = { at, drill: drill.id, name: drill.name, score, wpm: m.wpm, fillers: f.total,
      parts: Object.fromEntries(parts.map(p => [p.k, p.v])),
      promptId: run.promptId || null, reading: !!run.target, raw: m, v: SCORING_VERSION,
      secs: Math.round(elapsed) };
    const short = tooShort({ secs: elapsed, speakSecs: speakTime, words: wCount, transcript: listener.supported, reading: !!run.target });
    const result: RunResult = { session, short, run, drill, text, m, parts, score, elapsed,
      tape, tapeV, marks, wordTimes: wordTimes.slice(), audioURL };
    setPhase({ kind: "done" });
    o.onFinish?.(result);
    return result;
  }

  /* Leave without saving: before the run, cancel the countdown; during it,
     the partial recording is discarded rather than scored. */
  function dispose() {
    token++;
    o.speaker?.cancel();
    if (phase === "running") {
      phase = "done";
      clock.cancelFrame(raf);
      listener.stop();
      void audio.stopRecording();
    }
    phase = "idle";
  }

  return {
    begin, finish, dispose, live,
    get phase() { return phase; },
    /* Length and mic sensitivity are set before the clock starts, never after. */
    setDuration(s: number) { if (phase === "idle") { dur = s; live.left = s; } },
    setSensitivity(s: number) { if (phase === "idle") vad.sens = s; },
  };
}
export type SessionHandle = ReturnType<typeof createSession>;
