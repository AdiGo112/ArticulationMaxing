/* storage.js — The single localStorage record, read and written whole.
   Speakeasy. Native ES modules, no build step: the browser loads these directly. */

import { buildPlan } from "./drills.js";

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
