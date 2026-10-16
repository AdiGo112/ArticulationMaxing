/* storage.ts — The user's record: its shape, the daily plan, streaks, and
   backup files. Pure: where the record lives (IndexedDB, db.ts) is separate.
   Ported from the old app's storage.js. */

import { buildPlan, dictionOutcome, packById, retryNote, updateCards, type Card, type PlanPick, type Session } from "./drills.ts";

export interface Plan extends PlanPick { day: string; done: string[] }

export interface UserRecord {
  sessions: Session[];
  cards: Card[];                                 // diction retry (F5)
  plan?: Plan | null;
  pack?: string | null;                          // goal pack (F8)
  buzz?: Record<string, boolean>;                // filler buzzer per drill (F3)
  theme?: string | null;
}

export const emptyRecord = (): UserRecord => ({ sessions: [], cards: [], theme: null });

/* Every caller assumes sessions is an array, so a stored value of the wrong
   shape is worse than no stored value at all — JSON.parse("5") is truthy. */
export function normaliseRecord(d: unknown): UserRecord {
  if (!d || typeof d !== "object" || Array.isArray(d)) return emptyRecord();
  const r = d as UserRecord;
  if (!Array.isArray(r.sessions)) r.sessions = [];
  if (!Array.isArray(r.cards)) r.cards = [];
  return r;
}

/* The old app's localStorage text (or anything else) → a record, never a throw. */
export function parseRecord(text: string | null | undefined): UserRecord {
  try { return normaliseRecord(JSON.parse(text ?? "null")); } catch { return emptyRecord(); }
}

/* The old app's localStorage record → this app's, once, on first load. That
   record was user-editable, so sessions and cards pass the backup validator;
   the settings come across as they are, if they have the right type. */
export function migrateLegacy(text: string | null | undefined, drillIds: string[]): UserRecord {
  const r = parseRecord(text);
  const out: UserRecord = {
    sessions: r.sessions.map(s => cleanSession(s, drillIds)).filter((s): s is Session => !!s).slice(-MAX_SESSIONS),
    cards: r.cards.map(cleanCard).filter((c): c is Card => !!c),
    theme: typeof r.theme === "string" ? r.theme : null,
  };
  if (typeof r.pack === "string") out.pack = r.pack;
  if (r.buzz && typeof r.buzz === "object" && !Array.isArray(r.buzz))
    out.buzz = Object.fromEntries(Object.entries(r.buzz).filter(([, v]) => typeof v === "boolean"));
  return out;                                    // the plan is rebuilt: it is only ever today's
}

export const MAX_SESSIONS = 200;
export const addSession = (r: UserRecord, s: Session): UserRecord =>
  ({ ...r, sessions: r.sessions.concat(s).slice(-MAX_SESSIONS) });

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}
export function streak(sessions: Session[], now = Date.now()): number {
  if (!sessions.length) return 0;
  const days = new Set(sessions.map(s => dayKey(s.at)));
  let n = 0;
  const cur = new Date(now);
  if (!days.has(dayKey(cur.getTime()))) cur.setDate(cur.getDate() - 1);  // today not done yet: streak still alive
  while (days.has(dayKey(cur.getTime()))) { n++; cur.setDate(cur.getDate() - 1); }
  return n;
}

/* ══ THE DAILY PLAN ═════════════════════════════════════════════
   Regenerated once a day; remembers what you have finished.        */

export function todayPlan(r: UserRecord, now = Date.now()): Plan {
  const p = r.plan;
  if (p && p.day === dayKey(now)) return p;
  return { day: dayKey(now), ...buildPlan(r.sessions, 3, packById(r.pack)), done: [] };
}
export function markDone(p: Plan, drill: string): Plan {
  return p.drills.includes(drill) && !p.done.includes(drill) ? { ...p, done: p.done.concat(drill) } : p;
}

/* ══ SAVING A RUN ═══════════════════════════════════════════════
   Everything a finished run changes, in one pure step: history, diction
   cards (only with a transcript to judge), and today's plan.          */

export function recordRun(r: UserRecord, run: { session: Session; text: string; target: string | null; promptId: string | null },
  now = run.session.at) {
  let next = addSession(r, run.session);
  let retry: string | null = null;
  if (run.session.drill === "diction" && run.text && run.target && run.promptId) {
    const res = updateCards(next.cards, run.promptId, dictionOutcome(run.text, run.target), now);
    next = { ...next, cards: res.cards };
    retry = retryNote(res);
  }
  next = { ...next, plan: markDone(todayPlan(next, now), run.session.drill) };
  return { record: next, retry };
}

/* ══ BACKUP ═════════════════════════════════════════════════════════
   History lives only in this browser, and browsers delete it. A backup file
   is the only copy that survives that until accounts exist. The validator is
   also the shape a server import must accept (F11): anything that doesn't
   look like a session is dropped, never trusted. The Anthropic key is stored
   separately and is never part of a backup.                              */

export const BACKUP_KIND = "speakeasy-backup";

export const exportBackup = (record: Partial<UserRecord>, now: number) => ({
  kind: BACKUP_KIND, version: 1, exportedAt: new Date(now).toISOString(),
  sessions: record.sessions || [], cards: record.cards || []
});

const num = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
const str = (v: unknown, max: number): v is string => typeof v === "string" && v.length > 0 && v.length <= max;
const nums = (o: unknown, lo: number, hi: number): o is Record<string, number> =>
  !!o && typeof o === "object" && !Array.isArray(o) && Object.values(o).every(v => v == null || num(v, lo, hi));

type Loose = Record<string, unknown>;

/* One stored session, or null if it isn't one. Only known fields are copied,
   so nothing unexpected rides along into storage. */
export function cleanSession(x: unknown, drills: string[]): Session | null {
  if (!x || typeof x !== "object") return null;
  const s = x as Loose;
  if (!num(s.at, 1e12, 1e13) || typeof s.drill !== "string" || !drills.includes(s.drill) || !num(s.score, 0, 100)) return null;
  const out: Session = { at: s.at, drill: s.drill, name: str(s.name, 40) ? s.name : s.drill, score: Math.round(s.score),
    wpm: num(s.wpm, 0, 600) ? s.wpm : null, fillers: num(s.fillers, 0, 10000) ? s.fillers : null };
  if (nums(s.parts, 0, 100)) out.parts = { ...s.parts };
  if (str(s.promptId, 64)) out.promptId = s.promptId;
  if (typeof s.reading === "boolean") out.reading = s.reading;
  if (num(s.v, 1, 1000)) out.v = s.v;
  if (num(s.secs, 0, 3600)) out.secs = s.secs;
  // raw is the measurement object: plain numbers plus the filler breakdown
  if (s.raw && typeof s.raw === "object" && JSON.stringify(s.raw).length < 4000) {
    const { f, ...rest } = s.raw as Loose;
    const ff = f as Loose | undefined;
    if (Object.values(rest).every(v => v == null || typeof v === "boolean" || num(v, -1e6, 1e6)) &&
      ff && num(ff.hard, 0, 1e4) && num(ff.crutch, 0, 1e4) && num(ff.total, 0, 1e4) && nums(ff.found, 0, 1e4))
      out.raw = s.raw as Session["raw"];
  }
  return out;
}

export function cleanCard(x: unknown): Card | null {
  if (!x || typeof x !== "object") return null;
  const c = x as Loose;
  return str(c.word, 40) && str(c.twisterId, 64) && num(c.box, 1, 5) &&
    num(c.dueAt, 1e12, 1e13) && (c.misses == null || num(c.misses, 0, 100))
    ? { word: c.word, twisterId: c.twisterId, box: c.box, misses: (c.misses as number) || 0, dueAt: c.dueAt } : null;
}

/* Parse a backup file's text. Throws an Error whose message can be shown to
   the user as-is. */
export function parseBackup(text: string, drillIds: string[]) {
  let d: Loose;
  try { d = JSON.parse(text); } catch { throw new Error("That file isn't a Speakeasy backup — it isn't valid JSON."); }
  if (!d || d.kind !== BACKUP_KIND) throw new Error("That file isn't a Speakeasy backup.");
  if (d.version !== 1) throw new Error("This backup comes from a newer version of Speakeasy. Reload the page and try again.");
  const rawS = Array.isArray(d.sessions) ? d.sessions.slice(-5000) : [];
  const rawC = Array.isArray(d.cards) ? d.cards.slice(-2000) : [];
  const sessions = rawS.map(s => cleanSession(s, drillIds)).filter((s): s is Session => !!s);
  const cards = rawC.map(cleanCard).filter((c): c is Card => !!c);
  return { sessions, cards, dropped: rawS.length - sessions.length + rawC.length - cards.length };
}

/* Merge a parsed backup into the current record. Sessions match by time and
   drill, so restoring the same file twice changes nothing; the newest
   MAX_SESSIONS are kept. A card already here wins — it is the fresher copy. */
export function mergeBackup(record: UserRecord, backup: { sessions: Session[]; cards: Card[] }) {
  const key = (s: Session) => s.at + "|" + s.drill;
  const have = new Set((record.sessions || []).map(key));
  const added = backup.sessions.filter(s => !have.has(key(s)));
  const sessions = (record.sessions || []).concat(added).sort((a, b) => a.at - b.at).slice(-MAX_SESSIONS);
  const cardKey = (c: Card) => c.twisterId + "|" + c.word;
  const haveCard = new Set((record.cards || []).map(cardKey));
  const cards = (record.cards || []).concat(backup.cards.filter(c => !haveCard.has(cardKey(c))));
  return { record: { ...record, sessions, cards }, added: added.length };
}

/* Monday to Sunday of the current week: practised that day or not. */
export function practisedThisWeek(sessions: Session[], now = Date.now()): boolean[] {
  const d = new Date(now), monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (d.getDay() + 6) % 7);
  const days = new Set(sessions.map(s => dayKey(s.at)));
  return Array.from({ length: 7 }, (_, i) =>
    days.has(dayKey(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i).getTime())));
}
