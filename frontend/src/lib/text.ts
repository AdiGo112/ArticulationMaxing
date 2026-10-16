/* text.ts — Pure text and measurement helpers. No DOM, no state.
   Ported from src/text.js. */

import { CRUTCH, HARD, STOP } from "./content.ts";

/* ══ TEXT HELPERS ═════════════════════════════════════════════════ */

/* fold curly apostrophes to straight first: our copy is typeset with ’ but the
   speech recogniser returns ', and both must tokenise to the same word */
export const norm = (s: string) => s.toLowerCase().replace(/[’ʼ´]/g, "'")
  .replace(/[^a-z0-9'\s]/g, " ").replace(/\s+/g, " ").trim();
export const words = (s: string): string[] => norm(s) ? norm(s).split(" ") : [];
/* Display tokens — the original text split on whitespace, punctuation intact.
   Word timings are indexed by THIS, not by words(), so the spans rendered for
   playback and the timestamps recorded during the session can never drift. */
export const tokens = (s: string): string[] => s.trim() ? s.trim().split(/\s+/) : [];

/* Recognition reports a word slightly after it was spoken, so highlighting at
   the raw stamp always runs late. Nudge the playhead forward by this much. */
export const READ_LAG = 0.42;

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/* Loudness as a score, from the raw RMS averaged over speech. Decibels are
   monotonic across the whole real range: -46 dB (barely audible) → 0,
   0 dB (clipping) → 100. */
export function projFromRms(meanRms: number): number {
  const db = 20 * Math.log10(Math.max(meanRms, 1e-5));
  return clamp(Math.round((db + 46) / 46 * 100), 0, 100);
}

export interface ReadStats { acc: number; coverage: number; covered: number; missed: number; hit: boolean[] }

/* Reading a set passage produces two different facts that must not be mixed:
     acc      — of the words you actually reached, how many came through
     coverage — how much of the passage you got to at all
   Dividing hits by the whole passage conflates them, so stopping early reads
   as catastrophically bad diction rather than as an unfinished passage. */
export function readStats(spoken: string, target: string): ReadStats {
  const hit = matchTarget(spoken, target), n = hit.length;
  let last = -1;
  for (let i = 0; i < n; i++) if (hit[i]) last = i;
  const covered = last + 1;
  if (!n || covered < 3) return { acc: 0, coverage: 0, covered: 0, missed: n, hit };
  let good = 0;
  for (let i = 0; i < covered; i++) if (hit[i]) good++;
  return { acc: Math.round(100 * good / covered), coverage: Math.round(100 * covered / n),
    covered, missed: covered - good, hit };
}

/* Which words of a set passage were actually recognised, in order?
   One boolean per target token. A forward pointer with a short lookahead, so
   a dropped or inserted word costs you that word and not the rest of the
   line. The booth and the report both use this, so the marking you watched
   live is exactly the marking you get back afterwards. */
export function matchTarget(spoken: string, target: string): boolean[] {
  const sp = words(spoken), tn = tokens(target).map(w => words(w)[0] || "");
  const hit: boolean[] = new Array(tn.length).fill(false);
  let p = 0;
  for (const s of sp) {
    for (let k = p; k < Math.min(tn.length, p + 5); k++) {
      if (tn[k] === s) { hit[k] = true; p = k + 1; break; }
    }
  }
  return hit;
}

/* Which word is being spoken at playback position `at`? times is
   non-decreasing, so the last stamp at or before the position wins.
   -1 before the first word. */
export function wordAt(times: number[], at: number): number {
  const p = at + READ_LAG;
  let cur = -1;
  for (let i = 0; i < times.length; i++) { if (times[i] <= p) cur = i; else break; }
  return cur;
}

/* One pass, longest phrase first, so "and stuff" is one filler, not two.
   The live highlighter and the counter share this regex deliberately: the
   marks you watch during a run are the marks you are scored on. */
export const FILLER_RE = new RegExp("\\b(" +
  [...HARD, ...CRUTCH].sort((a, b) => b.length - a.length).map(f => f.replace(/ /g, "\\s+")).join("|") +
  ")\\b", "gi");

export interface FillerCount { hard: number; crutch: number; total: number; found: Record<string, number> }

export function countFillers(text: string): FillerCount {
  let hard = 0, crutch = 0;
  const found: Record<string, number> = {};
  for (const m of norm(text).matchAll(FILLER_RE)) {
    const f = m[0].replace(/\s+/g, " ");
    found[f] = (found[f] || 0) + 1;
    if (HARD.includes(f)) hard++; else crutch++;
  }
  return { hard, crutch, total: hard + crutch, found };
}

/* longest common subsequence length — texts are short, O(n*m) is fine */
function lcs(a: string[], b: string[]): number {
  const n = b.length;
  let prev = new Uint16Array(n + 1), cur = new Uint16Array(n + 1);
  for (let i = 0; i < a.length; i++) {
    for (let j = 1; j <= n; j++) cur[j] = a[i] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    const t = prev; prev = cur; cur = t; cur.fill(0);
  }
  return prev[n];
}
export function accuracy(spoken: string, target: string): number {
  const a = words(spoken), b = words(target);
  if (!b.length) return 0;
  return Math.round(100 * Math.min(1, lcs(a, b) / b.length));
}
export function variety(text: string): number | null {
  const content = words(text).filter(w => !STOP.has(w) && w.length > 2);
  if (content.length < 12) return null;
  return Math.round(100 * new Set(content).size / content.length);
}
/* Stems match so "reconciled" counts as "reconcile". The target is normalised
   too, or a capital or an apostrophe could never match. */
export function usedWord(text: string, target: string | null | undefined): boolean {
  const t = norm(target || "");
  if (!t) return false;                       // else every word startsWith("")
  const stem = t.slice(0, Math.max(4, t.length - 3));
  return words(text).some(w => w.startsWith(stem));
}

/* ══ YOUR OWN TEXT (F1) ═══════════════════════════════════════════ */

/* Pasted text arrives with markdown, bullets, emoji and smart quotes. Reduce
   it to plain sentences before anything tokenises it. "|" is our breath-mark
   syntax, so a literal one in the paste would silently split the passage. */
export function cleanText(s: unknown): string {
  return String(s || "")
    .replace(/\p{Extended_Pictographic}|️/gu, " ")
    .replace(/^[ \t]*(?:[-*•>]+|\d+[.)])[ \t]+/gm, "")     // bullets, numbering, quotes
    .replace(/[#*_`~|]+/g, " ")                              // markdown emphasis, headings, code
    .replace(/\s+/g, " ").trim();
}

/* Breath marks for a passage nobody marked by hand. Always after a sentence
   or clause end; after a comma once the segment is long enough to need air;
   and never more than 14 words without one — at the last comma if possible.
   Returns the READINGS format: segments joined by " | ". */
export function autoBreaths(text: string): string {
  const out: string[] = [];
  let seg: string[] = [];
  const cut = () => { if (seg.length) { out.push(seg.join(" ")); seg = []; } };
  for (const w of tokens(cleanText(text))) {
    seg.push(w);
    if (/[.!?;:]["”’)]*$/.test(w)) cut();
    else if (/,["”’)]*$/.test(w) && seg.length >= 6) cut();
    else if (seg.length >= 14) {
      // out of air: break at the last comma if there is one, so the cut
      // lands on a phrase boundary rather than stranding a word or two
      const c = seg.findLastIndex((x, i) => i >= 2 && /,["”’)]*$/.test(x));
      if (c < 0) cut();
      else { const rest = seg.splice(c + 1); cut(); seg = rest; }
    }
  }
  cut();
  return out.join(" | ");
}
