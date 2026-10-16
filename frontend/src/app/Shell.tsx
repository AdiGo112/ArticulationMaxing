/* Shell.tsx — The frame around every page: logo, streak, side nav (a tab bar
   on phones). DESIGN.md → Shape and motion, Screens. */

import type { ReactNode } from "react";
import { OnAir } from "../ui/parts.tsx";
import { streak } from "../lib/storage.ts";
import { useApp } from "./state.tsx";

const NAV: [string, string][] = [["", "TODAY"], ["drills", "DRILLS"], ["progress", "PROGRESS"], ["texts", "YOUR TEXTS"], ["guide", "GUIDE"], ["data", "YOUR DATA"]];
const TABS: [string, string, string][] = [["", "▶", "TODAY"], ["drills", "▦", "DRILLS"], ["progress", "↗", "PROGRESS"], ["data", "≡", "MORE"]];
const MORE = ["texts", "guide", "data"];                 // behind the phone's fourth tab

export function Shell({ page, children, rail, live = false, top, inert = false }: {
  page: string; children: ReactNode; rail?: ReactNode; live?: boolean; top?: ReactNode;
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
            <a key={href} href={"#/" + href} aria-current={href === page ? "page" : undefined}>
              {href === page ? "> " : "  "}{label}
            </a>
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
