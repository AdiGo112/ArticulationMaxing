/* storage.js — The single localStorage record, read and written whole.
   Speakeasy. Native ES modules, no build step: the browser loads these directly. */

import { buildPlan, packById } from "./drills.js";

/* ══ STORAGE ══════════════════════════════════════════════════════ */

const KEY = "speakeasy.v1";
export const store = {
  /* Every caller assumes sessions is an array, so a stored value of the wrong
     shape is worse than no stored value at all — JSON.parse("5") is truthy and
     used to sail straight through, leaving sessions undefined and taking the
     home screen down with it on the next render. */
  read(){
    try{
      const d = JSON.parse(localStorage.getItem(KEY));
      if(!d || typeof d !== "object" || Array.isArray(d)) return {sessions:[],theme:null};
      if(!Array.isArray(d.sessions)) d.sessions = [];
      if(!Array.isArray(d.cards)) d.cards = [];        // diction retry cards (F5)
      return d;
    }catch(e){ return {sessions:[],theme:null}; }
  },
  write(d){ try{ localStorage.setItem(KEY, JSON.stringify(d)); }catch(e){} },
  add(s){ const d=this.read(); d.sessions.push(s); d.sessions=d.sessions.slice(-200); this.write(d); return d; },
  set(k,v){ const d=this.read(); d[k]=v; this.write(d); }
};

export function dayKey(ts){ const d=new Date(ts); return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate(); }
export function streak(sessions){
  if(!sessions.length) return 0;
  const days = new Set(sessions.map(s=>dayKey(s.at)));
  let n=0, cur=new Date();
  if(!days.has(dayKey(cur.getTime()))) cur.setDate(cur.getDate()-1);  // today not done yet: streak still alive
  while(days.has(dayKey(cur.getTime()))){ n++; cur.setDate(cur.getDate()-1); }
  return n;
}

/* ══ THE DAILY PLAN ═════════════════════════════════════════════
   Built by buildPlan() (drills.js); this half only persists it. */

const todayKey = () => dayKey(Date.now());

/* The plan is regenerated once a day and remembers what you have finished. */
export function readPlan(){
  const d = store.read(), p = d.plan;
  if(p && p.day === todayKey()) return p;
  const built = buildPlan(d.sessions || [], 3, packById(d.pack));
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

/* ══ BACKUP ═════════════════════════════════════════════════════════
   History lives only in this browser, and browsers delete it: clearing site
   data does, and Safari drops a site's storage after 7 days without a visit.
   A backup file is the only copy that survives that until accounts exist.
   The validator below is also the shape a server import must accept (F11):
   anything that doesn't look like a session is dropped, never trusted.
   The Anthropic key is stored separately and is never part of a backup.   */

export const BACKUP_KIND = "speakeasy-backup";
const MAX_SESSIONS = 200;                        // the same cap store.add() keeps

export const exportBackup = (record, now) => ({
  kind: BACKUP_KIND, version: 1, exportedAt: new Date(now).toISOString(),
  sessions: record.sessions || [], cards: record.cards || []
});

const num = (v, lo, hi) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
const str = (v, max) => typeof v === "string" && v.length > 0 && v.length <= max;
const nums = (o, lo, hi) => o && typeof o === "object" && !Array.isArray(o) &&
  Object.values(o).every(v => v == null || num(v, lo, hi));

/* One session as stored by finish(), or null if it isn't one. Only known
   fields are copied, so nothing unexpected rides along into storage. */
function cleanSession(s, drills){
  if(!s || typeof s !== "object") return null;
  if(!num(s.at, 1e12, 1e13) || !drills.includes(s.drill) || !num(s.score, 0, 100)) return null;
  const out = { at: s.at, drill: s.drill, name: str(s.name, 40) ? s.name : s.drill, score: Math.round(s.score),
    wpm: num(s.wpm, 0, 600) ? s.wpm : null, fillers: num(s.fillers, 0, 10000) ? s.fillers : null };
  if(nums(s.parts, 0, 100)) out.parts = { ...s.parts };
  if(str(s.promptId, 64)) out.promptId = s.promptId;
  if(typeof s.reading === "boolean") out.reading = s.reading;
  if(num(s.v, 1, 1000)) out.v = s.v;
  if(num(s.secs, 0, 3600)) out.secs = s.secs;
  // raw is the measurement object: plain numbers plus the filler breakdown
  if(s.raw && typeof s.raw === "object" && JSON.stringify(s.raw).length < 4000){
    const { f, ...rest } = s.raw;
    if(Object.values(rest).every(v => v == null || typeof v === "boolean" || num(v, -1e6, 1e6)) &&
       f && num(f.hard, 0, 1e4) && num(f.crutch, 0, 1e4) && num(f.total, 0, 1e4) && nums(f.found, 0, 1e4))
      out.raw = s.raw;
  }
  return out;
}

const cleanCard = c => c && str(c.word, 40) && str(c.twisterId, 64) && num(c.box, 1, 5) &&
  num(c.dueAt, 1e12, 1e13) && (c.misses == null || num(c.misses, 0, 100))
  ? { word: c.word, twisterId: c.twisterId, box: c.box, misses: c.misses || 0, dueAt: c.dueAt } : null;

/* Parse a backup file's text. Returns { sessions, cards, dropped } or throws
   an Error whose message can be shown to the user as-is. */
export function parseBackup(text, drillIds){
  let d;
  try{ d = JSON.parse(text); }catch(e){ throw new Error("That file isn't a Speakeasy backup — it isn't valid JSON."); }
  if(!d || d.kind !== BACKUP_KIND) throw new Error("That file isn't a Speakeasy backup.");
  if(d.version !== 1) throw new Error("This backup comes from a newer version of Speakeasy. Reload the page and try again.");
  const rawS = Array.isArray(d.sessions) ? d.sessions.slice(-5000) : [];
  const rawC = Array.isArray(d.cards) ? d.cards.slice(-2000) : [];
  const sessions = rawS.map(s => cleanSession(s, drillIds)).filter(Boolean);
  const cards = rawC.map(cleanCard).filter(Boolean);
  return { sessions, cards, dropped: rawS.length - sessions.length + rawC.length - cards.length };
}

/* Merge a parsed backup into the current record. Sessions are matched by
   time and drill, so restoring the same file twice changes nothing; the
   newest MAX_SESSIONS are kept. A card already here wins — it is the
   fresher copy. Returns the new record and how many sessions were added. */
export function mergeBackup(record, backup){
  const key = s => s.at + "|" + s.drill;
  const have = new Set((record.sessions || []).map(key));
  const added = backup.sessions.filter(s => !have.has(key(s)));
  const sessions = (record.sessions || []).concat(added).sort((a,b) => a.at - b.at).slice(-MAX_SESSIONS);
  const cardKey = c => c.twisterId + "|" + c.word;
  const haveCard = new Set((record.cards || []).map(cardKey));
  const cards = (record.cards || []).concat(backup.cards.filter(c => !haveCard.has(cardKey(c))));
  return { record: { ...record, sessions, cards }, added: added.length };
}
