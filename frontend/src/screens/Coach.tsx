/* Coach — on the report: what the device can tell you at once, then a deeper
   read from Chrome's on-device model or Claude, whichever this browser can do.
   Replies render as text, never HTML. */

import { useEffect, useState } from "react";
import { analyseLanguage } from "../lib/drills.ts";
import { coachPrompt, parseCoach, reviewable, type CoachSection } from "../lib/coach.ts";
import { askClaude, askOnDevice, onDeviceState, readKey, writeKey, type OnDeviceState } from "../engine/coach.ts";
import type { RunResult } from "../engine/session.ts";

type View =
  | { kind: "menu" } | { kind: "key" } | { kind: "working"; note: string }
  | { kind: "done"; by: string; sections: CoachSection[] } | { kind: "error"; msg: string };

export function Coach({ r }: { r: RunResult }) {
  const [device, setDevice] = useState<OnDeviceState | null>(null);
  const [hasKey, setHasKey] = useState(() => !!readKey());
  const [view, setView] = useState<View>({ kind: "menu" });
  const [draft, setDraft] = useState("");
  useEffect(() => { void onDeviceState().then(setDevice); }, []);

  const reading = !!r.run.target;
  const findings = reading ? [] : analyseLanguage(r.text, { framework: r.run.framework?.name }).slice(0, 4);
  const prompt = coachPrompt({ drill: r.drill.name, question: r.run.cd || null, framework: r.run.framework?.name || null,
    reading, secs: r.elapsed, wpm: r.m.wpm, f: r.m.f, goodPauses: r.m.goodPauses, text: r.text });
  const canReview = reviewable(r.text);
  const local = device === "available" || device === "downloadable" || device === "downloading";

  const run = async (who: "device" | "claude") => {
    if (!canReview) return setView({ kind: "error", msg: "There's no transcript to review — fewer than eight words came through." });
    setView({ kind: "working", note: who === "device" ? "Thinking on this device…" : "Claude is reading your transcript…" });
    try {
      const reply = who === "device"
        ? await askOnDevice(prompt, pct => setView({ kind: "working", note: `Downloading the model… ${pct}%` }))
        : await askClaude(prompt);
      setView({ kind: "done", by: who === "device" ? "read by the model on this device" : "read by Claude", sections: parseCoach(reply) });
    } catch (e) {
      setView({ kind: "error", msg: e instanceof Error ? e.message : "The review couldn't run." });
    }
  };

  return (
    <section aria-label="Coach" className="card">
      <span className="label cyan">coach</span>

      {!r.text.trim()
        ? <p className="muted" style={{ margin: 0 }}>No transcript to read, so there's nothing to analyse.</p>
        : reading
          ? <p className="muted" style={{ margin: 0 }}>A set passage: the words are the author's, so only your delivery is scored above.</p>
          : findings.length
            ? <>
                <span className="label" style={{ fontSize: 11 }}>read on this device · {findings.length} habit{findings.length > 1 ? "s" : ""} worth breaking</span>
                <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8, lineHeight: 1.6 }}>
                  {findings.map(f => <li key={f.id}><b>{f.title}.</b> <span className="body">{f.detail}</span></li>)}
                </ul>
              </>
            : <p className="body" style={{ margin: 0 }}><b>Nothing weak enough to flag.</b> No hedging, padding or repetition worth mentioning.</p>}

      {/* a deeper read needs words to read: with too few, the tiers stay out of the way */}
      {canReview && <div aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
        {view.kind === "menu" && (
          <>
            <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
              {local
                ? <>Your browser has a language model built in. It runs <b style={{ color: "var(--ink)" }}>on this device</b> — no key, nothing sent.{device !== "available" && " It needs a one-off download first."}</>
                : device === null ? "Checking whether this browser can run a model on-device…"
                : <>For a read of <b style={{ color: "var(--ink)" }}>what you said</b> — structure, hedging, a rewrite — ask Claude. It sends this take's transcript to Anthropic, never audio.</>}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {local && <button type="button" className={"btn " + (hasKey ? "ghost" : "primary")} onClick={() => void run("device")}>{device === "available" ? "Ask the on-device model" : "Download the on-device model"}</button>}
              {hasKey
                ? <><button type="button" className="btn primary" onClick={() => void run("claude")}>Review with Claude</button>
                    <button type="button" className="btn ghost" onClick={() => { writeKey(""); setHasKey(false); }}>forget key</button></>
                : <button type="button" className="btn ghost" onClick={() => setView({ kind: "key" })}>Use Claude…</button>}
            </div>
          </>
        )}

        {view.kind === "key" && (
          <form style={{ display: "flex", flexDirection: "column", gap: 10 }} onSubmit={e => { e.preventDefault(); if (!draft.trim()) return; writeKey(draft.trim()); setDraft(""); setHasKey(true); setView({ kind: "menu" }); }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, letterSpacing: "0.1em", color: "var(--muted)" }}>ANTHROPIC API KEY
              <input type="password" value={draft} onChange={e => setDraft(e.target.value)} placeholder="sk-ant-…" autoComplete="off" spellCheck={false}
                style={{ background: "var(--panel)", border: "1px solid var(--edge)", borderRadius: 10, padding: "12px 14px", color: "var(--ink)", font: "inherit" }} />
            </label>
            <p className="muted" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6 }}>
              <b style={{ color: "var(--ink)" }}>This is the one thing here that leaves your device.</b> The key is kept only in this browser; the transcript goes to Anthropic when you press Review — never on its own, never your audio. Keys come from <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">console.anthropic.com</a>.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" className="btn primary">Save key</button>
              <button type="button" className="btn ghost" onClick={() => setView({ kind: "menu" })}>cancel</button>
            </div>
          </form>
        )}

        {view.kind === "working" && <p className="body" style={{ margin: 0 }}>{view.note}</p>}

        {view.kind === "error" && (
          <div role="alert" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ margin: 0, color: "var(--alert)" }}><b>Review failed.</b> <span className="body">{view.msg}</span></p>
            <button type="button" className="btn ghost" style={{ alignSelf: "flex-start" }} onClick={() => setView({ kind: "menu" })}>back</button>
          </div>
        )}

        {view.kind === "done" && (
          <>
            <span className="label" style={{ fontSize: 11 }}>{view.by}</span>
            {view.sections.map((s, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {s.head && <h3 className="h2" style={{ fontSize: 19 }}>{s.head}</h3>}
                {s.paras.map((p, k) => (
                  <p key={k} style={s.quote
                    ? { margin: 0, fontFamily: "var(--display)", fontSize: 18, lineHeight: 1.55, border: "1px dashed #3A3833", borderRadius: 12, padding: "12px 14px" }
                    : { margin: 0, lineHeight: 1.65, color: "var(--body)" }}>{p}</p>
                ))}
              </div>
            ))}
            <button type="button" className="btn ghost" style={{ alignSelf: "flex-start" }} onClick={() => setView({ kind: "menu" })}>ask again</button>
          </>
        )}
      </div>}
    </section>
  );
}
