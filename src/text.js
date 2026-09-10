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

export function countFillers(text){
  const t = " " + norm(text) + " ";
  let hard=0, crutch=0; const found={};
  const tally = (list, isHard) => list.forEach(f=>{
    const m = t.match(new RegExp("(?<=\\s)"+f.replace(/ /g,"\\s+")+"(?=\\s)","g"));
    if(m){ found[f]=(found[f]||0)+m.length; if(isHard) hard+=m.length; else crutch+=m.length; }
  });
  try{ tally(HARD,true); tally(CRUTCH,false); }
  catch(e){                                    // Safari <16.4 has no lookbehind
    const ws = words(text);
    ws.forEach(w=>{ if(HARD.includes(w)){ hard++; found[w]=(found[w]||0)+1; }
                    else if(CRUTCH.includes(w)){ crutch++; found[w]=(found[w]||0)+1; } });
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
/* stems match so "reconciled" counts as "reconcile" */
export function usedWord(text, target){
  const stem = target.slice(0, Math.max(4, target.length-3));
  return words(text).some(w => w.startsWith(stem));
}
export const esc = s => String(s).replace(/[&<>]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));

export const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
