/* Shell.tsx — The frame around every page: logo, streak, side nav (a tab bar
   on phones). DESIGN.md → Shape and motion, Screens. */

import type { ReactNode } from "react";
import { OnAir } from "../ui/parts.tsx";
import { streak } from "../lib/storage.ts";
import { useApp } from "./state.tsx";
import { DRILLS } from "../lib/drills.ts";

/* Sections. Everything about one drill — its booth, its report, your own texts —
   lives under DRILLS, so the nav says where you are, not where you came from. */
const NAV: [string, string][] = [["", "TODAY"], ["drills", "DRILLS"], ["interview", "INTERVIEW"], ["progress", "PROGRESS"], ["guide", "GUIDE"], ["data", "YOUR DATA"]];
const SUB: [string, string][] = [...DRILLS.map(d => ["drill/" + d.id, d.name] as [string, string]), ["texts", "Your texts"]];
const TABS: [string, string, string][] = [["", "▶", "TODAY"], ["drills", "▦", "DRILLS"], ["progress", "↗", "PROGRESS"], ["data", "≡", "MORE"]];
const MORE = ["interview", "guide", "data"];             // behind the phone's fourth tab

export function Shell({ page, sub, children, rail, live = false, top, inert = false }: {
  page: string; children: ReactNode; rail?: ReactNode; live?: boolean; top?: ReactNode;
  sub?: string;                                   // under DRILLS: "drill/<id>" or "texts"
  inert?: boolean;                                // behind a modal: unreachable by Tab or click
}) {
  const { record } = useApp();
  const days = streak(record.sessions);
  return (
    <div className="shell" inert={inert}>
      <header className="top">
        <OnAir live={live} />
        <div className="grow" />
        {top}
        <span className="chip"><span style={{ color: "var(--amber)" }}>▲</span> {days ? `${days}-day streak` : "no streak yet"}</span>
      </header>
      <div className="frame">
        <nav className="side" aria-label="Sections">
          {NAV.map(([href, label]) => (
            <div key={href} style={{ display: "contents" }}>
              <a href={"#/" + href} aria-current={href === page ? (sub ? "true" : "page") : undefined}>
                {href === page ? "> " : "  "}{label}{href === "interview" && <span className="soon">soon</span>}
              </a>
              {href === "drills" && (
                <ul className="sub" aria-label="Drills">
                  {SUB.map(([h, name]) => (
                    <li key={h}><a href={"#/" + h} aria-current={h === sub ? "page" : undefined}>{name}</a></li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </nav>
        <main className="main" id="main">
          {MORE.includes(page) && (
            <nav className="subnav" aria-label="More">
              {NAV.filter(([h]) => MORE.includes(h)).map(([href, label]) => (
                <a key={href} href={"#/" + href} aria-current={href === page ? "page" : undefined}>{label}</a>
              ))}
            </nav>
          )}
          {children}
        </main>
        {rail && <aside className="rail">{rail}</aside>}
      </div>
      <nav className="tabs" aria-label="Sections">
        {TABS.map(([href, glyph, label]) => (
          <a key={label} href={"#/" + href} aria-current={href === page || (href === "data" && MORE.includes(page)) ? "page" : undefined}><b aria-hidden="true">{glyph}</b>{label}</a>
        ))}
      </nav>
    </div>
  );
}
