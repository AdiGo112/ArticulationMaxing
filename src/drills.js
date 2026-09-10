/* drills.js — The six drills, local language analysis, and the daily plan.
   Speakeasy. Native ES modules, no build step: the browser loads these directly. */

import { ECHOES, FRAMEWORKS, HARD, PROMPTS, READINGS, STOP, TWISTERS, WORDS } from "./content.js";
import { dayKey, store } from "./storage.js";
import { esc, norm, words } from "./text.js";

/* ══ DRILLS ═══════════════════════════════════════════════════════ */

const pick = a => a[Math.floor(Math.random()*a.length)];
const T = "var(--tungsten)", M = "var(--meter)", L = "var(--live)";

export const DRILLS = [
  { id:"impromptu", name:"Impromptu", accent:T, dur:90, prep:15, tag:"Structure",
    icon:"M13 2 4 14h6l-1 8 9-12h-6z",
    desc:"A prompt you’ve never seen, a framework to hang it on, and ninety seconds. The rail tells you which part you should be on.",
    hint:"Read the prompt. Pick your last sentence before you start." },

  { id:"filler", name:"Filler Hunt", accent:L, dur:60, prep:5, tag:"Fluency",
    icon:"M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
    desc:"Talk for a minute on any topic. Every um, uh, like or basically lights up the moment it lands. Target: zero.",
    hint:"When you feel a filler coming, close your mouth instead. Silence is free." },

  { id:"pace", name:"Pace & Pause", accent:M, dur:0, prep:5, tag:"Delivery",
    icon:"M12 20a8 8 0 1 1 8-8M12 12l5-3",
    desc:"Read a passage aloud inside a 130–170 word-per-minute band. Amber marks are breath points — hold each one for a full beat.",
    hint:"The marks aren’t decoration. Stop completely at each one." },

  { id:"diction", name:"Diction Gym", accent:T, dur:0, prep:3, tag:"Clarity",
    icon:"M4 12h2l2-6 3 14 3-11 2 5h4",
    desc:"Tongue twisters, scored by whether the recogniser actually understood you. Sloppy consonants show up as red words.",
    hint:"Slow and perfect beats fast and mangled. Speed comes after accuracy." },

  { id:"word", name:"Word Forge", accent:M, dur:35, prep:10, tag:"Vocabulary",
    icon:"M12 3 3 8v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8",
    desc:"One precise word, one definition. Build a real sentence around it out loud — the drill checks you actually used it.",
    hint:"Don’t define the word. Use it, in a sentence about your own life." },

  { id:"echo", name:"Echo", accent:L, dur:0, prep:2, tag:"Cadence",
    icon:"M8 8a5 5 0 0 1 0 8M11.5 5a9 9 0 0 1 0 14M5 11v2",
    desc:"A well-shaped sentence is read to you. Repeat it back with the same rhythm and stress. Scored on accuracy.",
    hint:"Copy the melody, not just the words. Where did the voice rise and fall?" }
];
export const drillById = id => DRILLS.find(d=>d.id===id);

/* Build the stage for one run. Returns {html, target, rail, dur, speak} */
export function buildRun(id){
  if(id==="impromptu"){
    const p = pick(PROMPTS), f = pick(FRAMEWORKS);
    return { dur:90, target:null, framework:f,
      html:`<div class="kick eyebrow">Impromptu · ${esc(f.name)}</div>
            <div class="big">${esc(p)}</div>
            <div class="def">${esc(f.why)}</div>
            <div class="rail">${f.steps.map((s,i)=>
              `<div class="step" data-i="${i}"><div class="sn">${String(i+1).padStart(2,"0")}</div>
               <div class="st">${esc(s.t)}</div><div class="sh">${esc(s.h)}</div></div>`).join("")}</div>`,
      cd:`${p}` };
  }
  if(id==="filler"){
    const p = pick(PROMPTS);
    return { dur:60, target:null,
      html:`<div class="kick eyebrow">Filler Hunt · 60 seconds · target zero</div>
            <div class="big">${esc(p)}</div>
            <div class="def">Any topic works — this one is just to stop you stalling. The score is the fillers, not the content.</div>`,
      cd:p };
  }
  if(id==="pace"){
    const r = pick(READINGS);
    const target = r.x.replace(/\|/g," ");
    const html = r.x.split("|").map(seg =>
      seg.trim().split(/\s+/).filter(Boolean).map(w=>`<w>${esc(w)}</w>`).join(" ")
    ).join(' <span class="brk">‖</span> ');
    return { dur: Math.max(45, Math.round(words(target).length/2.5)), target,
      display: r.x,                       // keeps the "|" breath marks for the report
      html:`<div class="kick eyebrow">Read aloud${r.s?" · "+esc(r.s):""}</div>
            <div class="read">${html}</div>`,
      cd:r.t };
  }
  if(id==="diction"){
    const t = pick(TWISTERS);
    const target = (t.x+" ").repeat(3).trim();
    return { dur:30, target,
      html:`<div class="kick eyebrow">Diction · ${esc(t.f)} · three times through</div>
            <div class="read">${target.split(" ").map(w=>`<w>${esc(w)}</w>`).join(" ")}</div>
            <div class="def">Say it three times without a stumble. Red words are ones the recogniser couldn’t make out.</div>`,
      cd:t.x };
  }
  if(id==="word"){
    const w = pick(WORDS);
    return { dur:35, target:null, requireWord:w.w,
      html:`<div class="kick eyebrow">Word Forge</div>
            <div class="big">${esc(w.w)}</div>
            <div class="def">${esc(w.d)}<br><i>e.g. &ldquo;${esc(w.e)}&rdquo;</i></div>`,
      cd:`${w.w} — ${w.d}` };
  }
  const line = pick(ECHOES);
  return { dur:22, target:line, speak:line,
    html:`<div class="kick eyebrow">Echo · listen, then repeat</div>
          <div class="read">${line.split(" ").map(w=>`<w>${esc(w)}</w>`).join(" ")}</div>
          <div class="def">Match the rhythm and the stress, not just the words.</div>`,
    cd:"Listen first" };
}

/* ══ LOCAL LANGUAGE ANALYSIS ═════════════════════════════════════
   Deterministic, offline, instant, and in every browser. Not a model —
   it looks for specific habits that weaken spoken English and quotes your
   own words back. This is the floor: whatever else is available, this runs.  */

const HEDGE = ["i think","i guess","i suppose","maybe","perhaps","probably","sort of","kind of",
  "a bit","a little","i feel like","i would say","more or less","or something","i mean",
  "not sure","might be","could be","in my opinion","to be honest"];
const VAGUE = ["thing","things","stuff","something","someone","somebody","somewhere","anything",
  "everything","a lot","lots","some","various","certain","whatever"];
const INTENSIFIER = ["very","really","so","super","extremely","incredibly","totally","completely",
  "absolutely","quite","pretty","actually","literally","definitely","obviously"];

const countPhrases = (text, list) => {
  const t = " " + norm(text) + " ";
  const found = {};
  list.forEach(p => {
    // word-boundary safe without lookbehind: pad and match with spaces
    let i = 0, n = 0, needle = " " + p + " ";
    while((i = t.indexOf(needle, i)) !== -1){ n++; i += needle.length - 1; }
    if(n) found[p] = n;
  });
  return found;
};
const totalOf = o => Object.values(o).reduce((a,b)=>a+b, 0);
const topOf = (o, k) => Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0, k||3).map(e=>e[0]);

/* Findings are ordered by how much they cost you, worst first. */
export function analyseLanguage(text, opts){
  opts = opts || {};
  const ws = words(text), n = ws.length;
  const out = [];
  if(n < 12) return out;                       // too little to say anything honest about
  // floor the denominator and require more than one occurrence: in a 30-word
  // answer a single "someone" would otherwise cross a per-100 threshold and
  // get reported as a habit, which it isn't
  const per100 = c => (c / Math.max(n, 50)) * 100;
  const push = (id, weight, title, detail) => out.push({ id, weight, title, detail });

  const hedges = countPhrases(text, HEDGE), hCount = totalOf(hedges);
  if(hCount >= 2 && per100(hCount) >= 2.2)
    push("hedge", per100(hCount), "You are hedging",
      `${hCount} hedging phrase${hCount>1?"s":""} — ${topOf(hedges).map(w=>`“${w}”`).join(", ")}. ` +
      `Each one quietly tells the listener not to fully believe you. Say the claim, then defend it if challenged.`);

  const vague = countPhrases(text, VAGUE), vCount = totalOf(vague);
  if(vCount >= 2 && per100(vCount) >= 3)
    push("vague", per100(vCount), "Too many placeholder words",
      `${vCount} vague word${vCount>1?"s":""} — ${topOf(vague).map(w=>`“${w}”`).join(", ")}. ` +
      `Every one is a slot where a specific noun would have been stronger.`);

  const ints = countPhrases(text, INTENSIFIER), iCount = totalOf(ints);
  if(iCount >= 2 && per100(iCount) >= 3.5)
    push("intense", per100(iCount) * .8, "Intensifiers are doing the work",
      `${iCount} of them — ${topOf(ints).map(w=>`“${w}”`).join(", ")}. ` +
      `“Very important” is weaker than “essential”. Pick the stronger word instead of propping up a weak one.`);

  // a content word leaned on far more than the rest
  const content = ws.filter(w => !STOP.has(w) && w.length > 3);
  if(content.length >= 15){
    const freq = {};
    content.forEach(w => freq[w] = (freq[w]||0) + 1);
    const [word, count] = Object.entries(freq).sort((a,b)=>b[1]-a[1])[0];
    if(count >= 4 && count/content.length >= 0.05)
      push("repeat", count * 1.6, "One word is carrying too much",
        `You said “${word}” ${count} times. Reaching for a synonym forces a sharper thought, ` +
        `not just a different sound.`);
  }

  // starting clause after clause the same way
  const openers = {};
  ws.forEach((w, i) => { if(i === 0 || ["and","but","so","then","because"].includes(ws[i-1])) openers[w] = (openers[w]||0)+1; });
  const topOpen = Object.entries(openers).sort((a,b)=>b[1]-a[1])[0];
  if(topOpen && topOpen[1] >= 4)
    push("opener", topOpen[1], "Your clauses all start the same way",
      `${topOpen[1]} of them begin with “${topOpen[0]}”. Vary the entry point and the whole answer stops sounding like a list.`);

  // opened on a hedge instead of a position
  const first = ws.slice(0, 6).join(" ");
  if(HEDGE.some(h => first.includes(h)) || HARD.includes(ws[0]))
    push("open", 6, "Weak opening",
      `You started with “${ws.slice(0, 5).join(" ")}…”. The first sentence is the one they remember — ` +
      `lead with the position and put the caveat after it.`);

  // frameworks ask for a reason and an example; both leave linguistic traces
  if(opts.framework){
    const t = " " + norm(text) + " ";
    if(!/(^| )(because|since|the reason|that is why|which is why)( |$)/.test(t))
      push("reason", 5, "No reason given",
        `The ${opts.framework} shape asks you to say why. Nothing in this answer signals a reason — ` +
        `one “because” changes an assertion into an argument.`);
    if(!/(^| )(for example|for instance|such as|like when|once |last week|last year)( |$)/.test(t))
      push("example", 5.5, "No concrete example",
        `Nothing here points at a specific occasion. One real example is worth three more sentences of theory.`);
  }

  return out.sort((a,b) => b.weight - a.weight);
}

/* ══ THE DAILY SESSION ══════════════════════════════════════════
   Landing on six drills and having to choose is where a daily habit dies.
   A plan is three drills picked from your own weakest metrics, so the
   decision is already made and the practice is aimed at what is worst.  */

/* Which drill trains which weakness. Several metrics point at the same drill,
   which is fine — the plan takes the first three DISTINCT drills. */
const METRIC_DRILL = {
  filler: "filler",    // um, uh, crutch words
  pace:   "pace",      // too fast or too slow
  pause:  "pace",      // not pausing deliberately
  acc:    "diction",   // consonants not landing
  cover:  "diction",   // not getting through the text
  var:    "word",      // recycling the same words
  proj:   "echo"       // under-projecting, flat delivery
};
export const METRIC_NAME = {
  filler:"fillers", pace:"pace", pause:"pausing", acc:"diction",
  cover:"reading through", var:"word variety", proj:"projection"
};

/* Average each component over recent sessions. Older sessions have no `parts`,
   so they are simply skipped rather than treated as zeros. */
export function metricAverages(sessions, window){
  const sum = {}, n = {};
  sessions.slice(-(window || 10)).forEach(s => {
    if(!s.parts) return;
    for(const k in s.parts){
      if(typeof s.parts[k] !== "number") continue;
      sum[k] = (sum[k] || 0) + s.parts[k]; n[k] = (n[k] || 0) + 1;
    }
  });
  const out = {};
  for(const k in sum) out[k] = Math.round(sum[k]/n[k]);
  return out;
}

/* Three drills, worst weakness first. Falls back to the least-practised drills
   when there is not enough history to know what is weak yet. */
export function buildPlan(sessions, size){
  size = size || 3;
  const avg = metricAverages(sessions);
  const ranked = Object.keys(avg).sort((a,b) => avg[a] - avg[b]);
  const drills = [], why = {};
  for(const k of ranked){
    const d = METRIC_DRILL[k];
    if(!d || drills.includes(d)) continue;
    drills.push(d); why[d] = { metric:k, score:avg[k] };
    if(drills.length === size) break;
  }
  if(drills.length < size){
    // not enough data: favour whatever has been practised least
    const count = {};
    DRILLS.forEach(d => count[d.id] = 0);
    sessions.forEach(s => { if(count[s.drill] != null) count[s.drill]++; });
    DRILLS.slice().sort((a,b) => count[a.id] - count[b.id]).forEach(d => {
      if(drills.length < size && !drills.includes(d.id)) drills.push(d.id);
    });
  }
  return { drills, why };
}

/* Per-metric trend. One composite score can't tell you that your pace is
   improving while your fillers are not — which is exactly the thing worth
   knowing. Compares the recent half of a series against the earlier half. */
export function trendFor(sessions, key){
  const v = sessions.filter(s => s.parts && typeof s.parts[key] === "number")
                    .map(s => s.parts[key]);
  if(v.length < 3) return null;                 // too few points to claim a direction
  const half = Math.floor(v.length/2);
  const mean = a => a.reduce((x,y)=>x+y,0)/a.length;
  return { values:v, now:v[v.length-1], n:v.length,
           delta: Math.round(mean(v.slice(half)) - mean(v.slice(0, half))) };
}

const todayKey = () => dayKey(Date.now());

/* The plan is regenerated once a day and remembers what you have finished. */
export function readPlan(){
  const d = store.read(), p = d.plan;
  if(p && p.day === todayKey()) return p;
  const built = buildPlan(d.sessions || []);
  const fresh = { day: todayKey(), drills: built.drills, why: built.why, done: [] };
  store.set("plan", fresh);
  return fresh;
}
export function markPlanDone(drill){
  const p = readPlan();
  if(p.drills.includes(drill) && !p.done.includes(drill)){
    p.done = p.done.concat(drill);
    store.set("plan", p);
  }
  return p;
}
export const nextInPlan = p => p.drills.find(d => !p.done.includes(d)) || null;
