/* Self-check for Speakeasy's pure logic. Run: node test.js
   Imports the modules that hold no DOM and exercises the scoring path. */
import assert from "assert";

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
  await import("./src/scoring.js"));

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
      assert.ok(r.html && r.html.length > 20, d.id + " produced no prompt");
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

console.log(`ok — ${n} checks passed`);
