/* stage.js — The markup the booth shows for one run.
   Speakeasy. Native ES modules, no build step: the browser loads these directly. */

import { esc } from "./text.js";

/* The stage markup for a run built by buildRun(). Words the recogniser is
   matched against are wrapped in <w> so the booth can light them one by one. */
const wrapWords = s => s.split(" ").map(w=>`<w>${esc(w)}</w>`).join(" ");
export function stageHtml(run){
  switch(run.drill){
    case "impromptu": { const f = run.framework;
      return `<div class="kick eyebrow">Impromptu · ${esc(f.name)}</div>
            <div class="big">${esc(run.prompt)}</div>
            <div class="def">${esc(f.why)}</div>
            <div class="rail">${f.steps.map((s,i)=>
              `<div class="step" data-i="${i}"><div class="sn">${String(i+1).padStart(2,"0")}</div>
               <div class="st">${esc(s.t)}</div><div class="sh">${esc(s.h)}</div></div>`).join("")}</div>`; }
    case "filler":
      return `<div class="kick eyebrow">Filler Hunt · 60 seconds · target zero</div>
            <div class="big">${esc(run.prompt)}</div>
            <div class="def">Nothing to work out here — you already know the answer. Just keep talking for the full minute. Only fillers and pauses are scored; the content is not.</div>`;
    case "pace":
      return `<div class="kick eyebrow">Read aloud${run.source?" · "+esc(run.source):""}</div>
            <div class="read">${run.display.split("|").map(seg =>
              seg.trim().split(/\s+/).filter(Boolean).map(w=>`<w>${esc(w)}</w>`).join(" ")
            ).join(' <span class="brk">‖</span> ')}</div>`;
    case "diction":
      return `<div class="kick eyebrow">Diction · ${esc(run.focus)} · three times through</div>
            <div class="read">${wrapWords(run.target)}</div>
            <div class="def">Say it three times without a stumble. Red words are ones the recogniser couldn’t make out.</div>`;
    case "word":
      return `<div class="kick eyebrow">Word Forge</div>
            <div class="big">${esc(run.requireWord)}</div>
            <div class="def">${esc(run.def)}<br><i>e.g. &ldquo;${esc(run.example)}&rdquo;</i></div>`;
    default:
      return `<div class="kick eyebrow">Echo · listen, then repeat</div>
          <div class="read">${wrapWords(run.target)}</div>
          <div class="def">Match the rhythm and the stress, not just the words.</div>`;
  }
}
