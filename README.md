# Speakeasy

A speaking-practice booth that runs entirely in the browser. Six drills for
articulation, pace, diction and confidence, scored live from your microphone.

No build step, no dependencies, no backend, no account. Audio and transcripts
stay in the tab — except one opt-in feature, documented under [Coaching](#coaching).

---

## Run it

```bash
node serve.js     # http(s)://localhost:8137
node test.js      # 108 checks
```

`serve.js` serves **HTTPS** when `localhost-cert.pem` and `localhost-key.pem`
are both present, plain HTTP otherwise. Chrome's speech recogniser is fussier
about origins than `getUserMedia`, so prefer HTTPS:

```bash
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout localhost-key.pem -out localhost-cert.pem -days 825 \
  -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

Self-signed, so Chrome warns once — **Advanced → Proceed to localhost**.
Both `.pem` files are gitignored; `localhost-key.pem` is a private key and must
never be committed or uploaded.

Opening `index.html` off the filesystem is unreliable — the mic needs a secure
context. Port 8137 is hardcoded in `serve.js:15`.

Requires Node 20.11+ (`import.meta.dirname`). No `npm install` — `package.json`
has no dependencies and exists only to set `"type": "module"` so Node treats
`src/` as ES modules when running the tests.

---

## Layout

Native ES modules, loaded directly by the browser. 4,936 lines total.

```text
index.html      279   markup only
style.css       586   every rule
serve.js         48   dev server, port 8137
test.js         969   108 assertions, node:assert, no framework
mic-test.html   167   standalone transcription diagnostic

src/
  dom.js          5   export const $ = id => document.getElementById(id)
  content.js    533   all text pools (see table below)
  storage.js     33   the localStorage record, streak, dayKey
  text.js       130   pure text + measurement — no DOM, no state
  audio.js      129   mic stream, probe(), isSpeechFrame(), makeVAD()
  speech.js     109   Web Speech wrapper, asrProblem() messages
  drills.js     301   DRILLS, buildRun(), analyseLanguage(), the daily plan
  scoring.js     98   band(), ramp(), fillerRate(), scoreRun(), verdict()
  canvas.js     126   idle wave, ribbon, tape, history sparklines
  run.js        460   session runtime: arm, countdown, frame loop, finish
  report.js     293   post-run report, setup pills, shared UI primitives
  coach.js      270   three coaching tiers
  ui.js         365   views, router, event listeners
  main.js        35   boot — the only module with an import-time side effect
```

`dom.js` and `content.js` import nothing. `run`/`report`/`coach`/`ui` reference
each other cyclically; ES modules handle it, with one rule: **anything called
while a module is still evaluating must live in a module with no cycles.** That
is why `$` sits alone in `dom.js` — `ui.js` and `report.js` both call it at
import time to attach handlers.

---

## The six drills

| id | Name | Length | Prep | Set text | Extra |
|---|---|---|---|---|---|
| `impromptu` | Impromptu | 90s | 15s | — | framework rail (PREP/STAR/…) |
| `filler` | Filler Hunt | 60s | 5s | — | mechanics-only scoring |
| `pace` | Pace & Pause | `max(60, words/2.5)` ≈ 60–110s | 5s | yes | `‖` breath marks |
| `diction` | Diction Gym | 30s | 3s | yes, ×3 | — |
| `word` | Word Forge | 35s | 10s | — | `requireWord` check |
| `echo` | Echo | 22s | 2s | yes | sentence is spoken to you first |

Length is adjustable (30s / 1 min / 90s / 2 min) on drills with no set text.
Reading drills take their length from the passage.

### Content pools (`src/content.js`)

| Export | Count | Used by |
|---|---|---|
| `PROMPTS` | 126 | Impromptu |
| `EASY_PROMPTS` | 22 | Filler Hunt |
| `FRAMEWORKS` | 5 | Impromptu rail |
| `READINGS` | 12 | Pace & Pause |
| `TWISTERS` | 62 | Diction Gym |
| `WORDS` | 110 | Word Forge |
| `ECHOES` | 80 | Echo |
| `HARD` | 11 | hard fillers — `um umm uh uhh er erm ah ahh hmm mmm mm` |
| `CRUTCH` | 22 | crutch words — `like`, `you know`, `basically`, … |
| `STOP` | 86 | stopword set for word variety |

Filler Hunt draws from `EASY_PROMPTS` on purpose: the topic must not compete
for attention. It is scored on **mechanics only** — pace and word variety are
excluded, since a plain repetitive answer is the correct output of an easy topic.

---

## Scoring

Every metric is mapped to 0–100 by one of two curves (`src/scoring.js`):

- `band(v, lo, hi, fall)` — 100 inside `[lo, hi]`, falls by `fall` points per unit outside.
- `ramp(v, zero, full)` — linear, no plateau, for metrics that are simply better when higher.

| Component | Curve | Weight | Notes |
|---|---|---|---|
| Pace | `band(wpm, 138, 165, 1.6)` | 1.4 on `pace`, 1 elsewhere | **excluded on `filler`** |
| Fillers | `100 − rate × 9` | 2.4 on `filler`, 1 elsewhere | rate = per 100 words, hard ×2 |
| Projection | `band(proj, 55, 78, 2.2)` | 0.8 | ≈ RMS 0.10–0.30 |
| Diction | `ramp(acc, 50, 96)` | 2 | reading drills only |
| Passage read | `ramp(coverage, 30, 98)` | 1 | reading drills only |
| Word variety | `band(var, 68, 100, 2.2)` | 0.7 | **excluded on `filler`** |
| Pausing | `band(pausesPerMin, 5, 10, 11)` | 1.3 on `pace`/`filler`, 0.7 elsewhere | |

Total is the weighted mean, rounded. Non-finite components are dropped rather
than averaged in — one `NaN` used to poison the score and every trend after it.

The on-screen copy for Pace & Pause says 130–170 wpm; the scorer's full-marks
band is the narrower 138–165.

### Verdict thresholds

`≥90` Sharp · `≥76` Solid · `≥62` Getting there · `≥45` Rough, and that's fine ·
below that, Early days.

Calibrated so a flawless run is 100, good-but-imperfect is high 80s, mediocre
≈50, poor in the 30s. `test.js` pins that ordering and requires >50 points
between best and worst run.

### Filler rate

```
(hard × 2 + crutch) / max(words, 50) × 100
```

The 50-word denominator floor stops one slip in a short answer reading as a
catastrophe. On a set passage `crutch` is zeroed — the author's "you know" is
not your verbal tic.

---

## Measurement

| Metric | Definition |
|---|---|
| `wpm` | words ÷ elapsed minutes. Needs ≥8 words and >5s, else 0 |
| `artic` | words ÷ **speaking** minutes (pauses excluded). Needs >3s of speech |
| `proj` | `20·log10(mean RMS)` mapped −46 dB → 0, 0 dB → 100 |
| `snr` | mean speech RMS over the noise floor, in dB |
| `acc` | of the passage words you **reached**, how many were recognised |
| `coverage` | how far through the passage you got (index of last hit) |
| `var` | unique content words ÷ total, stopwords and ≤2-char words removed; `null` under 12 content words |
| `accuracy()` | LCS against the target, so insertions cost nothing and omissions cost |
| `goodPauses` | gaps of 0.4–2.2s |
| `longPause` | longest gap over 0.35s |
| `room` | `min(100, floor × 900)` |

Gaps are measured between genuine voice (`vad.aboveSince − silentSince`), not
between hangover edges, and ignore the first 500 ms of the run.

Word Forge overrides: using the target word sets `acc` to 100, missing it caps
`acc` at 40. Stem matching accepts inflections (`reconciled` counts as `reconcile`).

---

## Voice activity detection (`src/audio.js`)

A fixed threshold is wrong in most rooms — a fan sits above it permanently, so
the app believes you never stop talking. Two gates, both relative to your room:

```js
isSpeechFrame(rms, ratio, floor, sens):
  gate   = floor × (3.2 / sens) + 0.006
  speech = rms > gate  &&  ratio > 0.32
```

| Constant | Value | Meaning |
|---|---|---|
| Speech band | 200–3800 Hz | `ratio` = share of spectral energy inside it |
| `ratio` threshold | 0.32 | rejects hum, fans, desk knocks (below) and hiss (above) |
| `ON_MS` | 60 ms | must look like speech this long before it counts |
| `HANG_MS` | 220 ms | stays believed this long after, so plosives don't chop a word |
| Calibration | 1s, ≤400 frames | needs ≥8 samples to commit |
| Floor | 75th percentile | one cough can't poison it the way `max()` would |
| Floor adaptation | ×0.05 down, ×0.0004 up | falls fast, rises slowly; min 0.002 |
| `fftSize` | 2048 | ≈23 Hz bins at 48 kHz |
| `minDecibels` | −85 | clamps near-silent bins so the ratio stays sharp |

`getUserMedia` constraints: `echoCancellation: true`, `noiseSuppression: true`,
`autoGainControl: false` — AGC would flatten the projection measurement.

**Mic sensitivity** (`sens`) is exposed next to the length picker, because real
rooms vary more than any constant covers:

| Label | `sens` | Effect |
|---|---|---|
| Strict | 0.7 | higher gate — use when the room bleeds in |
| Normal | 1 | default |
| Quiet voice | 1.5 | lower gate — use when quiet speech is missed |

On the ribbon and the tape: **your voice is amber and full height, the room is
grey and flat.** A banner warns when the measured room level is high enough to
interfere.

---

## Transcription

Uses the Web Speech API. Language follows `navigator.language` when it is any
English, else `en-US`.

| | Chrome / Edge | Safari | Firefox | Brave |
|---|---|---|---|---|
| Timer, level, pauses, projection, recording, playback, tape | yes | yes | yes | yes |
| Transcript, pace, fillers, diction, word variety | yes | partial | no | no |

Everywhere else the drills still run and score on what the audio alone can
measure. The **Transcript** chip shows the exact state: `ready`, `listening…`,
`on`, `off`, `failed`.

| Chip / banner | Cause | Fix |
|---|---|---|
| `failed` + "can't reach its service" | Chrome uploads audio to Google to transcribe, so **this one feature needs internet** | Check VPN, proxy, privacy extensions; try Incognito |
| `failed` + "Brave doesn't support transcription" | Brave ships without the Google speech keys — deliberate, no setting to change | Use Chrome or Edge; everything else works in Brave |
| `failed` + "microphone is busy" (`audio-capture`) | Another tab, call app or recorder holds the mic | Close it and start again |
| `failed` + "was blocked" (`not-allowed`) | Permission denied | Allow via the padlock in the address bar |
| `listening…` that never becomes `on` | Recogniser running, nothing understood | Move closer, or set mic to **Quiet voice** |

`no-speech` and `aborted` are normal between utterances and are not reported.
`network` retries twice before giving up. Recognition restarts itself on `onend`
(300 ms backoff if the session died inside 500 ms), and any interim text is
folded into the final rather than dropped — that is the "words vanish
mid-sentence" case.

**Diagnosing:** open `/mic-test.html`. It runs the recogniser in three
configurations — alone, with the mic already held open, and continuous — logs
every event and error code, and tells you whether the fault is the browser, the
network, or this app's usage of the API.

---

## Routes

Every place is a URL; Back and Forward behave normally.

| URL | Page |
|---|---|
| `#home` | today's session and the start button |
| `#practice` | all six drills |
| `#progress` | trends, history, recent sessions |
| `#guide` | how to improve, what the numbers mean |
| `#drill-<id>` | that drill, ready to start |

The router never writes history itself: setting the hash pushes an entry and
fires `hashchange`, which applies the route. The one exception is a hash
pointing nowhere, which is **replaced** rather than pushed so a bad link isn't a
Back-button trap. Navigating away mid-run discards the run rather than saving a
partial score.

---

## The daily plan

`#home` opens with three drills picked from your own weakest component scores
(`buildPlan`, `src/drills.js`). Each step says why — "weakest: fillers · 41".

| Weak metric | Drill |
|---|---|
| `filler` | Filler Hunt |
| `pace`, `pause` | Pace & Pause |
| `acc`, `cover` | Diction Gym |
| `var` | Word Forge |
| `proj` | Echo |

Averaged over the last 10 sessions; sessions with no `parts` are skipped, not
counted as zeros. Ties and gaps fall back to whatever you've practised least.
Rebuilt once a day, remembers what you finished, and the report hands you
straight to the next step.

`trendFor()` on `#progress` compares the recent half of a series against the
earlier half and needs **at least 3 points** before claiming a direction.

---

## Storage

One `localStorage` record, key `speakeasy.v1`, read and written whole:

```js
{
  sessions: [{ at, drill, name, score, wpm, fillers,
               parts: { pace, filler, proj, acc, cover, var, pause } }],
  plan:     { day, drills: [id], why: { [id]: { metric, score } }, done: [id] },
  theme:    string | null
}
```

Capped at the last **200** sessions. A stored value of the wrong shape is
discarded rather than trusted. Component scores are persisted, not just the
total — the plan and the trends both read them.

The Anthropic API key, if you set one, lives separately under
`speakeasy.anthropicKey`.

Recordings are held in memory for the current page only and are dropped when
you leave. Clearing site data resets streak and history.

---

## Coaching

Three tiers on the report, strongest first, always leaving something useful.

**1. Local analysis — always on, no model, no network.** `analyseLanguage()`
flags hedging, placeholder nouns, intensifiers, one content word carried too
far, repeated clause openers, a weak opening, and on framework drills a missing
reason or example. Findings are ranked worst-first and quote your own words.

Thresholds: silent under 12 words; rates floored at a 50-word denominator and
requiring **≥2 occurrences** — otherwise a single "someone" in a 30-word answer
crosses a per-100 threshold and gets reported as a habit.

| Finding | Trigger |
|---|---|
| Hedging | ≥2 and ≥2.2 per 100 words |
| Placeholder words | ≥2 and ≥3.0 per 100 |
| Intensifiers | ≥2 and ≥3.5 per 100 |
| One word carrying too much | ≥4 uses and ≥5% of content words |
| Repeated clause openers | ≥4 clauses start the same |

**2. On-device model — no key, nothing sent.** Chrome's built-in
`LanguageModel`. Availability is probed with a **3s timeout** and the panel
renders before the probe answers, so a hanging check can't leave a blank space.
Offers the one-off download when the state is `downloadable`.

**3. Claude — sharpest, but it sends your transcript.** Opt-in, your own key.

Press **Review what I said** and the transcript plus drill context go to
`claude-opus-5` for four sections: **Structure**, **Language**, **Rewrite** (the
whole answer as you could have said it, sized to what you actually spoke — it is
skipped on set-passage drills, where the words are the author's) and **Next**.

- Off until you turn it on. No key, no requests.
- Key from [console.anthropic.com](https://console.anthropic.com/settings/keys),
  stored only in this browser's `localStorage`.
- **Your audio never leaves.** Only the transcript and drill context, and only
  on the button press.
- The SDK is `import()`ed on demand from `esm.sh`, so it costs nothing for
  anyone who doesn't use it.

This is a browser-side key (`dangerouslyAllowBrowser`) — fine on your own
machine, but a public deployment wants a small server proxy holding the key.

---

## The report

- **Tape** — bar height is loudness, red marks are fillers, green ticks are
  deliberate pauses, grey stretches are room rather than you. Click anywhere to
  hear that moment back.
- **The passage comes back.** Reading drills reproduce the text word by word,
  **mint where it came through, coral where it didn't**, using the same
  `matchTarget()` the live booth used — so the marking you watched is the
  marking you get. Breath marks (`‖`) are not target words and never shift the
  alignment; a test pins that across every reading drill.
- **Playback follows the text.** Spoken words stay lit, the current word is
  highlighted, the rest stays dim. Click a word to jump the audio. Timings come
  from the recogniser's interim results, stamped when a word first appears and
  only ever extended. A fixed **0.42s** lead (`READ_LAG`) compensates for
  recognition reporting a word after it was spoken. Rendered words and recorded
  timings share one tokeniser (`tokens()`), so the highlight cannot drift.
- Drills with no set text show the prompt instead.

---

## Interface

A broadcast booth: warm tungsten room, cold mint instrument readouts. The lamp
behind the page is driven by your actual mic level.

| Role | Face |
|---|---|
| Display | **Fraunces** — `opsz` axis, survives 16px to 140px |
| Body | **Jost** |
| Labels & data | **IBM Plex Mono** — holds up at 10px uppercase |

Motion effects are reimplemented natively (no dependencies, no build):
spotlight cards (`--mx`/`--my` from `pointermove`), border beam (`conic-gradient`
on an animated `@property` angle), number ticker (`requestAnimationFrame`,
easeOutQuart), blur fade, split text, SVG radial gauges, `feTurbulence` grain,
shimmer, ripple.

**One rule the whole interface follows:** no element's resting state may depend
on an animation having run. Reveals are inverted — content is visible by
default and script adds `.pre` for a single frame. If scripting fails, the page
is already there rather than stuck invisible.

Accessibility was built in: skip link, visible focus rings, `aria-live` on the
coach and transcript, labelled icon buttons, `color-scheme` and `theme-color`
per theme, explicit transition properties (never `transition: all`), safe-area
padding, and `prefers-reduced-motion` support that also stills the canvas loop.

---

## Deploy

Static files, nothing to build. HTTPS is the only requirement — browsers block
mic access on plain HTTP.

| Host | How |
|---|---|
| Netlify | drag the folder onto <https://app.netlify.com/drop> |
| Vercel | `npx vercel --prod` |
| GitHub Pages | push, enable Pages on the branch |
| Cloudflare Pages | connect the repo, leave the build command empty |

Don't deploy `serve.js` or the `.pem` files.

---

## Tests

```bash
node test.js
```

108 assertions, `node:assert`, no framework, no dependencies. Covers filler
counting, LCS accuracy, word variety, stem matching, streaks, the score at both
extremes and its spread, every drill building a runnable stage, VAD gating and
calibration, word-timing alignment, passage marking, projection across the real
dynamic range, diction vs coverage separation, the daily plan, trends, language
analysis, and the recogniser's duplicate/interim/throw recovery paths.

Not covered: the DOM and audio-device layers — run the app for those.
