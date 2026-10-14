# Decisions

Why Speakeasy is built the way it is. One entry per choice between real alternatives: what was
decided, what was rejected, and why. Append new entries at the end; when a decision is reversed,
add a new entry and mark the old one **Superseded by D-xxx** — never rewrite history.

Format: **Context** (what forced a choice) · **Decision** · **Rejected** · **Consequences**.

---

## D-001 · A static, zero-dependency browser app — 2026-09-04 · *Superseded by D-003 for production*

**Context.** First version, built for the owner's own practice. **Decision.** Native ES modules,
no build step, no dependencies, no backend; deploy by copying the folder to any static host.
**Consequences.** Still true of the running app until the Phase 2 port. Everything pure stayed
DOM-free and tested, which is what makes the port feasible.

## D-002 · $0 to run — 2026-10-14

**Context.** Going public with free and paid tiers was considered; the owner set the constraint
"spend nothing." **Decision.** Every service runs on a free tier that allows commercial use; the
only optional spend is a domain. **Rejected.** Vercel Hobby (forbids commercial use), paying for
Claude for users, server-side speech recognition, cloud TTS. **Consequences.** Heavy work happens
in the browser (D-005, D-006); Claude is bring-your-own-key (D-007); each hosted piece has a free
fallback (ARCHITECTURE → Free-tier limits).

## D-003 · Production stack: the WChess shape — 2026-10-14

**Context.** The owner chose a Next.js rewrite, then asked to reuse the free stack from their
WChess project (Render, Neon). **Decision.** Vite + React + TypeScript SPA on Netlify; NestJS +
Prisma API on Render's free tier; Postgres on Neon; Cloudflare R2 for recordings; Resend for
magic links; GitHub Actions for cron. Auth copied from WChess (JWT + httpOnly refresh cookie,
`cf-connecting-ip` for throttling). **Rejected.**
- *Next.js* — wants a server; on Render's free tier that server sleeps, so the 30–60 s cold start
  would hit every page, and Vercel's free plan forbids commercial use.
- *Supabase* (db + auth + storage) — fewer parts, but the free tier pauses after 7 idle days and
  ties the app to one vendor.
- *All-Cloudflare* (Workers + D1 + R2) — genuinely free, but Next.js on Workers risks the free
  script-size limit, and it is a stack the owner hasn't run.
- *Better Auth + Drizzle, Redis, PostHog* — more moving parts than one person should maintain; WChess
  needed Redis for live game state, Speakeasy doesn't.

**Consequences.** One stack the owner already knows how to deploy and debug.

## D-004 · Serve the SPA from Netlify, not from Render — 2026-10-14

**Context.** WChess serves its SPA from the same Render service as the API. **Decision.** The SPA
lives on Netlify; Netlify rewrites `/api/*` to Render so cookies stay same-origin. **Why.** Render
free sleeps after 15 minutes; a practice app must open instantly. Only sync waits on Render, in the
background, with a wake-up ping on page load.

## D-005 · Free transcription: Web Speech live, Whisper in the browser after the take — 2026-10-14

**Context.** Web Speech covers Chrome/Edge only; Firefox and Brave get no transcript, so no fillers,
pace or diction. Server speech-to-text costs money and moves audio off the device. **Decision.**
Keep Web Speech for live feedback; add Whisper (`base.en`, transformers.js, WebGPU → WASM) on the
recording after each take, downloaded lazily after the first run. **Gate.** Whisper tends to drop
"um/uh"; it only becomes a filler source if it reaches ≥ 80% filler recall on 20 hand-counted takes
(PRD → F9). **Rejected.** Deepgram/Whisper APIs (cost), Groq's free tier (rate limits, unclear
commercial terms, audio leaves the device).

## D-006 · Train our own filler detector; defer our own coaching model — 2026-10-14

**Context.** The owner asked whether to build a model instead of relying on Claude. **Decision.**
- **F15, before launch:** a small audio classifier (log-mel CNN, ONNX, 1–5 MB) that hears fillers
  directly, trained on free Kaggle/Colab GPUs. It removes the dependence on any transcript for the
  core metric.
- **F16, after launch:** a 0.5–1.5B open model fine-tuned with LoRA for the written review, run on
  WebGPU — once real usage shows which feedback people use.

**Rejected.** Training a language model from scratch (cost, data); training on Claude outputs
until Anthropic's terms are confirmed to allow it; hosting models on a server (GPUs aren't free).
**Consequences.** A labelling tool (`label.html`) and a recording habit; licences of external
datasets must be checked before use.

## D-007 · Claude only with the user's own key; no paid tier yet — 2026-10-14

**Context.** Claude reviews cost roughly $0.10 each on Opus; D-002 rules out paying for them.
**Decision.** Claude stays an opt-in, bring-your-own-key feature (transcript only, on button
press). Free users get the local rules and Chrome's built-in model, later F16. A paid tier is an
open question for after launch. **Rejected (for now).** Free Claude reviews on our key; a paid tier
before there is usage data.

## D-008 · Private by default — 2026-10-14

**Context.** A security, privacy and legal review of the production plan. **Decision.**
Transcripts stay on the device unless a separate sync opt-in is on; webcam video is never uploaded;
recordings go to the cloud only by opt-in with retention shown at consent; training donations are
a separate per-take opt-in; no voiceprints, speaker identification, embeddings or face analysis;
Chrome's live transcription (which sends audio to Google) is disclosed at its toggle; age gate at
sign-up. **Consequences.** The data table in ARCHITECTURE → What leaves the device is the contract;
the launch checklist in TASKS enforces it.

## D-009 · Recordings: first and latest per prompt, Opus 16 kbps — 2026-10-14

**Context.** Then-vs-now needs recordings to persist; R2's free tier is 10 GB. **Decision.** Keep
exactly two takes per prompt (first, latest), encoded at 16 kbps mono Opus — about 0.12 MB/min —
locally in IndexedDB and, opted in, in R2 with a lifecycle rule. **Rejected.** Keeping every take;
selling storage as the paid feature (nobody pays for storage in this category, and it is the
costliest, riskiest data to hold).

## D-010 · Accounts are optional; the app is local-first — 2026-10-14

**Decision.** Everything except sync works signed-out. First sign-in imports local history,
validated on the server and idempotent by client session id. **Why.** A sign-up wall before the
first drill is the largest drop-off in practice apps, and signed-out use collects nothing.

## D-011 · Permanent content ids with a ledger — 2026-10-14

**Context.** Content pools were plain arrays and sessions stored no prompt. **Decision.** Every
item carries an explicit id; `content-ids.txt` is the ledger and the test suite enforces it.
**Rejected.** Index-based ids (an insertion shifts everything after it); hashing the text (fixing a
typo would change the id). **Consequences.** Editing rules in `CLAUDE.md`.

## D-012 · Store raw measurements and a scoring version — 2026-10-14

**Context.** Scoring is recalibrated often; stored component scores are only true for the scorer
that made them. **Decision.** Each session stores `raw` (the measurement object), `reading` and
`v` (`SCORING_VERSION`), so history can be rescored. Any change to scoring bumps the version.

## D-013 · Drill selection returns data; markup and storage move out — 2026-10-14

**Context.** Preparing for the React port. **Decision.** `buildRun()` returns plain data;
`stage.js` builds the markup; plan persistence moved to `storage.js`. `drills.js` neither touches
storage nor builds HTML. **Why.** React will render from data, and pure logic ports as-is.

## D-014 · Redesign the UI during the React port — 2026-10-14

**Context.** The owner judged the current UI not good enough and wants it fixed first. **Decision.**
Design first (prototype from the owner's inspirations, captured in `docs/DESIGN.md`), then build it
once, in React, as part of the port. **Rejected.** Restyling the vanilla app and then porting it —
every screen would be built twice.

## D-015 · Pin CDN imports to an exact version — 2026-10-14

**Decision.** The Anthropic SDK loads from esm.sh at an exact version at least two weeks old.
**Why.** An unversioned CDN import ships whatever was published last to every user.

---

## Open questions

| Question | Decide when | Notes |
|---|---|---|
| Paid tier? | after launch, with usage data | Would sell Claude reviews / interview mode on our key, capped per user, via a merchant of record (Polar, Lemon Squeezy) |
| Domain | before launch | `*.netlify.app` free, or ~$10/yr |
| Repo visibility | before Phase 4 | Public: unlimited Actions minutes; private: 2,000/mo (enough) |
| PodcastFillers licence | before training F15 | If non-commercial: own + volunteer takes, LibriSpeech for "other speech" |
| Anthropic terms on training with outputs | before F16 data work | Assume no until confirmed |
| Waitlist | Phase 0 | Netlify Forms is free with a plain HTML form |
