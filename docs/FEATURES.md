# Speakeasy — feature specs

Companion to [PRODUCTION_PLAN.md](PRODUCTION_PLAN.md). Each feature: why, the flow, how it works,
what it stores, edge cases, and what "done" means. All features run at $0 and work signed-out unless
stated otherwise. Code references are to the current vanilla app; after the Phase 2 port they map to
`frontend/src/lib/` and the session engine.

Phase key: **P3** = free on-device features · **P4** = accounts · **P5** = cloud recordings + interview · **P6** = launch.

| # | Feature | Phase | Size | Depends on |
|---|---|---|---|---|
| F0 | Stable content ids + raw metrics | P1 | S | — |
| F1 | Rehearse your own text | P3 | M | F0 |
| F2 | Progress as facts | P3 | S | F0 |
| F3 | Filler buzzer | P3 | S | — |
| F4 | Pitch range / monotone | P3 | M | F0 |
| F5 | Diction retry (spaced repetition) | P3 | S | F0 |
| F6 | Then vs now | P3 local, P5 cloud | M | F0, F10 |
| F7 | Webcam self-view | P3 | M | — |
| F8 | Goal packs | P3 | S | F0 |
| F9 | Whisper transcription | P3 | L | — |
| F10 | Local recording store | P3 | S | — |
| F11 | Accounts + sync | P4 | L | F0 |
| F12 | Privacy controls (export, delete, opt-ins) | P4–P5 | M | F11 |
| F13 | Interview mode | P5 | L | F8 |
| F14 | Share: improvement card + challenge link | P6 | M | F2, F11 |
| F15 | Own model: audio filler detector | P3 | L | F10 |
| F16 | Own model: in-browser coaching LLM | post-launch | L | F11 (usage data) |

S ≈ ≤3 days · M ≈ 1 week · L ≈ 2 weeks, solo.

---

## F0 · Stable content ids + raw metrics (foundation)

**Why.** Today `content.js` pools are plain arrays and a stored session keeps no prompt at all
(`run.js:456` saves `drill, score, wpm, fillers, parts`). Then-vs-now, diction retry and challenge
links all need to know *which* prompt a take answered, and trends break whenever scoring is recalibrated.

**How.**
- Every content item gets a permanent id: `imp-001`, `easy-001`, `read-gettysburg`, `tw-001`,
  `word-001`, `echo-001`. Ids never change or get reused; removing an item retires its id.
- `buildRun()` returns `promptId`. Session record gains `promptId`, `raw` (the `m` object minus the
  transcript) and `scoringVersion` (starts at `1`; bumped by every change to `scoreRun`).
- Progress and the daily plan recompute from `raw` with the current scorer, so recalibration never
  makes the past look better or worse than it was.

**Migration.** Old sessions have no `promptId`/`raw`; they keep working for trends via `parts`, and
are simply ineligible for then-vs-now.

**Done when.** A test fails if any two content items share an id, or if an id present in the last
release disappears without being listed as retired.

---

## F1 · Rehearse your own text

**Why.** The single most urgent reason anyone practises: a real talk, answer or toast on a real date.

**Flow.**
1. Practice → **Your text** → paste or type (title optional). Live word count and estimated time.
2. Preview shows auto-placed breath marks `‖`; tap between words to add or remove one.
3. Start → runs exactly like Pace & Pause: passage on screen, word-by-word marking, coverage, diction, pace.
4. Report as for readings, plus "Run again" and "Edit text".
5. Texts are saved in a **Your texts** list; each shows best score, last run and run count.

**How.**
- Reuse the reading pipeline unchanged: build `{ x: "seg | seg | seg" }` and feed it through the same
  path as `READINGS` (`drills.js` pace branch). `matchTarget`, `readStats`, the `‖` handling and the
  report's passage replay all apply as-is.
- Auto breath marks: split after `. ! ? ; :` always, after `,` when the running segment is ≥ 6 words,
  and force a split at 14 words with no punctuation.
- Duration: `max(30, words / 2.5)` seconds — the Pace & Pause formula, with a lower floor for short answers.
- Crutch words are not scored (as for set passages: `fillerRate(m, reading=true)`) — but a "your text
  contains *basically* ×3" note is shown before the run, since here the author is the user.
- Long texts (> 400 words ≈ 2:40) offer **Rehearse in sections**: the same segmentation, one section
  per run, with a combined view.

**Stores.** `CustomText { id, title, body, createdAt, updatedAt }`; sessions point at `customTextId`.
Synced only if signed in. Limits: 2,000 words per text, 50 texts.

**Edge cases.** Pasted text with markdown, bullets or emoji → strip to plain text before tokenising.
Non-English text → warn that diction marking assumes English. A text edited after runs → keep old
sessions, mark them "earlier version".

**Done when.** A 300-word pasted talk runs end-to-end with marking identical in quality to a built-in
reading; tests pin the breath-mark rules on fixed inputs.

---

## F2 · Progress as facts

**Why.** "Fillers down 58% since 4 Sep" lands harder than any chart, and it is the core retention message.

**Flow.** `#progress` opens with up to three fact cards, biggest change first, then the existing
trends. The report shows one fact if this run just set a record ("Your lowest filler rate yet").

**How.** For each metric with enough history (≥ 6 sessions containing it, spanning ≥ 3 days):
- Compare the median of the **earliest third** to the median of the **latest third** (medians, so one
  bad day can't create or erase a trend).
- Claim a change only if it is ≥ 15% relative **and** ≥ 5 points absolute on the component scale.
- Metric phrasing table, never a raw component name:
  `filler` → "Fillers down 58% since 4 Sep" · `pace` → "Your pace settled from 182 to 156 wpm" ·
  `pause` → "From 2 to 7 deliberate pauses a minute" · `pitch` → "Your range widened from 3 to 6 semitones".
- Regressions are reported once, gently, with the drill that fixes them ("Pace drifted up this week —
  Pace & Pause").
- Records: best score per drill, lowest filler rate, longest streak.

**Done when.** A pure `facts(sessions, today)` function with unit tests for: too little data (no
claim), noisy flat data (no claim), clear improvement, clear regression, and a metric that appears
mid-history.

---

## F3 · Filler buzzer

**Already there:** a visual flash on each new filler (`run.js:347`, `S.flashUntil`, `#coach.flash`).

**Add.**
- **Sound:** a short, soft WebAudio tick (sine 880 Hz, 60 ms, gain envelope) — not a harsh buzz;
  it should interrupt the habit, not the speaker.
- **Haptic:** `navigator.vibrate(40)` where supported (Android).
- **Toggle per drill**, off by default, on by default in Filler Hunt. Remembered.

**Rules.** Fire on the transition of the hard-filler count (`um/uh/er`), not crutch words by default
(an option adds crutch words). Debounce 600 ms. Never fire on a set passage. Routed so the tick is not
picked up by the mic: play through the same `AudioContext`; echo cancellation handles the rest — verify
it does not register as speech in the VAD.

**Limit.** Needs a live transcript, so Chrome/Edge only — until F15 ships, after which the buzzer is
driven by the audio filler detector in every browser. Before F15, the toggle is shown disabled with
the reason.

**Done when.** In Filler Hunt with the buzzer on, saying "um" produces exactly one tick within ~1 s, and
a 60-second take with the tick firing does not change the VAD's speaking-time measurement by > 2%.

---

## F4 · Pitch range / monotone

**Why.** A flat voice is one of the most common complaints about speakers and nothing in the app
measures it.

**How.**
- Per speech frame (only when the VAD says voice), read `getFloatTimeDomainData` (float, not the
  8-bit buffer `probe()` uses) and run **YIN** for f0 in 70–400 Hz. Discard frames with YIN
  confidence < 0.85.
- Convert to semitones relative to the take's own median f0: `12·log2(f0/median)`. This makes the
  measure independent of voice type.
- **Range** = p90 − p10 of semitones across the take. **Flat stretches** = runs ≥ 4 s with
  range < 2 semitones; marked on the tape.
- Score component `pitch`: `band(range, 5, 12, 9)` *(constants to calibrate)*, weight 0.6; on reading
  drills weight 0.8 (reading aloud is where people go flattest). Excluded on Diction Gym (twisters are
  repetitive by design) and Filler Hunt. Bump `scoringVersion`.
- Live: a thin pitch trace under the ribbon, optional.

**Calibration before shipping.** Record 10 takes read deliberately flat and 10 deliberately
expressive; pick constants so flat ≤ 40, expressive ≥ 85. Commit the fixtures as test data.

**Privacy.** Pitch is computed and summarised on the device; only the range number is stored. No
voice profile is built.

**Done when.** Synthetic test: a sine sweep across 6 semitones yields range ≈ 6 ± 0.5; a constant tone
yields < 0.5; noise yields no frames.

---

## F5 · Diction retry (spaced repetition)

**Why.** The same sounds fail for the same person. Bring their failures back until they don't.

**How.**
- After each Diction Gym run, words that came out coral (missed in `matchTarget`) become cards keyed
  by `(word, twisterId)`. Words that came through on a due card promote it.
- **Leitner boxes**: 1 → 3 → 7 → 14 → 30 days; a miss sends the card back to box 1. Box 5 passed →
  retired.
- Diction Gym picks: a due twister if any card is due (most-overdue first), else random as now.
- Report line: "*sixth*, *sheikh's* came back clean — 2 sounds retired."
- Practice card shows "3 due today".

**Stores.** `DictionCard { word, twisterId, box, dueAt }`. No job: due cards are a query at pick time.

**Edge cases.** Proper nouns or words the recogniser can't produce for anyone (score < 30% across all
users is unknowable offline — instead: a word missed 5 times in a row is auto-retired with a note
"the recogniser struggles with this one, not you").

**Done when.** Unit tests on box transitions and due selection with a fixed clock.

---

## F6 · Then vs now

**Why.** Hearing your own improvement is the most motivating thing the app can offer.

**Flow.**
- The report for any prompt you've answered before shows **Then vs now**: two players stacked, each
  with date, score and its tape; play one, then the other, or "play both openings" (first 15 s of each).
- Underneath: the component deltas ("fillers 9 → 2, pace 188 → 158").
- `#progress` gets a **Then vs now** shelf: the prompts with the biggest score gap.

**How.**
- Keep per prompt (F0 id) exactly two recordings: **first** and **latest**. A new take replaces
  `latest`; `first` is never replaced. (Optionally pin a "best" as a third — later.)
- Encode at `audioBitsPerSecond: 16000` Opus (`audio.js` `startRecording` already prefers
  `audio/webm;codecs=opus`) → ~0.12 MB/min.
- Safari records `audio/mp4`; store the mime type with the blob.

**Stores.** Local: IndexedDB (F10). Cloud (P5, opt-in): R2 `u/{userId}/{promptId}/{first|latest}.webm`,
`Recording` rows.

**Edge cases.** Prompts drawn at random mean repeats are rare → add **"Do this prompt again in a
week"** on the report, which pins it into the daily plan 7 days later. Own texts (F1) and Echo/Diction
repeat naturally.

**Done when.** Same prompt answered twice on different days shows both takes with working playback,
signed-out, after a browser restart.

---

## F7 · Webcam self-view

**Why.** Seeing yourself — eye line, face, hands — is a different level of practice.

**Flow.** Toggle **Camera** in the setup pills (off by default). During the run, a mirrored preview
in the corner. After: video playback in the report, synced with the tape and transcript.

**How.** `getUserMedia({ video: { width: 1280, height: 720, frameRate: 30 } })`, separate
`MediaRecorder` at ~1 Mbps VP9/H.264, its own stream so audio analysis is untouched. Stored in
IndexedDB, newest 10 videos kept, delete-all button. **Never uploaded, never analysed** — no face or
gaze detection (privacy plan §4).

**Edge cases.** Camera denied → toggle reverts with a message, drill continues audio-only. Low storage
(`navigator.storage.estimate()`) → warn and keep fewer videos. Mobile: front camera, portrait layout.

**Done when.** A run with camera on records, plays back in sync with the tape (drift < 200 ms over
90 s), and survives a reload.

---

## F8 · Goal packs

**Why.** People arrive with a goal ("job interview Friday"), not a drill name.

**Packs (launch set).**

| Pack | Contents |
|---|---|
| Job interview | Impromptu with STAR/PREP on interview-style prompts, Filler Hunt, F13 interview mode |
| Presentation | Your text (F1), Pace & Pause, pitch focus (F4) |
| Pitch / sales | 60-second impromptu, Word Forge, then-vs-now on one prompt |
| Everyday clarity | Diction Gym + retry (F5), Echo, Filler Hunt |

**How.** A pack is data: `{ id, name, blurb, drills: [{ drill, promptPool?, weight }] }`. Choosing a
pack biases the daily plan (`buildPlan`) toward its drills while still targeting the weakest metric.
One active pack at a time, changeable any time.

**Needs content:** ~40 interview prompts, ~20 pitch prompts, each with an F0 id.

**Done when.** Selecting a pack changes the next day's plan to ≥ 2 of 3 drills from the pack.

---

## F9 · Whisper transcription (free, every browser)

**Why.** Today Firefox, Brave and much of Safari get no transcript, so no fillers, pace or diction.

**Flow.**
1. First run in a browser without Web Speech: audio-only scoring as now, plus a card: "Get full scoring
   in this browser — one-time 75 MB download, runs on your device."
2. Accept → download in the background (progress shown), cached by the browser.
3. After each take: "Transcribing…" (seconds on WebGPU, longer on WASM), then the report fills in
   fillers, pace, variety, diction.
4. In Chrome/Edge: Web Speech stays live; Whisper optionally re-transcribes after the take for a
   cleaner transcript (setting, off by default).

**How.** transformers.js in a Web Worker, `whisper-base.en` (q8), WebGPU → WASM fallback, word
timestamps from the `_timestamped` export. Weights from the Hugging Face CDN. Decode the recorded blob
with `AudioContext.decodeAudioData`, resample to 16 kHz mono.

**The filler gate (blocking).** Whisper tends to drop "um/uh".
1. Seed the decoder with a disfluent prompt ("Umm, so, uh, I mean, like, hmm…").
2. Build a fixture set: 20 real takes, fillers counted by hand.
3. Ship only if filler recall ≥ 80% and false positives ≤ 1 per take. Otherwise ship Whisper for pace,
   variety and diction only, and take fillers from F15 (audio filler detector).
4. Every report labels the transcript source (live / on-device) so numbers are comparable.

**Edge cases.** Low-memory device (`navigator.deviceMemory < 4`) → offer `tiny.en` (~40 MB). Tab
backgrounded mid-transcription → resume on focus. Download interrupted → resumable, never blocks a run.

**Done when.** Firefox produces a full report with fillers (if the gate passed), and the first run in
a fresh browser never waits on the download.

---

## F10 · Local recording store

**Why.** Recordings are dropped on page leave today (`audio.url` only). F6 and F7 need them to persist.

**How.** IndexedDB, one store `media { id, kind: audio|video, sessionId, promptId, role, mime, blob,
bytes, createdAt }`. Quota check via `navigator.storage.estimate()`; ask `navigator.storage.persist()`
once the user has ≥ 5 recordings so the browser doesn't evict them. Settings → Storage shows usage and
"Delete all recordings".

**Done when.** Recordings survive restart; deleting clears them and frees the space reported.

---

## F11 · Accounts + sync (P4)

**Why.** Same history on phone and laptop; prerequisite for cloud recordings and challenge links.

**Flow.** Nothing changes for signed-out users. **Sign in** in the header → Google, or email magic
link. Age question at sign-up (§F12). First sign-in: "Bring your 37 sessions into your account?" →
import. Then sync is automatic and silent; offline changes queue and flush.

**How.**
- Auth as in WChess: short-lived JWT + httpOnly refresh cookie, same origin via the Netlify rewrite.
- Sync is **client-wins append** for sessions (immutable, keyed by client UUID → idempotent) and
  **last-write-wins by `updatedAt`** for custom texts and diction cards. No real-time; sync on load,
  after each run, and on `visibilitychange`.
- Render cold start: the SPA never waits — sync runs in the background with a small status dot.

**Server validates** every imported record (shape, ranges, ≤ 2,000 sessions per import, ≤ 1 MB body).

**Done when.** Two browsers signed into one account converge after a run on each, including when
one was offline.

---

## F12 · Privacy controls (P4–P5)

| Control | Default | Where |
|---|---|---|
| Sync transcripts | off | Settings → Privacy |
| Keep recordings in the cloud | off; consent screen states retention | Settings → Privacy, and offered on first then-vs-now |
| Live transcription via the browser (sends audio to Google in Chrome) | on in Chrome, with a disclosure | Setup pills; turn off to use on-device only |
| Export my data | — | JSON of everything + zip of recordings |
| Delete my account | — | Deletes rows, R2 objects, challenge links; confirms by typing the email |

**Age.** Sign-up asks birth year. Under 13: no account (local use still works, nothing collected).
Cloud recordings and model features: 16+ (18+ where local law requires parental consent, e.g. India).

**Done when.** Export → delete → re-import round-trips; after delete, R2 holds no object under the
user's prefix.

---

## F13 · Interview mode (P5)

**Why.** Being questioned is what people freeze on, and nothing else trains it.

**Flow.**
1. Choose a pack (job interview / pitch / presentation Q&A) and length (3 or 6 questions).
2. The question is spoken (browser `speechSynthesis`) and shown on screen.
3. You answer (60–120 s, standard run with scoring).
4. A follow-up is asked based on what you said ("You mentioned the migration — what went wrong?").
5. End: a combined report — score per answer, a session summary, and the weakest answer offered for a
   retry.

**Follow-up source, best available first:**
1. Claude with the user's own key (existing BYOK setting).
2. Chrome's built-in model (existing tier 2 in `coach.js`).
3. WebLLM small model — opt-in download, desktop only.
4. **No model:** a scripted follow-up bank keyed by question type ("What would you do differently?",
   "Give me a specific example.", "What was the result?") — always works.

**Safety.** The transcript is untrusted input: wrapped and labelled as data in every prompt; follow-up
output is plain text, capped at 40 words, one question; max 6 turns.

**Done when.** A 3-question interview completes with no key, no model and no network beyond the page.

---

## F14 · Share: improvement card + challenge link (P6)

**Why.** People don't post average scores; they do post visible progress and challenges.

**Improvement card.**
- Offered only when F2 has a real fact to show, or then-vs-now has a gap ≥ 10 points.
- Rendered client-side on a canvas → PNG (Web Share API on mobile, download on desktop).
- Shows: the fact ("Fillers 14 → 3 in 3 weeks"), the two tapes, the app name. **Never** transcript
  or audio.

**Challenge link.**
- From any report: **Challenge someone** → `/c/{slug}` (random 10-char slug, never the session id).
- The page shows the prompt and "beat 82", then opens straight into that drill and prompt — no sign-in.
- Result screen compares the two scores. Signed-out challengers can sign up to save the result.
- `noindex`, revocable from Settings, expires after 30 days. Requires the sender to be signed in
  (the slug lives in Postgres).

**Done when.** A challenge link opened in a private window runs the same prompt and shows the comparison.

---

## F15 · Own model: audio filler detector (P3)

**Why.** Filler counting is the app's core metric and today it depends on a transcript: Chrome/Edge
only, and Whisper tends to drop "um/uh" (F9). A small model that hears fillers **in the audio** makes
the metric work in every browser, offline, live, with nothing leaving the device.

**What it is.** A small CNN over log-mel spectrograms (64 mel bins, 25 ms windows, 10 ms hop, 1 s
context) classifying each frame window as `um · uh · other speech · silence/noise`. Target size
1–5 MB (int8 ONNX). Runs in a Web Worker via onnxruntime-web (WASM, WebGPU when present) on the
mic stream, gated by the existing VAD so it only runs on speech frames.

**Data.**

| Source | Use | Note |
|---|---|---|
| PodcastFillers (Adobe Research) | main training set, labelled um/uh + other events | **licence unverified — may be non-commercial; check before use** |
| Own takes | ~200 takes recorded in the app, labelled by hand | consent-only: the developer's own and volunteers who opt in explicitly. Never users' recordings by default |
| Augmentation | room noise, reverb, gain, laptop/phone mic EQ | matches the app's real conditions |

If PodcastFillers can't be used commercially: label own data plus volunteers, and use permissively
licensed speech (e.g. LibriSpeech, CC BY 4.0) for the "other speech" class.

**Training ($0).** PyTorch on Kaggle (≈30 free GPU hrs/week) or Colab free. Notebook + labelling
script live in `models/filler/` in the repo; weights published on Hugging Face (free CDN), versioned.

**Labelling tool.** Built: `label.html` (dev only, see README → Labelling takes). Records or opens
takes, marks um/uh/other spans on a zoomable waveform, exports audio + JSON per take.

**Evaluation gate (blocking).**
- Held-out set of ≥ 40 takes from **different speakers** than training.
- Ship if: recall ≥ 85%, precision ≥ 85%, latency < 50 ms per window on a mid laptop (WASM),
  and false fires on a no-filler take ≤ 1 per minute.
- Also report per-condition (quiet room / noisy room / phone mic) — no condition below 75% recall.

**Integration.**
- `countFillers()` stays for crutch words (*like, basically*), which need words, not sound.
  Hard fillers come from the detector when present, else from the transcript as now.
- Tape marks come from the detector's timestamps — more precise than transcript timing.
- F3 buzzer switches to the detector → every browser.
- Every report labels the filler source. Bump `scoringVersion` when the source changes.

**Privacy.** Runs on the device. Training uses only explicitly donated recordings; a "donate this
take for model training" button is a separate, per-take opt-in, never bundled with cloud storage.

**Done when.** Gate passed; Firefox shows live filler marks and the buzzer with no transcript.

---

## F16 · Own model: in-browser coaching LLM (post-launch)

**Why.** The written review ("Structure / Language / Next") currently needs Claude with the user's key
or Chrome's built-in model. A fine-tuned small model would give every free user that review on their
own device.

**Held until after launch, on purpose.** Real usage first shows which feedback people actually read
and act on; that decides the training target.

**What it is.** A small open-weight model, **0.5–1.5B** (candidates: Qwen 2.5/3, Llama 3.2 1B, Gemma 3
1B — pick by licence and eval), LoRA fine-tuned to one job: transcript + drill context + local
metrics → feedback in the fixed format. 4-bit quantised, run with WebLLM or transformers.js on
WebGPU. Download ≈ 400 MB (0.5B) to ≈ 1 GB (1.5B), opt-in, cached.

**Not doing:** training from scratch (cost, data); rewriting the whole answer (small models do this
badly — the rewrite stays a Claude-BYOK feature); server hosting (GPU isn't free).

**Training data — the hard part.**

| Source | OK? |
|---|---|
| Feedback written by the developer and volunteer coaches | yes |
| Local rule findings (`analyseLanguage()`) as structured labels | yes |
| Synthetic examples from an open-weight model whose licence permits training on its output | yes, check the licence |
| Claude outputs | **check Anthropic's terms first** — they restrict using outputs to build competing models; assume no until confirmed |
| Users' transcripts | only explicitly donated, per-transcript opt-in |

Target: ~2,000 examples, ≥ 300 hand-written or hand-checked.

**Evaluation gate (blocking).**
- 50 held-out real transcripts; blind side-by-side against the current best free option (local rules
  + Chrome built-in model).
- Ship if it wins or ties on ≥ 70% and never invents something the speaker didn't say (every quote
  must appear in the transcript — checked automatically).
- Runs at ≥ 10 tokens/s on a mid laptop with WebGPU; otherwise not offered on that device.

**Fallback order after F16:** Claude (own key) → F16 model → Chrome built-in → local rules.
The local rules always run.

**Done when.** Gate passed; a free user on a desktop with WebGPU gets a full review with no key and
no network after the one-time download.

---

## Cross-cutting rules

- **The audio-only path is a feature.** Every feature states what happens with no transcript; none may
  throw or show NaN without one.
- **Tests first for pure logic:** F0, F1 breath marks, F2 facts, F4 pitch, F5 boxes, F11 merge — each a
  pure function with fixed-input tests, like the current `test.js`.
- **Every new score component bumps `scoringVersion`** and gets a calibration fixture set.
- **Nothing new leaves the device** without appearing in the F12 table.
