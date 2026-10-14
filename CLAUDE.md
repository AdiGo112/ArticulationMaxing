# Speakeasy

A speaking-practice booth in the browser: drills scored live from the microphone. Today a static
site of native ES modules (no build, no dependencies); moving to a React SPA + small API, all on
free tiers.

## Commands

- `node serve.js` — dev server, https://localhost:8137 (HTTP if the `.pem` files are absent)
- `node test.js` — the whole suite; no `npm install` needed (Node 20.11+)

## Docs — read before acting

- **Starting a session or picking up work** → `docs/TASKS.md` (what's done, next, blocked). Update it
  in the same commit as the work.
- **Changing anything in `src/`** → `docs/ARCHITECTURE.md` (modules, a run end to end, scoring,
  storage, target stack, what leaves the device).
- **Building or changing a feature** → `docs/PRD.md` (goals, non-goals, specs F0–F16 with "done when").
- **Choosing a library, service or approach** → `docs/DECISIONS.md`; append an entry when you choose
  between real alternatives.
- **UI work** → `docs/DESIGN.md`, once it exists; it is written from the owner's inspirations before
  any screen is rebuilt.

## Rules

- **The audio-only path is a feature.** Every drill and feature keeps running with no transcript
  (Firefox, Brave): it scores what audio alone measures and never throws or shows NaN.
- **Analysis stays on the device.** Anything that leaves it is opt-in, says what it sends, and is
  listed in ARCHITECTURE → What leaves the device before it ships.
- **$0 to run.** Use free tiers that allow commercial use. A new hosted service, paid tier or
  external origin starts as a DECISIONS entry; a new origin also goes into the CSP in `netlify.toml`.
- **Content ids are permanent.** Fix text in place (the id stays). Append new items with the next id
  and add it to `content-ids.txt`. Retire an item by deleting it and its ledger line together.
- **Scoring changes bump `SCORING_VERSION`** (`src/scoring.js`) — any change to `scoreRun()` or its curves.
- **Logic lives in DOM-free modules with a test in `test.js`.** Break the logic on purpose once and
  watch the new test fail before trusting it.
- **Only runtime files ship.** `netlify.toml` copies `index.html`, `style.css` and `src/`; a new runtime
  file outside those must be added there. Dev pages (`mic-test.html`, `label.html`) stay out.
- **Pin CDN imports** to an exact version at least two weeks old.
- **Commit messages end at the body** — no `Co-Authored-By` or other AI-attribution trailers, and
  none in PR descriptions.
