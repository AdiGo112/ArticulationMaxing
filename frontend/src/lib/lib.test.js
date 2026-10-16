/* Vitest port of test.js for the TypeScript logic in src/lib. Run: npm test
   The cases are test.js's, minus the label page (still a dev page of the old
   app) and stageHtml (React renders runs). Keep the two in step until the old
   app is retired.
   ponytail: plain JS with node:assert, so the cases port unchanged; typing the
   fixtures would mean a cast on nearly every partial session. */
import assert from "node:assert";
import fs from "node:fs";
import { test } from "vitest";
import * as content from "./content.ts";
import * as text from "./text.ts";
import * as scoring from "./scoring.ts";
import * as drills from "./drills.ts";
import * as storage from "./storage.ts";
import * as vad from "./vad.ts";
import * as speech from "./speech.ts";

/* Stand-in for Chrome's recogniser, so the restart and de-duplication logic
   can be driven by hand. Records every instance the listener spins up. */
const spun = [];
function FakeSR(){ spun.push(this); }
FakeSR.prototype.start = function(){ this.started = true; this.onstart && this.onstart(); };
FakeSR.prototype.stop  = function(){ this.onend && this.onend(); };
const res = (txt, isFinal) => ({ 0:{transcript:txt}, isFinal });
const mem = {};

const X = { ...content, ...text, ...scoring, ...drills, ...storage, ...vad, ...speech,
  listener: speech.createListener(FakeSR) };


test("hard fillers are caught, crutch words counted separately", () => {
  const f = X.countFillers("um so I was like basically going to uh say something you know");
  assert.strictEqual(f.hard, 2, "expected um + uh");
  assert.strictEqual(f.crutch, 3, "expected like + basically + you know: " + JSON.stringify(f.found));
});

test("clean speech scores zero fillers", () => {
  const f = X.countFillers("The premise is wrong, so the conclusion cannot hold.");
  assert.strictEqual(f.hard, 0);
});

test("substring words are not false positives", () => {
  // "alike" contains "like", "thumb" contains "um" — neither is a filler
  const f = X.countFillers("They look alike and my thumb hurts and the errand is done");
  assert.strictEqual(f.total, 0, "matched inside a word: " + JSON.stringify(f.found));
});

test("accuracy is 100 on a perfect read and degrades on omission", () => {
  const target = "she sells sea shells by the sea shore";
  assert.strictEqual(X.accuracy(target, target), 100);
  assert.strictEqual(X.accuracy("she sells sea shells", target), 50);
  assert.ok(X.accuracy("completely different words entirely", target) < 40);
});

test("accuracy tolerates inserted filler words", () => {
  const target = "I would rather be slow and right";
  assert.ok(X.accuracy("um I would rather uh be slow and right", target) === 100);
});

test("variety needs enough content words, then measures repetition", () => {
  assert.strictEqual(X.variety("short thing here"), null);
  const repeated = ("project project project deadline deadline meeting ").repeat(3);
  const varied = "articulation cadence diction rhythm emphasis clarity pacing structure phrasing tempo timbre resonance";
  assert.ok(X.variety(repeated) < 40, "repetitive text should score low");
  assert.strictEqual(X.variety(varied), 100);
});

test("stem matching accepts inflected forms of the target word", () => {
  assert.ok(X.usedWord("I finally reconciled the two accounts", "reconcile"));
  assert.ok(X.usedWord("that is a nuanced point", "nuance"));
  assert.ok(!X.usedWord("I have no idea what that means", "reconcile"));
});

test("band() peaks inside the range and falls off outside", () => {
  assert.strictEqual(X.band(150, 125, 175, 1.1), 100);
  assert.ok(X.band(200, 125, 175, 1.1) < 100);
  assert.ok(X.band(60, 125, 175, 1.1) < X.band(110, 125, 175, 1.1));
});

test("a clean run outscores a filler-heavy one on the same drill", () => {
  const base = { proj:70, goodPauses:5, longPause:1.2, pauseScore:90, var:70, acc:null, usedWord:null };
  const good = X.scoreRun({...base, wpm:150, f:{hard:0,crutch:1,total:1,found:{}}}, {}, "filler");
  const bad  = X.scoreRun({...base, wpm:150, f:{hard:6,crutch:9,total:15,found:{}}}, {}, "filler");
  assert.ok(good.score > bad.score + 25, `${good.score} vs ${bad.score}`);
  assert.ok(good.score <= 100 && bad.score >= 0);
});

test("score stays in 0–100 at both extremes", () => {
  const worst = X.scoreRun({wpm:400, f:{hard:40,crutch:40,total:80,found:{}}, proj:2,
    goodPauses:0, longPause:20, pauseScore:0, var:5, acc:0, usedWord:false}, {}, "impromptu");
  const best = X.scoreRun({wpm:150, f:{hard:0,crutch:0,total:0,found:{}}, proj:70,
    goodPauses:6, longPause:1, pauseScore:100, var:80, acc:100, usedWord:true}, {}, "impromptu");
  assert.ok(worst.score >= 0 && worst.score <= 100, "worst=" + worst.score);
  assert.ok(best.score >= 90 && best.score <= 100, "best=" + best.score);
});

test("missing transcription still produces a score from audio alone", () => {
  const s = X.scoreRun({wpm:null, f:{hard:0,crutch:0,total:0,found:{}}, proj:65,
    goodPauses:4, longPause:1.5, pauseScore:85, var:null, acc:null, usedWord:null}, {}, "impromptu");
  assert.ok(s.score > 0 && Number.isFinite(s.score), "got " + s.score);
  assert.ok(!s.parts.some(p => p.k === "pace"), "pace should be omitted, not zeroed");
});

test("streak counts consecutive days and survives today being unfinished", () => {
  const day = n => Date.now() - n*86400000;
  assert.strictEqual(X.streak([]), 0);
  assert.strictEqual(X.streak([{at:day(0)}]), 1);
  assert.strictEqual(X.streak([{at:day(0)},{at:day(1)},{at:day(2)}]), 3);
  assert.strictEqual(X.streak([{at:day(1)},{at:day(2)}]), 2, "yesterday+ still counts today");
  assert.strictEqual(X.streak([{at:day(3)},{at:day(4)}]), 0, "a gap breaks it");
});

test("every drill builds a runnable stage", () => {
  X.DRILLS.forEach(d => {
    for (let i = 0; i < 40; i++) {           // buildRun picks at random — hit every branch
      const r = X.buildRun(d.id);
      assert.ok(r.dur > 0 && r.dur < 400, d.id + " bad duration " + r.dur);
      if (r.target) assert.ok(X.accuracy(r.target, r.target) === 100, d.id + " target not self-consistent");
    }
  });
});

test("coaching notes always return something actionable", () => {
  const m = { wpm:150, f:{hard:0,crutch:0,total:0,found:{}}, proj:70, acc:null, var:null,
              goodPauses:4, longPause:1, usedWord:null };
  assert.ok(X.coachNotes(m, {}, "impromptu", 80).length >= 1);
  const rough = { wpm:210, f:{hard:7,crutch:8,total:15,found:{like:8}}, proj:30, acc:50, var:35,
                  goodPauses:0, longPause:6, usedWord:false };
  const notes = X.coachNotes(rough, {requireWord:"nuance"}, "impromptu", 30);
  assert.ok(notes.length === 4, "should cap at 4 notes, got " + notes.length);
  notes.forEach(([h, b]) => assert.ok(h && b, "note missing a half"));
});

test("verdict covers the whole 0–100 range", () => {
  for (let s = 0; s <= 100; s += 5) {
    const [title, sub] = X.verdict(s);
    assert.ok(title && sub, "no verdict at " + s);
  }
});

/* ── voice activity detection ─────────────────────────────────────────
   The bug this replaced: a fixed `level > 0.075` gate counted room tone as
   speech, so in a noisy room the app saw one unbroken utterance.          */

const SPEECH = 0.55, RUMBLE = 0.14;   // representative speech-band ratios

test("a noisy room is not speech, even when it is louder than the old fixed gate", () => {
  const noisyFloor = 0.09;            // ambient above the old 0.075 threshold
  // steady room tone sitting at its own floor must not register
  assert.ok(!X.isSpeechFrame(0.095, RUMBLE, noisyFloor, 1), "room tone counted as speech");
  assert.ok(!X.isSpeechFrame(0.12, RUMBLE, noisyFloor, 1), "louder room tone counted as speech");
});

test("speech in that same noisy room still registers", () => {
  const noisyFloor = 0.09;
  assert.ok(X.isSpeechFrame(0.40, SPEECH, noisyFloor, 1), "real speech missed in a noisy room");
});

test("quiet speech in a quiet room registers", () => {
  assert.ok(X.isSpeechFrame(0.05, SPEECH, 0.004, 1), "quiet speech missed in a quiet room");
});

test("loud low-frequency rumble is rejected on spectral shape alone", () => {
  // a door slam or desk knock: plenty of energy, none of it in the speech band
  assert.ok(!X.isSpeechFrame(0.6, 0.10, 0.01, 1), "rumble passed the speech-band gate");
});

test("sensitivity moves the gate monotonically", () => {
  const rms = 0.030, floor = 0.010;
  assert.ok(!X.isSpeechFrame(rms, SPEECH, floor, 0.7), "strict should reject this frame");
  assert.ok(X.isSpeechFrame(rms, SPEECH, floor, 1.5), "quiet-voice should accept this frame");
});

test("calibration takes the 75th percentile, so one cough cannot poison the floor", () => {
  const v = X.makeVAD(1);
  for (let i = 0; i < 40; i++) v.sample(0.010);
  v.sample(0.9);                       // someone coughs during calibration
  assert.ok(v.commit(), "commit refused a full calibration buffer");
  assert.ok(v.floor < 0.02, "one spike moved the floor to " + v.floor);
});

test("calibration is refused when too few samples were collected", () => {
  const v = X.makeVAD(1);
  v.sample(0.01); v.sample(0.01);
  assert.strictEqual(v.commit(), false);
  assert.strictEqual(v.calibrated, false);
});

test("hysteresis: speech must persist to engage, and survives a brief dip", () => {
  const v = X.makeVAD(1); v.floor = 0.005;
  assert.ok(!v.step(0.4, SPEECH, 1000), "engaged instantly — no onset debounce");
  assert.ok(v.step(0.4, SPEECH, 1000 + v.ON_MS), "did not engage after the onset window");
  // a stop consonant: silent frame partway through a word must not end the segment
  assert.ok(v.step(0.001, 0.1, 1000 + v.ON_MS + 100), "a 100ms gap chopped the word");
  // a real pause does end it
  assert.ok(!v.step(0.001, 0.1, 1000 + v.ON_MS + v.HANG_MS + 50), "segment never ended");
});

test("the adaptive floor rises to meet a room that gets noisier", () => {
  const v = X.makeVAD(1); v.floor = 0.005;
  const before = v.floor;
  for (let i = 0; i < 4000; i++) v.step(0.05, RUMBLE, 1000 + i * 16);
  assert.ok(v.floor > before, "floor never adapted upward");
  assert.ok(!v.speaking, "sustained room tone ended up classified as speech");
});

/* ── follow-along transcript ──────────────────────────────────────── */

test("display tokens stay 1:1 with the recorded word timings", () => {
  // the timing array is built from tokens(), so the spans rendered from the
  // same function must line up index for index — otherwise the highlight drifts
  const text = "I don't know — the deadline was, um, arbitrary. 3.5 weeks?";
  const tk = X.tokens(text);
  assert.strictEqual(tk.length, 11, tk.join("|"));   // the em dash is its own token
  assert.strictEqual(tk[1], "don't", "punctuation and apostrophes must survive intact");
  assert.deepStrictEqual(X.tokens(""), []);
  assert.deepStrictEqual(X.tokens("   "), []);
});

test("wordAt picks the last word spoken at or before the playhead", () => {
  const times = [0.5, 1.0, 2.0, 5.0];
  const L = X.READ_LAG;
  assert.strictEqual(X.wordAt(times, 0), -1, "nothing is spoken yet at t=0");
  assert.strictEqual(X.wordAt(times, 0.5 - L), 0, "first word should light as it is reached");
  assert.strictEqual(X.wordAt(times, 2.0 - L), 2);
  assert.strictEqual(X.wordAt(times, 4.9 - L), 2, "must not jump ahead of the next stamp");
  assert.strictEqual(X.wordAt(times, 5.0 - L), 3);
  assert.strictEqual(X.wordAt(times, 99), 3, "past the end stays on the last word");
});

test("wordAt returns -1 before anything has been said", () => {
  assert.strictEqual(X.wordAt([9, 10], 0), -1);
  assert.strictEqual(X.wordAt([], 3), -1);
});

test("wordAt never goes backwards as playback advances", () => {
  const times = [0.2, 0.9, 0.9, 1.4, 3.0, 3.0, 7.7];   // repeats are normal — words arrive in bursts
  let prev = -2;
  for (let at = 0; at < 9; at += 0.05) {
    const i = X.wordAt(times, at);
    assert.ok(i >= prev, `index went backwards at ${at.toFixed(2)}s`);
    prev = i;
  }
  assert.strictEqual(prev, times.length - 1);
});

/* ── reading back the set passage ─────────────────────────────────── */

test("a perfect read marks every target word", () => {
  const target = "she sells sea shells by the sea shore";
  assert.deepStrictEqual(X.matchTarget(target, target), new Array(8).fill(true));
});

test("a swallowed word is the only one marked missed", () => {
  const target = "red lorry yellow lorry";
  assert.deepStrictEqual(X.matchTarget("red yellow lorry", target),
    [true, false, true, true], "the miss must not cascade into the rest of the line");
});

test("inserted filler words do not knock the passage out of alignment", () => {
  const target = "truly rural truly rural";
  assert.deepStrictEqual(X.matchTarget("truly um rural truly uh rural", target),
    [true, true, true, true]);
});

test("saying nothing marks the whole passage missed", () => {
  const target = "a proper copper coffee pot";
  assert.deepStrictEqual(X.matchTarget("", target), new Array(5).fill(false));
  assert.deepStrictEqual(X.matchTarget("completely unrelated words", target),
    new Array(5).fill(false));
});

test("match count and reported accuracy agree", () => {
  const target = "the purpose of speech is not to prove that you know something";
  const said = "the purpose of speech is to prove you know something";
  const hit = X.matchTarget(said, target);
  const pct = Math.round(100 * hit.filter(Boolean).length / hit.length);
  // both derive from the same spoken text, so the marking cannot contradict the score
  assert.ok(Math.abs(pct - X.accuracy(said, target)) <= 10, `${pct} vs ${X.accuracy(said, target)}`);
});

test("breath marks are not target words, so they cannot shift the marking", () => {
  // this is the alignment the report depends on: display tokens minus the "|"
  // markers must equal the target tokens, one for one
  const display = "Say the thing, | then stop talking, | and let the silence do it.";
  const target = display.replace(/\|/g, " ");
  const shown = X.tokens(display).filter(w => w !== "|");
  assert.deepStrictEqual(shown, X.tokens(target),
    "display and target tokenise differently — the hit marking would drift");
  assert.strictEqual(X.matchTarget(target, target).length, shown.length);
});

test("crutch words inside a set passage are not held against the reader", () => {
  // several READINGS contain "you know", "just", "actually" — reading them aloud
  // is obedience, not a verbal tic, so only hard stumbles should score
  const m = { wpm:150, f:{hard:0, crutch:6, total:6, found:{}}, proj:70,
              goodPauses:5, longPause:1.2, pauseScore:90, var:null, acc:90, usedWord:null };
  const reading = X.scoreRun(m, {target:"the purpose of speech is that you know something"}, "pace");
  const freeform = X.scoreRun(m, {}, "impromptu");
  const rf = reading.parts.find(p => p.k === "filler").v;
  const ff = freeform.parts.find(p => p.k === "filler").v;
  assert.strictEqual(rf, 100, "reader was penalised for the author's words");
  assert.ok(ff < rf, "freeform speech should still be judged on crutch words");
});

test("a stumble while reading still counts", () => {
  const m = { wpm:150, f:{hard:4, crutch:0, total:4, found:{}}, proj:70,
              goodPauses:5, longPause:1.2, pauseScore:90, var:null, acc:90, usedWord:null };
  const s = X.scoreRun(m, {target:"some passage"}, "pace");
  assert.ok(s.parts.find(p => p.k === "filler").v < 70, "um/uh must still cost you while reading");
});

test("every reading drill's display string stays aligned with its target", () => {
  X.DRILLS.forEach(d => {
    for (let i = 0; i < 30; i++) {
      const r = X.buildRun(d.id);
      if (!r.target) continue;
      const shown = X.tokens(r.display || r.target).filter(w => w !== "|");
      assert.strictEqual(shown.length, X.tokens(r.target).length,
        d.id + ": display has " + shown.length + " words, target has " + X.tokens(r.target).length);
    }
  });
});

/* ── projection ───────────────────────────────────────────────────────
   The bug: projection reused the drawing curve, which saturates at rms 0.13.
   Every normal voice pinned at the top, and anything louder scored WORSE
   than a mumble.                                                          */

test("projection rises with loudness across the whole real range", () => {
  const rms = [0.005, 0.01, 0.02, 0.05, 0.08, 0.12, 0.2, 0.35, 0.6, 0.9];
  const out = rms.map(X.projFromRms);
  for (let i = 1; i < out.length; i++)
    assert.ok(out[i] > out[i-1], `not monotonic: rms ${rms[i-1]}→${out[i-1]}, ${rms[i]}→${out[i]}`);
  assert.ok(out[0] < 20 && out[out.length-1] > 90, out.join(","));
});

test("normal speaking levels spread out instead of all pinning at the top", () => {
  const quiet = X.projFromRms(0.03), normal = X.projFromRms(0.10), loud = X.projFromRms(0.30);
  assert.ok(normal - quiet > 12, `quiet ${quiet} vs normal ${normal} — too compressed`);
  assert.ok(loud - normal > 12, `normal ${normal} vs loud ${loud} — too compressed`);
});

test("a mumble no longer outscores clear speech", () => {
  const mumble = X.band(X.projFromRms(0.02), 50, 82, 1.8);
  const clear  = X.band(X.projFromRms(0.15), 50, 82, 1.8);
  assert.ok(clear > mumble, `mumble scored ${mumble}, clear speech ${clear}`);
});

test("both mumbling and clipping are penalised, normal speech is not", () => {
  const s = r => X.band(X.projFromRms(r), 50, 82, 1.8);
  assert.ok(s(0.01) < 60, "a whisper should not score well: " + s(0.01));
  assert.strictEqual(s(0.15), 100, "normal speech should be clean");
  assert.ok(s(0.95) < 90, "near-clipping should cost something: " + s(0.95));
});

/* ── reading: diction vs coverage ─────────────────────────────────────
   The bug: accuracy divided hits by the WHOLE passage, so stopping early
   read as catastrophic diction rather than an unfinished passage.        */

test("stopping early is coverage, not bad diction", () => {
  const target = "the purpose of speech is not to prove that you know something";
  const half = "the purpose of speech is not";             // read perfectly, then stopped
  const st = X.readStats(half, target);
  assert.strictEqual(st.acc, 100, "clear speech was scored as a diction failure");
  assert.ok(st.coverage < 60, "coverage should reflect the unread remainder: " + st.coverage);
});

test("words actually misheard still count against diction", () => {
  const target = "red lorry yellow lorry red lorry";
  const st = X.readStats("red yellow red lorry", target);   // two swallowed mid-passage
  assert.ok(st.acc < 80, "misheard words should lower diction: " + st.acc);
  assert.strictEqual(st.coverage, 100, "they did reach the end");
});

test("saying almost nothing does not report as a real score", () => {
  const target = "a proper copper coffee pot and a proper copper lid";
  const st = X.readStats("a", target);
  assert.strictEqual(st.acc, 0);
  assert.strictEqual(st.coverage, 0);
  assert.strictEqual(X.readStats("", target).acc, 0);
});

test("a perfect full read scores 100 on both", () => {
  const target = "she sells sea shells by the sea shore";
  const st = X.readStats(target, target);
  assert.strictEqual(st.acc, 100);
  assert.strictEqual(st.coverage, 100);
});

test("diction and coverage are scored as separate components", () => {
  const m = { wpm:140, f:{hard:0,crutch:0,total:0,found:{}}, proj:65, goodPauses:5,
              longPause:1.2, pauseScore:90, var:null, acc:100, coverage:40, usedWord:null };
  const s = X.scoreRun(m, {target:"x"}, "pace");
  const keys = s.parts.map(p => p.k);
  assert.ok(keys.includes("acc") && keys.includes("cover"), keys.join(","));
  // perfect diction on 40% of the passage must not read as a perfect session
  assert.ok(s.score < 95, "unfinished passage scored " + s.score);
});

/* ── does the score actually discriminate? ────────────────────────────
   The bug: pace, projection and variety sat on plateaus so wide that only
   the filler count moved, and nearly every session came out 90+.          */

const session = o => ({ wpm:150, f:{hard:0,crutch:0,total:0,found:{}}, words:150, proj:65,
  goodPauses:6, longPause:1.5, pauseScore:100, var:70, acc:null, coverage:null,
  usedWord:null, ...o });

test("clearly different performances get clearly different scores", () => {
  const s = o => X.scoreRun(session(o), {}, "impromptu").score;
  const great = s({});
  const ok    = s({ wpm:165, f:{hard:2,crutch:4,total:6,found:{}} });
  const meh   = s({ wpm:190, var:50, goodPauses:2, pauseScore:60,
                    f:{hard:5,crutch:8,total:13,found:{}} });
  const bad   = s({ wpm:225, var:38, proj:32, goodPauses:0, pauseScore:15,
                    f:{hard:13,crutch:15,total:28,found:{}} });
  assert.ok(great > ok && ok > meh && meh > bad, [great,ok,meh,bad].join(" > "));
  // the whole point: a poor session must not still land in the 80s
  assert.ok(bad < 45, "a bad session scored " + bad);
  assert.ok(meh < 70, "a mediocre session scored " + meh);
  assert.ok(great - bad > 50, "range is only " + (great - bad) + " points");
});

test("no single metric pins at 100 across an implausibly wide range", () => {
  const spread = key => {
    const vals = [];
    for (const o of [{wpm:110},{wpm:140},{wpm:170},{wpm:200},{wpm:240}])
      vals.push(X.scoreRun(session(o), {}, "impromptu").parts.find(p => p.k === key).v);
    return new Set(vals).size;
  };
  assert.ok(spread("pace") >= 4, "pace gives the same score across most of its range");
});

test("fillers are judged as a rate, not a raw count", () => {
  const f = { hard:2, crutch:1, total:3, found:{} };
  const short = X.scoreRun(session({ words:45, f }), {}, "impromptu");
  const long  = X.scoreRun(session({ words:320, f }), {}, "impromptu");
  const sv = short.parts.find(p => p.k === "filler").v;
  const lv = long.parts.find(p => p.k === "filler").v;
  assert.ok(lv > sv + 30, `same count scored ${sv} vs ${lv} — length is being ignored`);
});

test("a very short answer is not destroyed by one slip", () => {
  const one = X.scoreRun(session({ words:18, f:{hard:1,crutch:0,total:1,found:{}} }), {}, "impromptu");
  assert.ok(one.parts.find(p => p.k === "filler").v > 55,
    "one filler in a short answer scored " + one.parts.find(p => p.k === "filler").v);
});

test("ramp has no plateau, so improvement always shows", () => {
  assert.strictEqual(X.ramp(50, 50, 96), 0);
  assert.strictEqual(X.ramp(96, 50, 96), 100);
  assert.ok(X.ramp(80, 50, 96) > X.ramp(70, 50, 96));
  assert.strictEqual(X.ramp(200, 50, 96), 100, "must clamp above the top");
  assert.strictEqual(X.ramp(0, 50, 96), 0, "must clamp below the bottom");
});

/* ── today's session plan ─────────────────────────────────────────── */

const withParts = (drill, parts) => ({ at:Date.now(), drill, name:drill, score:70, parts });

test("the plan targets the weakest metric first", () => {
  const ss = Array.from({length:6}, () =>
    withParts("impromptu", { pace:92, filler:31, proj:88, var:85, pause:80 }));
  const { drills, why } = X.buildPlan(ss);
  assert.strictEqual(drills[0], "filler", "worst metric was fillers, got " + drills[0]);
  assert.strictEqual(why.filler.metric, "filler");
  assert.ok(why.filler.score < 40, "should report the weak average: " + why.filler.score);
});

test("the plan is three distinct drills, never a repeat", () => {
  // pace and pause both map to the Pace & Pause drill — it must appear once
  const ss = Array.from({length:5}, () =>
    withParts("impromptu", { pace:20, pause:22, filler:40, var:60, proj:90 }));
  const { drills } = X.buildPlan(ss);
  assert.strictEqual(drills.length, 3);
  assert.strictEqual(new Set(drills).size, 3, "duplicate drill in plan: " + drills.join(","));
  assert.strictEqual(drills[0], "pace");
});

test("with no history the plan still returns three real drills", () => {
  const { drills } = X.buildPlan([]);
  assert.strictEqual(drills.length, 3);
  assert.strictEqual(new Set(drills).size, 3);
  drills.forEach(id => assert.ok(X.DRILLS.some(d => d.id === id), "not a real drill: " + id));
});

test("the plan favours least-practised drills when metrics are missing", () => {
  // sessions from before component scores were stored have no `parts`
  const ss = Array.from({length:8}, () => ({ at:Date.now(), drill:"impromptu", score:70 }));
  const { drills } = X.buildPlan(ss);
  assert.strictEqual(drills.length, 3);
  assert.ok(!drills.includes("impromptu"), "should not pick the most-practised drill");
});

test("a goal pack puts at least two of its drills in the plan, and keeps the weakest metric", () => {
  // diction is the weakest by far; no pack below trains it except clarity
  const ss = Array.from({length:6}, () =>
    withParts("pace", { acc:20, cover:90, pace:80, pause:75, filler:85, var:88, proj:90 }));
  for(const pack of X.PACKS){
    for(const hist of [ss, []]){
      const { drills } = X.buildPlan(hist, 3, pack);
      const own = drills.filter(d => pack.drills.some(x => x.drill === d));
      assert.ok(own.length >= 2, `${pack.id}: only ${own.length} of its drills in ${drills.join(",")}`);
      assert.strictEqual(new Set(drills).size, 3);
      if(hist.length) assert.ok(drills.includes("diction"), `${pack.id} hid the weakest metric: ${drills.join(",")}`);
    }
  }
  assert.deepStrictEqual(X.buildPlan(ss, 3, null), X.buildPlan(ss, 3), "no pack, no change");
});

test("a goal pack's prompt pool reaches Impromptu", () => {
  const ids = new Set(), pitch = X.packById("pitch"), interview = X.packById("interview");
  for(let i = 0; i < 100; i++){
    const r = X.buildRun("impromptu", X.packRunOpts(interview, "impromptu"));
    ids.add(r.promptId);
    assert.ok(["STAR", "PREP"].includes(r.framework.name), "interview got " + r.framework.name);
  }
  assert.ok([...ids].every(id => id.startsWith("int-")), "an interview run served " + [...ids].find(id => !id.startsWith("int-")));
  const p = X.buildRun("impromptu", X.packRunOpts(pitch, "impromptu"));
  assert.ok(p.promptId.startsWith("pitch-") && p.dur === 60);
  assert.strictEqual(X.packRunOpts(pitch, "word"), undefined);
  assert.strictEqual(X.packById("nope"), null);
});

test("metric averages ignore sessions recorded before parts existed", () => {
  const avg = X.metricAverages([
    { drill:"a", score:50 },
    withParts("a", { filler:40 }),
    withParts("a", { filler:60 })
  ]);
  assert.strictEqual(avg.filler, 50, "a partless session was counted as zero");
});

/* ── per-metric trends ────────────────────────────────────────────── */

test("a trend needs at least three points before it claims anything", () => {
  const two = [withParts("a",{pace:50}), withParts("a",{pace:80})];
  assert.strictEqual(X.trendFor(two, "pace"), null);
  assert.strictEqual(X.trendFor([], "pace"), null);
  assert.strictEqual(X.trendFor(two, "filler"), null, "absent metric must not trend");
});

test("improvement reads positive and decline reads negative", () => {
  const mk = vals => vals.map(v => withParts("a", { pace:v }));
  assert.ok(X.trendFor(mk([40,45,70,80]), "pace").delta > 0);
  assert.ok(X.trendFor(mk([85,80,50,40]), "pace").delta < 0);
  const flat = X.trendFor(mk([60,61,60,61]), "pace");
  assert.strictEqual(flat.delta, 0, "steady scores should read flat, got " + flat.delta);
});

test("a trend reports the latest value, not the average", () => {
  const t3 = X.trendFor([withParts("a",{var:20}), withParts("a",{var:30}), withParts("a",{var:90})], "var");
  assert.strictEqual(t3.now, 90);
  assert.strictEqual(t3.n, 3);
});

/* ── local language analysis (no model, no network) ───────────────── */

const hedgy = "I think maybe this is sort of the kind of thing that I guess could be " +
              "important but I'm not really sure and I feel like the stuff was very very good";
const strong = "The deadline was arbitrary. I assumed it was fixed because nobody questioned it, " +
               "and we lost three weeks. For example, last March we shipped early once someone asked who set it.";

test("hedging is caught and the speaker's own words are quoted back", () => {
  const f = X.analyseLanguage(hedgy, {});
  const hedge = f.find(x => x.id === "hedge");
  assert.ok(hedge, "hedging not detected: " + f.map(x=>x.id).join(","));
  assert.ok(/i think|i guess|maybe/.test(hedge.detail), "should quote the actual phrases");
});

test("a clear, concrete answer is left alone", () => {
  const f = X.analyseLanguage(strong, { framework:"PREP" });
  assert.strictEqual(f.length, 0, "flagged a good answer: " + f.map(x=>x.title).join(" / "));
});

test("it stays silent when there is too little to judge", () => {
  assert.deepStrictEqual(X.analyseLanguage("um yeah ok", {}), []);
  assert.deepStrictEqual(X.analyseLanguage("", {}), []);
});

test("framework drills flag a missing reason and a missing example", () => {
  const noEvidence = "The deadline was wrong and we should have moved it and that is my view on the matter here";
  const f = X.analyseLanguage(noEvidence, { framework:"PREP" }).map(x => x.id);
  assert.ok(f.includes("reason"), "missing 'because' not flagged: " + f.join(","));
  assert.ok(f.includes("example"), "missing example not flagged: " + f.join(","));
  // without a framework those two are not expected of the speaker
  const free = X.analyseLanguage(noEvidence, {}).map(x => x.id);
  assert.ok(!free.includes("reason") && !free.includes("example"),
    "freeform speech should not be judged against a framework");
});

test("a word leaned on repeatedly is named", () => {
  const repet = "The project project deadline was a project problem and the project team " +
                "decided the project timeline needed another project review before launch";
  const f = X.analyseLanguage(repet, {});
  const rep = f.find(x => x.id === "repeat");
  assert.ok(rep && /project/.test(rep.detail), "overused word not named: " + JSON.stringify(f.map(x=>x.id)));
});

test("findings are ranked worst-first", () => {
  const f = X.analyseLanguage(hedgy, { framework:"PREP" });
  assert.ok(f.length > 1);
  for(let i = 1; i < f.length; i++)
    assert.ok(f[i-1].weight >= f[i].weight, "findings are not ordered by weight");
});

test("phrase counting does not match inside longer words", () => {
  // "sometimes" contains "some", "nothing" contains "thing"
  const f = X.analyseLanguage(
    "Sometimes nothing works and everybody somehow manages regardless of the situation at hand today", {});
  const vague = f.find(x => x.id === "vague");
  assert.ok(!vague, "matched a vague word inside a longer one: " + (vague && vague.detail));
});

test("a re-reported final is not appended twice", () => {
  // Chrome re-fires results it already marked final, with resultIndex pointing
  // back at them. Appending blind duplicated whole phrases in the transcript.
  const L = X.listener;
  spun.length = 0;
  L.start();
  const r = spun[0];
  r.onresult({ resultIndex:0, results:[res("hello there", true)] });
  assert.strictEqual(L.final.trim(), "hello there");
  r.onresult({ resultIndex:0, results:[res("hello there", true), res(" world", false)] });
  assert.strictEqual(L.final.trim(), "hello there", "final was appended a second time");
  assert.strictEqual((L.text().match(/hello there/g)||[]).length, 1, "phrase appears twice");
  L.stop();
});

test("speech still interim when the session ends is kept, not dropped", () => {
  // Chrome ends sessions on its own and discards pending interim text — the
  // words-vanish-mid-sentence case.
  const L = X.listener;
  spun.length = 0;
  L.start();
  const r = spun[0];
  r.onresult({ resultIndex:0, results:[res("the tail end", false)] });
  assert.strictEqual(L.final, "", "nothing final yet");
  r.onend();
  assert.strictEqual(L.final.trim(), "the tail end", "interim tail was thrown away");
  assert.strictEqual(L.interim, "", "interim not cleared after the flush");
  L.stop();
});

test("a start() that throws still recovers instead of dying silently", () => {
  const L = X.listener;
  spun.length = 0;
  FakeSR.prototype.start = function(){ throw new Error("InvalidStateError"); };
  L.start();
  assert.strictEqual(spun.length, 1);
  assert.ok(L.want, "gave up on a throw — transcription would stay dead all run");
  L.stop();
  FakeSR.prototype.start = function(){ this.started = true; this.onstart && this.onstart(); };
});

test("no-speech is not recorded as a fault", () => {
  const L = X.listener;
  spun.length = 0;
  L.start();
  spun[0].onerror({ error:"no-speech" });
  assert.strictEqual(L.err, null, "a normal silence gap was reported as an error");
  spun[0].onerror({ error:"network" });
  assert.strictEqual(L.err, "network");
  L.stop();
});

/* ── fillers: overlap, agreement with the highlighter, odd input ────────── */

test("an overlapping phrase is counted once, not twice", () => {
  // "stuff" and "and stuff" are both crutches. Tallying each separately charged
  // a single tic twice and disagreed with what the transcript highlighted.
  const f = X.countFillers("I finished the homework and stuff yesterday");
  assert.strictEqual(f.crutch, 1, "counted the overlap twice: " + JSON.stringify(f.found));
  assert.deepStrictEqual(Object.keys(f.found), ["and stuff"], "the longer phrase should win");
});

test("the shorter phrase still counts when it stands alone", () => {
  const f = X.countFillers("I have stuff to do");
  assert.strictEqual(f.crutch, 1);
  assert.ok(f.found.stuff, "plain 'stuff' stopped being counted");
});

test("the counter and the highlighter mark exactly the same things", () => {
  // they share FILLER_RE precisely so the marks you watch during a run are the
  // marks you are scored on — this is the invariant that keeps them honest
  const samples = [
    "um so basically I was like you know going to say something and stuff",
    "uh I mean it was sort of okay so anyway",
    "no fillers at all in this particular sentence",
  ];
  for(const s of samples){
    const marked = (X.norm(s).match(X.FILLER_RE) || []).length;
    assert.strictEqual(X.countFillers(s).total, marked,
      "counter and highlighter disagree on: " + s);
  }
});

test("fillers survive punctuation and curly apostrophes", () => {
  assert.strictEqual(X.countFillers("Um, well... uh — yes.").hard, 2);
  // our copy is typeset with ’ but the recogniser returns ' — both must tokenise alike
  assert.strictEqual(X.countFillers("I mean, I’m fine").crutch, 1);
});

test("filler counting handles empty and whitespace-only text", () => {
  for(const s of ["", "   ", "\n\t"]){
    const f = X.countFillers(s);
    assert.deepStrictEqual([f.hard, f.crutch, f.total], [0,0,0], "not clean on " + JSON.stringify(s));
  }
});

test("a filler inside a longer word is not a filler", () => {
  // "um" in "umbrella", "er" in "certain", "mm" in "summary"
  const f = X.countFillers("The umbrella summary was certain and thorough");
  assert.strictEqual(f.total, 0, "matched inside a word: " + JSON.stringify(f.found));
});

/* ── usedWord: Word Forge marks the answer, so casing must not break it ──── */

test("usedWord matches regardless of how the target is capitalised", () => {
  assert.ok(X.usedWord("I reconciled the accounts", "Reconcile"));
  assert.ok(X.usedWord("I reconciled the accounts", "reconcile"));
  assert.ok(X.usedWord("the nuance was lost", "Nuance"));
});

test("usedWord matches a stem, not just the exact word", () => {
  assert.ok(X.usedWord("she conceded the point", "concede"), "inflected form should count");
  assert.ok(!X.usedWord("I ate a sandwich", "concede"), "unrelated word should not count");
});

test("usedWord on an empty target is false, not vacuously true", () => {
  // startsWith("") is true for every string, so an empty stem would pass anything
  assert.strictEqual(X.usedWord("literally any words here", ""), false);
  assert.strictEqual(X.usedWord("literally any words here", null), false);
});

/* ── scoring: a bad measurement must not take the whole score with it ────── */

test("a non-finite metric never reaches the score", () => {
  const f = { hard:0, crutch:0, total:0, found:{} };
  for(const bad of [NaN, Infinity, -Infinity]){
    const r = X.scoreRun({ wpm:150, proj:bad, f, words:100 }, null, "impromptu");
    assert.ok(Number.isFinite(r.score), bad + " propagated into the score");
    assert.ok(r.parts.every(p => Number.isFinite(p.v)), bad + " survived inside a part");
  }
  // NaN has no defensible position on the scale, so the metric is dropped
  // outright; the infinities are simply off the end of it and clamp into range
  const nan = X.scoreRun({ wpm:150, proj:NaN, f, words:100 }, null, "impromptu");
  assert.ok(!nan.parts.some(p => p.k === "proj"), "NaN should drop the metric entirely");
  const inf = X.scoreRun({ wpm:150, proj:Infinity, f, words:100 }, null, "impromptu");
  assert.strictEqual(inf.parts.find(p => p.k === "proj").v, 0, "Infinity should clamp, not vanish");
});

test("a run with nothing measurable scores zero rather than NaN", () => {
  const r = X.scoreRun({ wpm:null, proj:null, f:{hard:0,crutch:0,total:0,found:{}}, words:0 },
                       null, "impromptu");
  assert.ok(Number.isFinite(r.score), "score was not a number");
});

test("reading a passage does not charge you for the author's crutch words", () => {
  const m = { hard:0, crutch:8, total:8, found:{} };
  const asReading = X.fillerRate({ f:m, words:200 }, true);
  const asAnswer  = X.fillerRate({ f:m, words:200 }, false);
  assert.strictEqual(asReading, 0, "crutches counted while reading a set passage");
  assert.ok(asAnswer > 0);
});

test("filler rate is per 100 words, with a floor under short answers", () => {
  const f = { hard:1, crutch:0, total:1, found:{} };
  // one slip in 10 words must not read as a catastrophe: the denominator floors at 50
  assert.strictEqual(X.fillerRate({ f, words:10 }, false), X.fillerRate({ f, words:50 }, false));
  assert.ok(X.fillerRate({ f, words:50 }, false) > X.fillerRate({ f, words:400 }, false),
    "the same slip should matter less in a longer answer");
});

/* ── storage: the record is user-editable, so treat it as untrusted ──────── */

test("a stored record of the wrong shape cannot take down the home screen", () => {
  // every caller assumes sessions is an array; JSON.parse("5") is truthy and used
  // to sail through, leaving it undefined until the next render threw
  const cases = ["5", "[]", '"hello"', '{"theme":"dark"}', "{", "null", "true"];
  for(const raw of cases){
    mem["speakeasy.v1"] = raw;
    const d = X.parseRecord(mem["speakeasy.v1"]);
    assert.ok(d && typeof d === "object", "read() returned a non-object for " + raw);
    assert.ok(Array.isArray(d.sessions), "sessions was not an array for " + raw);
    assert.doesNotThrow(() => X.buildPlan(d.sessions, 3), "buildPlan threw for " + raw);
  }
  delete mem["speakeasy.v1"];
});

test("a stored record keeps its real sessions", () => {
  mem["speakeasy.v1"] = JSON.stringify({ sessions:[{at:1, score:50}], theme:"dark" });
  const d = X.parseRecord(mem["speakeasy.v1"]);
  assert.strictEqual(d.sessions.length, 1);
  assert.strictEqual(d.theme, "dark");
  delete mem["speakeasy.v1"];
});

test("the streak counts back from today and stops at the first gap", () => {
  const at = d => { const x = new Date(); x.setDate(x.getDate()-d); return { at:x.getTime() }; };
  assert.strictEqual(X.streak([]), 0, "no sessions is no streak");
  assert.strictEqual(X.streak([at(0), at(1), at(2)]), 3);
  assert.strictEqual(X.streak([at(0), at(1), at(3)]), 2, "should stop at the gap");
  // not having practised yet today does not end a run that was alive yesterday
  assert.strictEqual(X.streak([at(1), at(2)]), 2);
  assert.strictEqual(X.streak([at(4), at(5)]), 0, "an old run is not a live streak");
});

test("several sessions on one day count as one day of streak", () => {
  const now = Date.now();
  assert.strictEqual(X.streak([{at:now}, {at:now-1000}, {at:now-2000}]), 1);
});

/* ── measurement helpers at their boundaries ────────────────────────────── */

test("projection is bounded and rises with loudness", () => {
  assert.strictEqual(X.projFromRms(0), 0, "silence should floor at 0");
  assert.strictEqual(X.projFromRms(1), 100, "clipping should cap at 100");
  const quiet = X.projFromRms(0.01), normal = X.projFromRms(0.1), loud = X.projFromRms(0.4);
  assert.ok(quiet < normal && normal < loud, "not monotonic: " + [quiet, normal, loud]);
  for(const v of [0, 1e-9, 0.5, 1, 2]) assert.ok(Number.isFinite(X.projFromRms(v)), "not finite at " + v);
});

test("stopping early reads as unfinished, not as bad diction", () => {
  // this is the whole reason acc and coverage are separate numbers
  const target = "the quick brown fox jumps over the lazy dog today";
  const r = X.readStats("the quick brown fox jumps", target);
  assert.strictEqual(r.acc, 100, "every word reached was correct, so acc is 100");
  assert.ok(r.coverage < 60, "coverage should show the passage was not finished");
});

test("a dropped word costs that word and not the rest of the line", () => {
  const target = "the quick brown fox jumps over the lazy dog";
  const hit = X.matchTarget("the quick fox jumps over the lazy dog", target);
  assert.strictEqual(hit[2], false, "'brown' should be marked missed");
  assert.ok(hit.slice(3).every(Boolean), "the rest of the line should still match");
});

test("readStats on nothing spoken does not divide by zero", () => {
  const r = X.readStats("", "the quick brown fox jumps");
  assert.ok(Number.isFinite(r.acc) && Number.isFinite(r.coverage));
  assert.deepStrictEqual([r.acc, r.coverage], [0, 0]);
});

test("accuracy handles an empty target or empty speech", () => {
  assert.strictEqual(X.accuracy("hello", ""), 0, "empty target must not divide by zero");
  assert.strictEqual(X.accuracy("", "hello world"), 0);
  assert.strictEqual(X.accuracy("hello world", "hello world"), 100);
});

test("variety stays silent until there is enough content to mean anything", () => {
  assert.strictEqual(X.variety("one two three"), null, "too short to judge");
  const long = "orbit lantern harbour thicket compass meadow tunnel anchor pebble ribbon " +
               "cavern willow signal marble" ;
  assert.strictEqual(X.variety(long), 100, "all distinct content words");
  const repeat = ("orbit ".repeat(14)).trim();
  assert.ok(X.variety(repeat) < 20, "heavy repetition should score low");
});

test("wordAt returns -1 before the first word and tracks the lag", () => {
  const times = [1, 2, 3];
  assert.strictEqual(X.wordAt(times, 0), -1, "nothing spoken yet");
  assert.strictEqual(X.wordAt([], 5), -1, "no timings at all");
  // recognition reports late, so the playhead is nudged forward by READ_LAG
  assert.strictEqual(X.wordAt(times, 1 - X.READ_LAG), 0);
  assert.strictEqual(X.wordAt(times, 99), 2, "past the end, the last word wins");
});

test("tokens and words agree on how many things were said", () => {
  // word timings are indexed by tokens(), so a drift here desynchronises playback
  const s = "Hello, world — it's fine.";
  assert.strictEqual(X.tokens(s).length, 5, "em-dash is its own token");
  assert.deepStrictEqual(X.tokens(""), []);
  assert.deepStrictEqual(X.words(""), []);
  assert.deepStrictEqual(X.words("   "), []);
});

/* ── drills ─────────────────────────────────────────────────────────────── */

test("every drill builds a run without throwing", () => {
  for(const d of X.DRILLS){
    const r = X.buildRun(d.id);
    assert.ok(r && r.cd, d.id + " produced no countdown text");
    assert.ok(Number.isFinite(r.dur) && r.dur > 0, d.id + " has no usable duration");
  }
});

test("a plan can be built before there is any history", () => {
  const p = X.buildPlan([], 3);
  assert.strictEqual(p.drills.length, 3);
  assert.ok(p.drills.every(id => X.DRILLS.some(d => d.id === id)), "planned an unknown drill");
});

test("history stats are quiet rather than wrong when there is no history", () => {
  assert.deepStrictEqual(X.metricAverages([], 5), {});
  assert.strictEqual(X.trendFor([], "score"), null);
  assert.strictEqual(X.trendFor([{ at:Date.now(), score:50 }], "score"), null,
    "one point is not a trend");
});

/* ── Filler Hunt judges mechanics only ──────────────────────────────────── */

const MECH = { wpm:150, proj:66, var:55, pauseScore:70, words:120,
               f:{ hard:2, crutch:3, total:5, found:{} } };

test("Filler Hunt scores no pace and no word variety", () => {
  // its own copy promises the content is not scored; it used to score both
  const parts = X.scoreRun(MECH, null, "filler").parts.map(p => p.k);
  assert.ok(!parts.includes("pace"), "pace is still scored on Filler Hunt");
  assert.ok(!parts.includes("var"), "word variety is still scored on Filler Hunt");
  assert.ok(parts.includes("filler"), "fillers must still be scored");
});

test("every other drill still scores pace and variety", () => {
  for(const id of ["impromptu","word"]){
    const parts = X.scoreRun(MECH, null, id).parts.map(p => p.k);
    assert.ok(parts.includes("pace"), id + " lost its pace metric");
    assert.ok(parts.includes("var"), id + " lost its variety metric");
  }
});

test("repeating yourself costs nothing on Filler Hunt, but still counts elsewhere", () => {
  // the whole point of an easy topic is a plain, repetitive answer — scoring
  // variety would punish exactly the behaviour the drill is asking for
  const repetitive = { ...MECH, var:22 };
  assert.strictEqual(X.scoreRun(repetitive,null,"filler").score,
                     X.scoreRun(MECH,null,"filler").score,
                     "variety still moved the Filler Hunt score");
  assert.ok(X.scoreRun(repetitive,null,"impromptu").score <
            X.scoreRun(MECH,null,"impromptu").score,
            "variety stopped counting on Impromptu too");
});

test("fillers dominate the Filler Hunt score", () => {
  const r = X.scoreRun(MECH, null, "filler");
  const total = r.parts.reduce((s,p) => s + p.w, 0);
  const share = r.parts.find(p => p.k === "filler").w / total;
  assert.ok(share > 0.5, "fillers are only " + Math.round(share*100) + "% of the score");
});

test("pausing counts for more on Filler Hunt than on a general drill", () => {
  const w = id => X.scoreRun(MECH, null, id).parts.find(p => p.k === "pause").w;
  assert.ok(w("filler") > w("impromptu"),
    "pausing is the remedy this drill teaches, so it should outweigh the generic case");
});

test("fillers still lead the Filler Hunt score after the pausing bump", () => {
  const r = X.scoreRun(MECH, null, "filler");
  const total = r.parts.reduce((s,p) => s + p.w, 0);
  const byWeight = r.parts.slice().sort((a,b) => b.w - a.w);
  assert.strictEqual(byWeight[0].k, "filler", "fillers stopped being the headline metric");
  assert.strictEqual(byWeight[1].k, "pause", "pausing should be the clear second");
  assert.ok(r.parts.find(p => p.k === "filler").w / total > 0.5,
    "fillers dropped below half the score");
});

test("swapping fillers for pauses pays, but stopping constantly does not", () => {
  // the trade the drill exists to teach: close your mouth instead of filling
  const ppm = n => Math.round(X.band(n, 5, 10, 11));
  const run = (hard, pausesPerMin) => X.scoreRun(
    { ...MECH, f:{ hard, crutch:1, total:hard+1, found:{} }, pauseScore:ppm(pausesPerMin) },
    null, "filler").score;

  const filling = run(5, 4);          // stalls out loud
  const pausing = run(0, 9);          // stops instead
  const choppy  = run(0, 16);         // stops every four seconds

  assert.ok(pausing > filling + 20, `the trade should pay: ${filling} -> ${pausing}`);
  assert.ok(choppy < pausing, "constant stopping should not beat well-placed pauses");
  assert.ok(choppy > filling, "even choppy silence beats a mouth full of um");
});

test("Filler Hunt draws from the easy pool, not the thinking prompts", () => {
  // an unfamiliar prompt makes you think, and thinking is where "um" comes from
  const seen = new Set();
  for(let i = 0; i < 200; i++) seen.add(X.buildRun("filler").cd);
  const easy = X.EASY_PROMPTS.map(p => p.x), thinking = X.PROMPTS.map(p => p.x);
  assert.ok([...seen].every(p => easy.includes(p)),
    "Filler Hunt served a prompt from outside EASY_PROMPTS");
  assert.ok(seen.size > 5, "the pool is barely varying: only " + seen.size + " seen");
  const overlap = easy.filter(p => thinking.includes(p));
  assert.strictEqual(overlap.length, 0, "the two pools share prompts: " + overlap[0]);
});

test("Impromptu still draws from the thinking prompts", () => {
  const seen = new Set();
  for(let i = 0; i < 200; i++) seen.add(X.buildRun("impromptu").cd);
  assert.ok([...seen].every(p => X.PROMPTS.some(q => q.x === p)), "Impromptu served an easy prompt");
});

test("Filler Hunt gives five seconds of prep and a full minute of speaking", () => {
  const d = X.DRILLS.find(x => x.id === "filler");
  assert.strictEqual(d.prep, 5, "prep is meant to be short enough that you cannot plan");
  assert.strictEqual(d.dur, 60);
});

/* ── content ids ────────────────────────────────────────────────────────
   History, then-vs-now and challenge links refer to prompts by id, so an id
   must never be reused or silently disappear. content-ids.txt is the ledger:
   retiring an item means deleting its line here on purpose.  */

const POOLS = ["PROMPTS","EASY_PROMPTS","INTERVIEW_PROMPTS","PITCH_PROMPTS","READINGS","TWISTERS","WORDS","ECHOES"];
const allIds = POOLS.flatMap(k => X[k].map(i => i.id));

test("every content item has a unique id", () => {
  assert.ok(allIds.every(id => typeof id === "string" && id), "an item has no id");
  const dup = allIds.find((id, i) => allIds.indexOf(id) !== i);
  assert.strictEqual(dup, undefined, "duplicate id: " + dup);
});

test("no id in the ledger has disappeared from the content", () => {
  const ledger = fs.readFileSync(new URL("../../../content-ids.txt", import.meta.url), "utf8")
    .split(/\r?\n/).filter(Boolean);
  const gone = ledger.filter(id => !allIds.includes(id));
  assert.deepStrictEqual(gone, [], "ids vanished — edit content in place, never delete: " + gone.join(", "));
  const fresh = allIds.filter(id => !ledger.includes(id));
  assert.deepStrictEqual(fresh, [], "new ids missing from content-ids.txt: " + fresh.join(", "));
});

test("every run says which prompt it came from", () => {
  for(const d of X.DRILLS) for(let i = 0; i < 20; i++){
    const r = X.buildRun(d.id);
    assert.ok(allIds.includes(r.promptId), d.id + " run has unknown promptId " + r.promptId);
    assert.strictEqual(r.drill, d.id);
  }
});

test("a stored session can be rescored from its raw measurements", () => {
  // what finish() stores: raw = m, reading = !!run.target. JSON round-trip,
  // because that is what localStorage does to it.
  const cases = [
    [{ wpm:150, f:{hard:1,crutch:2,total:3,found:{um:1}}, words:220, proj:66, acc:null, coverage:null,
       var:72, goodPauses:6, longPause:1.4, pauseScore:88, usedWord:null }, false, "impromptu"],
    [{ wpm:141, f:{hard:0,crutch:1,total:1,found:{}}, words:180, proj:61, acc:91, coverage:97,
       var:null, goodPauses:9, longPause:1.1, pauseScore:100, usedWord:null }, true, "pace"],
    [{ wpm:null, f:{hard:0,crutch:0,total:0,found:{}}, words:0, proj:40, acc:null, coverage:null,
       var:null, goodPauses:2, longPause:3, pauseScore:40, usedWord:null }, false, "filler"]
  ];
  for(const [m, reading, id] of cases){
    const first = X.scoreRun(m, { target: reading ? "x" : null }, id).score;
    const back = JSON.parse(JSON.stringify({ raw:m, reading }));
    const again = X.scoreRun(back.raw, { target: back.reading ? "x" : null }, id).score;
    assert.strictEqual(again, first, id + ": rescoring changed the score");
  }
  assert.ok(Number.isInteger(X.SCORING_VERSION) && X.SCORING_VERSION >= 1);
});

/* ── your own text (F1) ───────────────────────────────────────────────── */

test("pasted text is reduced to plain sentences", () => {
  assert.strictEqual(X.cleanText("# Title\n- **Bold** point 🎉\n1. Second | item\n> quote `code`"),
    "Title Bold point Second item quote code");
  assert.strictEqual(X.cleanText(""), "");
});

test("breath marks land on sentence and clause ends", () => {
  assert.strictEqual(X.autoBreaths("Hello there. How are you today? Fine; thanks."),
    "Hello there. | How are you today? | Fine; | thanks.");
});

test("a comma only earns a breath once the segment is long enough", () => {
  assert.strictEqual(X.autoBreaths("Well, I think so."), "Well, I think so.", "short: no cut at the comma");
  assert.strictEqual(X.autoBreaths("When the meeting finally started late, everyone sat down."),
    "When the meeting finally started late, | everyone sat down.");
});

test("no segment runs past 14 words, and a forced cut prefers the last comma", () => {
  const long = "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen";
  const segs = X.autoBreaths(long).split(" | ");
  assert.ok(segs.every(s => s.split(" ").length <= 14), "segment over 14 words");
  assert.strictEqual(segs.join(" "), long, "words lost or reordered");
  const comma = "Thank you for coming today, it really means a lot to all of us here!";
  assert.strictEqual(X.autoBreaths(comma), "Thank you for coming today, | it really means a lot to all of us here!",
    "should break at the comma, not strand 'here!'");
});

test("a run from your own text is a normal reading run", () => {
  const r = X.buildTextRun("Good morning, everyone. Thank you for coming today, it really means a lot to us.", { id:"abc", title:"Toast" });
  assert.strictEqual(r.drill, "pace");
  assert.strictEqual(r.promptId, "text-abc");
  assert.strictEqual(X.tokens(r.display).filter(w => w !== "|").length, X.tokens(r.target).length,
    "display and target out of step");
  assert.strictEqual(X.accuracy(r.target, r.target), 100);
  assert.ok(r.dur >= 30, "short texts still get 30 seconds");
  assert.strictEqual(X.buildTextRun("   🎉  "), null, "nothing to read");
  assert.deepStrictEqual(X.buildTextRun("It was basically fine, like, mostly.").crutch.sort(), ["basically","like"]);
});

/* ── pitch (F4) ───────────────────────────────────────────────────────── */

const SR = 48000;
const tone = (f, harmonics) => {
  const a = new Float32Array(2048);
  for(let i = 0; i < a.length; i++){
    let s = 0;
    for(let k = 1; k <= (harmonics || 1); k++) s += Math.sin(2*Math.PI*f*k*i/SR) / k;
    a[i] = s * 0.3;
  }
  return a;
};

test("YIN finds the pitch of pure and voice-like tones across the speaking range", () => {
  for(const f of [80, 120, 180, 260, 380]){
    for(const h of [1, 6]){
      const r = X.yin(tone(f, h), SR);
      assert.ok(r && Math.abs(r.f0 - f) / f < 0.01, `${f} Hz x${h} read as ${r && r.f0}`);
      assert.ok(r.conf > 0.85, "low confidence on a clean tone");
    }
  }
});

test("YIN reports nothing for noise", () => {
  let x = 7;
  const n = new Float32Array(2048).map(() => (x = (x * 1103515245 + 12345) % 2147483648) / 2147483648 - 0.5);
  assert.strictEqual(X.yin(n, SR), null);
});

test("YIN refuses a pitch it cannot trust, like a voice buried in loud noise", () => {
  let x = 7;
  const a = tone(150).map((v, i) => v + ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648 - 0.5) * 1.2);
  assert.strictEqual(X.yin(a, SR), null, "a guess in noise would invent pitch variation");
});

test("pitch range is measured in semitones, independent of voice", () => {
  const frames = (notes) => notes.flatMap((f, j) => Array.from({length:20}, (_, i) => ({ t:(j*20+i)*0.05, f0:f })));
  const flat = X.pitchStats(frames([150, 150, 150]));
  assert.ok(flat.range < 0.5, "a constant tone has no range: " + flat.range);
  const six = X.pitchStats(frames([150, 150 * 2 ** (6/12)]));
  assert.ok(Math.abs(six.range - 6) < 0.5, "two notes six semitones apart: " + six.range);
  const low = X.pitchStats(frames([90, 90 * 2 ** (6/12)]));
  assert.ok(Math.abs(low.range - six.range) < 0.1, "a lower voice must read the same range");
  assert.strictEqual(X.pitchStats(frames([150]).slice(0, 10)), null, "too few frames to judge");
});

test("flat stretches are found, expressive ones are not", () => {
  const f = [];
  for(let i = 0; i < 160; i++) f.push({ t: i * 0.05, f0: 150 });                       // 0–8 s monotone
  for(let i = 160; i < 320; i++) f.push({ t: i * 0.05, f0: 150 * 2 ** ((i % 20 - 10) / 2.5) }); // 8–16 s varied
  const s = X.pitchStats(f);
  assert.deepStrictEqual(s.flat, [0, 4]);
});

/* ── diction retry (F5) ───────────────────────────────────────────────── */

const D0 = Date.UTC(2026, 9, 1), DAY = 864e5;

test("diction outcome splits reached words into hit and missed", () => {
  const target = "Red lorry, yellow lorry. Red lorry, yellow lorry.";
  const o = X.dictionOutcome("red lorry yellow lolly red lorry yellow lorry", target);
  assert.deepStrictEqual(o.missed, ["lorry"], "missed once of four is missed");
  assert.deepStrictEqual(o.hit.sort(), ["red", "yellow"]);
  assert.deepStrictEqual(X.dictionOutcome("", target), { hit:[], missed:[] }, "nothing reached, nothing judged");
});

test("a missed word becomes a card due tomorrow; a miss resets it", () => {
  let { cards } = X.updateCards([], "tw-002", { hit:[], missed:["lorry"] }, D0);
  assert.strictEqual(cards.length, 1);
  assert.strictEqual(cards[0].dueAt, D0 + DAY);
  ({ cards } = X.updateCards(cards, "tw-002", { hit:["lorry"], missed:[] }, D0 + DAY));
  assert.strictEqual(cards[0].box, 2);
  assert.strictEqual(cards[0].dueAt, D0 + DAY + 3*DAY);
  ({ cards } = X.updateCards(cards, "tw-002", { hit:[], missed:["lorry"] }, D0 + 2*DAY));
  assert.strictEqual(cards[0].box, 1, "a miss goes back to box 1");
});

test("a hit only promotes a card that was due", () => {
  let { cards } = X.updateCards([], "tw-002", { hit:[], missed:["lorry"] }, D0);
  ({ cards } = X.updateCards(cards, "tw-002", { hit:["lorry"], missed:[] }, D0 + 3600e3));
  assert.strictEqual(cards[0].box, 1, "same-day repeat promoted early");
});

test("cards retire after box 5, or after five misses in a row", () => {
  let cards = [{ word:"lorry", twisterId:"tw-002", box:5, misses:0, dueAt:D0 }], retired;
  ({ cards, retired } = X.updateCards(cards, "tw-002", { hit:["lorry"], missed:[] }, D0));
  assert.deepStrictEqual(retired, [{ word:"lorry", why:"learned" }]);
  assert.strictEqual(cards.length, 0);
  cards = [];
  for(let i = 0; i < 5; i++) ({ cards, retired } = X.updateCards(cards, "tw-009", { hit:[], missed:["sheikh's"] }, D0 + i*DAY));
  assert.deepStrictEqual(retired, [{ word:"sheikh's", why:"recogniser" }]);
});

test("retry note: names what came back clean and what retired", () => {
  const cards = [{ word:"sixth", twisterId:"tw-009", box:2, misses:0, dueAt:D0 },
                 { word:"sheikh's", twisterId:"tw-009", box:5, misses:0, dueAt:D0 },
                 { word:"sheep", twisterId:"tw-009", box:1, misses:0, dueAt:D0 + DAY }];
  const r = X.updateCards(cards, "tw-009", { hit:["sixth", "sheikh's", "sheep"], missed:[] }, D0);
  assert.deepStrictEqual(r.cleared, ["sixth", "sheikh's"], "a card not yet due is not news");
  assert.strictEqual(X.retryNote(r), "“sixth”, “sheikh's” came back clean — 1 sound retired.");
  assert.strictEqual(X.retryNote({ cleared:[], retired:[] }), null);
  assert.strictEqual(X.retryNote({ cleared:[], retired:[{ word:"sixth", why:"recogniser" }] }),
    "Retired “sixth”: the recogniser struggles with this one, not you.");
});

test("the same word in two twisters is two cards", () => {
  let { cards } = X.updateCards([], "tw-001", { hit:[], missed:["sea"] }, D0);
  ({ cards } = X.updateCards(cards, "tw-040", { hit:[], missed:["sea"] }, D0));
  assert.strictEqual(cards.length, 2);
});

test("due cards come most overdue first, and Diction Gym serves that twister", () => {
  const cards = [{ word:"a1", twisterId:"tw-003", dueAt:D0 + 2*DAY }, { word:"b1", twisterId:"tw-010", dueAt:D0 },
                 { word:"c1", twisterId:"tw-020", dueAt:D0 + 9*DAY }];
  assert.deepStrictEqual(X.dueCards(cards, D0 + 3*DAY).map(c => c.twisterId), ["tw-010", "tw-003"]);
  assert.strictEqual(X.buildRun("diction", { twisterId:"tw-010" }).promptId, "tw-010");
  assert.ok(X.buildRun("diction", { twisterId:"tw-nope" }).promptId, "unknown id falls back to random");
});

/* ── progress as facts (F2) ───────────────────────────────────────────── */

const sess = (day, o) => ({ at: D0 + day*DAY, drill: o.drill || "impromptu", name: o.name || "Impromptu",
  score: o.score ?? 60, secs: o.secs ?? 90,
  raw: { wpm: o.wpm ?? 150, words: o.words ?? 200, goodPauses: o.pauses ?? 6,
         f: { total: o.fillers ?? 4, hard: 0, crutch: o.fillers ?? 4 } } });

test("facts stay quiet without enough history", () => {
  assert.deepStrictEqual(X.facts([]), []);
  const five = [0,1,2,3,4].map(d => sess(d, { fillers: d ? 1 : 20 }));
  assert.deepStrictEqual(X.facts(five), [], "five sessions is too few");
  const sameDay = [0,0,0,0,0,0,0,0,0].map((d, i) => sess(i * 0.01, { fillers: i < 3 ? 20 : 1 }));
  assert.deepStrictEqual(X.facts(sameDay), [], "one afternoon is not a trend");
  const old = [0,1,2,3,4,5,6,7,8].map(d => ({ at: D0 + d*DAY, score: d * 10, drill:"filler" }));
  assert.deepStrictEqual(X.facts(old), [], "sessions without raw are not counted");
});

test("noisy but flat history makes no claim", () => {
  const noisy = [0,1,2,3,4,5,6,7,8].map(d => sess(d, { fillers: [4,5,4,6,4,5,4,5,4][d], score: [60,64,58,61,63,59,62,60,61][d] }));
  assert.deepStrictEqual(X.facts(noisy), []);
});

test("a change too small relative to its size makes no claim", () => {
  // +6 points clears the 5-point floor but is only 7% of a score of 80
  const h = [0,1,2,3,4,5,6,7,8].map(d => sess(d, { score: d < 3 ? 80 : 86 }));
  assert.ok(!X.facts(h).some(f => f.metric === "score"));
});

test("a clear filler improvement is reported with its start date", () => {
  const h = [0,1,2,3,4,5,6,7,8].map(d => sess(d, { fillers: d < 3 ? 12 : d < 6 ? 8 : 5 }));
  const f = X.facts(h);
  assert.strictEqual(f[0].metric, "filler");
  assert.strictEqual(f[0].kind, "better");
  assert.strictEqual(f[0].text, "Fillers down 58% since 1 Oct");
});

test("a regression is reported gently, with the drill that fixes it, after any progress", () => {
  const h = [0,1,2,3,4,5,6,7,8].map(d => sess(d, { wpm: d < 3 ? 150 : 185, score: d < 3 ? 50 : 70 }));
  const f = X.facts(h);
  assert.strictEqual(f[0].metric, "score", "progress leads");
  const pace = f.find(x => x.metric === "pace");
  assert.strictEqual(pace.kind, "worse");
  assert.strictEqual(pace.drill, "pace");
  assert.strictEqual(pace.text, "Your pace drifted from 150 to 185 wpm since 1 Oct");
});

test("pace inside the band never counts as a change", () => {
  const h = [0,1,2,3,4,5,6,7,8].map(d => sess(d, { wpm: d < 3 ? 140 : 162 }));
  assert.ok(!X.facts(h).some(f => f.metric === "pace"));
});

test("a metric that appears mid-history is judged on its own points", () => {
  const h = [0,1,2,3,4,5,6,7,8,9,10,11].map(d => sess(d, { secs: d < 6 ? 5 : 60, pauses: d < 9 ? 2 : 8 }));
  const p = X.facts(h).find(f => f.metric === "pause");
  assert.ok(p && p.kind === "better", "pause trend over its own six sessions");
  assert.strictEqual(p.text, "From 2 to 8 deliberate pauses a minute since 7 Oct");
});

test("records need history, and name the drill", () => {
  const h = [0,1,2,3,4].map(d => sess(d, { score: 60 }));
  assert.strictEqual(X.recordFor(h.concat(sess(5, { score: 90 })).slice(1)), null, "only four earlier sessions");
  assert.deepStrictEqual(X.recordFor(h.concat(sess(5, { score: 90 }))), { kind:"score", text:"Your best Impromptu score yet" });
  assert.deepStrictEqual(X.recordFor(h.concat(sess(5, { score: 55, fillers: 1 }))), { kind:"filler", text:"Your lowest filler rate yet" });
  assert.strictEqual(X.recordFor(h.concat(sess(5, { score: 55 }))), null);
});

/* ── backup (storage.js) ──────────────────────────────────────────────── */

const IDS = X.DRILLS.map(d => d.id);
const T0 = Date.UTC(2026, 9, 1);
const full = (i, o) => ({ at: T0 + i * 864e5, drill: "impromptu", name: "Impromptu", score: 70, wpm: 150, fillers: 3,
  parts: { pace: 90, filler: 80 }, promptId: "imp-001", reading: false, v: 1, secs: 90,
  raw: { wpm: 150, words: 220, proj: 60, acc: null, f: { hard: 1, crutch: 2, total: 3, found: { um: 1 } } }, ...o });

test("backup: export then parse gives the same sessions and cards back", () => {
  const record = { sessions: [full(0), full(1)], cards: [{ word:"lorry", twisterId:"tw-002", box:2, misses:0, dueAt:T0 }], theme:"light" };
  const text = JSON.stringify(X.exportBackup(record, T0));
  const b = X.parseBackup(text, IDS);
  assert.deepStrictEqual(b.sessions, record.sessions);
  assert.deepStrictEqual(b.cards, record.cards);
  assert.strictEqual(b.dropped, 0);
  assert.ok(!text.includes("anthropic"), "the API key must never be in a backup");
});

test("backup: files that aren't backups are refused with a readable reason", () => {
  assert.throws(() => X.parseBackup("not json", IDS), /isn't valid JSON/);
  assert.throws(() => X.parseBackup(JSON.stringify({ sessions: [] }), IDS), /isn't a Speakeasy backup/);
  assert.throws(() => X.parseBackup(JSON.stringify({ kind: X.BACKUP_KIND, version: 9 }), IDS), /newer version/);
});

test("backup: anything that doesn't look like a session is dropped, and extra fields never ride along", () => {
  const text = JSON.stringify({ kind: X.BACKUP_KIND, version: 1, cards: [{ word: "x" }], sessions: [
    full(0, { evil: "<script>" }),           // kept, minus the unknown field
    full(1, { drill: "hacking" }),           // unknown drill
    full(2, { score: 400 }),                 // impossible score
    full(3, { at: "yesterday" }),            // not a timestamp
    full(4, { parts: { pace: "fast" } }),    // kept, but without its bad parts
    full(5, { raw: { wpm: 150, f: "lots" } }), // kept, but without its bad raw
    null, 42
  ] });
  const b = X.parseBackup(text, IDS);
  assert.strictEqual(b.sessions.length, 3);
  assert.ok(!("evil" in b.sessions[0]));
  assert.ok(!("parts" in b.sessions[1]) && "raw" in b.sessions[1]);
  assert.ok(!("raw" in b.sessions[2]) && "parts" in b.sessions[2]);
  assert.strictEqual(b.dropped, 5 + 1, "5 bad sessions and 1 bad card");
});

test("backup: restoring merges by time and drill, and twice changes nothing", () => {
  const here = { sessions: [full(0), full(2)], cards: [{ word:"lorry", twisterId:"tw-002", box:3, misses:0, dueAt:T0 }], theme:"dark" };
  const file = X.parseBackup(JSON.stringify(X.exportBackup({ sessions: [full(1), full(2)],
    cards: [{ word:"lorry", twisterId:"tw-002", box:1, misses:2, dueAt:T0 }, { word:"sea", twisterId:"tw-001", box:1, misses:1, dueAt:T0 }] }, T0)), IDS);
  const once = X.mergeBackup(here, file);
  assert.strictEqual(once.added, 1);
  assert.deepStrictEqual(once.record.sessions.map(s => s.at), [full(0).at, full(1).at, full(2).at], "sorted by time");
  assert.strictEqual(once.record.cards.find(c => c.word === "lorry").box, 3, "the card already here wins");
  assert.strictEqual(once.record.cards.length, 2);
  assert.strictEqual(once.record.theme, "dark", "settings stay as they are");
  const twice = X.mergeBackup(once.record, file);
  assert.strictEqual(twice.added, 0);
  assert.deepStrictEqual(twice.record, once.record);
});

test("backup: a merge keeps only the newest 200 sessions, like the store", () => {
  const many = Array.from({ length: 250 }, (_, i) => full(i));
  const b = X.parseBackup(JSON.stringify(X.exportBackup({ sessions: many }, T0)), IDS);
  const m = X.mergeBackup({ sessions: [] }, b);
  assert.strictEqual(m.record.sessions.length, 200);
  assert.strictEqual(m.record.sessions[0].at, full(50).at);
});

/* ── filler buzzer (F3) ─────────────────────────────────────────────── */

const F = (hard, crutch) => ({ hard, crutch, total: hard + crutch });
const B0 = { count: 0, at: -Infinity };

test("buzzer: one tick per new hard filler, none for crutch words by default", () => {
  let s = B0, ticks = 0;
  const feed = (f, now, o) => { const r = X.buzz(s, f, now, o); s = r.state; if(r.fire) ticks++; };
  feed(F(0, 0), 0); feed(F(1, 0), 100); feed(F(1, 0), 900);   // the same "um" re-sent in a revision
  assert.strictEqual(ticks, 1);
  feed(F(1, 3), 2000);
  assert.strictEqual(ticks, 1, "crutch words ticked without the option");
  feed(F(1, 4), 3000, { crutch: true });
  assert.strictEqual(ticks, 2, "the crutch option counts every filler");
});

test("buzzer: debounced, and never fires while a revision shrinks the count", () => {
  let r = X.buzz(B0, F(1, 0), 1000);
  assert.ok(r.fire);
  r = X.buzz(r.state, F(2, 0), 1300);
  assert.ok(!r.fire, "two ticks 300 ms apart");
  r = X.buzz(r.state, F(1, 0), 2000);                          // Chrome dropped a word
  r = X.buzz(r.state, F(2, 0), 2100);
  assert.ok(!r.fire, "a revision back up to a count already heard ticked again");
  r = X.buzz(r.state, F(3, 0), 2200);
  assert.ok(r.fire);
});

test("buzzer: silent on a set passage; on by default only in Filler Hunt", () => {
  assert.ok(!X.buzz(B0, F(2, 0), 0, { reading: true }).fire);
  assert.strictEqual(X.buzzOn(undefined, "filler"), true);
  assert.strictEqual(X.buzzOn({}, "impromptu"), false);
  assert.strictEqual(X.buzzOn({ filler: false, word: true }, "filler"), false);
  assert.strictEqual(X.buzzOn({ filler: false, word: true }, "word"), true);
});

