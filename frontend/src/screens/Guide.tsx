/* Guide — four habits (ASCII sketches: decoration, never data), what each
   number means (drawn for real), and the waitlist. DESIGN.md → Screens; the
   canvas's Guide board. */

import { useState, type FormEvent } from "react";
import { Reel } from "../ui/parts.tsx";
import { Shell } from "../app/Shell.tsx";

const TIPS: [string, string, string][] = [
  ["you:    so um the plan is\nbetter: so · · · the plan is", "Pause instead of “um”",
    "A filler is what a mouth does while a brain catches up. Silence does the same job and sounds deliberate. When you feel an “um” coming, close your mouth. Two seconds of quiet reads as confidence."],
  ["start ──────────────▶ END\n         decide this first ^", "Decide your ending first",
    "Rambling is starting a sentence without knowing where it lands. Before you open your mouth, pick the last sentence. Everything before it is the route there."],
  ["[ long sentence with no air in it ]\n[ short. ] [ breath. ] [ short. ]", "Speak in shorter sentences",
    "Long sentences need working memory you don't have when you're nervous. Full stops are free: invisible places to breathe and think."],
  ["▶ ▮▮▮▮▮▮▯▯▯▯ 0:42\n  week 1: ugh   week 2: oh", "Listen to the playback",
    "Every take is recorded on this device so you can hear yourself. It's uncomfortable for about a week, then it becomes the fastest feedback you have."],
];

/* A range with its full-marks band, labelled at the ends and the band edges. */
function Scale({ lo, hi, band, ends, unit }: { lo: number; hi: number; band: [number, number]; ends: [string, string]; unit: string }) {
  const at = (v: number) => (v - lo) / (hi - lo) * 100 + "%";
  return (
    <div role="img" aria-label={`Full marks from ${band[0]} to ${band[1]} ${unit}`} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div className="bar" style={{ height: 14 }}>
        <span className="band" style={{ left: at(band[0]), width: `calc(${at(band[1])} - ${at(band[0])})`, background: "var(--cyan)", opacity: 0.85 }} />
      </div>
      <div className="axis" style={{ fontSize: 11.5 }}><span>{ends[0]}</span><span>{ends[1]}</span></div>
      <span style={{ fontSize: 12, color: "var(--cyan)" }}>■ {band[0]}–{band[1]} · full marks</span>
    </div>
  );
}

export function Guide() {
  return (
    <Shell page="guide">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="label amber">// the drills are the easy part</span>
          <h1 className="h1">How to actually get better.</h1>
        </div>
        <Reel state="think" size={130} />
      </div>

      <section aria-label="Four habits" className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))" }}>
        {TIPS.map(([art, title, body]) => (
          <article key={title} className="card">
            <pre aria-hidden="true" style={{ fontSize: 12, lineHeight: 1.4, color: "var(--amber)", overflowX: "auto" }}>{art}</pre>
            <h2 className="h2" style={{ fontSize: 21 }}>{title}</h2>
            <p className="body" style={{ margin: 0, lineHeight: 1.65 }}>{body}</p>
          </article>
        ))}
      </section>

      <section aria-labelledby="numTitle" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <h2 id="numTitle" className="rule">── WHAT THE NUMBERS MEAN · EACH SCORE IS 0–100 ──────────────────</h2>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))" }}>
          <article className="card">
            <h3 className="h2" style={{ fontSize: 20 }}>Pace</h3>
            <Scale lo={100} hi={220} band={[138, 165]} ends={["100", "220 wpm"]} unit="words a minute" />
            <p className="body" style={{ margin: 0, lineHeight: 1.65 }}>Words a minute across the take — the band broadcasters aim for. Faster and the room stops processing; slower and you lose them. The report also gives your rate while actually speaking, pauses stripped out.</p>
          </article>
          <article className="card">
            <h3 className="h2" style={{ fontSize: 20 }}>Fillers</h3>
            <div className="row" style={{ fontSize: 13 }}>
              <mark className="hard">um</mark> <mark className="hard">uh</mark> <span className="muted">× 2 each ·</span>
              <mark className="crutch">like</mark> <mark className="crutch">basically</mark> <mark className="crutch">you know</mark> <span className="muted">× 1 each</span>
            </div>
            <p className="body" style={{ margin: 0, lineHeight: 1.65 }}>Counted per hundred words, so a long fluent answer isn't punished for the slip a short one makes. Hard fillers weigh double. Crutch words only count when you chose them — never in a passage you were given.</p>
          </article>
          <article className="card">
            <h3 className="h2" style={{ fontSize: 20 }}>Projection</h3>
            <Scale lo={0} hi={100} band={[55, 78]} ends={["mumble · 0", "clipping · 100"]} unit="on the loudness scale" />
            <p className="body" style={{ margin: 0, lineHeight: 1.65 }}>How loud you are, measured only while you're speaking. Read it beside <b>voice above room</b>: six decibels over the background isn't carrying, however loud it feels from inside.</p>
          </article>
          <article className="card">
            <h3 className="h2" style={{ fontSize: 20 }}>Diction and passage read</h3>
            <div role="img" aria-label="Ten words: six came through, one missed, three not reached" style={{ display: "flex", gap: 6 }}>
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} style={{ flex: "1 1 0", height: 18, borderRadius: 4, background: i >= 7 ? "transparent" : i === 4 ? "var(--alert)" : "var(--cyan)",
                  border: i >= 7 ? "1px dashed var(--edge)" : "none" }} />
              ))}
            </div>
            <div className="row muted" style={{ fontSize: 12, gap: 16 }}>
              <span><b style={{ color: "var(--cyan)" }}>■</b> came through</span><span><b style={{ color: "var(--alert)" }}>■</b> missed</span><span>□ not reached</span>
            </div>
            <p className="body" style={{ margin: 0, lineHeight: 1.65 }}>Two separate scores. Diction: of the words you reached, how many came through — 6 of 7 here. Passage read: how far you got — 7 of 10. Stopping early is a pacing problem, not a pronunciation one.</p>
          </article>
        </div>
      </section>

      <Waitlist />
    </Shell>
  );
}

/* Netlify Forms: the hidden form in index.html registers "waitlist" at deploy;
   this posts to it with fetch so the page doesn't reload. */
function Waitlist() {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true); setMsg("Sending…");
    try {
      const body = new URLSearchParams(new FormData(form) as unknown as Record<string, string>);
      const r = await fetch("/", { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
      if (!r.ok) throw new Error(String(r.status));
      form.reset(); setMsg("Thanks — got it.");
    } catch { setMsg("That didn't send. Check your connection and try again."); }
    setBusy(false);
  };
  return (
    <form name="waitlist" className="card panel" onSubmit={send} aria-labelledby="waitTitle">
      <input type="hidden" name="form-name" value="waitlist" />
      <p hidden><label>Leave this empty <input name="company" tabIndex={-1} autoComplete="off" /></label></p>
      <h2 id="waitTitle" className="h2">What would you use this for?</h2>
      <p className="body" style={{ margin: 0, lineHeight: 1.6 }}>An interview, a talk, a habit? Tell us, and leave an email if you want to hear when accounts and sync arrive. This form is sent to our host, Netlify, when you press Send. No recordings, scores or transcripts go with it.</p>
      <label className="field">WHAT YOU'RE PRACTISING FOR<textarea name="use" rows={2} maxLength={500} required /></label>
      <label className="field">EMAIL (OPTIONAL)<input type="email" name="email" maxLength={200} autoComplete="email" /></label>
      <div className="row">
        <button type="submit" className="btn primary" disabled={busy}>Send</button>
        <span role="status" aria-live="polite" className="muted">{msg}</span>
      </div>
    </form>
  );
}
