/* db.ts — Where the record lives: one IndexedDB value, read and written whole,
   as the old app did with localStorage. IndexedDB because recordings (F10)
   will sit beside it, and because Safari's 7-day eviction treats both alike —
   the backup file is still the copy that survives that.
   ponytail: one key holding the whole record; split sessions into their own
   store if a 200-session record ever makes saving slow.                    */

import { DRILLS } from "../lib/drills.ts";
import { migrateLegacy, normaliseRecord, type UserRecord } from "../lib/storage.ts";

const DB = "speakeasy", STORE = "kv", KEY = "record", LEGACY = "speakeasy.v1";

const req = <T>(r: IDBRequest<T>) => new Promise<T>((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

function openDb(): Promise<IDBDatabase> {
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(STORE);
  return req(r);
}

/* The record; on the very first load, the old app's history brought across.
   The localStorage copy is left in place, so a failed copy loses
   nothing. Without IndexedDB (rare: some private modes) the old key is used. */
export async function loadRecord(): Promise<UserRecord> {
  let db: IDBDatabase;
  try { db = await openDb(); }
  catch { return migrateLegacy(safeLocal(), DRILLS.map(d => d.id)); }
  const got = await req(db.transaction(STORE).objectStore(STORE).get(KEY));
  if (got !== undefined) return normaliseRecord(got);
  const migrated = migrateLegacy(safeLocal(), DRILLS.map(d => d.id));
  await saveTo(db, migrated);
  return migrated;
}

export async function saveRecord(r: UserRecord): Promise<void> {
  try { await saveTo(await openDb(), r); }
  catch { try { localStorage.setItem(LEGACY, JSON.stringify(r)); } catch { /* storage full or blocked */ } }
}

function saveTo(db: IDBDatabase, r: UserRecord) {
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(r, KEY);
  return new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}

function safeLocal(): string | null {
  try { return localStorage.getItem(LEGACY); } catch { return null; }
}

/* Start over: the old app's copy goes too, or the history it holds would
   still be sitting in this browser. */
export function forgetLegacy() {
  try { localStorage.removeItem(LEGACY); } catch { /* blocked: nothing to remove */ }
}
