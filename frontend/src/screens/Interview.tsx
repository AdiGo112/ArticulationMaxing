/* Interview — a placeholder for F13 (PRD → F13 · Interview mode): what is
   coming, and the closest thing that works today, Impromptu on interview
   questions. */

import { buildRun } from "../lib/drills.ts";
import { Reel } from "../ui/parts.tsx";
import { Shell } from "../app/Shell.tsx";
import { go, useApp } from "../app/state.tsx";

const STEPS: [string, string][] = [
  ["Pick a set", "Job interview, pitch, or presentation Q&A — three or six questions."],
  ["Hear the question", "It's read aloud and shown on screen, like a real panel."],
  ["Answer", "60 to 120 seconds, scored like any other run."],
  ["Get a follow-up", "“You mentioned the migration — what went wrong?” Built from what you said; works with no key and no network."],
  ["See the whole interview", "A score per answer, a summary, and your weakest answer offered for a retry."],
];

export function Interview() {
  const { setAgain } = useApp();
  const practise = () => { setAgain(buildRun("impromptu", { pool: "interview" })); go("drill/impromptu"); };
  return (
    <Shell page="interview">
      <div className="page-head-row">
        <div className="page-head">
          <span className="label amber">// coming next · interview mode</span>
          <h1 className="h1">A mock interview that talks back.</h1>
        </div>
        <Reel state="listen" size={130} />
      </div>

      <section aria-labelledby="howTitle" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 id="howTitle" className="rule">── HOW IT WILL WORK ─────────────────────────────────────────────</h2>
        <ol className="grid" style={{ listStyle: "none", margin: 0, padding: 0, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))" }}>
          {STEPS.map(([t, d], i) => (
            <li key={t} className="card" style={{ gap: 8 }}>
              <span className="label amber sm">{String(i + 1).padStart(2, "0")}</span>
              <b style={{ fontFamily: "var(--display)", fontSize: 18 }}>{t}</b>
              <span className="body" style={{ fontSize: 13, lineHeight: 1.6 }}>{d}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="card panel amber" aria-labelledby="nowTitle">
        <span className="label amber">until then</span>
        <h2 id="nowTitle" className="h2">Practise on real interview questions now.</h2>
        <p className="body" style={{ margin: 0, lineHeight: 1.6 }}>Impromptu with the questions panels actually ask, and a framework (STAR, PREP) to hang each answer on. No follow-ups yet — that's the part this page will add.</p>
        <div className="row">
          <button type="button" className="btn primary" onClick={practise}>▶ ANSWER AN INTERVIEW QUESTION</button>
          <a className="btn ghost" href="#/drill/filler">or cut your fillers first</a>
        </div>
      </section>
    </Shell>
  );
}
