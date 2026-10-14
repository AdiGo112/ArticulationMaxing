/* text.js — Pure text and measurement helpers. No DOM, no state.
   Speakeasy. Native ES modules, no build step: the browser loads these directly. */

import { CRUTCH, HARD, STOP } from "./content.js";

/* ══ TEXT HELPERS ═════════════════════════════════════════════════ */

/* fold curly apostrophes to straight first: our copy is typeset with ’ but the
   speech recogniser returns ', and both must tokenise to the same word */
export const norm = s => s.toLowerCase().replace(/[’ʼ´]/g,"'")
  .replace(/[^a-z0-9'\s]/g," ").replace(/\s+/g," ").trim();
export const words = s => norm(s) ? norm(s).split(" ") : [];
/* Display tokens — the original text split on whitespace, punctuation intact.
   Word timings are indexed by THIS, not by words(), so the spans rendered for
   playback and the timestamps recorded during the session can never drift. */
export const tokens = s => s.trim() ? s.trim().split(/\s+/) : [];

/* Recognition reports a word slightly after it was spoken, so highlighting at
   the raw stamp always runs late. Nudge the playhead forward by this much. */
export const READ_LAG = 0.42;

/* Loudness as a score, from the raw RMS averaged over speech.
   The old version reused the drawing curve, which saturates at rms 0.13 — so
   every normal speaking voice pinned at the top, and anything louder scored
   WORSE than a mumble. Decibels are monotonic across the whole real range:
   -46 dB (barely audible) → 0, 0 dB (clipping) → 100. */
export function projFromRms(meanRms){
  const db = 20 * Math.log10(Math.max(meanRms, 1e-5));
  return clamp(Math.round((db + 46) / 46 * 100), 0, 100);
}

/* Reading a set passage produces two different facts that must not be mixed:
     acc      — of the words you actually reached, how many came through
     coverage — how much of the passage you got to at all
   Dividing hits by the whole passage conflates them, so stopping early reads
   as catastrophically bad diction rather than as an unfinished passage. */
export function readStats(spoken, target){
  const hit = matchTarget(spoken, target), n = hit.length;
  let last = -1;
  for(let i=0;i<n;i++) if(hit[i]) last = i;
  const covered = last + 1;
  if(!n || covered < 3) return { acc:0, coverage:0, covered:0, missed:n, hit };
  let good = 0;
  for(let i=0;i<covered;i++) if(hit[i]) good++;
  return { acc: Math.round(100*good/covered), coverage: Math.round(100*covered/n),
           covered, missed: covered - good, hit };
}

/* Which words of a set passage were actually recognised, in order?
   Returns one boolean per target token. A forward pointer with a short
   lookahead, so a dropped or inserted word costs you that word and not the
   rest of the line. The booth and the report both use this, so the marking
   you watched live is exactly the marking you get back afterwards. */
export function matchTarget(spoken, target){
  const sp = words(spoken), tn = tokens(target).map(w => words(w)[0] || "");
  const hit = new Array(tn.length).fill(false);
  let p = 0;
  for(const s of sp){
    for(let k=p; k<Math.min(tn.length, p+5); k++){
      if(tn[k] === s){ hit[k] = true; p = k+1; break; }
    }
  }
  return hit;
}

/* Which word is being spoken at playback position `at`?
   times is non-decreasing, so the last stamp at or before the position wins.
   Returns -1 before the first word. */
export function wordAt(times, at){
  const p = at + READ_LAG;
  let cur = -1;
  for(let i=0;i<times.length;i++){ if(times[i] <= p) cur = i; else break; }
  return cur;
}

/* One pass, longest phrase first. Tallying each filler separately counted
   overlapping phrases twice — "and stuff" scored as both "stuff" and "and
   stuff" — so a single verbal tic cost double. Alternation with the longest
   entries first lets the phrase win and consume its words.

   The live highlighter and the counter share this regex deliberately: the marks
   you watch during a run are then always the same marks you are scored on.
   Sharing a /g regex is safe here because replace() resets lastIndex when it
   finishes and matchAll() works on its own clone. */
export const FILLER_RE = new RegExp("\\b(" +
  [...HARD, ...CRUTCH].sort((a,b)=>b.length-a.length).map(f=>f.replace(/ /g,"\\s+")).join("|") +
  ")\\b", "gi");

export function countFillers(text){
  let hard=0, crutch=0; const found={};
  for(const m of norm(text).matchAll(FILLER_RE)){
    const f = m[0].replace(/\s+/g," ");
    found[f] = (found[f]||0)+1;
    if(HARD.includes(f)) hard++; else crutch++;
  }
  return {hard, crutch, total:hard+crutch, found};
}

/* longest common subsequence length — texts are short, O(n*m) is fine */
function lcs(a,b){
  const n=b.length; let prev=new Uint16Array(n+1), cur=new Uint16Array(n+1);
  for(let i=0;i<a.length;i++){
    for(let j=1;j<=n;j++) cur[j] = a[i]===b[j-1] ? prev[j-1]+1 : Math.max(prev[j],cur[j-1]);
    const t=prev; prev=cur; cur=t; cur.fill(0);
  }
  return prev[n];
}
export function accuracy(spoken, target){
  const a=words(spoken), b=words(target);
  if(!b.length) return 0;
  return Math.round(100 * Math.min(1, lcs(a,b)/b.length));
}
export function variety(text){
  const content = words(text).filter(w=>!STOP.has(w) && w.length>2);
  if(content.length < 12) return null;
  return Math.round(100 * new Set(content).size / content.length);
}
/* stems match so "reconciled" counts as "reconcile".
   Normalise the target too: words() lowercases what was spoken, so a target
   carrying a capital or an apostrophe could never match and Word Forge would
   quietly mark a correct answer wrong. */
export function usedWord(text, target){
  const t = norm(target || "");
  if(!t) return false;                       // else every word startsWith("")
  const stem = t.slice(0, Math.max(4, t.length-3));
  return words(text).some(w => w.startsWith(stem));
}
export const esc = s => String(s).replace(/[&<>]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));

export const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

/* ══ YOUR OWN TEXT (F1) ═══════════════════════════════════════════ */

/* Pasted text arrives with markdown, bullets, emoji and smart quotes. Reduce
   it to plain sentences before anything tokenises it. "|" is our breath-mark
   syntax, so a literal one in the paste would silently split the passage. */
export function cleanText(s){
  return String(s || "")
    .replace(/\p{Extended_Pictographic}|\uFE0F/gu, " ")
    .replace(/^[ \t]*(?:[-*•>]+|\d+[.)])[ \t]+/gm, "")     // bullets, numbering, quotes
    .replace(/[#*_`~|]+/g, " ")                              // markdown emphasis, headings, code
    .replace(/\s+/g, " ").trim();
}

/* Breath marks for a passage nobody marked by hand. Always after a sentence
   or clause end; after a comma once the segment is long enough to need air;
   and never more than 14 words without one — at the last comma if possible. Returns the READINGS format:
   segments joined by " | ". */
export function autoBreaths(text){
  const out = [];
  let seg = [];
  const cut = () => { if(seg.length){ out.push(seg.join(" ")); seg = []; } };
  for(const w of tokens(cleanText(text))){
    seg.push(w);
    if(/[.!?;:]["”’)]*$/.test(w)) cut();
    else if(/,["”’)]*$/.test(w) && seg.length >= 6) cut();
    else if(seg.length >= 14){
      // out of air: break at the last comma if there is one, so the cut
      // lands on a phrase boundary rather than stranding a word or two
      const c = seg.findLastIndex((x, i) => i >= 2 && /,["”’)]*$/.test(x));
      if(c < 0) cut();
      else { const rest = seg.splice(c + 1); cut(); seg = rest; }
    }
  }
  cut();
  return out.join(" | ");
}
