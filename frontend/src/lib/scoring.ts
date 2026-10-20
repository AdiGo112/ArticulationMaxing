/* scoring.ts — Turning one run's measurements into a 0-100 score and a verdict.
   Ported from the old app's scoring.js; SCORING_VERSION continues its numbering. */

import { CRUTCH } from "./content.ts";
import { clamp, type FillerCount } from "./text.ts";
import type { Run } from "./drills.ts";

/* Bump on any change to scoreRun() or the curves it uses. Stored with every
   session so old scores can be recomputed from their raw measurements.  */
export const SCORING_VERSION = 1;

/* One run's raw measurements — what finish() stores as a session's `raw`. */
export interface Measurements {
  wpm: number | null;
  artic?: number | null;          // rate while actually speaking
  f: FillerCount;
  words: number;
  proj: number;
  snr?: number | null;            // dB of voice above the room
  acc: number | null;
  coverage: number | null;
  var: number | null;
  goodPauses: number;
  longPause: number;
  pauseScore: number | null;
  usedWord: boolean | null;
  quiet?: number;                 // % of the run spent silent
  room?: number | null;
}

export interface Part { k: string; label: string; v: number; w: number }

export const band = (v: number, lo: number, hi: number, fall: number) =>
  v >= lo && v <= hi ? 100 : clamp(100 - (v < lo ? lo - v : v - hi) * fall, 0, 100);
/* Linear 0→100 between two points, for metrics that are simply better when
   higher. Unlike band() it has no plateau, so improvement always shows. */
export const ramp = (v: number, zero: number, full: number) => clamp((v - zero) / (full - zero) * 100, 0, 100);

/* Fillers per 100 words; hard fillers weigh double. Reading a set passage:
   its crutch words are the author's, so they don't count. The denominator is
   floored, so one slip in a short answer doesn't read as a catastrophe. */
export function fillerRate(m: Pick<Measurements, "f" | "words">, reading: boolean): number {
  const w = Math.max(m.words || 0, 50);
  return (m.f.hard * 2 + (reading ? 0 : m.f.crutch)) / w * 100;
}

export function scoreRun(m: Measurements, run: Pick<Run, "target"> | null | undefined, id: string) {
  const parts: Part[] = [];
  // Number.isFinite, not just != null: one NaN out of a degenerate measurement
  // used to make the whole run score NaN and poison every trend after it
  const add = (k: string, label: string, v: number | null, w: number) => {
    if (v != null && Number.isFinite(v)) parts.push({ k, label, v: Math.round(v), w });
  };
  const reading = !!(run && run.target);
  // Filler Hunt judges how you spoke, never what you said
  const mechanicsOnly = id === "filler";

  // 138–165 wpm is the band broadcasters aim for; outside it, degrade steadily
  if (!mechanicsOnly) add("pace", "Pace", m.wpm ? band(m.wpm, 138, 165, 1.6) : null, id === "pace" ? 1.4 : 1);
  // ~1 per 100 words is a strong speaker, ~5 is average, 10+ is distracting
  add("filler", "Fillers", m.wpm == null ? null :
    clamp(100 - fillerRate(m, reading) * 9, 0, 100), mechanicsOnly ? 2.4 : 1);
  // 55–78 on the dB scale is roughly rms .10–.30: carrying, without clipping
  add("proj", "Projection", band(m.proj, 55, 78, 2.2), .8);
  // ASR is never perfect, so 96% counts as full marks rather than 100%
  if (m.acc != null) add("acc", "Diction", ramp(m.acc, 50, 96), 2);
  if (m.coverage != null) add("cover", "Passage read", ramp(m.coverage, 30, 98), 1);
  if (m.var != null && !mechanicsOnly) add("var", "Word variety", band(m.var, 68, 100, 2.2), .7);
  // on Filler Hunt, pausing is the remedy the drill teaches, so it weighs more
  if (m.pauseScore != null) add("pause", "Pausing", m.pauseScore, id === "pace" || mechanicsOnly ? 1.3 : .7);

  const tw = parts.reduce((s, p) => s + p.w, 0) || 1;
  return { score: Math.round(parts.reduce((s, p) => s + p.v * p.w, 0) / tw), parts };
}

export function verdict(score: number): [string, string] {
  if (score >= 90) return ["Sharp.", "That was clean, paced and structured. Raise the difficulty — shorter prep, harder prompt."];
  if (score >= 76) return ["Solid.", "Clearly above average delivery. The gap to excellent is in the details below."];
  if (score >= 62) return ["Getting there.", "The shape is right. Pick the single lowest number below and only work on that this week."];
  if (score >= 45) return ["Rough, and that’s fine.", "Everyone sounds like this at the start. Run the same drill three days in a row before you judge it."];
  return ["Early days.", "Nothing here is a verdict on you. It’s a baseline. The second run is almost always better than the first."];
}

export function coachNotes(m: Measurements, run: Pick<Run, "target" | "requireWord">): [string, string][] {
  const n: [string, string][] = [];
  if (m.f.hard >= 3) n.push(["Fillers are your loudest tell.",
    `You landed ${m.f.hard} hard filler${m.f.hard > 1 ? "s" : ""} (um, uh, er). Next run, when one starts to form, shut your mouth and count one beat. It will feel like an eternity and sound like composure.`]);
  if (m.f.crutch >= 5 && !(run && run.target)) n.push(["Crutch words are padding the sentences.",
    `${m.f.crutch} uses of ${Object.keys(m.f.found).filter(k => CRUTCH.includes(k)).slice(0, 3).join(", ") || "like / basically / actually"}. They’re not wrong, they’re just load-bearing for nothing. Cut them and the sentence stands anyway.`]);
  if (m.wpm && m.wpm > 180) n.push(["You’re outrunning the listener.",
    `${m.wpm} wpm. Above about 175 the audience stops processing and starts just hearing. Put a full stop where you’d normally put a comma.`]);
  if (m.wpm && m.wpm < 115) n.push(["Too slow to hold attention.",
    `${m.wpm} wpm. This usually means you’re composing the sentence while saying it. Decide the whole sentence, then deliver it at speed.`]);
  if (m.proj < 45) n.push(["You’re under-projecting.",
    `Your voice averaged ${m.proj}/100${m.snr != null ? `, sitting only ${m.snr} dB above the room` : ""}. Not volume — support. Breathe from lower down and aim at the far wall, not the screen.`]);
  if (m.proj > 88) n.push(["You’re close to clipping.",
    "The signal is nearly at the top of what the microphone can take, which distorts consonants and makes you harder to understand, not easier. Sit back a few inches rather than speaking more quietly."]);
  if (m.coverage != null && m.coverage < 70) n.push(["You didn’t reach the end of the passage.",
    `You got through ${m.coverage}% of it. That is not a diction problem — accuracy is scored only on the words you actually reached — but the passage is built to be finished. Read a little faster, or run a longer session.`]);
  if (m.room != null && m.room >= 34) n.push(["Your room is working against you.",
    `Background noise measured ${m.room}/100. The detector has to raise its threshold above that, so quiet passages may not register as speech at all. A quieter room will move these numbers more than any drill will.`]);
  if (m.acc != null && m.acc < 78) n.push(["Consonants are getting swallowed.",
    `Of the words you reached, ${m.acc}% came through. The ends of words are usually the first casualty. Over-articulate the final consonant for a week.`]);
  if (m.var != null && m.var < 48) n.push(["You’re recycling the same words.",
    `${m.var}% of your content words were unique. Not a vocabulary problem — a reaching problem. Try Word Forge before your next impromptu.`]);
  if (m.longPause > 4.5) n.push(["One pause ran too long.",
    `Longest gap was ${m.longPause.toFixed(1)}s. Under two seconds reads as thought; over four reads as lost. If you need longer, say "let me think about that" out loud.`]);
  if (run.requireWord && !m.usedWord) n.push(["The target word never appeared.",
    `You didn’t use "${run.requireWord}". Building the sentence around the word is the whole exercise — the definition is just the starting point.`]);
  if (m.goodPauses >= 3 && m.f.hard === 0) n.push(["You paused instead of stalling.",
    `${m.goodPauses} deliberate pauses and zero hard fillers. This is exactly the trade you want. Keep it.`]);
  if (!n.length) n.push(["Nothing obvious to fix.",
    "No single metric is dragging. Make it harder: cut the prep time in half, or take a prompt you actively don’t want."]);
  return n.slice(0, 4);
}

/* Too little to score: a number from a take this short would be confident and
   wrong (a 2 s Filler Hunt once scored 62, its fillers unscored because pace
   needs 5 s). Free speech needs 10 s; a set passage can be read in a few
   seconds, so it needs voice and, with a transcript, a few of its words.
   Without a transcript (Firefox) only time and voice count. Returns why, or null. */
export function tooShort(o: { secs: number; speakSecs: number; words: number; transcript: boolean; reading: boolean }): string | null {
  // voice detection can mistake a steady room for silence; with a transcript, the words decide
  if (!o.transcript && o.speakSecs < 1.5) return "Reel didn't hear enough of your voice to score.";
  if (!o.reading && o.secs < 10) return "Under ten seconds is too short to score. Keep going for at least ten.";
  if (o.transcript && o.words < (o.reading ? 3 : 8)) return "Too few words came through to score.";
  return null;
}
