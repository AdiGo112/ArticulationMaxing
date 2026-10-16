# Speakeasy

A speaking-practice booth in the browser: drills scored live from the microphone. A React +
TypeScript app in `frontend/` (Vite, static, no backend yet); a small API comes later, all on free
tiers.

## Commands

All in `frontend/` (Node 22+; `npm install` once):

- `npm run dev` — the app at http://localhost:5173, plus the dev pages `label.html` and `mic-test.html`
- `npm test` — Vitest; `npm run typecheck`; `npm run build`
- `node ../scripts/smoke-frontend.mjs` — after a build: the built app in headless Chrome on its fake
  mic (a real run end to end, migration, phone widths, one Reel per screen) and the label page
- CI runs all of these on every push.

## Docs — read before acting

- **Starting a session or picking up work** → `docs/TASKS.md` (what's done, next, blocked). Update it
  in the same commit as the work.
- **Changing anything in `frontend/src/`** → `docs/ARCHITECTURE.md` (modules, a run end to end,
  scoring, storage, the engine, target stack, what leaves the device).
- **Building or changing a feature** → `docs/PRD.md` (goals, non-goals, specs F0–F16 with "done when").
- **Choosing a library, service or approach** → `docs/DECISIONS.md`; append an entry when you choose
  between real alternatives.
- **UI work** → `docs/DESIGN.md` (direction, ASCII rules, colour and type tokens, Reel the mascot);
  the mockups are on the design canvas it links. Read it before building or changing a screen.

## Rules

- **The audio-only path is a feature.** Every drill and feature keeps running with no transcript
  (Firefox, Brave): it scores what audio alone measures and never throws or shows NaN.
- **Analysis stays on the device.** Anything that leaves it is opt-in, says what it sends, and is
  listed in ARCHITECTURE → What leaves the device and in `docs/PRIVACY.md` before it ships.
- **$0 to run.** Use free tiers that allow commercial use. A new hosted service, paid tier or
  external origin starts as a DECISIONS entry; a new origin also goes into the CSP in `netlify.toml`.
- **Content ids are permanent.** Fix text in place (the id stays). Append new items with the next id
  and add it to `content-ids.txt`. Retire an item by deleting it and its ledger line together.
- **Scoring changes bump `SCORING_VERSION`** (`frontend/src/lib/scoring.ts`) — any change to
  `scoreRun()` or its curves.
- **Logic lives in `frontend/src/lib/`**: pure, no DOM or React, with a Vitest test. Break the logic
  on purpose once and watch the new test fail before trusting it.
- **Only the app ships.** Netlify builds `frontend/` and publishes `frontend/dist`; Vite builds
  `index.html` alone, so the dev pages (`label.html`, `mic-test.html`) never ship.
- **Pin npm dependencies** to an exact version at least two weeks old (no `^` or `~`).
- **Commit messages end at the body** — no `Co-Authored-By` or other AI-attribution trailers, and
  none in PR descriptions.
