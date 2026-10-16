/* drills.js — The six drills, local language analysis, and the daily plan.
   Speakeasy. Native ES modules, no build step: the browser loads these directly. */

import { CRUTCH, EASY_PROMPTS, ECHOES, FRAMEWORKS, HARD, INTERVIEW_PROMPTS, PITCH_PROMPTS, PROMPTS, READINGS, STOP, TWISTERS, WORDS } from "./content.js";
import { autoBreaths, countFillers, norm, readStats, tokens, words } from "./text.js";

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
    desc:"A minute on something you already know cold, so nothing competes for your attention. Every um, uh, like or basically lights up the moment it lands. Target: zero.",
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

/* Pick the material for one run. Pure data — no markup, no storage — so the
   same object can be rendered by any UI, replayed by "Run it again", and
   stored by its promptId. The booth turns it into markup (stageHtml, run.js). */
export function buildRun(id, opts){
  opts = opts || {};
  if(id==="impromptu"){
    // goal packs (F8): interview questions want a story or a position, so STAR
    // or PREP; a pitch is sixty seconds, not ninety
    const pool = opts.pool === "interview" ? INTERVIEW_PROMPTS : opts.pool === "pitch" ? PITCH_PROMPTS : PROMPTS;
    const p = pick(pool);
    const f = pick(opts.pool === "interview" ? FRAMEWORKS.filter(x => x.id === "star" || x.id === "prep") : FRAMEWORKS);
    return { drill:id, promptId:p.id, dur: opts.pool === "pitch" ? 60 : 90, target:null, framework:f, prompt:p.x, cd:p.x };
  }
  if(id==="filler"){
    // an easy topic on purpose: see EASY_PROMPTS
    const p = pick(EASY_PROMPTS);
    return { drill:id, promptId:p.id, dur:60, target:null, prompt:p.x, cd:p.x };
  }
  if(id==="pace"){
    const r = pick(READINGS);
    const target = r.x.replace(/\|/g," ");
    // ~2.5 words a second is the middle of the target band. The floor is the
    // point of the drill: pace drift and breath control do not show up in a
    // twenty-second read, however tidy that read is.
    return { drill:id, promptId:r.id, dur: Math.max(60, Math.round(words(target).length/2.5)), target,
      display: r.x,                       // keeps the "|" breath marks for the report
      source: r.s, cd:r.t };
  }
  if(id==="diction"){
    // a twister with words due for a retry (dueCards) beats a random one
    const t = TWISTERS.find(x => x.id === opts.twisterId) || pick(TWISTERS);
    return { drill:id, promptId:t.id, dur:30, target:(t.x+" ").repeat(3).trim(), focus:t.f, cd:t.x };
  }
  if(id==="word"){
    const w = pick(WORDS);
    return { drill:id, promptId:w.id, dur:35, target:null, requireWord:w.w, def:w.d, example:w.e,
      cd:`${w.w} — ${w.d}` };
  }
  const line = pick(ECHOES);
  return { drill:"echo", promptId:line.id, dur:22, target:line.x, speak:line.x, cd:"Listen first" };
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
   when there is not enough history to know what is weak yet. A goal pack (F8)
   takes every slot but the last, weakest of its drills first; the last slot
   stays on your weakest metric overall, so a pack never hides it. */
export function buildPlan(sessions, size, pack){
  size = size || 3;
  const avg = metricAverages(sessions);
  const order = [], reason = {};
  for(const k of Object.keys(avg).sort((a,b) => avg[a] - avg[b])){
    const d = METRIC_DRILL[k];
    if(!d || order.includes(d)) continue;
    order.push(d); reason[d] = { metric:k, score:avg[k] };
  }
  // not enough data: favour whatever has been practised least
  const count = {};
  DRILLS.forEach(d => count[d.id] = 0);
  sessions.forEach(s => { if(count[s.drill] != null) count[s.drill]++; });
  DRILLS.slice().sort((a,b) => count[a.id] - count[b.id]).forEach(d => order.includes(d.id) || order.push(d.id));

  const inPack = pack ? pack.drills.map(x => x.drill) : [];
  const drills = order.filter(d => inPack.includes(d)).slice(0, size - 1);
  for(const d of order) if(drills.length < size && !drills.includes(d)) drills.push(d);
  const why = {};
  drills.forEach(d => { if(reason[d]) why[d] = reason[d]; });
  return { drills, why };
}

/* ══ GOAL PACKS (F8) ═════════════════════════════════════════════
   People arrive with a goal, not a drill name. A pack biases the daily plan
   (buildPlan) and, where it says so, the prompts a drill draws from. */

export const PACKS = [
  { id:"interview", name:"Job interview",
    blurb:"The questions panels actually ask, answered in a shape they can follow, without the ums.",
    drills:[{ drill:"impromptu", pool:"interview" }, { drill:"filler" }] },
  { id:"presentation", name:"Presentation",
    blurb:"A pace a room can follow, pauses that land, and a voice that carries.",
    drills:[{ drill:"pace" }, { drill:"echo" }] },
  { id:"pitch", name:"Pitch / sales",
    blurb:"Sixty seconds to sell something to a named listener, in precise words.",
    drills:[{ drill:"impromptu", pool:"pitch" }, { drill:"word" }] },
  { id:"clarity", name:"Everyday clarity",
    blurb:"Consonants that land, rhythm that carries, and fewer fillers.",
    drills:[{ drill:"diction" }, { drill:"echo" }, { drill:"filler" }] }
];
export const packById = id => PACKS.find(p => p.id === id) || null;

/* buildRun options for a drill under a pack: which prompt pool, if any. */
export const packRunOpts = (pack, drill) => {
  const d = pack && pack.drills.find(x => x.drill === drill);
  return d && d.pool ? { pool: d.pool } : undefined;
};

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

export const nextInPlan = p => p.drills.find(d => !p.done.includes(d)) || null;

/* ══ YOUR OWN TEXT (F1) ══════════════════════════════════════════
   A pasted talk runs through exactly the Pace & Pause machinery: the same
   marking, coverage and diction, with breath marks placed automatically.
   Crutch words aren't scored, as on any set passage (fillerRate's reading
   flag) — but they are the user's own words, so the run lists them for the
   setup screen to point out.                                           */

export const TEXT_MAX_WORDS = 2000;

export function buildTextRun(text, opts){
  opts = opts || {};
  const display = autoBreaths(text);
  const target = display.replace(/\|/g, " ").replace(/\s+/g, " ").trim();
  if(!words(target).length) return null;
  const found = countFillers(target).found;
  return { drill:"pace", promptId: opts.id ? "text-" + opts.id : null, custom:true,
    dur: Math.max(30, Math.round(words(target).length/2.5)), target, display,
    source: opts.title || "", cd: opts.title || "Your text",
    crutch: Object.keys(found).filter(w => CRUTCH.includes(w)) };
}

/* ══ DICTION RETRY (F5) ══════════════════════════════════════════
   The same sounds fail for the same person. Words that come out coral in
   Diction Gym become cards; Leitner boxes bring them back at 1, 3, 7, 14
   and 30 days until they come through clean. A card is a word inside a
   specific twister — the sound depends on its neighbours.               */

const DAY = 864e5;
export const BOX_DAYS = [1, 3, 7, 14, 30];

/* Which content words of a twister came through and which didn't.
   Only words you reached count (readStats' coverage), and a word missed in
   any of the three repetitions is missed. Stopwords are skipped: a dropped
   "the" is the recogniser, not your consonants. */
export function dictionOutcome(spoken, target){
  const st = readStats(spoken, target), toks = tokens(target);
  const hit = new Set(), missed = new Set();
  for(let i = 0; i < st.covered; i++){
    const w = words(toks[i])[0];
    if(!w || w.length < 3 || STOP.has(w)) continue;
    (st.hit[i] ? hit : missed).add(w);
  }
  missed.forEach(w => hit.delete(w));
  return { hit:[...hit], missed:[...missed] };
}

/* Apply one Diction Gym result to the card set; returns { cards, retired, cleared }.
   A miss always sends the card back to box 1. A hit only promotes a card
   that was due — repeating the twister the same afternoon proves nothing
   about next week. Passing box 5 retires a card; so do five misses in a
   row, because some words the recogniser can't produce for anyone. */
export function updateCards(cards, twisterId, outcome, now){
  const out = (cards || []).map(c => ({...c})), retired = [], cleared = [];
  const find = w => out.find(c => c.word === w && c.twisterId === twisterId);
  for(const w of outcome.missed){
    const c = find(w);
    if(c){ c.box = 1; c.misses = (c.misses||0) + 1; c.dueAt = now + DAY; }
    else out.push({ word:w, twisterId, box:1, misses:1, dueAt: now + DAY });
  }
  for(const w of outcome.hit){
    const c = find(w);
    if(!c || c.dueAt > now) continue;
    c.misses = 0; cleared.push(w);
    if(c.box >= BOX_DAYS.length){ retired.push({ word:w, why:"learned" }); c.gone = true; }
    else { c.box++; c.dueAt = now + BOX_DAYS[c.box - 1] * DAY; }
  }
  for(const c of out) if(!c.gone && c.misses >= 5){ retired.push({ word:c.word, why:"recogniser" }); c.gone = true; }
  return { cards: out.filter(c => !c.gone), retired, cleared };
}

/* Due cards, most overdue first. */
export const dueCards = (cards, now) =>
  (cards || []).filter(c => c.dueAt <= now).sort((a,b) => a.dueAt - b.dueAt);

/* The report line for one updateCards() result, or null when nothing changed:
   "“sixth”, “sheikh's” came back clean — 2 sounds retired." */
export function retryNote(res){
  const q = ws => ws.map(w => `“${w}”`).join(", ");
  const learned = res.retired.filter(r => r.why === "learned").length;
  const hard = res.retired.filter(r => r.why === "recogniser").map(r => r.word);
  const out = [];
  if(res.cleared.length) out.push(`${q(res.cleared)} came back clean` +
    (learned ? ` — ${learned} sound${learned > 1 ? "s" : ""} retired.` : "."));
  if(hard.length) out.push(`Retired ${q(hard)}: the recogniser struggles with ${hard.length > 1 ? "these" : "this one"}, not you.`);
  return out.length ? out.join(" ") : null;
}

/* ══ PROGRESS AS FACTS (F2) ══════════════════════════════════════
   "Fillers down 58% since 4 Sep" lands harder than any chart. Compares the
   median of the earliest third of your history against the latest third —
   medians, so one bad day can neither create nor erase a trend — and only
   claims a change that is both relatively and absolutely real.
   Reads the raw measurements stored since scoring v1; older sessions are
   simply not counted.                                                   */

const median = a => { const s = [...a].sort((x,y) => x-y), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m-1] + s[m]) / 2; };
const shortDate = t => new Date(t).toLocaleDateString("en-GB", { day:"numeric", month:"short" });
const offBand = w => w < 138 ? 138 - w : w > 165 ? w - 165 : 0;   // scoreRun's full-marks pace band
const pctOf = (a, b) => Math.round(Math.abs(b - a) / Math.max(a, b) * 100);
const fix = v => v < 10 ? v.toFixed(1).replace(/\.0$/, "") : String(Math.round(v));

/* value(s) → number | null. better: which direction is good. minAbs: the
   smallest absolute change worth mentioning. rel:false skips the 15%
   relative test, for values that are distances rather than amounts. */
const FACT_METRICS = {
  filler: { drill:"filler", better:"down", minAbs:0.5,
    value: s => s.raw.words >= 20 ? s.raw.f.total / Math.max(s.raw.words, 50) * 100 : null,
    say: (a, b, since, worse) => worse
      ? `Fillers crept up ${pctOf(a,b)}% since ${since}`
      : `Fillers down ${pctOf(a,b)}% since ${since}` },
  pace: { drill:"pace", better:"down", minAbs:5, rel:false,
    value: s => s.raw.wpm ? offBand(s.raw.wpm) : null, show: s => s.raw.wpm,
    say: (a, b, since, worse, from, to) => worse
      ? `Your pace drifted from ${from} to ${to} wpm since ${since}`
      : `Your pace settled from ${from} to ${to} wpm since ${since}` },
  pause: { drill:"pace", better:"up", minAbs:1,
    value: s => s.secs >= 20 ? s.raw.goodPauses / (s.secs / 60) : null,
    say: (a, b, since, worse) => worse
      ? `Deliberate pauses fell from ${fix(a)} to ${fix(b)} a minute since ${since}`
      : `From ${fix(a)} to ${fix(b)} deliberate pauses a minute since ${since}` },
  score: { drill:null, better:"up", minAbs:5,
    value: s => s.score,
    say: (a, b, since, worse) => worse
      ? `Scores slipped from ${Math.round(a)} to ${Math.round(b)} since ${since}`
      : `Your scores rose from ${Math.round(a)} to ${Math.round(b)} since ${since}` }
};

/* Up to `max` facts, biggest change first, progress before regressions.
   Each: { metric, kind:"better"|"worse", text, drill } — a regression
   carries the drill that trains it. */
export function facts(sessions, max){
  const out = [];
  const usable = (sessions || []).filter(s => s.raw && s.raw.f);
  for(const [k, M] of Object.entries(FACT_METRICS)){
    const pts = usable.map(s => ({ s, v: M.value(s) })).filter(p => p.v != null && Number.isFinite(p.v));
    if(pts.length < 6 || pts[pts.length-1].s.at - pts[0].s.at < 3 * DAY) continue;
    const third = Math.floor(pts.length / 3);
    const early = pts.slice(0, third), late = pts.slice(-third);
    const a = median(early.map(p => p.v)), b = median(late.map(p => p.v));
    const abs = Math.abs(b - a);
    // relative to the larger side, so falling all the way to zero still counts
    const rel = M.rel === false ? 1 : abs / Math.max(Math.abs(a), Math.abs(b));
    if(abs < M.minAbs || rel < 0.15) continue;
    const good = M.better === "down" ? b < a : b > a;
    const from = M.show && Math.round(median(early.map(p => M.show(p.s))));
    const to   = M.show && Math.round(median(late.map(p => M.show(p.s))));
    out.push({ metric:k, kind: good ? "better" : "worse", drill: good ? null : M.drill,
      rank: (good ? 2 : 1) + Math.min(rel, 0.99),
      text: M.say(a, b, shortDate(early[0].s.at), !good, from, to) });
  }
  return out.sort((x,y) => y.rank - x.rank).slice(0, max || 3).map(({rank, ...f}) => f);
}

/* Did the latest session set a personal record? Needs 5 earlier sessions of
   the same drill, so the first decent day isn't a "record" by default. */
export function recordFor(sessions){
  const all = (sessions || []).filter(s => s.raw && s.raw.f);
  const last = all[all.length-1];
  if(!last) return null;
  const prior = all.slice(0, -1).filter(s => s.drill === last.drill);
  if(prior.length < 5) return null;
  if(last.score > Math.max(...prior.map(s => s.score)))
    return { kind:"score", text:`Your best ${last.name} score yet` };
  const rate = s => s.raw.words >= 20 ? s.raw.f.total / Math.max(s.raw.words, 50) : Infinity;
  const best = Math.min(...prior.map(rate));
  if(Number.isFinite(best) && rate(last) < best)
    return { kind:"filler", text:"Your lowest filler rate yet" };
  return null;
}

/* ══ FILLER BUZZER (F3) ══════════════════════════════════════════
   A soft tick the moment an "um" lands, to interrupt the habit rather than
   the speaker. Off by default, on by default in Filler Hunt; a choice made
   per drill is remembered. Never on a set passage: there the words aren't
   yours, so a filler in them isn't a habit.                              */

export const BUZZ_GAP = 600;                     // ms between ticks

export const buzzOn = (prefs, drill) =>
  prefs && typeof prefs[drill] === "boolean" ? prefs[drill] : drill === "filler";

/* One transcript update → { fire, state }. Fires on a rise in the hard-filler
   count (every filler with `crutch`), debounced. The count only ever grows:
   Chrome revises interim text, and a revision must not tick twice. */
export function buzz(state, f, now, opts){
  opts = opts || {};
  const count = opts.crutch ? f.total : f.hard;
  const fire = !opts.reading && count > state.count && now - state.at >= BUZZ_GAP;
  return { fire, state: { count: Math.max(count, state.count), at: fire ? now : state.at } };
}
