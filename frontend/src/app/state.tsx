/* state.tsx — App-wide state: the user's record (IndexedDB), the last run's
   result for the report, and the route. Logic stays in lib/; this only holds
   it and saves on change. */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { loadRecord, saveRecord } from "../engine/db.ts";
import { emptyRecord, type UserRecord } from "../lib/storage.ts";
import type { RunResult } from "../engine/session.ts";
import type { Run } from "../lib/drills.ts";

export interface Last { result: RunResult; retry: string | null }

interface App {
  record: UserRecord;
  update: (fn: (r: UserRecord) => UserRecord) => void;
  last: Last | null;
  setLast: (l: Last | null) => void;
  again: Run | null;                              // "same prompt again" hands the run back to the booth
  setAgain: (r: Run | null) => void;
}

const Ctx = createContext<App | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [record, setRecord] = useState<UserRecord | null>(null);
  const [last, setLast] = useState<Last | null>(null);
  const [again, setAgain] = useState<Run | null>(null);
  useEffect(() => { loadRecord().then(setRecord, () => setRecord(emptyRecord())); }, []);
  const update = useCallback((fn: (r: UserRecord) => UserRecord) => {
    setRecord(r => { const next = fn(r || emptyRecord()); void saveRecord(next); return next; });
  }, []);
  if (!record) return null;                       // one IndexedDB read; nothing worth a spinner
  return <Ctx.Provider value={{ record, update, last, setLast, again, setAgain }}>{children}</Ctx.Provider>;
}

export function useApp(): App {
  const a = useContext(Ctx);
  if (!a) throw new Error("useApp outside AppProvider");
  return a;
}

/* Routes are hashes, so the static host needs no rewrites:
   #/  #/drills  #/drill/<id>  #/report  #/progress  #/texts  #/guide  #/data */
export function useRoute(): string[] {
  const read = () => (location.hash.replace(/^#\/?/, "") || "").split("/").filter(Boolean);
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => { setRoute(read()); window.scrollTo(0, 0); };
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return route;
}
export const go = (path: string) => { location.hash = "#/" + path; };
