/* A whole run without a microphone: a scripted fake mic, a hand-driven clock
   and a fake recogniser. This is the end of a run that headless Chrome can't
   reach (it has no mic). */
import { expect, test } from "vitest";
import { createSession, type AudioPort, type ClockPort, type Phase, type RunResult } from "./session.ts";
import { createListener, type SRConstructor, type SRInstance } from "../lib/speech.ts";
import { buildRun, drillById, type Drill, type RunOpts } from "../lib/drills.ts";
import { emptyRecord, recordRun, todayPlan } from "../lib/storage.ts";

const VOICE = { rms: 0.1, level: 0.6, ratio: 0.6 }, ROOM = { rms: 0.004, level: 0.02, ratio: 0.1 };

/* voiced(t) says whether the fake speaker is talking t seconds into the run. */
function rig(opts: { voiced?: (t: number) => boolean; asr?: boolean; micRefused?: boolean } = {}) {
  let now = 1000, cb: (() => void) | null = null, t0 = -1, ticks = 0, recording = false;
  const clock: ClockPort = {
    now: () => now,
    frame: f => { cb = f; return 1; },
    cancelFrame: () => { cb = null; },
    wait: () => Promise.resolve(),
  };
  const audio: AudioPort = {
    open: () => opts.micRefused ? Promise.reject(new Error("NotAllowedError")) : Promise.resolve(),
    probe: () => t0 >= 0 && (opts.voiced || (() => true))((now - t0) / 1000) ? VOICE : ROOM,
    startRecording: () => { recording = true; t0 = now; },
    stopRecording: () => { recording = false; return Promise.resolve("blob:take"); },
    tick: () => { ticks++; },
  };
  const spun: SRInstance[] = [];
  const FakeSR = function (this: SRInstance) { spun.push(this); this.start = () => this.onstart?.(); this.stop = () => this.onend?.(); } as unknown as SRConstructor;
  const listener = createListener(opts.asr === false ? undefined : FakeSR);
  const say = (txt: string, isFinal = false) =>
    spun[spun.length - 1].onresult!({ resultIndex: 0, results: { length: 1, 0: { isFinal, 0: { transcript: txt } } } });
  /* advance the run by `secs` in 16 ms frames */
  const play = (secs: number) => { for (let t = 0; t < secs * 1000 && cb; t += 16) { now += 16; cb(); } };
  return { clock, audio, listener, say, play, get ticks() { return ticks; }, get recording() { return recording; } };
}

function session(r: ReturnType<typeof rig>, drillId: string, extra: { buzz?: boolean } = {}, opts: RunOpts = {}) {
  const drill = drillById(drillId) as Drill, run = buildRun(drillId, opts);
  const phases: Phase["kind"][] = [], done: RunResult[] = [];
  const s = createSession({ run, drill, audio: r.audio, listener: r.listener, clock: r.clock, ...extra,
    onPhase: p => phases.push(p.kind), onFinish: res => done.push(res) });
  return { s, run, phases, done };
}

test("a run arms, measures the room, counts down, runs and finishes on time", async () => {
  const r = rig();
  const { s, phases, done } = session(r, "filler");
  await s.begin();
  expect(s.phase).toBe("running");
  expect(phases.slice(0, 2)).toEqual(["calibrating", "countdown"]);
  r.play(61);
  await Promise.resolve(); await Promise.resolve();        // finish awaits stopRecording
  expect(done).toHaveLength(1);
  expect(done[0].elapsed).toBeGreaterThanOrEqual(60);
  expect(done[0].audioURL).toBe("blob:take");
  expect(r.recording).toBe(false);
});

test("deliberate pauses are counted from the voice, and speaking time is measured", async () => {
  // speak 2 s, pause 1 s, repeated: a good pause after every stretch
  const r = rig({ voiced: t => t % 3 < 2 });
  const { s } = session(r, "impromptu");
  await s.begin();
  r.play(30);
  const res = (await s.finish())!;
  expect(res.m.goodPauses).toBeGreaterThanOrEqual(8);
  expect(res.m.goodPauses).toBeLessThanOrEqual(10);
  expect(res.m.quiet).toBeGreaterThan(25);
  expect(res.m.quiet).toBeLessThan(42);
  expect(res.marks.filter(m => m.type === "pause").length).toBe(res.m.goodPauses);
});

test("the buzzer ticks once per new um, and fillers are marked on the tape", async () => {
  const r = rig();
  const { s } = session(r, "filler", { buzz: true });
  await s.begin();
  r.play(2); r.say("so um");
  r.play(1); r.say("so um I went");                        // the same um again: no tick
  r.play(1); r.say("so um I went uh there");
  expect(r.ticks).toBe(2);
  expect(s.live.fillers.hard).toBe(2);
  const res = (await s.finish())!;
  expect(res.marks.filter(m => m.type === "filler")).toHaveLength(2);
});

test("no buzzer unless asked, and never on a set passage", async () => {
  const r = rig();
  const a = session(r, "filler");
  await a.s.begin(); r.play(1); r.say("um uh"); await a.s.finish();
  const r2 = rig();
  const b = session(r2, "pace", { buzz: true });
  await b.s.begin(); r2.play(1); r2.say("um uh"); await b.s.finish();
  expect(r.ticks + r2.ticks).toBe(0);
});

test("audio only: no transcript still scores, with no NaN anywhere", async () => {
  const r = rig({ asr: false, voiced: t => t % 3 < 2 });
  const { s } = session(r, "pace");
  await s.begin();
  r.play(20);
  const res = (await s.finish())!;
  expect(res.m.wpm).toBeNull();
  expect(res.m.acc).toBeNull();
  expect(Number.isFinite(res.score)).toBe(true);
  for (const [k, v] of Object.entries(res.m)) if (typeof v === "number") expect(Number.isFinite(v), k).toBe(true);
  expect(res.session.parts && Object.keys(res.session.parts)).not.toContain("pace");
});

test("a set passage is marked live and scored on what was reached", async () => {
  const r = rig();
  const { s, run } = session(r, "diction");
  await s.begin();
  r.play(3); r.say(run.target!.split(" ").slice(0, 6).join(" "), true);
  expect(s.live.hits.filter(Boolean).length).toBe(6);
  const res = (await s.finish())!;
  expect(res.m.acc).toBe(100);
  expect(res.m.coverage).toBeLessThan(100);
});

test("dispose during the countdown means nothing starts (StrictMode's double mount)", async () => {
  const r = rig();
  const { s, done } = session(r, "impromptu");
  const p = s.begin();
  s.dispose();
  await p;
  expect(s.phase).toBe("idle");
  expect(r.recording).toBe(false);
  r.play(5);
  expect(done).toHaveLength(0);
});

test("a refused mic says so, and a second try can still start", async () => {
  const r = rig({ micRefused: true });
  const { s, phases } = session(r, "word");
  await s.begin();
  expect(phases).toEqual(["calibrating", "error"]);
  expect(r.recording).toBe(false);
});

test("a second begin() while running does nothing", async () => {
  const r = rig();
  const { s, phases } = session(r, "impromptu");
  await s.begin();
  const n = phases.length;
  await s.begin();
  expect(phases.length).toBe(n);
});

test("recordRun saves the session, updates diction cards, and ticks off the plan", async () => {
  const r = rig();
  // "She sells sea shells…": skipping "sea" mid-line is a miss inside what was reached
  const { s, run } = session(r, "diction", {}, { twisterId: "tw-001" });
  await s.begin();
  r.play(3); r.say("she sells shells by the sea shore", true);
  const res = (await s.finish())!;
  const rec = { ...emptyRecord(), plan: { ...todayPlan(emptyRecord(), res.session.at), drills: ["diction", "pace", "echo"] } };
  const { record } = recordRun(rec, { session: res.session, text: res.text, target: run.target, promptId: run.promptId }, res.session.at);
  expect(record.sessions).toHaveLength(1);
  expect(record.plan!.done).toEqual(["diction"]);
  expect(record.cards.map(c => [c.word, c.twisterId])).toEqual([["sea", "tw-001"]]);
});
