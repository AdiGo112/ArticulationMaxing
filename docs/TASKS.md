# Tasks

Where the work stands. Specs: [PRD.md](PRD.md) · design and build: [ARCHITECTURE.md](ARCHITECTURE.md)
· reasons: [DECISIONS.md](DECISIONS.md).

Update this file in the same commit as the work: tick what's done, add what was found, move
blocked items to **Waiting**. `[x]` done · `[~]` partly done (the line says what's left) · `[ ]` to do.

**Last updated:** 2026-10-14 · **Branch:** `prod/phase-0-1` (on top of `refactor/es-modules`, neither merged to `main`)

---

## Now

1. **UI redesign** — waiting on the owner's inspirations (see Design).
2. Meanwhile: owner records and labels takes (see Waiting on the owner).

## Waiting on the owner

These need a person, an account or a microphone.

- [ ] Share UI inspirations: screenshots/links, what you like in each, what you hate now, phone or desktop first.
- [ ] Deploy: Netlify → Import from Git → this repo; `netlify.toml` does the rest.
- [ ] One Diction Gym run in Chrome, then check `JSON.parse(localStorage["speakeasy.v1"])` — the
      latest session has `secs`, `raw`, `promptId`, and `cards` lists any coral words. (Headless
      tests can't reach the end of a microphone run.)
- [ ] First real take in `label.html` — confirms recording and decoding (headless can't).
- [ ] Record and label **20 takes** with hand-counted fillers (Whisper gate, F9).
- [ ] Record and label **~200 takes** over the coming weeks (F15 training data).
- [ ] Decide whether to merge `refactor/es-modules` and `prod/phase-0-1` into `main`, and push —
      CI (`.github/workflows/ci.yml`) runs once the branch is on GitHub; it hasn't run yet.
- [ ] Cloudflare account for Web Analytics (DECISIONS D-016), then add its snippet and CSP origins.
- [ ] Answer the open questions in DECISIONS: feedback channel, licence, domain.

---

Rough size: 14–18 weeks solo from Phase 2 to launch, slower part-time.

## Phase 0 — ship what exists

- [x] `netlify.toml`: publishes only `index.html`, `style.css`, `src/`; CSP and security headers.
- [x] Coach on `claude-opus-5-5`; SDK pinned on esm.sh.
- [ ] Deploy (owner).
- [ ] Waitlist / "what would you use this for?" — Netlify Forms.
- [ ] Analytics snippet once the Cloudflare account exists; privacy page names it.

## Groundwork (not tied to a phase)

- [x] CI: unit tests and the browser smoke test on every push (not yet run on GitHub).
- [x] `scripts/smoke.mjs`: routes, drills, label page, backup restore — in real Chrome.
- [x] Backup and restore of local history (*Progress → Your data*); persistent-storage request.
- [x] Fixed: recent sessions showed the text "2014" instead of a dash for missing values.
- [x] `docs/PRIVACY.md` draft, true to today's app.

## Phase 1 — prepare the code ✓

- [x] Permanent content ids + `content-ids.txt` ledger, enforced by tests (F0).
- [x] `buildRun()` returns data; markup in `stage.js`; plan persistence in `storage.js`.
- [x] Sessions store `promptId`, `raw`, `reading`, `v`, `secs`; rescoring from `raw` tested.

## Design

- [ ] Inspirations from the owner.
- [ ] `docs/DESIGN.md`: direction, tokens (type, colour, spacing, motion), screen inventory.
- [ ] Clickable prototype of home, booth (live run), report, progress; iterate until approved.

## Phase 2 — port to Vite + React + TypeScript

- [ ] Monorepo `frontend/` (Vite) + `backend/` (Nest, empty).
- [ ] Pure modules → `frontend/src/lib/` as TS; `test.js` → Vitest.
- [ ] Session engine `createSession({ onTick, onPhase, onFinish })`; React mounts it via a ref;
      safe under StrictMode double-mount; AudioContext created inside the click (iOS).
- [ ] Screens built to `DESIGN.md`.
- [ ] Self-host the fonts (Google Fonts sends every visitor's IP to Google).
- [ ] `localStorage` → IndexedDB with a one-time migration.
- [ ] Exit: feature parity; audio-only path passes in Firefox; deployed.

## Phase 3 — free on-device features

| Feature | Logic | UI / wiring | Left |
|---|---|---|---|
| F1 Your own text | [x] | [ ] | editor, preview, "Your texts" list |
| F2 Progress facts | [x] | [ ] | fact cards on `#progress`, record line on the report |
| F3 Filler buzzer | [ ] | [ ] | tick + vibrate + per-drill toggle |
| F4 Pitch | [~] | [ ] | run YIN in a Worker during runs; calibrate on 10 flat + 10 expressive takes; score component (+ `SCORING_VERSION`) |
| F5 Diction retry | [x] | [~] | live: cards collected, due twisters served. Left: report line, "3 due" card |
| F6 Then vs now | [ ] | [ ] | needs F10 |
| F7 Webcam self-view | [ ] | [ ] | local only |
| F8 Goal packs | [ ] | [ ] | write ~40 interview + ~20 pitch prompts with ids |
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
- [ ] Transcripts wrapped and labelled as data in every model prompt.
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
