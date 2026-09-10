/* storage.js — The single localStorage record, read and written whole.
   Speakeasy. Native ES modules, no build step: the browser loads these directly. */

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
