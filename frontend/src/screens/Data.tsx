/* Your data — backup, the Claude key, what leaves the device, booth settings,
   start over. DESIGN.md → Screens; the canvas's Data board. */

import { useEffect, useRef, useState } from "react";
import { DRILLS, ago, buzzOn } from "../lib/drills.ts";
import { emptyRecord, exportBackup, mergeBackup, parseBackup } from "../lib/storage.ts";
import { forgetLegacy } from "../engine/db.ts";
import { readKey, writeKey } from "../engine/coach.ts";
import { Reel } from "../ui/parts.tsx";
import { Shell } from "../app/Shell.tsx";
import { useApp } from "../app/state.tsx";

const SENS = [["strict", 0.7], ["normal", 1], ["quiet voice", 1.5]] as const;
const LEAVES: [string, string, string, boolean][] = [
  ["Your voice, for scoring", "nowhere — scored here", "never", false],
  ["Recordings, scores, texts", "nowhere — this browser only", "never", false],
  ["Your voice, for live captions (Chrome, Edge)", "Google, via the browser's speech service", "while a run records", true],
  ["One take's transcript", "Anthropic, with your key", "only when you press Review", true],
  ["The waitlist form", "Netlify, our host", "only when you press Send", true],
];
// drills where the words are yours, so a tick on "um" means something
const BUZZ = DRILLS.filter(d => ["filler", "impromptu", "word"].includes(d.id));

export function Data() {
  const { record, update } = useApp();
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [kept, setKept] = useState<boolean | null>(null);
  const [hasKey, setHasKey] = useState(() => !!readKey());
  const [draft, setDraft] = useState("");
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { navigator.storage?.persisted?.().then(setKept, () => {}); }, []);

  const download = () => {
    const now = Date.now();
    const url = URL.createObjectURL(new Blob([JSON.stringify(exportBackup(record, now), null, 1)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `speakeasy-backup-${new Date(now).toISOString().slice(0, 10)}.json` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    update(r => ({ ...r, backedUpAt: now }));
    setNote({ ok: true, text: `Saved ${record.sessions.length} session${record.sessions.length === 1 ? "" : "s"} to your downloads.` });
  };

  const restore = async (f: File | undefined) => {
    if (!f) return;
    try {
      const b = parseBackup(await f.text(), DRILLS.map(d => d.id));
      const m = mergeBackup(record, b);
      update(() => m.record);
      setNote({ ok: true, text: `Restored ${m.added} new session${m.added === 1 ? "" : "s"}` + (m.added < b.sessions.length ? `; ${b.sessions.length - m.added} were already here` : "")
        + (b.dropped ? `. ${b.dropped} damaged entr${b.dropped === 1 ? "y was" : "ies were"} skipped.` : ".") });
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : "That file couldn't be read." });
    }
    if (file.current) file.current.value = "";
  };

  const startOver = () => {
    if (!confirm("Delete every session, text, retry word, setting and your Claude key from this browser? This can't be undone.")) return;
    forgetLegacy(); writeKey(""); setHasKey(false);
    update(() => emptyRecord());
    setNote({ ok: true, text: "Everything is gone from this browser." });
  };

  const sens = record.sens ?? 1;
  return (
    <Shell page="data">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="label amber">// everything lives in this browser</span>
        <h1 className="h1">Your data, and where it goes.</h1>
      </div>

      <div className="grid">
        <section className="card panel" aria-labelledby="bkTitle">
          <h2 id="bkTitle" className="h2">Keep a backup</h2>
          <span className="label" style={{ fontSize: 11 }}>last backup: {ago(record.backedUpAt)}</span>
          <p className="body" style={{ margin: 0, lineHeight: 1.6 }}>Browsers delete site data — clearing it does, and Safari does after a week without a visit. A backup file is the copy that survives. Restoring merges; it never overwrites.</p>
          <div className="row">
            <button type="button" className="btn primary" onClick={download}>↓ DOWNLOAD A BACKUP</button>
            <button type="button" className="btn ghost" onClick={() => file.current?.click()}>restore from a file</button>
            <input ref={file} type="file" accept=".json,application/json" hidden aria-label="Backup file" onChange={e => void restore(e.target.files?.[0])} />
          </div>
          {note && <p role="status" style={{ margin: 0, color: note.ok ? "var(--cyan)" : "var(--alert)" }}>{note.text}</p>}
          {kept && <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>This browser has agreed to keep your data unless you clear it.</p>}
        </section>

        <section className="card" aria-labelledby="aiTitle">
          <h2 id="aiTitle" className="h2">Coaching from Claude</h2>
          <span className="label" style={{ fontSize: 11, color: hasKey ? "var(--amber)" : undefined }}>{hasKey ? "on · key saved in this browser" : "off"}</span>
          <p className="body" style={{ margin: 0, lineHeight: 1.6 }}>Optional, with your own Anthropic key. When you press <b>Review with Claude</b> on a report, that take's transcript and its prompt go to Anthropic — never audio. The key stays in this browser and is never in a backup.</p>
          {hasKey
            ? <button type="button" className="btn ghost" style={{ alignSelf: "flex-start" }} onClick={() => { writeKey(""); setHasKey(false); }}>forget the key</button>
            : <form className="row" onSubmit={e => { e.preventDefault(); if (!draft.trim()) return; writeKey(draft.trim()); setDraft(""); setHasKey(true); }}>
                <label className="field" style={{ flex: "1 1 220px" }}>API KEY
                  <input type="password" value={draft} onChange={e => setDraft(e.target.value)} placeholder="sk-ant-…" autoComplete="off" spellCheck={false} />
                </label>
                <button type="submit" className="btn primary" style={{ alignSelf: "flex-end" }}>Save key</button>
              </form>}
        </section>
      </div>

      <section aria-labelledby="leaveTitle" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 id="leaveTitle" className="rule">── WHAT LEAVES THIS DEVICE ──────────────────────────────────────</h2>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead><tr><th scope="col">WHAT</th><th scope="col">GOES TO</th><th scope="col">WHEN</th></tr></thead>
            <tbody>
              {LEAVES.map(([what, to, when, out]) => (
                <tr key={what}>
                  <td><span aria-hidden="true" style={{ color: out ? "var(--amber)" : "var(--cyan)" }}>● </span>{what}</td>
                  <td style={{ color: out ? "var(--amber)" : "var(--cyan)" }}>{to}</td>
                  <td className="muted">{when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid">
        <section className="card" aria-labelledby="setTitle">
          <h2 id="setTitle" className="h2">Booth settings</h2>
          <span className="label" style={{ fontSize: 11 }}>mic sensitivity</span>
          <div className="row">
            {SENS.map(([l, v]) => <button key={v} type="button" className="pill" aria-pressed={sens === v} onClick={() => update(r => ({ ...r, sens: v }))}>{l}</button>)}
          </div>
          <span className="label" style={{ fontSize: 11 }}>tick on “um”</span>
          <div className="row" style={{ gap: 18 }}>
            {BUZZ.map(d => {
              const on = buzzOn(record.buzz, d.id);
              return <label key={d.id} className="check"><input type="checkbox" checked={on} onChange={() => update(r => ({ ...r, buzz: { ...r.buzz, [d.id]: !on } }))} /> {d.name}</label>;
            })}
          </div>
        </section>

        <section className="card" aria-labelledby="delTitle" style={{ borderColor: "var(--alert-key)" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
              <h2 id="delTitle" className="h2">Start over</h2>
              <p className="body" style={{ margin: 0, lineHeight: 1.6 }}>Deletes every session, text, retry word, setting and your Claude key from this browser. Download a backup first if you might want them.</p>
            </div>
            <Reel state="sleep" size={112} />
          </div>
          <button type="button" className="btn stop" style={{ alignSelf: "flex-start" }} onClick={startOver}>DELETE EVERYTHING</button>
        </section>
      </div>
    </Shell>
  );
}
