# Architecture

How Speakeasy works, and the system it is growing into. Behaviour and reasons live here;
*why we chose* one option over another lives in [DECISIONS.md](DECISIONS.md), *what to build* in
[PRD.md](PRD.md), *what's done* in [TASKS.md](TASKS.md). For exact values (thresholds, weights,
pool contents) the code is the source of truth — this file explains them.

- [The app](#the-app) — module map, a run end to end, drills and content, measurement, scoring,
  voice detection, transcription, report, coaching, plan, routes, storage, feature logic,
  interface, dev pages, deploy, tests, the engine
- [Target](#target) — stack, request path, what leaves the device, data model, free-tier limits

---

# The app

A React + TypeScript single-page app built with Vite (`frontend/`), served as static files; no
backend yet. Everything runs in the tab. The vanilla-JS app it replaced was retired on 2026-10-16
(DECISIONS D-023); its history is in git.

## Module map

```text
frontend/
  index.html     the only page that is built and shipped
  label.html, mic-test.html   dev pages: served by `npm run dev`, never built
  src/
    lib/          pure, typed, no DOM — tested with Vitest
      content.ts    every text pool (prompts, readings, twisters, words, echoes, filler lists)
      text.ts       tokenising, filler counting, passage matching, accuracy, variety, own text
      scoring.ts    curves, scoreRun(), verdicts, coaching notes, SCORING_VERSION
      drills.ts     DRILLS, buildRun(), language analysis, the plan, packs, facts, diction cards,
                    the buzzer rule, the live coach line
      vad.ts        voice-activity detection, YIN pitch
      speech.ts     the Web Speech listener (recogniser passed in) and its error messages
      storage.ts    the record's shape, plan, streak, recordRun(), backup validation, migration
      reel.ts       Reel's pixels: frames(state) → one SVG path per colour per frame
      ascii.ts      ASCII decoration around real words (the speech bubble)
    engine/
      session.ts    createSession(): arm, calibrate, count down, frame loop, finish → RunResult
      browser.ts    the real ports: mic + MediaRecorder + buzzer tick, clock, speech synthesis
      db.ts         the record in IndexedDB; first load copies the old localStorage record
      useSession.ts React's handle: the engine in a ref, state only on phase changes
    label/          label.js, the labelling page's pure helpers (tested)
    ui/             parts.tsx (Reel, logo, Bar, Wave, Timeline, Marked) · art.ts (ripples)
    app/            state.tsx (record, last result, hash routes) · Shell.tsx (header, nav, tabs)
    screens/        Home, Booth, Report; the other pages show "next" until they are built
    styles.css      DESIGN.md's tokens; fonts self-hosted from @fontsource
```

**Pure vs DOM.** `lib/` imports nothing from the DOM or React, which is what lets Vitest cover it
and lets the engine run whole sessions in Node. `engine/` touches the browser only through
`browser.ts` and `db.ts`.

## A run, end to end

1. **Pick.** `buildRun(id, opts)` returns plain data: `{ drill, promptId, dur, target, display,
   framework, requireWord, speak, cd, … }`. A goal pack can point Impromptu at its prompt pool;
   Diction Gym passes the most overdue diction card's twister. "Same prompt again" reuses the run.
2. **Arm.** `begin()` (from a click, for iOS) opens the mic, measures the room for ~1 s, then counts
   down (Echo speaks its sentence instead). The booth behind the overlay is inert.
3. **Live.** `loop()` per animation frame: probe → VAD → `onTick(live)` with level, meters,
   pauses, fillers and their marks, live passage marking and the coach line.
4. **Finish.** `finish()` assembles the measurement object `m`, scores it and returns a
   `RunResult`; the booth saves it with `recordRun()` (history, diction cards, today's plan) and
   opens the report.

Leaving mid-run (Esc, or another page) discards the run rather than saving a partial score.

## Drills and content

| id | Name | Length | Prep | Set text | Extra |
|---|---|---|---|---|---|
| `impromptu` | Impromptu | 90 s | 15 s | — | framework rail (PREP, STAR, …) |
| `filler` | Filler Hunt | 60 s | 5 s | — | easy prompts, mechanics-only scoring |
| `pace` | Pace & Pause | `max(60, words/2.5)` | 5 s | yes | `‖` breath marks |
| `diction` | Diction Gym | 30 s | 3 s | twister ×3 | serves due retry cards first |
| `word` | Word Forge | 35 s | 10 s | — | must use the word |
| `echo` | Echo | 22 s | 2 s | yes | sentence is spoken to you first |

Length is adjustable (30 s / 1 min / 90 s / 2 min) on drills with no set text.

Pools in `lib/content.ts`: `PROMPTS` (Impromptu), `EASY_PROMPTS` (Filler Hunt), `FRAMEWORKS`,
`READINGS` (Pace & Pause; `|` marks a breath), `TWISTERS`, `WORDS`, `ECHOES`, plus the filler lists
`HARD` (um, uh, er…) and `CRUTCH` (like, you know, basically…) and the `STOP` word set.

**Filler Hunt** draws easy topics on purpose — the topic must not compete for attention — and is
scored on mechanics only: pace and word variety are excluded, because a plain, repetitive answer is
the right output for an easy topic.

**Content ids.** Every item in the six drill pools has a permanent `id` — `imp-001`, `easy-001`,
`read-001`, `tw-001`, `word-<word>`, `echo-001` — recorded on each run as `promptId`.
`content-ids.txt` is the ledger; `test.js` fails on a duplicate id, an id missing from the ledger,
or a ledger id gone from the content. The editing rules are in `CLAUDE.md`.

## Measurement

`finish()` builds `m`, the measurement object every score is computed from:

| Field | Meaning |
|---|---|
| `wpm` | words ÷ elapsed minutes; needs ≥ 8 words and > 5 s, else null |
| `artic` | words ÷ *speaking* minutes (pauses excluded) |
| `f` | `{ hard, crutch, total, found }` from `countFillers()` |
| `words` | word count of the transcript |
| `proj` | `20·log10(mean speech RMS)` mapped −46 dB → 0, 0 dB → 100 |
| `snr` | mean speech RMS over the room's noise floor, in dB |
| `acc` | of the passage words you *reached*, how many were recognised |
| `coverage` | how far through the passage you got |
| `var` | unique content words ÷ total; null under 12 content words |
| `goodPauses` / `longPause` | gaps of 0.4–2.2 s / longest gap |
| `pauseScore` | `band(pausesPerMinute, 5, 10, 11)` |
| `usedWord` | Word Forge: target used (stem match, so *reconciled* counts) |
| `room` | measured noise level, 0–100 |

Gaps are measured between genuine voice, not hangover edges, and ignore the first 500 ms.
Word Forge overrides `acc`: 100 if the word was used, capped at 40 if not. Passage matching
(`matchTarget`) is a forward pointer with a short lookahead, so a dropped or inserted word costs
that word and not the rest of the line; the booth and the report use the same matcher.

## Scoring

`scoreRun(m, run, drillId)` maps each metric to 0–100 with one of two curves and takes the weighted
mean:

- `band(v, lo, hi, fall)` — 100 inside `[lo, hi]`, falling `fall` points per unit outside.
- `ramp(v, zero, full)` — linear, for metrics that are simply better when higher.

| Component | Curve | Weight |
|---|---|---|
| Pace | `band(wpm, 138, 165, 1.6)` | 1.4 on `pace`, 1 elsewhere, **excluded on `filler`** |
| Fillers | `100 − rate × 9` | 2.4 on `filler`, 1 elsewhere |
| Projection | `band(proj, 55, 78, 2.2)` | 0.8 |
| Diction | `ramp(acc, 50, 96)` | 2 (reading drills) |
| Passage read | `ramp(coverage, 30, 98)` | 1 (reading drills) |
| Word variety | `band(var, 68, 100, 2.2)` | 0.7, **excluded on `filler`** |
| Pausing | `pauseScore` | 1.3 on `pace`/`filler`, 0.7 elsewhere |

Filler rate = `(hard × 2 + crutch) / max(words, 50) × 100`. The 50-word floor stops one slip in a
short answer reading as a catastrophe; on a set passage `crutch` is zeroed, since the author's
"you know" is not your tic. Non-finite components are dropped rather than averaged — one `NaN`
used to poison the score and every trend after it. The on-screen Pace & Pause copy says 130–170
wpm; full marks are the narrower 138–165.

Verdicts: ≥ 90 Sharp · ≥ 76 Solid · ≥ 62 Getting there · ≥ 45 Rough, and that's fine · else Early
days. Calibrated so a flawless run is 100, good-but-imperfect high 80s, mediocre ≈ 50, poor in the
30s; `test.js` pins that ordering and a spread of more than 50 points.

**`SCORING_VERSION`** is stored with every session along with `raw` (= `m`) and `reading`, so a
recalibrated scorer can recompute history from measurements instead of trusting old `parts`.

## Voice activity detection

A fixed loudness threshold fails in most rooms (a fan sits above it, so you "never stop
talking"). `isSpeechFrame()` uses two gates, both relative to the room:

```text
gate   = floor × (3.2 / sens) + 0.006
speech = rms > gate  &&  ratio > 0.32      ratio = share of energy in 200–3800 Hz
```

The floor is the 75th percentile of a 1 s calibration (one cough can't poison it), then adapts —
falling fast, rising slowly. `ON_MS` 60 ms before speech counts, `HANG_MS` 220 ms after so
plosives don't chop words. `getUserMedia` runs with echo cancellation and noise suppression on and
**auto-gain off** — AGC would flatten projection. Mic sensitivity (Strict 0.7 / Normal 1 / Quiet
voice 1.5) is exposed in the booth because real rooms vary more than any constant covers. On the
ribbon and tape, your voice is amber and full height; the room is grey and flat.

## Transcription

Web Speech API, language from `navigator.language` when English, else `en-US`. Chrome uploads the
audio to Google to transcribe, so this one feature needs a network.

| | Chrome / Edge | Safari | Firefox | Brave |
|---|---|---|---|---|
| Timer, level, pauses, projection, recording, tape | yes | yes | yes | yes |
| Transcript, pace, fillers, diction, word variety | yes | partial | no | no |

Without a transcript every drill still runs and scores what the audio alone measures — the
**audio-only path**. `no-speech` and `aborted` are normal and not reported; `network` retries twice;
recognition restarts on `onend` (300 ms backoff if it died inside 500 ms), and interim text is
folded into the final rather than dropped. Word timings for playback are stamped when a word first
appears in interim results.

## Report

- **The take** — bar height is the loudest moment in each slice; fillers are pills and deliberate
  pauses ticks on the timeline below. Click the bars to hear that moment.
- **Parts** — each component of the score, out of 100, coloured by band.
- **One thing to fix** — the first of `coachNotes()`; **since you started** lists `facts()`.

## Coaching

The old app's three tiers — local language analysis (`analyseLanguage()`, in `lib/` and tested),
Chrome's on-device model, and opt-in Claude review with the user's own key — are being rebuilt on
the report (TASKS). The local tier needs no network; Claude sends only the transcript, on a button.

## The daily plan

`buildPlan()` picks three drills from the weakest component averages over the last 10 sessions
(filler → Filler Hunt; pace, pause → Pace & Pause; acc, cover → Diction Gym; var → Word Forge;
proj → Echo), falling back to the least-practised drills. `todayPlan()` (lib/storage.ts) rebuilds it
once a day and `markDone()` remembers what's done. `trendFor()` needs at least 3 points to claim a direction.

## Routes

`#/` Home, `#/drill/<id>` the booth, `#/report`, `#/drills`, `#/progress`, `#/texts`, `#/guide`,
`#/data`. Hash routes need no server rewrites; an unknown hash shows Home.

## Storage

One IndexedDB value (database `speakeasy`, store `kv`, key `record`), read at start and written
whole on change; last 200 sessions. A value of the wrong shape is replaced, not trusted.

```js
{
  sessions: [{ at, drill, name, score, wpm, fillers,
               parts: { pace, filler, proj, acc, cover, var, pause },
               promptId, reading, raw, v, secs }],      // these five since scoring v1
  cards:    [{ word, twisterId, box, misses, dueAt }], // diction retry
  plan:     { day, drills, why, done },
  pack:     string | null,                              // goal pack id (F8)
  buzz:     { [drillId]: boolean },                     // filler buzzer choices (F3)
  theme:    string | null
}
```

**Migration.** On first load the old app's `localStorage["speakeasy.v1"]` is copied in through the
backup validator (`migrateLegacy()`) and left in place. Without IndexedDB the record lives in that
key instead. Recordings live in memory for the page only.

**Backup.** `parseBackup()` accepts only `{ kind: "speakeasy-backup", version: 1, sessions, cards }`,
copies known fields and drops the rest; `mergeBackup()` matches sessions by time and drill and caps
at 200. The same validator is the shape a server import must accept (PRD → F11). The download and
restore buttons return with the Your data page. After 5 sessions the app calls
`navigator.storage.persist()`.

## Feature logic

The PRD features' logic, all in `lib/` with tests; which screens show them is in
[TASKS.md](TASKS.md).

- **Own text (F1)** — `cleanText()` strips markdown, bullets, emoji and `|`. `autoBreaths()`
  breaks after `. ! ? ; :`, after a comma once the segment has 6+ words, and at 14 words at the
  latest — at the last comma if there is one. `buildTextRun()` makes a normal Pace & Pause run,
  `dur = max(30, words/2.5)`, and lists the text's own crutch words.
- **Progress facts (F2)** — `facts()` compares the median of the earliest third with the latest
  third of sessions that have `raw`. A claim needs ≥ 6 points over ≥ 3 days, ≥ 15% relative change,
  and a per-metric absolute minimum (fillers 0.5 per 100 words, pace 5 wpm outside the band,
  pauses 1/min, score 5). Progress is listed before regressions; a regression names its drill.
  `recordFor()` needs 5 earlier sessions of the same drill.
- **Pitch (F4)** — `yin()` finds f0 in 70–400 Hz and returns null below 0.85 confidence (noise).
  `pitchStats()` reports the p10–p90 range in semitones relative to the take's own median, and
  flat 4 s windows. Not yet run during sessions: it needs a Web Worker, and calibration on real
  takes.
- **Diction retry (F5)** — *live*. `dictionOutcome()` judges content words you reached;
  `updateCards()` runs Leitner boxes at 1/3/7/14/30 days (a miss resets to box 1; a hit promotes
  only a due card; box 5 passed or five misses in a row retires it); `dueCards()` orders by
  overdue. `retryNote()` turns one result into the report line ("“sixth” came back clean — 1 sound
  retired."); the booth serves the most overdue twister, and the report shows the line.
- **Filler buzzer (F3)** — *live*. `buzz()` fires on a rise in the hard-filler count (all fillers
  with the crutch option), at most once per 600 ms, never on a set passage, and never twice for a
  count Chrome revised down and back up. the engine's `tick()` (`engine/browser.ts`) plays a 60 ms 880 Hz sine
  through the mic's own `AudioContext`; `navigator.vibrate(40)` where supported. `buzzOn()`: on by default in
  Filler Hunt only; a per-drill choice is kept in the record's `buzz`. Needs a live transcript, so
  the toggle is disabled without one.
- **Goal packs (F8)** — *live*. `PACKS` is data; `buildPlan(sessions, size, pack)` gives a pack
  every slot but the last (weakest of its drills first) and keeps the last on the weakest metric
  overall. `packRunOpts()` points Impromptu at `INTERVIEW_PROMPTS` (STAR or PREP) or
  `PITCH_PROMPTS` (60 s). The choice is the record's `pack`, picked on Home; picking one
  rebuilds today's plan if none of it is done, otherwise it applies from tomorrow.

## Interface

[DESIGN.md](DESIGN.md) is the source: the terminal booth, colours, type, Reel, the screens. The
accessibility baseline carries over: visible focus, `aria-live` on the transcript and coach,
labelled controls, real buttons and links, a modal that makes the page inert, and reduced motion
(Reel holds its first frame).

## Dev pages

Served by `npm run dev` in `frontend/` (http://localhost:5173), never built or published:

- `mic-test.html` — runs the recogniser alone, with the mic held, and continuous, logging every
  event, to tell a browser/network fault from an app fault.
- `label.html` + `src/label/label.js` — the F15 labelling tool (how-to in the README). Decodes with
  an `OfflineAudioContext`; `#demo` builds a synthetic take. `label.js` is pure and tested.

## Deploy

`netlify.toml` builds `frontend/` (`npm ci && npm run build`) and publishes `frontend/dist`, with a
Content-Security-Policy that allows only our own origin plus `api.anthropic.com` for opt-in
coaching, `Permissions-Policy` (microphone self only), `nosniff` and `frame-ancestors 'none'`.
Fonts, scripts and styles are bundled, so a visit loads nothing from a third party. A hidden copy
of the waitlist form in `index.html` is what Netlify Forms detects at build time.

## Tests

`npm test` (Vitest): `lib/lib.test.js` (the old suite, case for case), `lib/*.test.ts` (Reel, ASCII,
storage), `label/label.test.js`, and `engine/session.test.ts`, which drives whole runs with a
scripted fake mic, a hand-driven clock and a fake recogniser.

`node scripts/smoke-frontend.mjs` (after a build) runs the built app in headless Chrome over the
DevTools protocol, with Chrome's fake microphone: a real run from the room check to the report and
IndexedDB, the old-history migration, the goal pack, the live logo, one Reel per screen, Home and
Report at phone width (checked against 390 px — mobile emulation widens the viewport to fit
overflow), and the label page's mouse and keyboard handling. CI runs typecheck, tests, build and
smoke on every push.

## The engine

**The engine** owns one run and touches neither the DOM nor storage. It takes its world as ports:
`AudioPort` (open, probe, record, tick), `ClockPort` (now, frame, wait), the listener from
`createListener(SR)`, and an optional `SpeakerPort` for Echo. It reports through `onPhase`
(idle → calibrating → countdown → running → done, or error), `onTick(live)` every frame (one
mutated `Live` object: meters, transcript, live passage marking, coach line), and `onFinish(result)`.
The caller saves the result with `recordRun()` (history, diction cards, today's plan) and
`saveRecord()`. `begin()` is only called from a click, and the AudioContext is created before the
first await, so iOS counts it as part of the gesture; `dispose()` orphans everything in flight,
which makes StrictMode's double mount harmless.

---

# Target

The production system, built in phases (see [TASKS.md](TASKS.md)); choices and rejected
alternatives are in [DECISIONS.md](DECISIONS.md).

## Stack and request path

```text
Browser — does almost all the work
├─ Vite + React + TS SPA ............ Netlify (free CDN, always warm)
├─ Web Audio: VAD, projection, pitch, buzzer
├─ Web Speech (Chrome/Edge) ......... live transcript
├─ Whisper base.en (transformers.js)  post-take transcript, every browser
├─ Filler detector (ONNX, F15) ...... fillers from audio, every browser
├─ Coach: local rules → Chrome model → own small model (F16) → Claude (user's key)
└─ IndexedDB ........................ sessions, recordings, webcam video
   │  /api/*  (Netlify rewrite: same origin, so the refresh cookie works)
   ▼
NestJS + Prisma API ................. Render free web service
├─ auth: JWT + httpOnly refresh cookie (as in WChess)
├─ sync: sessions, custom texts, diction cards, challenges
└─ presigned URLs for recordings
   ├─ Neon Postgres ................. scores and metadata
   ├─ Cloudflare R2 ................. opt-in audio only
   └─ Resend ........................ magic-link email
Cron: GitHub Actions · Errors: Sentry · Traffic: Cloudflare Web Analytics (page views, no cookies)
```

Render's free service sleeps after 15 minutes and takes ~30–60 s to wake, so the SPA never waits
on it: it pings `/api/v1/health/live` on load and syncs in the background.

```text
# netlify _redirects
/api/*  https://speakeasy.onrender.com/api/:splat  200
/*      /index.html                                200
```

The session engine becomes `createSession({ onTick, onPhase, onFinish })`, owning audio, VAD,
speech and the frame loop; React mounts it through a ref, meters draw to refs/canvas, and React
state changes only on phase changes. The AudioContext is created inside the click (iOS).

## What leaves the device

| Data | Lives in | Leaves the device |
|---|---|---|
| Audio for scoring, pitch, VAD, filler detection | memory | never |
| Live transcript (Chrome/Edge) | memory | **to Google**, by the browser's recogniser — disclosed at the toggle |
| Whisper transcript | IndexedDB | never |
| Scores, metrics, prompt ids | IndexedDB; Postgres if signed in | on sync |
| Transcripts | IndexedDB | only with the separate "sync transcripts" opt-in |
| Recordings (audio) | IndexedDB; R2 if cloud recordings are on | opt-in, retention shown at consent |
| Webcam video | IndexedDB | never |
| Claude review | — | transcript only, to Anthropic, on button press, user's key |
| Training donations (F15/F16) | — | per-take opt-in, separate from cloud storage |
| Waitlist form: what you practise for, optional email | — | to Netlify Forms, only when you press Send |
| Request data (IP address, browser) | — | to Netlify serving the page and Cloudflare Web Analytics (no cookies); fonts self-hosted so none goes to Google |

No voiceprints, speaker identification, embeddings or face analysis. Error reports carry no
transcripts.

## Data model (Prisma sketch)

```prisma
model User        { id String @id @default(uuid()); email String? @unique; googleId String? @unique
                    birthYearOk Boolean; recordingsOptIn Boolean @default(false)
                    transcriptsOptIn Boolean @default(false); createdAt DateTime @default(now()) }
model Session     { id String @id                 // client UUID: import and retries are idempotent
                    userId String; drill String; promptId String?; customTextId String?
                    raw Json; score Int; scoringVersion Int; secs Int
                    transcript String?             // only with transcriptsOptIn
                    createdAt DateTime
                    @@index([userId, createdAt]) @@index([userId, promptId]) }
model Recording   { id String @id; sessionId String @unique; userId String
                    key String; bytes Int; role String /* first|latest */; expiresAt DateTime? }
model CustomText  { id String @id; userId String; title String; body String; updatedAt DateTime }
model DictionCard { userId String; twisterId String; word String; box Int; misses Int; dueAt DateTime
                    @@id([userId, twisterId, word]) }
model Challenge   { slug String @id; sessionId String; promptId String; score Int
                    createdAt DateTime; revokedAt DateTime? }
model Usage       { userId String; kind String; period String; count Int
                    @@id([userId, kind, period]) }
```

The daily plan stays client-side; quotas and rate limits live in `Usage` (no Redis).

## Free-tier limits

Figures marked *(unverified)* need checking on the vendor's page.

| Service | Free allowance | Outgrown at | Then |
|---|---|---|---|
| Netlify | ~100 GB/mo *(unverified; credit-based)* | ~100k visits/mo | Cloudflare Pages |
| Render | 750 h/mo, 512 MB, sleeps at 15 min | needing no cold start | $7/mo instance |
| Neon | 0.5 GB *(unverified)* | ~250k sessions (~2 KB each) | prune / paid |
| Cloudflare R2 | 10 GB, free egress, card on file *(unverified)* | see below | Backblaze B2 as a second bucket |
| Resend | 3,000/mo, 100/day *(unverified)* | > 100 sign-ins/day | Google sign-in carries the rest |
| Hugging Face CDN | free | — | serves Whisper and model weights |
| GitHub Actions | 2,000 min/mo private, unlimited public | — | — |
| Sentry | 5k errors/mo *(unverified)* | — | sample |

R2 stays inside 10 GB by recording speech as Opus 16 kbps mono (~0.12 MB/min) and keeping only
the **first and latest** take per prompt — what then-vs-now needs: roughly 2–5 MB per active user,
so 2,000–5,000 recording users.
