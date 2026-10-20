# Tasks

Where the work stands. Specs: [PRD.md](PRD.md) · design and build: [ARCHITECTURE.md](ARCHITECTURE.md)
· reasons: [DECISIONS.md](DECISIONS.md).

Update this file in the same commit as the work: tick what's done, add what was found, move
blocked items to **Waiting**. `[x]` done · `[~]` partly done (the line says what's left) · `[ ]` to do.

**Last updated:** 2026-10-20 · **Branch:** `prod/phase-0-1` (on top of `refactor/es-modules`, neither merged to `main`)

The vanilla-JS app was retired on 2026-10-16 (D-023): the React app in `frontend/` is the app.
Until the items under **Phase 2 → Back from the old app** land, it does less than the old one did.

---

## Now

1. **First five minutes** (Phase 2 → Walkthrough fixes, in order): the too-short-to-score guard, the
   Home redesign, per-drill meters — then the rest of that list.
2. **Finish Phase 2** (Phase 2 → Back from the old app): the report's follow-along transcript and
   passage marks, the booth's due twister, then the first-run screen.
3. Meanwhile: owner records and labels takes (see Waiting on the owner).

## Waiting on the owner

These need a person, an account or a microphone.

- [ ] Deploy: Netlify → Import from Git → this repo; `netlify.toml` does the rest. Then **Site
      configuration → Forms → enable form detection**, or the waitlist form posts into nothing.
- [ ] Try the app with your real mic: `cd frontend && npm install && npm run dev`, then today's plan at
      http://localhost:5173 — a drill should score, show its report, and still be in your streak after a
      reload. Your old history should be there too (copied once from the old app's storage).
- [ ] One Diction Gym run in Chrome with a word you swallow; the next day the booth should serve that
      twister again and the report say what came back clean. (Headless tests can't reach this.)
- [ ] One Filler Hunt run in Chrome with the buzzer on (the default): one soft tick per "um", and
      the report's speaking time looks right — the tick must not register as your voice (F3).
- [ ] First real take in `label.html` (now at http://localhost:5173/label.html from `npm run dev`) —
      confirms recording and decoding (headless can't).
- [ ] Record and label **20 takes** with hand-counted fillers (Whisper gate, F9).
- [ ] Record and label **~200 takes** over the coming weeks (F15 training data).
- [ ] Decide whether to merge `refactor/es-modules` and `prod/phase-0-1` into `main`, and push —
      CI (`.github/workflows/ci.yml`) runs once the branch is on GitHub; it hasn't run yet.
- [ ] Cloudflare account for Web Analytics (DECISIONS D-016), then add its snippet and CSP origins.
- [ ] Answer the open questions in DECISIONS: feedback channel, licence, domain.

---

Rough size: 14–18 weeks solo from Phase 2 to launch, slower part-time.

## Phase 0 — ship what exists

- [x] `netlify.toml`: builds `frontend/`, publishes only its `dist/`; CSP with no third-party origin
      except `api.anthropic.com` for opt-in coaching; security headers.
- [ ] Deploy (owner).
- [~] Waitlist / "what would you use this for?" — Netlify Forms (D-019). The form is detected from
      `index.html`; its card on the page comes back with the other old-app items.
- [ ] Analytics snippet once the Cloudflare account exists; privacy page names it.

## Groundwork (not tied to a phase)

- [x] CI: typecheck, Vitest, build and the browser smoke test on every push (not yet run on GitHub).
- [x] `scripts/smoke-frontend.mjs`: a real run on Chrome's fake mic, migration, phone widths, one Reel
      per screen, the label page.
- [~] Backup and restore: validator, merge and persistent-storage request are in `lib/`; the buttons
      return with Your data.
- [x] Fixed: recent sessions showed the text "2014" instead of a dash for missing values.
- [x] `docs/PRIVACY.md` draft, true to today's app.

## Phase 1 — prepare the code ✓

- [x] Permanent content ids + `content-ids.txt` ledger, enforced by tests (F0).
- [x] `buildRun()` returns data; the UI renders it; plan persistence is pure.
- [x] Sessions store `promptId`, `raw`, `reading`, `v`, `secs`; rescoring from `raw` tested.

## Design

- [x] Inspirations from the owner: Duolingo (structure), Claude's pixel doodles, ASCII art.
- [x] `docs/DESIGN.md`: direction, ASCII rules, colour, type, shape, Reel, screen inventory (D-021).
- [x] Mockups on the design canvas: every screen in DESIGN.md → Screens, phone layouts, Reel, logo.

## Phase 2 — port to Vite + React + TypeScript

- [x] `frontend/`: Vite + React + TS, pinned (D-020). `backend/` waits for Phase 4 — nothing to put in it yet.
- [x] Pure modules → `frontend/src/lib/` as TS; `test.js` → Vitest (147 cases, + engine and migration tests).
- [x] Session engine `createSession({ onTick, onPhase, onFinish })`; React mounts it via a ref
      (`useSession`); safe under StrictMode double-mount; AudioContext created inside the click (iOS).
      Whole runs tested in Node with fake ports, and in headless Chrome on its fake mic.
- [~] Screens built to `DESIGN.md`: the frame (logo, nav, phone tabs), Home, Booth (with the room check,
      countdown and problem states) and Report are done and run on the real engine. Left: Drills,
      Progress, Your texts, Guide, Your data, first run.
- [x] Reel: `lib/reel.ts` with tests, a React component, first frame only under reduced motion,
      one per screen.
- [x] Old app retired (D-023): `src/`, `index.html`, `style.css`, `test.js`, `serve.js` and its smoke test
      removed; the dev pages and `label.js` moved into `frontend/`; CI and Netlify build the app.
- **Back from the old app** — what it did that the new one doesn't yet:
  - [x] Progress: headline numbers, facts (F2) with the drill that trains a slip, score chart by
        drill, per-metric trends, recent sessions.
  - [x] Your data: backup download and restore (now with your texts), Claude key, what leaves the
        device, booth settings (mic sensitivity is remembered), start over.
  - [x] Coach on the report: local findings, Chrome's on-device model, Claude review (own key), with
        the transcript wrapped as data; SDK bundled and lazy (D-024).
  - [ ] Report: follow-along transcript (click a word to jump), the passage marked hit / missed /
        unread on reading drills, the record line (`recordFor()`).
  - [x] Booth: transcription errors (network, blocked, mic busy, Brave) shown while running, and a
        transcript chip that says starting / listening / hearing you / failing.
  - [ ] Booth: serve the most overdue diction twister.
  - [x] Guide page; the waitlist card (on the Guide).
  - Not coming back: the light theme (DESIGN.md is dark only).
- [x] Self-host the fonts: Bricolage Grotesque and JetBrains Mono from `@fontsource` (OFL), bundled.
- [x] `localStorage` → IndexedDB with a one-time migration (validated; the old copy stays).
- [x] New screens: Drills (best, length, last done; today / pack / words-due badges), Your texts (F1).
      Nav: the booth, report and Your texts sit under DRILLS, whose sub-items are the six drills and
      Your texts; INTERVIEW is its own tab (a placeholder for F13 that starts Impromptu on interview
      questions). On phones, the More tab holds Interview, Guide and Your data.
- [ ] First-run screen.
- **Walkthrough fixes (2026-10-17)** — from a full pass in headless Chrome (fake mic and recogniser):
  first visit, Impromptu booth, a Filler Hunt run, its report, Home and the report at 390 px.
  Verdict: the identity and copy are strong, and the booth while speaking and the report are the
  best screens. A first-timer bounces off Home (no focal point) and off a confident wrong score.
  - [x] **Too short to score** (`tooShort()` in lib/scoring.ts; free speech under 10 s, too few words,
        or — without a transcript only — under 1.5 s of voice; the booth says why and saves nothing).
  - [x] **Home redesign** (2026-10-17): one-column hero with Start naming the drill, path in order,
        streak / pack (a select) / privacy as one strip. Kept for reference:
        - Hero: the headline and Start on the left, Reel on the right, ASCII art behind both and never
          under the text, no translucent box.
        - Path: a straight list in order, with done items ticked in place. Today it shows "now:
          Impromptu" above a "done" Filler Hunt.
        - Streak and goal pack become one compact strip under the hero, and the "psst" tip moves
          into the hero.
        - On phones, streak and pack come up near the top instead of below everything.
  - [x] **Per-drill meters** (Booth `METERS`: Filler Hunt has no Pace; Diction / Echo show Accuracy and
        Projection; Pace & Pause gains Pauses; "—" until the take starts). Was:
        - Each drill shows only what it scores: no Pace on Filler Hunt; nothing filler-related on
          Diction or Echo.
        - Show "—", not a red "0", before the take starts.
  - [x] **Report clutter** (2026-10-20): no "OUT OF 100" label (only "up / down N on last time" when
        there is a last time); "Since you started" hidden until it has facts; take caption shortened to
        "click to jump", shown only when there is audio to jump in.
  - [x] **Timeline** (2026-10-20). The pills already sat in their own row, clear of the waveform and
        playhead; what was wrong underneath: a phrase with several fillers got one mark (8 heard, 5
        shown, and the label said 5), and the mark's word lost every "s" (`/s+/` for `/\s+/`). Now
        every filler is marked; one phrase's fillers share a pill ("uh +1"); pauses have their own
        lane; edge pills stay inside the track; crowded pills drop to a second row (phones).
  - [ ] **Booth before a run.**
        - Collapse the empty waveform to a thin strip until recording starts.
        - Fold length, mic and the "um" tick into one setup row, so the order is prompt, then Start.
  - [ ] **Refactor.** Move repeated inline styles (page header, card label, stat tile) into CSS
        classes before the redesign.
- **UI/UX review (2026-10-17)** — fixed: privacy wording (scoring local; live captions go to Google),
  Start sticks to the bottom of the booth, scores read /100 and low ones aren't red, chart has a y
  scale and no line under 3 points, drill list opens only inside DRILLS, drill-card badges aligned,
  pause marks announced as "pause", disabled Rehearse says why. Still to do:
  - [ ] Each drill shows only the meters it scores; "—" not "0" before the take starts.
  - [ ] One source of truth for length and the um-tick (Word Forge shows no length chip selected).
  - [ ] Echo: a replay button; hide the sentence until the first listen.
  - [ ] Today: path in order, done items ticked in place; pack list puts the current pack first.
  - [ ] Interview copy: no developer phrasing ("no key, no network"); lighter nav weight while "soon".
  - [ ] Recording mode: only prompt, timer and Stop while a take runs.
  - [ ] Report: lead with the single biggest problem.
  - [ ] First run in two clicks, with a mic check and a 30 s drill.
  - [ ] Accessibility pass: contrast of muted/faint on ground, label size, legends not colour-only,
        focus rings, live regions; Guide habits grid orphan at mid widths.
  - [ ] Stronger warning on the stored API key before real users; two-step Delete everything.
  - [ ] Real mobile pass at 390 px (drill grid, meters rail, type sizes).
- [ ] Exit: the list above done; audio-only path passes in Firefox; deployed.

## Phase 3 — free on-device features

| Feature | Logic | UI / wiring | Left |
|---|---|---|---|
| F1 Your own text | [x] | [x] | owner: rehearse a real talk once |
| F2 Progress facts | [x] | [~] | fact cards on `#/progress` live; record line on the report |
| F3 Filler buzzer | [x] | [x] | mic check (owner); a toggle for the crutch-word option (logic has it) |
| F4 Pitch | [~] | [ ] | run YIN in a Worker during runs; calibrate on 10 flat + 10 expressive takes; score component (+ `SCORING_VERSION`) |
| F5 Diction retry | [x] | [~] | report line and "N due" on Drills live; due twister in the booth (Phase 2) |
| F6 Then vs now | [ ] | [ ] | needs F10 |
| F7 Webcam self-view | [ ] | [ ] | local only |
| F8 Goal packs | [x] | [x] | picker on Home; interview mode joins with F13 |
| F9 Whisper | [ ] | [ ] | spike, then the 20-take filler gate |
| F10 Local recording store | [ ] | [ ] | IndexedDB |
| F15 Filler detector | [~] | [ ] | [x] labelling tool · [ ] licence check · [ ] data · [ ] training · [ ] gate |

## Phase 4 — accounts and sync

- [ ] Nest + Prisma on Render, Neon; auth from WChess; Google + magic link.
- [ ] Age gate; local-history import (validated, idempotent); sync sessions, texts, cards.
- [ ] Export + delete account.

## Phase 5 — cloud recordings and interview mode

- [ ] R2 opt-in, Opus 16 kbps, first + latest per prompt, lifecycle rule, retention at consent.
- [ ] F13 interview mode with the free model chain.

## Phase 6 — launch

- [ ] F14 improvement card + challenge links.
- [ ] Landing page that goes straight into a drill (first report in under 2 minutes).
- [ ] Launch checklist (below) complete.

### Launch checklist

From the security and privacy review; general information, not legal advice.

- [ ] Age gate: under 13 no account; cloud recordings and model features 16+ (18+ where parental
      consent is required, e.g. India's DPDP Act).
- [ ] Export and delete ship with cloud recordings; delete removes rows, R2 objects and challenge
      links; R2 lifecycle rule as backstop.
- [ ] R2 uploads: server picks the key under `u/{userId}/`, short expiry, content type pinned, size
      checked after upload; bucket private; every signed GET checks ownership.
- [x] Model output rendered as text, never HTML (current coach escapes it) — keep it so after the port.
- [x] Transcripts wrapped and labelled as data in every model prompt (`lib/coach.ts`, tested).
- [ ] Imported history validated server-side (shape, size cap, idempotent).
- [ ] Magic links single-use, 15 minutes; sign-in emails rate-limited per IP.
- [~] CSP and security headers (done for the static app; redo for the SPA + API); `security.txt`.
- [~] Privacy page: draft in `docs/PRIVACY.md`; publish it, filled in for whatever has shipped, with
      every processor (Netlify, Render, Neon, Cloudflare, Resend, Sentry, Google, Anthropic).
- [ ] Fonts self-hosted, so no visitor IP goes to Google on page load.
- [ ] Sentry scrubs transcripts.

## After launch

- [ ] F16 own coaching model (after Anthropic-terms and data questions in DECISIONS are settled).
- [ ] Decide on a paid tier with real usage data.

---

## Risks

| Risk | Mitigation |
|---|---|
| Whisper drops fillers | The F9 gate; F15 hears fillers from audio; reports label their source |
| Training-data licences | Check before training; fall back to own and donated takes |
| Render cold start | SPA on Netlify; wake ping on load; sync in the background |
| Free-tier terms change | Each hosted piece has a free fallback (ARCHITECTURE → Free-tier limits) |
| Whisper memory on iOS Safari | `base.en` at most; offer `tiny.en`; skip on low memory |
| Too much for one person | Launch scope is what real usage asks for; cut what nobody uses |
