/* Your texts (F1) — paste a talk, see where the breath marks fall, rehearse
   it in the booth as Pace & Pause. DESIGN.md → Screens; the canvas's Texts board. */

import { useState } from "react";
import { TEXT_MAX_WORDS, buildTextRun } from "../lib/drills.ts";
import { tokens, words } from "../lib/text.ts";
import type { SavedText } from "../lib/storage.ts";
import { Reel } from "../ui/parts.tsx";
import { Shell } from "../app/Shell.tsx";
import { go, useApp } from "../app/state.tsx";

const mmss = (s: number) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");

export function Texts() {
  const { record, update, setAgain } = useApp();
  const texts = record.texts || [];
  const [cur, setCur] = useState<SavedText>(() => texts[0] || blank());
  const saved = texts.find(t => t.id === cur.id);
  const dirty = !saved || saved.title !== cur.title || saved.text !== cur.text;
  const n = words(cur.text).length, tooLong = n > TEXT_MAX_WORDS;
  const run = tooLong ? null : buildTextRun(cur.text, { id: cur.id, title: cur.title.trim() });

  const runsOf = (id: string) => record.sessions.filter(s => s.promptId === "text-" + id);
  const save = () => update(r => {
    const t = { ...cur, at: Date.now() }, list = r.texts || [];
    return { ...r, texts: list.some(x => x.id === t.id) ? list.map(x => x.id === t.id ? t : x) : list.concat(t) };
  });
  const rehearse = () => { if (!run) return; if (dirty) save(); setAgain(run); go("drill/pace"); };
  const remove = () => {
    if (saved && !confirm(`Delete “${cur.title || "Untitled"}”? Its rehearsal scores stay in your history.`)) return;
    const rest = texts.filter(t => t.id !== cur.id);
    update(r => ({ ...r, texts: rest }));
    setCur(rest[0] || blank());
  };

  return (
    <Shell page="texts">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="label amber">// your own words · runs like pace & pause</span>
        <h1 className="h1">Rehearse the talk you have to give.</h1>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
        <section aria-label="Saved texts" style={{ flex: "1 1 240px", maxWidth: 340, display: "flex", flexDirection: "column", gap: 10 }}>
          <button type="button" className="btn ghost" onClick={() => setCur(blank())}>+ new text</button>
          {texts.map(t => {
            const runs = runsOf(t.id), on = t.id === cur.id, best = Math.max(0, ...runs.map(s => s.score));
            return (
              <button key={t.id} type="button" aria-current={on ? "true" : undefined} onClick={() => setCur(t)} className="card"
                style={{ textAlign: "left", cursor: "pointer", gap: 4, background: on ? "#141210" : "transparent", borderColor: on ? "var(--amber)" : undefined }}>
                <b>{t.title || "Untitled"}</b>
                <span className="muted" style={{ fontSize: 12 }}>{words(t.text).length} words · about {mmss(Math.max(30, Math.round(words(t.text).length / 2.5)))}</span>
                <span className="faint" style={{ fontSize: 12 }}>{runs.length ? `rehearsed ${runs.length === 1 ? "once" : runs.length + " times"} · best ${best}` : "not rehearsed yet"}</span>
              </button>
            );
          })}
          <p className="faint" style={{ margin: 0, fontSize: 12 }}>Kept on this device. Up to {TEXT_MAX_WORDS.toLocaleString("en")} words each.</p>
        </section>

        <section aria-label="Edit text" className="card panel" style={{ flex: "999 1 420px", minWidth: 0 }}>
          <label className="field">TITLE
            <input type="text" value={cur.title} maxLength={80} placeholder="Best man speech" onChange={e => setCur({ ...cur, title: e.target.value })} />
          </label>
          <label className="field">YOUR TEXT
            <textarea rows={7} value={cur.text} placeholder="Paste or type what you have to say." onChange={e => setCur({ ...cur, text: e.target.value.slice(0, 30000) })} />
          </label>

          {tooLong
            ? <p role="alert" style={{ margin: 0, color: "var(--alert)" }}>{n.toLocaleString("en")} words — the limit is {TEXT_MAX_WORDS.toLocaleString("en")}. Rehearse it a section at a time.</p>
            : run && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="label" style={{ fontSize: 11 }}>how it will run · breath marks placed for you</span>
                  <span className="muted" style={{ fontSize: 13 }}><b style={{ color: "var(--ink)" }}>{n} words</b> · about <b style={{ color: "var(--ink)" }}>{mmss(run.dur)}</b></span>
                </div>
                <p style={{ margin: 0, fontSize: 17, lineHeight: 1.8, maxHeight: 320, overflowY: "auto" }}>
                  {tokens(run.display!).map((w, k) => w === "|"
                    ? <b key={k} style={{ color: "var(--amber)" }} aria-label="pause here"> ‖ </b>
                    : <span key={k}>{w} </span>)}
                </p>
                <p className="muted" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6 }}>
                  <b style={{ color: "var(--amber)" }}>‖</b> stop fully here
                  {run.crutch!.length > 0 && <> · {run.crutch!.length} crutch word{run.crutch!.length > 1 ? "s" : ""} in your own text — {run.crutch!.map((c, i) => <span key={c}>{i ? ", " : ""}<b style={{ color: "var(--amber)" }}>{c}</b></span>)}. They aren't scored here, but they're worth cutting.</>}
                </p>
              </div>
            )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end", justifyContent: "space-between" }}>
            <div className="row">
              <button type="button" className="btn primary" disabled={!run} onClick={rehearse}>▶ REHEARSE THIS</button>
              <button type="button" className="btn ghost" disabled={!dirty || !cur.text.trim()} onClick={save}>{dirty ? "save" : "saved"}</button>
              {(saved || cur.text) && <button type="button" className="btn ghost" onClick={remove}>delete</button>}
            </div>
            <Reel state="read" size={120} />
          </div>
        </section>
      </div>
    </Shell>
  );
}

function blank(): SavedText {
  return { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: "", text: "", at: Date.now() };
}
