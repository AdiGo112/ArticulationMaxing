/* Self-check for Speakeasy's pure logic. Run: node test.js
   Imports the modules that hold no DOM and exercises the scoring path. */
import assert from "assert";
import fs from "fs";

/* Stand-in for Chrome's recogniser, so the restart and de-duplication logic
   can be driven by hand. Records every instance the listener spins up. */
const spun = [];
function FakeSR(){ spun.push(this); }
FakeSR.prototype.start = function(){ this.started = true; this.onstart && this.onstart(); };
FakeSR.prototype.stop  = function(){ this.onend && this.onend(); };
const res = (txt, isFinal) => ({ 0:{transcript:txt}, isFinal });

/* speech.js reads window.SpeechRecognition and storage.js reads localStorage as
   they evaluate, so both stubs have to exist before the imports run — which is
   why these are dynamic imports and not import statements at the top. */
const mem = {};
globalThis.window = { SpeechRecognition: FakeSR };
globalThis.spun = spun;
globalThis.localStorage = { getItem:k=>mem[k]??null, setItem:(k,v)=>mem[k]=v };

const X = Object.assign({},
  await import("./src/text.js"),
  await import("./src/audio.js"),
  await import("./src/speech.js"),
  await import("./src/storage.js"),
  await import("./src/drills.js"),
  await import("./src/scoring.js"),
  await import("./src/stage.js"),
  await import("./src/content.js"));

let n = 0;
const t = (name, fn) => { fn(); n++; };

t("hard fillers are caught, crutch words counted separately", () => {
  const f = X.countFillers("um so I was like basically going to uh say something you know");
  assert.strictEqual(f.hard, 2, "expected um + uh");
  assert.strictEqual(f.crutch, 3, "expected like + basically + you know: " + JSON.stringify(f.found));
});

t("clean speech scores zero fillers", () => {
  const f = X.countFillers("The premise is wrong, so the conclusion cannot hold.");
  assert.strictEqual(f.hard, 0);
});

t("substring words are not false positives", () => {
  // "alike" contains "like", "thumb" contains "um" — neither is a filler
  const f = X.countFillers("They look alike and my thumb hurts and the errand is done");
  assert.strictEqual(f.total, 0, "matched inside a word: " + JSON.stringify(f.found));
});

t("accuracy is 100 on a perfect read and degrades on omission", () => {
  const target = "she sells sea shells by the sea shore";
  assert.strictEqual(X.accuracy(target, target), 100);
  assert.strictEqual(X.accuracy("she sells sea shells", target), 50);
  assert.ok(X.accuracy("completely different words entirely", target) < 40);
});

t("accuracy tolerates inserted filler words", () => {
  const target = "I would rather be slow and right";
  assert.ok(X.accuracy("um I would rather uh be slow and right", target) === 100);
});

t("variety needs enough content words, then measures repetition", () => {
  assert.strictEqual(X.variety("short thing here"), null);
  const repeated = ("project project project deadline deadline meeting ").repeat(3);
  const varied = "articulation cadence diction rhythm emphasis clarity pacing structure phrasing tempo timbre resonance";
  assert.ok(X.variety(repeated) < 40, "repetitive text should score low");
  assert.strictEqual(X.variety(varied), 100);
});

t("stem matching accepts inflected forms of the target word", () => {
  assert.ok(X.usedWord("I finally reconciled the two accounts", "reconcile"));
  assert.ok(X.usedWord("that is a nuanced point", "nuance"));
  assert.ok(!X.usedWord("I have no idea what that means", "reconcile"));
});

t("band() peaks inside the range and falls off outside", () => {
  assert.strictEqual(X.band(150, 125, 175, 1.1), 100);
  assert.ok(X.band(200, 125, 175, 1.1) < 100);
  assert.ok(X.band(60, 125, 175, 1.1) < X.band(110, 125, 175, 1.1));
});

t("a clean run outscores a filler-heavy one on the same drill", () => {
  const base = { proj:70, goodPauses:5, longPause:1.2, pauseScore:90, var:70, acc:null, usedWord:null };
  const good = X.scoreRun({...base, wpm:150, f:{hard:0,crutch:1,total:1,found:{}}}, {}, "filler");
  const bad  = X.scoreRun({...base, wpm:150, f:{hard:6,crutch:9,total:15,found:{}}}, {}, "filler");
  assert.ok(good.score > bad.score + 25, `${good.score} vs ${bad.score}`);
  assert.ok(good.score <= 100 && bad.score >= 0);
});

t("score stays in 0–100 at both extremes", () => {
  const worst = X.scoreRun({wpm:400, f:{hard:40,crutch:40,total:80,found:{}}, proj:2,
    goodPauses:0, longPause:20, pauseScore:0, var:5, acc:0, usedWord:false}, {}, "impromptu");
  const best = X.scoreRun({wpm:150, f:{hard:0,crutch:0,total:0,found:{}}, proj:70,
    goodPauses:6, longPause:1, pauseScore:100, var:80, acc:100, usedWord:true}, {}, "impromptu");
  assert.ok(worst.score >= 0 && worst.score <= 100, "worst=" + worst.score);
  assert.ok(best.score >= 90 && best.score <= 100, "best=" + best.score);
});

t("missing transcription still produces a score from audio alone", () => {
  const s = X.scoreRun({wpm:null, f:{hard:0,crutch:0,total:0,found:{}}, proj:65,
    goodPauses:4, longPause:1.5, pauseScore:85, var:null, acc:null, usedWord:null}, {}, "impromptu");
  assert.ok(s.score > 0 && Number.isFinite(s.score), "got " + s.score);
  assert.ok(!s.parts.some(p => p.k === "pace"), "pace should be omitted, not zeroed");
});

t("streak counts consecutive days and survives today being unfinished", () => {
  const day = n => Date.now() - n*86400000;
  assert.strictEqual(X.streak([]), 0);
  assert.strictEqual(X.streak([{at:day(0)}]), 1);
  assert.strictEqual(X.streak([{at:day(0)},{at:day(1)},{at:day(2)}]), 3);
  assert.strictEqual(X.streak([{at:day(1)},{at:day(2)}]), 2, "yesterday+ still counts today");
  assert.strictEqual(X.streak([{at:day(3)},{at:day(4)}]), 0, "a gap breaks it");
});

t("every drill builds a runnable stage", () => {
  X.DRILLS.forEach(d => {
    for (let i = 0; i < 40; i++) {           // buildRun picks at random — hit every branch
      const r = X.buildRun(d.id);
      assert.ok(X.stageHtml(r).length > 20, d.id + " produced no prompt");
      assert.ok(r.dur > 0 && r.dur < 400, d.id + " bad duration " + r.dur);
      if (r.target) assert.ok(X.accuracy(r.target, r.target) === 100, d.id + " target not self-consistent");
    }
  });
});

t("coaching notes always return something actionable", () => {
  const m = { wpm:150, f:{hard:0,crutch:0,total:0,found:{}}, proj:70, acc:null, var:null,
              goodPauses:4, longPause:1, usedWord:null };
  assert.ok(X.coachNotes(m, {}, "impromptu", 80).length >= 1);
  const rough = { wpm:210, f:{hard:7,crutch:8,total:15,found:{like:8}}, proj:30, acc:50, var:35,
                  goodPauses:0, longPause:6, usedWord:false };
  const notes = X.coachNotes(rough, {requireWord:"nuance"}, "impromptu", 30);
  assert.ok(notes.length === 4, "should cap at 4 notes, got " + notes.length);
  notes.forEach(([h, b]) => assert.ok(h && b, "note missing a half"));
});

t("verdict covers the whole 0–100 range", () => {
  for (let s = 0; s <= 100; s += 5) {
    const [title, sub] = X.verdict(s);
    assert.ok(title && sub, "no verdict at " + s);
  }
});

/* ── voice activity detection ─────────────────────────────────────────
   The bug this replaced: a fixed `level > 0.075` gate counted room tone as
   speech, so in a noisy room the app saw one unbroken utterance.          */

const SPEECH = 0.55, RUMBLE = 0.14;   // representative speech-band ratios

t("a noisy room is not speech, even when it is louder than the old fixed gate", () => {
  const noisyFloor = 0.09;            // ambient above the old 0.075 threshold
  // steady room tone sitting at its own floor must not register
  assert.ok(!X.isSpeechFrame(0.095, RUMBLE, noisyFloor, 1), "room tone counted as speech");
  assert.ok(!X.isSpeechFrame(0.12, RUMBLE, noisyFloor, 1), "louder room tone counted as speech");
});

t("speech in that same noisy room still registers", () => {
  const noisyFloor = 0.09;
  assert.ok(X.isSpeechFrame(0.40, SPEECH, noisyFloor, 1), "real speech missed in a noisy room");
});

t("quiet speech in a quiet room registers", () => {
  assert.ok(X.isSpeechFrame(0.05, SPEECH, 0.004, 1), "quiet speech missed in a quiet room");
});

t("loud low-frequency rumble is rejected on spectral shape alone", () => {
  // a door slam or desk knock: plenty of energy, none of it in the speech band
  assert.ok(!X.isSpeechFrame(0.6, 0.10, 0.01, 1), "rumble passed the speech-band gate");
});

t("sensitivity moves the gate monotonically", () => {
  const rms = 0.030, floor = 0.010;
  assert.ok(!X.isSpeechFrame(rms, SPEECH, floor, 0.7), "strict should reject this frame");
  assert.ok(X.isSpeechFrame(rms, SPEECH, floor, 1.5), "quiet-voice should accept this frame");
});

t("calibration takes the 75th percentile, so one cough cannot poison the floor", () => {
  const v = X.makeVAD(1);
  for (let i = 0; i < 40; i++) v.sample(0.010);
  v.sample(0.9);                       // someone coughs during calibration
  assert.ok(v.commit(), "commit refused a full calibration buffer");
  assert.ok(v.floor < 0.02, "one spike moved the floor to " + v.floor);
});

t("calibration is refused when too few samples were collected", () => {
  const v = X.makeVAD(1);
  v.sample(0.01); v.sample(0.01);
  assert.strictEqual(v.commit(), false);
  assert.strictEqual(v.calibrated, false);
});

t("hysteresis: speech must persist to engage, and survives a brief dip", () => {
  const v = X.makeVAD(1); v.floor = 0.005;
  assert.ok(!v.step(0.4, SPEECH, 1000), "engaged instantly — no onset debounce");
  assert.ok(v.step(0.4, SPEECH, 1000 + v.ON_MS), "did not engage after the onset window");
  // a stop consonant: silent frame partway through a word must not end the segment
  assert.ok(v.step(0.001, 0.1, 1000 + v.ON_MS + 100), "a 100ms gap chopped the word");
  // a real pause does end it
  assert.ok(!v.step(0.001, 0.1, 1000 + v.ON_MS + v.HANG_MS + 50), "segment never ended");
});

t("the adaptive floor rises to meet a room that gets noisier", () => {
  const v = X.makeVAD(1); v.floor = 0.005;
  const before = v.floor;
  for (let i = 0; i < 4000; i++) v.step(0.05, RUMBLE, 1000 + i * 16);
  assert.ok(v.floor > before, "floor never adapted upward");
  assert.ok(!v.speaking, "sustained room tone ended up classified as speech");
});

/* ── follow-along transcript ──────────────────────────────────────── */

t("display tokens stay 1:1 with the recorded word timings", () => {
  // the timing array is built from tokens(), so the spans rendered from the
  // same function must line up index for index — otherwise the highlight drifts
  const text = "I don't know — the deadline was, um, arbitrary. 3.5 weeks?";
  const tk = X.tokens(text);
  assert.strictEqual(tk.length, 11, tk.join("|"));   // the em dash is its own token
  assert.strictEqual(tk[1], "don't", "punctuation and apostrophes must survive intact");
  assert.deepStrictEqual(X.tokens(""), []);
  assert.deepStrictEqual(X.tokens("   "), []);
});

t("wordAt picks the last word spoken at or before the playhead", () => {
  const times = [0.5, 1.0, 2.0, 5.0];
  const L = X.READ_LAG;
  assert.strictEqual(X.wordAt(times, 0), -1, "nothing is spoken yet at t=0");
  assert.strictEqual(X.wordAt(times, 0.5 - L), 0, "first word should light as it is reached");
  assert.strictEqual(X.wordAt(times, 2.0 - L), 2);
  assert.strictEqual(X.wordAt(times, 4.9 - L), 2, "must not jump ahead of the next stamp");
  assert.strictEqual(X.wordAt(times, 5.0 - L), 3);
  assert.strictEqual(X.wordAt(times, 99), 3, "past the end stays on the last word");
});

t("wordAt returns -1 before anything has been said", () => {
  assert.strictEqual(X.wordAt([9, 10], 0), -1);
  assert.strictEqual(X.wordAt([], 3), -1);
});

t("wordAt never goes backwards as playback advances", () => {
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

t("a perfect read marks every target word", () => {
  const target = "she sells sea shells by the sea shore";
  assert.deepStrictEqual(X.matchTarget(target, target), new Array(8).fill(true));
});

t("a swallowed word is the only one marked missed", () => {
  const target = "red lorry yellow lorry";
  assert.deepStrictEqual(X.matchTarget("red yellow lorry", target),
    [true, false, true, true], "the miss must not cascade into the rest of the line");
});

t("inserted filler words do not knock the passage out of alignment", () => {
  const target = "truly rural truly rural";
  assert.deepStrictEqual(X.matchTarget("truly um rural truly uh rural", target),
    [true, true, true, true]);
});

t("saying nothing marks the whole passage missed", () => {
  const target = "a proper copper coffee pot";
  assert.deepStrictEqual(X.matchTarget("", target), new Array(5).fill(false));
  assert.deepStrictEqual(X.matchTarget("completely unrelated words", target),
    new Array(5).fill(false));
});

t("match count and reported accuracy agree", () => {
  const target = "the purpose of speech is not to prove that you know something";
  const said = "the purpose of speech is to prove you know something";
  const hit = X.matchTarget(said, target);
  const pct = Math.round(100 * hit.filter(Boolean).length / hit.length);
  // both derive from the same spoken text, so the marking cannot contradict the score
  assert.ok(Math.abs(pct - X.accuracy(said, target)) <= 10, `${pct} vs ${X.accuracy(said, target)}`);
});

t("breath marks are not target words, so they cannot shift the marking", () => {
  // this is the alignment the report depends on: display tokens minus the "|"
  // markers must equal the target tokens, one for one
  const display = "Say the thing, | then stop talking, | and let the silence do it.";
  const target = display.replace(/\|/g, " ");
  const shown = X.tokens(display).filter(w => w !== "|");
  assert.deepStrictEqual(shown, X.tokens(target),
    "display and target tokenise differently — the hit marking would drift");
  assert.strictEqual(X.matchTarget(target, target).length, shown.length);
});

t("crutch words inside a set passage are not held against the reader", () => {
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

t("a stumble while reading still counts", () => {
  const m = { wpm:150, f:{hard:4, crutch:0, total:4, found:{}}, proj:70,
              goodPauses:5, longPause:1.2, pauseScore:90, var:null, acc:90, usedWord:null };
  const s = X.scoreRun(m, {target:"some passage"}, "pace");
  assert.ok(s.parts.find(p => p.k === "filler").v < 70, "um/uh must still cost you while reading");
});

t("every reading drill's display string stays aligned with its target", () => {
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

t("projection rises with loudness across the whole real range", () => {
  const rms = [0.005, 0.01, 0.02, 0.05, 0.08, 0.12, 0.2, 0.35, 0.6, 0.9];
  const out = rms.map(X.projFromRms);
  for (let i = 1; i < out.length; i++)
    assert.ok(out[i] > out[i-1], `not monotonic: rms ${rms[i-1]}→${out[i-1]}, ${rms[i]}→${out[i]}`);
  assert.ok(out[0] < 20 && out[out.length-1] > 90, out.join(","));
});

t("normal speaking levels spread out instead of all pinning at the top", () => {
  const quiet = X.projFromRms(0.03), normal = X.projFromRms(0.10), loud = X.projFromRms(0.30);
  assert.ok(normal - quiet > 12, `quiet ${quiet} vs normal ${normal} — too compressed`);
  assert.ok(loud - normal > 12, `normal ${normal} vs loud ${loud} — too compressed`);
});

t("a mumble no longer outscores clear speech", () => {
  const mumble = X.band(X.projFromRms(0.02), 50, 82, 1.8);
  const clear  = X.band(X.projFromRms(0.15), 50, 82, 1.8);
  assert.ok(clear > mumble, `mumble scored ${mumble}, clear speech ${clear}`);
});

t("both mumbling and clipping are penalised, normal speech is not", () => {
  const s = r => X.band(X.projFromRms(r), 50, 82, 1.8);
  assert.ok(s(0.01) < 60, "a whisper should not score well: " + s(0.01));
  assert.strictEqual(s(0.15), 100, "normal speech should be clean");
  assert.ok(s(0.95) < 90, "near-clipping should cost something: " + s(0.95));
});

/* ── reading: diction vs coverage ─────────────────────────────────────
   The bug: accuracy divided hits by the WHOLE passage, so stopping early
   read as catastrophic diction rather than an unfinished passage.        */

t("stopping early is coverage, not bad diction", () => {
  const target = "the purpose of speech is not to prove that you know something";
  const half = "the purpose of speech is not";             // read perfectly, then stopped
  const st = X.readStats(half, target);
  assert.strictEqual(st.acc, 100, "clear speech was scored as a diction failure");
  assert.ok(st.coverage < 60, "coverage should reflect the unread remainder: " + st.coverage);
});

t("words actually misheard still count against diction", () => {
  const target = "red lorry yellow lorry red lorry";
  const st = X.readStats("red yellow red lorry", target);   // two swallowed mid-passage
  assert.ok(st.acc < 80, "misheard words should lower diction: " + st.acc);
  assert.strictEqual(st.coverage, 100, "they did reach the end");
});

t("saying almost nothing does not report as a real score", () => {
  const target = "a proper copper coffee pot and a proper copper lid";
  const st = X.readStats("a", target);
  assert.strictEqual(st.acc, 0);
  assert.strictEqual(st.coverage, 0);
  assert.strictEqual(X.readStats("", target).acc, 0);
});

t("a perfect full read scores 100 on both", () => {
  const target = "she sells sea shells by the sea shore";
  const st = X.readStats(target, target);
  assert.strictEqual(st.acc, 100);
  assert.strictEqual(st.coverage, 100);
});

t("diction and coverage are scored as separate components", () => {
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

t("clearly different performances get clearly different scores", () => {
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

t("no single metric pins at 100 across an implausibly wide range", () => {
  const spread = key => {
    const vals = [];
    for (const o of [{wpm:110},{wpm:140},{wpm:170},{wpm:200},{wpm:240}])
      vals.push(X.scoreRun(session(o), {}, "impromptu").parts.find(p => p.k === key).v);
    return new Set(vals).size;
  };
  assert.ok(spread("pace") >= 4, "pace gives the same score across most of its range");
});

t("fillers are judged as a rate, not a raw count", () => {
  const f = { hard:2, crutch:1, total:3, found:{} };
  const short = X.scoreRun(session({ words:45, f }), {}, "impromptu");
  const long  = X.scoreRun(session({ words:320, f }), {}, "impromptu");
  const sv = short.parts.find(p => p.k === "filler").v;
  const lv = long.parts.find(p => p.k === "filler").v;
  assert.ok(lv > sv + 30, `same count scored ${sv} vs ${lv} — length is being ignored`);
});

t("a very short answer is not destroyed by one slip", () => {
  const one = X.scoreRun(session({ words:18, f:{hard:1,crutch:0,total:1,found:{}} }), {}, "impromptu");
  assert.ok(one.parts.find(p => p.k === "filler").v > 55,
    "one filler in a short answer scored " + one.parts.find(p => p.k === "filler").v);
});

t("ramp has no plateau, so improvement always shows", () => {
  assert.strictEqual(X.ramp(50, 50, 96), 0);
  assert.strictEqual(X.ramp(96, 50, 96), 100);
  assert.ok(X.ramp(80, 50, 96) > X.ramp(70, 50, 96));
  assert.strictEqual(X.ramp(200, 50, 96), 100, "must clamp above the top");
  assert.strictEqual(X.ramp(0, 50, 96), 0, "must clamp below the bottom");
});

/* ── today's session plan ─────────────────────────────────────────── */

const withParts = (drill, parts) => ({ at:Date.now(), drill, name:drill, score:70, parts });

t("the plan targets the weakest metric first", () => {
  const ss = Array.from({length:6}, () =>
    withParts("impromptu", { pace:92, filler:31, proj:88, var:85, pause:80 }));
  const { drills, why } = X.buildPlan(ss);
  assert.strictEqual(drills[0], "filler", "worst metric was fillers, got " + drills[0]);
  assert.strictEqual(why.filler.metric, "filler");
  assert.ok(why.filler.score < 40, "should report the weak average: " + why.filler.score);
});

t("the plan is three distinct drills, never a repeat", () => {
  // pace and pause both map to the Pace & Pause drill — it must appear once
  const ss = Array.from({length:5}, () =>
    withParts("impromptu", { pace:20, pause:22, filler:40, var:60, proj:90 }));
  const { drills } = X.buildPlan(ss);
  assert.strictEqual(drills.length, 3);
  assert.strictEqual(new Set(drills).size, 3, "duplicate drill in plan: " + drills.join(","));
  assert.strictEqual(drills[0], "pace");
});

t("with no history the plan still returns three real drills", () => {
  const { drills } = X.buildPlan([]);
  assert.strictEqual(drills.length, 3);
  assert.strictEqual(new Set(drills).size, 3);
  drills.forEach(id => assert.ok(X.DRILLS.some(d => d.id === id), "not a real drill: " + id));
});

t("the plan favours least-practised drills when metrics are missing", () => {
  // sessions from before component scores were stored have no `parts`
  const ss = Array.from({length:8}, () => ({ at:Date.now(), drill:"impromptu", score:70 }));
  const { drills } = X.buildPlan(ss);
  assert.strictEqual(drills.length, 3);
  assert.ok(!drills.includes("impromptu"), "should not pick the most-practised drill");
});

t("metric averages ignore sessions recorded before parts existed", () => {
  const avg = X.metricAverages([
    { drill:"a", score:50 },
    withParts("a", { filler:40 }),
    withParts("a", { filler:60 })
  ]);
  assert.strictEqual(avg.filler, 50, "a partless session was counted as zero");
});

/* ── per-metric trends ────────────────────────────────────────────── */

t("a trend needs at least three points before it claims anything", () => {
  const two = [withParts("a",{pace:50}), withParts("a",{pace:80})];
  assert.strictEqual(X.trendFor(two, "pace"), null);
  assert.strictEqual(X.trendFor([], "pace"), null);
  assert.strictEqual(X.trendFor(two, "filler"), null, "absent metric must not trend");
});

t("improvement reads positive and decline reads negative", () => {
  const mk = vals => vals.map(v => withParts("a", { pace:v }));
  assert.ok(X.trendFor(mk([40,45,70,80]), "pace").delta > 0);
  assert.ok(X.trendFor(mk([85,80,50,40]), "pace").delta < 0);
  const flat = X.trendFor(mk([60,61,60,61]), "pace");
  assert.strictEqual(flat.delta, 0, "steady scores should read flat, got " + flat.delta);
});

t("a trend reports the latest value, not the average", () => {
  const t3 = X.trendFor([withParts("a",{var:20}), withParts("a",{var:30}), withParts("a",{var:90})], "var");
  assert.strictEqual(t3.now, 90);
  assert.strictEqual(t3.n, 3);
});

/* ── local language analysis (no model, no network) ───────────────── */

const hedgy = "I think maybe this is sort of the kind of thing that I guess could be " +
              "important but I'm not really sure and I feel like the stuff was very very good";
const strong = "The deadline was arbitrary. I assumed it was fixed because nobody questioned it, " +
               "and we lost three weeks. For example, last March we shipped early once someone asked who set it.";

t("hedging is caught and the speaker's own words are quoted back", () => {
  const f = X.analyseLanguage(hedgy, {});
  const hedge = f.find(x => x.id === "hedge");
  assert.ok(hedge, "hedging not detected: " + f.map(x=>x.id).join(","));
  assert.ok(/i think|i guess|maybe/.test(hedge.detail), "should quote the actual phrases");
});

t("a clear, concrete answer is left alone", () => {
  const f = X.analyseLanguage(strong, { framework:"PREP" });
  assert.strictEqual(f.length, 0, "flagged a good answer: " + f.map(x=>x.title).join(" / "));
});

t("it stays silent when there is too little to judge", () => {
  assert.deepStrictEqual(X.analyseLanguage("um yeah ok", {}), []);
  assert.deepStrictEqual(X.analyseLanguage("", {}), []);
});

t("framework drills flag a missing reason and a missing example", () => {
  const noEvidence = "The deadline was wrong and we should have moved it and that is my view on the matter here";
  const f = X.analyseLanguage(noEvidence, { framework:"PREP" }).map(x => x.id);
  assert.ok(f.includes("reason"), "missing 'because' not flagged: " + f.join(","));
  assert.ok(f.includes("example"), "missing example not flagged: " + f.join(","));
  // without a framework those two are not expected of the speaker
  const free = X.analyseLanguage(noEvidence, {}).map(x => x.id);
  assert.ok(!free.includes("reason") && !free.includes("example"),
    "freeform speech should not be judged against a framework");
});

t("a word leaned on repeatedly is named", () => {
  const repet = "The project project deadline was a project problem and the project team " +
                "decided the project timeline needed another project review before launch";
  const f = X.analyseLanguage(repet, {});
  const rep = f.find(x => x.id === "repeat");
  assert.ok(rep && /project/.test(rep.detail), "overused word not named: " + JSON.stringify(f.map(x=>x.id)));
});

t("findings are ranked worst-first", () => {
  const f = X.analyseLanguage(hedgy, { framework:"PREP" });
  assert.ok(f.length > 1);
  for(let i = 1; i < f.length; i++)
    assert.ok(f[i-1].weight >= f[i].weight, "findings are not ordered by weight");
});

t("phrase counting does not match inside longer words", () => {
  // "sometimes" contains "some", "nothing" contains "thing"
  const f = X.analyseLanguage(
    "Sometimes nothing works and everybody somehow manages regardless of the situation at hand today", {});
  const vague = f.find(x => x.id === "vague");
  assert.ok(!vague, "matched a vague word inside a longer one: " + (vague && vague.detail));
});

t("a re-reported final is not appended twice", () => {
  // Chrome re-fires results it already marked final, with resultIndex pointing
  // back at them. Appending blind duplicated whole phrases in the transcript.
  const L = X.listener, spun = global.spun;
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

t("speech still interim when the session ends is kept, not dropped", () => {
  // Chrome ends sessions on its own and discards pending interim text — the
  // words-vanish-mid-sentence case.
  const L = X.listener, spun = global.spun;
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

t("a start() that throws still recovers instead of dying silently", () => {
  const L = X.listener, spun = global.spun;
  spun.length = 0;
  FakeSR.prototype.start = function(){ throw new Error("InvalidStateError"); };
  L.start();
  assert.strictEqual(spun.length, 1);
  assert.ok(L.want, "gave up on a throw — transcription would stay dead all run");
  L.stop();
  FakeSR.prototype.start = function(){ this.started = true; this.onstart && this.onstart(); };
});

t("no-speech is not recorded as a fault", () => {
  const L = X.listener, spun = global.spun;
  spun.length = 0;
  L.start();
  spun[0].onerror({ error:"no-speech" });
  assert.strictEqual(L.err, null, "a normal silence gap was reported as an error");
  spun[0].onerror({ error:"network" });
  assert.strictEqual(L.err, "network");
  L.stop();
});

/* ── fillers: overlap, agreement with the highlighter, odd input ────────── */

t("an overlapping phrase is counted once, not twice", () => {
  // "stuff" and "and stuff" are both crutches. Tallying each separately charged
  // a single tic twice and disagreed with what the transcript highlighted.
  const f = X.countFillers("I finished the homework and stuff yesterday");
  assert.strictEqual(f.crutch, 1, "counted the overlap twice: " + JSON.stringify(f.found));
  assert.deepStrictEqual(Object.keys(f.found), ["and stuff"], "the longer phrase should win");
});

t("the shorter phrase still counts when it stands alone", () => {
  const f = X.countFillers("I have stuff to do");
  assert.strictEqual(f.crutch, 1);
  assert.ok(f.found.stuff, "plain 'stuff' stopped being counted");
});

t("the counter and the highlighter mark exactly the same things", () => {
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

t("fillers survive punctuation and curly apostrophes", () => {
  assert.strictEqual(X.countFillers("Um, well... uh — yes.").hard, 2);
  // our copy is typeset with ’ but the recogniser returns ' — both must tokenise alike
  assert.strictEqual(X.countFillers("I mean, I’m fine").crutch, 1);
});

t("filler counting handles empty and whitespace-only text", () => {
  for(const s of ["", "   ", "\n\t"]){
    const f = X.countFillers(s);
    assert.deepStrictEqual([f.hard, f.crutch, f.total], [0,0,0], "not clean on " + JSON.stringify(s));
  }
});

t("a filler inside a longer word is not a filler", () => {
  // "um" in "umbrella", "er" in "certain", "mm" in "summary"
  const f = X.countFillers("The umbrella summary was certain and thorough");
  assert.strictEqual(f.total, 0, "matched inside a word: " + JSON.stringify(f.found));
});

/* ── usedWord: Word Forge marks the answer, so casing must not break it ──── */

t("usedWord matches regardless of how the target is capitalised", () => {
  assert.ok(X.usedWord("I reconciled the accounts", "Reconcile"));
  assert.ok(X.usedWord("I reconciled the accounts", "reconcile"));
  assert.ok(X.usedWord("the nuance was lost", "Nuance"));
});

t("usedWord matches a stem, not just the exact word", () => {
  assert.ok(X.usedWord("she conceded the point", "concede"), "inflected form should count");
  assert.ok(!X.usedWord("I ate a sandwich", "concede"), "unrelated word should not count");
});

t("usedWord on an empty target is false, not vacuously true", () => {
  // startsWith("") is true for every string, so an empty stem would pass anything
  assert.strictEqual(X.usedWord("literally any words here", ""), false);
  assert.strictEqual(X.usedWord("literally any words here", null), false);
});

/* ── scoring: a bad measurement must not take the whole score with it ────── */

t("a non-finite metric never reaches the score", () => {
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

t("a run with nothing measurable scores zero rather than NaN", () => {
  const r = X.scoreRun({ wpm:null, proj:null, f:{hard:0,crutch:0,total:0,found:{}}, words:0 },
                       null, "impromptu");
  assert.ok(Number.isFinite(r.score), "score was not a number");
});

t("reading a passage does not charge you for the author's crutch words", () => {
  const m = { hard:0, crutch:8, total:8, found:{} };
  const asReading = X.fillerRate({ f:m, words:200 }, true);
  const asAnswer  = X.fillerRate({ f:m, words:200 }, false);
  assert.strictEqual(asReading, 0, "crutches counted while reading a set passage");
  assert.ok(asAnswer > 0);
});

t("filler rate is per 100 words, with a floor under short answers", () => {
  const f = { hard:1, crutch:0, total:1, found:{} };
  // one slip in 10 words must not read as a catastrophe: the denominator floors at 50
  assert.strictEqual(X.fillerRate({ f, words:10 }, false), X.fillerRate({ f, words:50 }, false));
  assert.ok(X.fillerRate({ f, words:50 }, false) > X.fillerRate({ f, words:400 }, false),
    "the same slip should matter less in a longer answer");
});

/* ── storage: the record is user-editable, so treat it as untrusted ──────── */

t("a stored record of the wrong shape cannot take down the home screen", () => {
  // every caller assumes sessions is an array; JSON.parse("5") is truthy and used
  // to sail through, leaving it undefined until the next render threw
  const cases = ["5", "[]", '"hello"', '{"theme":"dark"}', "{", "null", "true"];
  for(const raw of cases){
    mem["speakeasy.v1"] = raw;
    const d = X.store.read();
    assert.ok(d && typeof d === "object", "read() returned a non-object for " + raw);
    assert.ok(Array.isArray(d.sessions), "sessions was not an array for " + raw);
    assert.doesNotThrow(() => X.buildPlan(d.sessions, 3), "buildPlan threw for " + raw);
  }
  delete mem["speakeasy.v1"];
});

t("a stored record keeps its real sessions", () => {
  mem["speakeasy.v1"] = JSON.stringify({ sessions:[{at:1, score:50}], theme:"dark" });
  const d = X.store.read();
  assert.strictEqual(d.sessions.length, 1);
  assert.strictEqual(d.theme, "dark");
  delete mem["speakeasy.v1"];
});

t("the streak counts back from today and stops at the first gap", () => {
  const at = d => { const x = new Date(); x.setDate(x.getDate()-d); return { at:x.getTime() }; };
  assert.strictEqual(X.streak([]), 0, "no sessions is no streak");
  assert.strictEqual(X.streak([at(0), at(1), at(2)]), 3);
  assert.strictEqual(X.streak([at(0), at(1), at(3)]), 2, "should stop at the gap");
  // not having practised yet today does not end a run that was alive yesterday
  assert.strictEqual(X.streak([at(1), at(2)]), 2);
  assert.strictEqual(X.streak([at(4), at(5)]), 0, "an old run is not a live streak");
});

t("several sessions on one day count as one day of streak", () => {
  const now = Date.now();
  assert.strictEqual(X.streak([{at:now}, {at:now-1000}, {at:now-2000}]), 1);
});

/* ── measurement helpers at their boundaries ────────────────────────────── */

t("projection is bounded and rises with loudness", () => {
  assert.strictEqual(X.projFromRms(0), 0, "silence should floor at 0");
  assert.strictEqual(X.projFromRms(1), 100, "clipping should cap at 100");
  const quiet = X.projFromRms(0.01), normal = X.projFromRms(0.1), loud = X.projFromRms(0.4);
  assert.ok(quiet < normal && normal < loud, "not monotonic: " + [quiet, normal, loud]);
  for(const v of [0, 1e-9, 0.5, 1, 2]) assert.ok(Number.isFinite(X.projFromRms(v)), "not finite at " + v);
});

t("stopping early reads as unfinished, not as bad diction", () => {
  // this is the whole reason acc and coverage are separate numbers
  const target = "the quick brown fox jumps over the lazy dog today";
  const r = X.readStats("the quick brown fox jumps", target);
  assert.strictEqual(r.acc, 100, "every word reached was correct, so acc is 100");
  assert.ok(r.coverage < 60, "coverage should show the passage was not finished");
});

t("a dropped word costs that word and not the rest of the line", () => {
  const target = "the quick brown fox jumps over the lazy dog";
  const hit = X.matchTarget("the quick fox jumps over the lazy dog", target);
  assert.strictEqual(hit[2], false, "'brown' should be marked missed");
  assert.ok(hit.slice(3).every(Boolean), "the rest of the line should still match");
});

t("readStats on nothing spoken does not divide by zero", () => {
  const r = X.readStats("", "the quick brown fox jumps");
  assert.ok(Number.isFinite(r.acc) && Number.isFinite(r.coverage));
  assert.deepStrictEqual([r.acc, r.coverage], [0, 0]);
});

t("accuracy handles an empty target or empty speech", () => {
  assert.strictEqual(X.accuracy("hello", ""), 0, "empty target must not divide by zero");
  assert.strictEqual(X.accuracy("", "hello world"), 0);
  assert.strictEqual(X.accuracy("hello world", "hello world"), 100);
});

t("variety stays silent until there is enough content to mean anything", () => {
  assert.strictEqual(X.variety("one two three"), null, "too short to judge");
  const long = "orbit lantern harbour thicket compass meadow tunnel anchor pebble ribbon " +
               "cavern willow signal marble" ;
  assert.strictEqual(X.variety(long), 100, "all distinct content words");
  const repeat = ("orbit ".repeat(14)).trim();
  assert.ok(X.variety(repeat) < 20, "heavy repetition should score low");
});

t("wordAt returns -1 before the first word and tracks the lag", () => {
  const times = [1, 2, 3];
  assert.strictEqual(X.wordAt(times, 0), -1, "nothing spoken yet");
  assert.strictEqual(X.wordAt([], 5), -1, "no timings at all");
  // recognition reports late, so the playhead is nudged forward by READ_LAG
  assert.strictEqual(X.wordAt(times, 1 - X.READ_LAG), 0);
  assert.strictEqual(X.wordAt(times, 99), 2, "past the end, the last word wins");
});

t("tokens and words agree on how many things were said", () => {
  // word timings are indexed by tokens(), so a drift here desynchronises playback
  const s = "Hello, world — it's fine.";
  assert.strictEqual(X.tokens(s).length, 5, "em-dash is its own token");
  assert.deepStrictEqual(X.tokens(""), []);
  assert.deepStrictEqual(X.words(""), []);
  assert.deepStrictEqual(X.words("   "), []);
});

/* ── drills ─────────────────────────────────────────────────────────────── */

t("every drill builds a run without throwing", () => {
  for(const d of X.DRILLS){
    const r = X.buildRun(d.id);
    assert.ok(r && X.stageHtml(r), d.id + " produced no stage");
    assert.ok(Number.isFinite(r.dur) && r.dur > 0, d.id + " has no usable duration");
  }
});

t("a plan can be built before there is any history", () => {
  const p = X.buildPlan([], 3);
  assert.strictEqual(p.drills.length, 3);
  assert.ok(p.drills.every(id => X.DRILLS.some(d => d.id === id)), "planned an unknown drill");
});

t("history stats are quiet rather than wrong when there is no history", () => {
  assert.deepStrictEqual(X.metricAverages([], 5), {});
  assert.strictEqual(X.trendFor([], "score"), null);
  assert.strictEqual(X.trendFor([{ at:Date.now(), score:50 }], "score"), null,
    "one point is not a trend");
});

/* ── Filler Hunt judges mechanics only ──────────────────────────────────── */

const MECH = { wpm:150, proj:66, var:55, pauseScore:70, words:120,
               f:{ hard:2, crutch:3, total:5, found:{} } };

t("Filler Hunt scores no pace and no word variety", () => {
  // its own copy promises the content is not scored; it used to score both
  const parts = X.scoreRun(MECH, null, "filler").parts.map(p => p.k);
  assert.ok(!parts.includes("pace"), "pace is still scored on Filler Hunt");
  assert.ok(!parts.includes("var"), "word variety is still scored on Filler Hunt");
  assert.ok(parts.includes("filler"), "fillers must still be scored");
});

t("every other drill still scores pace and variety", () => {
  for(const id of ["impromptu","word"]){
    const parts = X.scoreRun(MECH, null, id).parts.map(p => p.k);
    assert.ok(parts.includes("pace"), id + " lost its pace metric");
    assert.ok(parts.includes("var"), id + " lost its variety metric");
  }
});

t("repeating yourself costs nothing on Filler Hunt, but still counts elsewhere", () => {
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

t("fillers dominate the Filler Hunt score", () => {
  const r = X.scoreRun(MECH, null, "filler");
  const total = r.parts.reduce((s,p) => s + p.w, 0);
  const share = r.parts.find(p => p.k === "filler").w / total;
  assert.ok(share > 0.5, "fillers are only " + Math.round(share*100) + "% of the score");
});

t("pausing counts for more on Filler Hunt than on a general drill", () => {
  const w = id => X.scoreRun(MECH, null, id).parts.find(p => p.k === "pause").w;
  assert.ok(w("filler") > w("impromptu"),
    "pausing is the remedy this drill teaches, so it should outweigh the generic case");
});

t("fillers still lead the Filler Hunt score after the pausing bump", () => {
  const r = X.scoreRun(MECH, null, "filler");
  const total = r.parts.reduce((s,p) => s + p.w, 0);
  const byWeight = r.parts.slice().sort((a,b) => b.w - a.w);
  assert.strictEqual(byWeight[0].k, "filler", "fillers stopped being the headline metric");
  assert.strictEqual(byWeight[1].k, "pause", "pausing should be the clear second");
  assert.ok(r.parts.find(p => p.k === "filler").w / total > 0.5,
    "fillers dropped below half the score");
});

t("swapping fillers for pauses pays, but stopping constantly does not", () => {
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

t("Filler Hunt draws from the easy pool, not the thinking prompts", () => {
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

t("Impromptu still draws from the thinking prompts", () => {
  const seen = new Set();
  for(let i = 0; i < 200; i++) seen.add(X.buildRun("impromptu").cd);
  assert.ok([...seen].every(p => X.PROMPTS.some(q => q.x === p)), "Impromptu served an easy prompt");
});

t("Filler Hunt gives five seconds of prep and a full minute of speaking", () => {
  const d = X.DRILLS.find(x => x.id === "filler");
  assert.strictEqual(d.prep, 5, "prep is meant to be short enough that you cannot plan");
  assert.strictEqual(d.dur, 60);
});

/* ── content ids ────────────────────────────────────────────────────────
   History, then-vs-now and challenge links refer to prompts by id, so an id
   must never be reused or silently disappear. content-ids.txt is the ledger:
   retiring an item means deleting its line here on purpose.  */

const POOLS = ["PROMPTS","EASY_PROMPTS","READINGS","TWISTERS","WORDS","ECHOES"];
const allIds = POOLS.flatMap(k => X[k].map(i => i.id));

t("every content item has a unique id", () => {
  assert.ok(allIds.every(id => typeof id === "string" && id), "an item has no id");
  const dup = allIds.find((id, i) => allIds.indexOf(id) !== i);
  assert.strictEqual(dup, undefined, "duplicate id: " + dup);
});

t("no id in the ledger has disappeared from the content", () => {
  const ledger = fs.readFileSync(new URL("./content-ids.txt", import.meta.url), "utf8")
    .split(/\r?\n/).filter(Boolean);
  const gone = ledger.filter(id => !allIds.includes(id));
  assert.deepStrictEqual(gone, [], "ids vanished — edit content in place, never delete: " + gone.join(", "));
  const fresh = allIds.filter(id => !ledger.includes(id));
  assert.deepStrictEqual(fresh, [], "new ids missing from content-ids.txt: " + fresh.join(", "));
});

t("every run says which prompt it came from", () => {
  for(const d of X.DRILLS) for(let i = 0; i < 20; i++){
    const r = X.buildRun(d.id);
    assert.ok(allIds.includes(r.promptId), d.id + " run has unknown promptId " + r.promptId);
    assert.strictEqual(r.drill, d.id);
  }
});

t("a stored session can be rescored from its raw measurements", () => {
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

console.log(`ok — ${n} checks passed`);
