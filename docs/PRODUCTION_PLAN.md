# Speakeasy — production plan ($0)

Status: draft, 2026-10-14. Reviewed by a four-seat council (architecture, security/privacy,
product, cost/ops); their changes are folded in. Figures marked *(unverified)* must be checked
against the vendor's page before relying on them.

---

## 1. Goals and hard constraints

| | |
|---|---|
| **Audience** | Public. Anyone, any modern browser, desktop first, mobile usable. |
| **Cost** | **$0/month to run.** Every service on a free tier that allows commercial use. Only optional spend: a domain (~$10/yr) — `*.netlify.app` is the free fallback. |
| **Privacy** | Analysis happens on the device. Nothing leaves unless the user presses a button that says what is sent. |
| **Works without an account** | Every drill, score and feature except sync works signed-out, in local storage. Accounts exist only to sync. |
| **Never break** | The audio-only path (no transcript) must keep scoring in every browser. |

**What "free" rules out:** a Claude bill paid by us. Claude stays bring-your-own-key. A paid
tier is a separate, later decision (§9) — nothing below depends on it.

---

## 2. Architecture

```
 Browser (does almost all the work)
 ├─ Vite + React + TS SPA ............ Netlify (free, CDN, always warm)
 ├─ Web Audio: VAD, projection, pitch, buzzer
 ├─ Web Speech (Chrome/Edge) ......... live transcript, live fillers
 ├─ Whisper base.en (transformers.js)  post-take transcript, every browser
 ├─ Coach: local rules → Chrome built-in model → Claude (user's own key)
 ├─ IndexedDB ........................ sessions, recordings, webcam video (signed-out store)
 │
 │  /api/*  (Netlify rewrite → same origin, so the refresh cookie works)
 ▼
 NestJS + Prisma API ................. Render free web service (Singapore)
 ├─ auth (JWT + refresh cookie, as in WChess)
 ├─ sync: sessions, custom texts, diction cards, challenges
 └─ presigned URLs for recordings
 │
 ├─ Neon Postgres (free, ap-southeast-1)
 ├─ Cloudflare R2 (free 10 GB) ....... opt-in audio only, never video
 └─ Resend (free) .................... magic-link email
 Scheduled: GitHub Actions cron (free) · Errors: Sentry free · Traffic: Netlify/Cloudflare analytics
```

Same stack as WChess on purpose: known deploy flow, known pitfalls (`cf-connecting-ip` for
login throttling carries over unchanged). **Change from WChess:** the SPA is served from Netlify, not
from Render, because Render free sleeps after 15 min idle and takes ~30–60s to wake. The app
must open instantly; only sync waits on Render. The SPA fires a `GET /api/v1/health/live` on load
to start the wake early.

Netlify `_redirects`:
```
/api/*  https://speakeasy.onrender.com/api/:splat  200
/*      /index.html                                200
```

---

## 3. Free tiers and when we'd outgrow them

| Service | Free allowance | What uses it | Outgrown at | Then |
|---|---|---|---|---|
| Netlify | 100 GB bandwidth/mo *(unverified; plan is credit-based now)* | SPA (~1 MB/visit) | ~100k visits/mo | Cloudflare Pages (unlimited bandwidth, free) |
| Render web | 750 instance-hrs/mo, 512 MB, sleeps at 15 min | API | sustained traffic needing no cold start | $7/mo instance |
| Neon | 0.5 GB, ~100 CU-hrs *(unverified)* | scores only (~2 KB/session) | ~250k sessions | prune / paid |
| Cloudflare R2 | 10 GB, free egress; card on file *(unverified)* | opt-in audio | see below | Backblaze B2 10 GB free as second bucket |
| Resend | 3,000/mo, 100/day *(unverified)* | magic links | >100 sign-ins/day | Google sign-in carries the rest |
| Hugging Face CDN | free | Whisper weights (~75 MB, cached once) | — | — |
| GitHub Actions | free on public repo / 2,000 min private | cron | — | — |
| Sentry | 5k errors/mo *(unverified)* | errors | — | sample |

**Keeping R2 inside 10 GB:** record speech as **Opus 16 kbps mono** (~0.12 MB/min, not 1 MB) and
keep, per user per prompt, only the **first and latest** take — exactly what then-vs-now needs.
≈ 2–5 MB per active user → **2,000–5,000 recording users** in the free tier.

**Never served from our hosts:** Whisper/WebLLM weights (Hugging Face CDN), video (never uploaded).

---

## 4. Privacy model

| Data | Where it lives | Leaves the device? |
|---|---|---|
| Audio for scoring, pitch, VAD | memory | never |
| Live transcript (Chrome/Edge) | memory | **yes, to Google**, by the browser's recogniser — disclosed at the toggle; Whisper-only mode avoids it |
| Whisper transcript | IndexedDB | never |
| Scores, metrics, prompt ids | IndexedDB; Postgres if signed in | sync only |
| Transcripts | IndexedDB | only with a separate "sync transcripts" opt-in |
| Recordings (audio) | IndexedDB; R2 if "keep recordings in the cloud" is on | opt-in, with retention shown at consent |
| Webcam video | IndexedDB | **never** |
| Claude review | — | transcript only, to Anthropic, on button press, with the user's key |

Rules: no voiceprints, speaker ID, embeddings or face analysis, ever (keeps us clear of biometric
law — BIPA etc.). PostHog-style session replay never added. Sentry scrubs transcripts.

---

## 5. Data model (Prisma, sketch)

```prisma
model User        { id String @id @default(uuid()); email String? @unique; googleId String? @unique
                    birthYearOk Boolean; recordingsOptIn Boolean @default(false)
                    transcriptsOptIn Boolean @default(false); createdAt DateTime @default(now()) }
model Session     { id String @id               // client-generated UUID → import/retry idempotent
                    userId String; drill String; promptId String?; customTextId String?
                    raw Json                     // wpm, fillers, proj, acc, cover, var, pause, pitchRange…
                    score Int; scoringVersion Int
                    transcript String?           // only when transcriptsOptIn
                    createdAt DateTime
                    @@index([userId, createdAt]) @@index([userId, promptId]) }
model Recording   { id String @id; sessionId String @unique; userId String
                    key String; bytes Int; role String /* first|latest */; expiresAt DateTime? }
model CustomText  { id String @id; userId String; title String; body String; createdAt DateTime }
model DictionCard { userId String; word String; box Int @default(1); dueAt DateTime
                    @@id([userId, word]) }
model Challenge   { slug String @id; sessionId String; promptId String; score Int
                    createdAt DateTime; revokedAt DateTime? }
model Usage       { userId String; kind String; period String; count Int
                    @@id([userId, kind, period]) }
```

Notes from review:
- **Prompt ids are stable strings** (`imp-042`), not array indexes — editing `content.js` must not
  reshuffle history. Required before then-vs-now can exist.
- **Store raw metrics + `scoringVersion`.** Scoring is recalibrated often; trends recompute from raw.
- No `plans` table — the daily plan is derived client-side each day, as now.
- No Redis (WChess needed it for live games; quotas live in `Usage`).

---

## 6. Features

| # | Feature | How (free) | Notes |
|---|---|---|---|
| 1 | **Then vs now** | Keep first + latest take per prompt; play side by side with both scores | Needs stable prompt ids. Local for everyone, cloud if opted in |
| 2 | **Rehearse your own text** | Paste text → same pipeline as Pace & Pause readings; auto breath marks at punctuation; length from word count | Strongest "real event" hook. Cap 2,000 words |
| 3 | **Interview mode** | Question packs by goal (job interview, pitch, presentation). Browser `speechSynthesis` asks; follow-up from Chrome built-in model → WebLLM (opt-in download) → Claude BYOK; fixed follow-up bank if none available | Cap turns (e.g. 6). Transcript is untrusted input to any model |
| 4 | **Monotone detection** | YIN pitch on the existing analyser, speech frames only; metric = pitch range in semitones (p10–p90) | New score component → bump `scoringVersion`. Calibrate on real takes |
| 5 | **Filler buzzer** | On a filler in Web Speech interim results → short WebAudio tick + flash | Chrome/Edge only (needs live transcript); off by default, toggle per drill |
| 6 | **Share** (post-launch) | Client-side canvas PNG: *improvement* card ("14 → 3 fillers"). Challenge link `/c/:slug` → opens straight into that prompt, no sign-in, "beat 82" | Score only, never transcript or audio. Random slug, `noindex`, revocable |
| 7 | **Progress as facts** | "Fillers down 58% since 4 Sep" — compare earliest vs latest third per metric; claim only with ≥3 points and a real change | Pure function, unit-tested |
| 9 | **Retry missed diction words** | Coral words from Diction Gym → Leitner boxes (1/3/7/14 days); due words seed the next Diction run | `WHERE dueAt <= now()`, no job |
| 11 | **Webcam self-view** | `getUserMedia` video + MediaRecorder, 720p, IndexedDB only | Never uploaded. Delete-all button |
| — | **Goal packs** | Group drills/prompts by goal: interview, presentation, pitch, everyday | Council: people search by goal, not drill name |

**Transcription — the one trap.** Whisper is trained on cleaned-up transcripts and tends to **drop
"um/uh"**. Filler counting is the heart of the app, so:
1. Seed Whisper with a disfluent `initial_prompt` ("Umm, so, uh, like, I mean…").
2. **Gate:** record 20 real takes, compare Whisper's filler count against hand counts; ship only if
   recall ≥ 80%.
3. Whatever the transcript source, prefer Web Speech's filler count where present; label which source
   produced each number.
4. Never block the first run on the model download. Load lazily after the first take, with a size
   prompt; audio-only scoring until it's ready.

---

## 7. Security must-fixes (before public launch)

1. **Age gate** at sign-up: under 13 blocked; cloud recordings and model features 16+ (18+ for India,
   DPDP Act). Signed-out local use needs no gate — nothing is collected. *(General info, not legal advice.)*
2. **Export + delete account** ship in the same phase as cloud recordings, not later. Delete removes R2
   objects, rows and challenge links. R2 lifecycle rule as backstop.
3. **R2 uploads:** server chooses the key (`u/{userId}/…`), short expiry, content-type pinned, size
   checked after upload. Bucket private; every signed GET checks ownership.
4. **Model output rendered as plain text**, never HTML/markdown-to-HTML. Transcripts wrapped and
   treated as data in every prompt.
5. **Import of local history** is validated server-side (shape, size cap, idempotent by UUID).
6. Magic links single-use, 15 min. Rate-limit sign-in emails per IP (`cf-connecting-ip`, as WChess).
7. CSP + security headers on Netlify; `security.txt`.
8. Privacy page listing every processor (Netlify, Render, Neon, Cloudflare, Resend, Sentry, Google
   via Web Speech, Anthropic via BYOK).

---

## 8. Phases

Each phase ends deployed and usable.

### Phase 0 — Ship what exists (1–2 days)
- Deploy the current static app to Netlify. Fix `src/coach.js:104` (`claude-opus-5` → `claude-opus-5-5`).
- Add a one-question waitlist / "what would you use this for?" link.
- **Exit:** public URL, real people using it.

### Phase 1 — Prepare the code (1 week)
- Stable string ids on every content item.
- Split `drills.js`: drill logic (pure) vs `storage.js` reads vs HTML building.
- Raw metrics + `scoringVersion` in the stored record (migrate `speakeasy.v1`).
- `test.js` stays green throughout.
- **Exit:** same app, same tests, logic modules importable with no DOM.

### Phase 2 — Port to Vite + React + TS (2–3 weeks)
- Monorepo like WChess: `frontend/` (Vite) and `backend/` (Nest, empty for now).
- Pure modules → `frontend/src/lib/` as TS; tests → Vitest.
- `run.js` → `createSession({ onTick, onPhase, onFinish })` engine owning audio, VAD, speech and the rAF
  loop. One React component mounts it via `useRef`; meters write to refs/canvas, React
  state only for phase changes. AudioContext created inside the click (iOS). StrictMode-safe.
- localStorage → IndexedDB (sessions, recordings), with a one-time migration.
- **Exit:** feature parity, audio-only path passes in Firefox, deployed to Netlify.

### Phase 3 — Free on-device features (3–4 weeks)
- #2 own text, #7 progress facts, #5 buzzer, #4 pitch, #9 diction retry, #11 webcam (local), goal packs.
- #1 then-vs-now, local only.
- Whisper: spike → 20-take filler gate (§6) → ship if it passes.
- **Own filler model (FEATURES F15):** label ~200 takes, train on Kaggle/Colab free GPUs, ONNX in the
  browser. Gate: ≥ 85% recall and precision on unseen speakers. Becomes the filler source in every browser.
- **Exit:** everything above works signed-out, $0 infrastructure beyond Netlify.

### Phase 4 — Accounts and sync (2 weeks)
- Nest + Prisma on Render, Neon. Auth copied from WChess (JWT + refresh cookie), Google + magic link.
- Age gate, import of local history, sync of sessions/texts/cards.
- Export + delete account.
- **Exit:** sign in on a second device and see the same history.

### Phase 5 — Cloud recordings + interview mode (2 weeks)
- R2 opt-in, Opus 16 kbps, first + latest per prompt, lifecycle rule, retention shown at consent.
- #3 interview mode with the free model chain.
- **Exit:** then-vs-now across devices; interview mode works with no key.

### Phase 6 — Launch (1 week)
- §7 checklist complete. Privacy page. Landing page that leads straight into a drill (first scored
  report in under 2 minutes).
- #6 improvement card + challenge links.
- **Exit:** public launch.

### After launch
- **Own coaching model (FEATURES F16):** fine-tune a 0.5–1.5B open model with LoRA, run in the browser
  via WebGPU. Started only once real usage shows which feedback people use.

Rough total: **14–18 weeks** solo to launch (F15 adds ~2–3), part-time slower.

---

## 9. Open decisions

1. **Paid tier — later, not now.** Everything above is $0. If added, it would sell Claude reviews and
   interview mode on our key (~$0.10/review on Opus 5.5, capped per user), via a merchant-of-record
   (Polar / Lemon Squeezy — per-sale fee only, no monthly). Decide after Phase 6 with real usage.
2. **Domain:** `speakeasy.netlify.app` (free) or ~$10/yr custom.
3. **Repo visibility:** public keeps GitHub Actions unlimited; private gives 2,000 min/mo (plenty).

## 10. Risks

| Risk | Mitigation |
|---|---|
| Whisper drops fillers | §6 gate; own audio filler model (F15); label sources |
| Training data licences (PodcastFillers, model outputs) | Verify before training; fall back to own + donated data |
| Render cold start | SPA on Netlify; wake ping on load; sync is background |
| Free tier terms change | Each piece has a free fallback (Pages, B2, Google sign-in) |
| iOS Safari memory with Whisper | `base.en` max; offer `tiny.en`; skip on low memory |
| Scope too big for one person | Phase 0 usage decides order inside Phase 3; cut anything nobody uses |
