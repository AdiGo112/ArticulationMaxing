# Speakeasy

A speaking practice booth that runs entirely in the browser. Six drills for
articulation, pace, diction and confidence, with live feedback from your own
microphone.

No build step, no dependencies, no backend, no account. Your audio and
transcripts never leave the tab.

## Run it locally

The microphone needs a secure context, so opening `index.html` straight from
the file system is unreliable. Use the included server:

```bash
node serve.js
```

`serve.js` serves **HTTPS** when `localhost-cert.pem` is present, and plain HTTP
otherwise. Chrome's speech recogniser is fussier about origins than `getUserMedia`
is, so prefer HTTPS. Generate the certificate once:

```bash
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout localhost-key.pem -out localhost-cert.pem -days 825 \
  -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

Then open <https://localhost:8137>. It is self-signed, so Chrome warns once —
click **Advanced → Proceed to localhost**. `localhost-key.pem` is a private key:
it is gitignored, and must never be committed or uploaded to a host.

### Diagnosing transcription

If the Transcript chip says `failed`, open **`/mic-test.html`**. It tests the
speech recogniser in three configurations — alone, with the microphone already
held open, and in continuous mode — logs every event and error code, and tells
you whether the fault is your browser, your network, or this app's usage of the
API. That distinction is the whole point: they need completely different fixes.

## How it's laid out

Native ES modules, loaded straight by the browser. There is still no build step
and still nothing to install — `package.json` exists only so Node treats `src/`
as modules when running the tests, and it has no dependencies.

```
index.html      the markup, and nothing else
style.css       every rule, one file
serve.js        the local dev server
test.js         the self-check
mic-test.html   standalone transcription diagnostic

src/
  dom.js        the one DOM lookup everything shares
  content.js    prompts, frameworks, readings, twisters, words, filler lists
  storage.js    the single localStorage record
  text.js       pure text and measurement helpers — no DOM, no state
  audio.js      microphone stream, level probing, voice-activity gate
  speech.js     the speech recogniser and its failure messages
  drills.js     the six drills, language analysis, the daily plan
  scoring.js    measurements to a 0-100 score and a verdict
  canvas.js     the tape, the idle wave, the trend sparklines
  run.js        session runtime: arming, countdown, frame loop, finishing
  report.js     the post-run report and shared UI primitives
  coach.js      optional Claude coaching, off unless you supply a key
  ui.js         home view, routing, every event listener
  main.js       boot — the only module with a side effect at import time
```

The bottom nine modules form a plain dependency graph with no cycles: `dom` and
`content` depend on nothing, and everything above them only reaches downward.
`run`, `report`, `coach` and `ui` do reference each other, because finishing a
run renders a report and the report can start the next run — that circularity is
in the app, not in the file layout. ES modules handle it, with one rule worth
knowing if you move code: **anything called while a module is still evaluating
must live in a module with no cycles.** That is why `$` sits alone in `dom.js` —
`ui.js` and `report.js` both call it at import time to attach handlers.

## Deploy it

It's static files, and there is nothing to build. Anything that serves static
files over HTTPS works:

| Host | How |
|---|---|
| **Netlify** | Drag this folder onto <https://app.netlify.com/drop> |
| **Vercel** | `npx vercel --prod` in this folder |
| **GitHub Pages** | Push the folder, enable Pages on the branch |
| **Cloudflare Pages** | Connect the repo, leave the build command empty |

There is nothing to configure. HTTPS is the only requirement — browsers block
microphone access on plain HTTP.

## Browser support

| | Chrome / Edge | Safari | Firefox |
|---|---|---|---|
| Timer, level meter, pauses, projection, recording, playback, tape | yes | yes | yes |
| Live transcript, pace, filler detection, accuracy, word variety | yes | partial | no |

Word-level feedback uses the Web Speech API, which today only Chrome and Edge
implement properly. Everywhere else the drills still run and still score you on
what the audio alone can measure — the app tells you which mode it's in rather
than silently degrading.

### When transcription isn't working

The booth carries a **Transcript** chip showing exactly which state you're in:
`ready`, `listening…`, `on`, `off`, or `failed`. A failure also raises a banner
naming the cause. The three real ones:

| Chip says | Cause | Fix |
|---|---|---|
| `failed` + "can't reach its service" | Chrome uploads audio to Google's servers to transcribe it, so **this one feature needs internet** even though the rest is local | Check the connection, and any VPN or extension blocking Google domains |
| `failed` + "microphone is busy" | Another tab, call app or recorder holds the mic; a second consumer can be refused, most often on Windows | Close the other app and start the drill again |
| `failed` + "was blocked" | Permission denied | Allow the mic via the padlock in the address bar |
| `listening…` that never becomes `on` | The recogniser is running but hasn't understood anything | Move closer, or set mic sensitivity to **Quiet voice** |

## Navigation and history

Every place in the app is a URL, so Back and Forward behave the way they do
anywhere else:

| URL | Where you land |
|---|---|
| `#home` | Today's session, and the button that starts it |
| `#practice` | All six drills, to browse and pick from |
| `#progress` | Trends, history and recent sessions |
| `#guide` | How to improve, and what the numbers mean |
| `#drill-impromptu` | That drill, ready to start |

Drills used to be invisible to history: the URL still read `#progress` while the
booth was open, so Back skipped the drill entirely and landed on a page you had
never visited. A drill is a place, and now has its own entry — Back from a drill
returns you to wherever you opened it from, and Forward walks the same path in
reverse.

The router never writes history itself. Setting the hash pushes an entry and
fires `hashchange`, which applies the route; that single path is what keeps the
stack honest. The one exception is a hash pointing nowhere (`#nonsense`), which
is *replaced* rather than pushed so a bad link can't become a trap you have to
press Back twice to escape.

Navigating away from a run in progress discards it rather than saving a partial
score — you chose to leave, the same as abandoning a form.

## Today's session

Landing on six drills and having to choose is where a daily habit dies, so the
Practice page opens with a plan: **three drills picked from your own weakest
metrics.** Each step says why it was chosen — "weakest: fillers · 41" — so the
practice is aimed rather than random.

The plan is built once a day and remembers what you've finished. Complete a drill
and the report hands you straight to the next one instead of dropping you back at
the menu. With no history yet it falls back to whatever you've practised least.

This is why the component scores are persisted with every session, not just the
total: the plan reads them to find the weak spot.

## What is moving

The composite score can't tell you that your pace is improving while your
projection is sliding — and that is exactly the thing worth knowing. The Progress
page breaks the score into its parts and sparklines each one, with an arrow
comparing your recent half against your earlier half.

A trend needs three sessions before it claims a direction. Sessions recorded
before component scores existed are skipped rather than counted as zeros.

## The drills

| Drill | Trains | How it's scored |
|---|---|---|
| **Impromptu** | Structure under pressure | A rail shows which part of PREP / STAR / etc. you should be on right now |
| **Filler Hunt** | Fluency | Every *um, uh, like, basically* lights up the moment you say it |
| **Pace & Pause** | Delivery | Read inside a 130–170 wpm band; amber marks are breath points |
| **Diction Gym** | Clarity | Tongue twisters, scored by whether the recogniser actually understood you |
| **Word Forge** | Vocabulary | Build a spoken sentence around a precise word; it checks you used it |
| **Echo** | Cadence | A well-shaped sentence is read to you; repeat it, scored on accuracy |

## Telling you apart from your room

Everything time-based depends on knowing when you are actually speaking. The
first version used a fixed threshold (`level > 0.075`), which is wrong in most
rooms: a fan or traffic sits above it permanently, so the app believed you never
stopped talking and every pause, projection and speaking-rate number was junk.

Detection is now relative to your room rather than absolute, with two gates:

1. **Loudness above the measured noise floor.** Before every run the app spends
   a second listening to your silence and takes the 75th percentile as the
   floor — so one cough during calibration can't poison it. The floor keeps
   adapting during the session (falls fast, rises very slowly), so an air
   conditioner starting mid-session doesn't break it.
2. **Spectral shape.** Voices concentrate energy in the 200–3800 Hz band; fans,
   hum and desk knocks sit below it, hiss sits above. A frame only counts as
   speech if enough of its energy is in the voice band.

Onset and hangover timers stop single clicks registering as speech and stop
plosives chopping a word in half. Pause length is measured between genuine voice,
not between hangover edges, so the timings stay honest.

You can see the result: in the ribbon and on the tape, **your voice is amber and
full height, the room is grey and flat.** The booth shows the measured room level
and warns you when it's high enough to interfere.

**Tuning is exposed, deliberately.** Real rooms and real microphones vary more
than any fixed constant can cover, so there is a Strict / Normal / Quiet voice
control next to the length picker. If quiet speech is being missed, loosen it; if
your room is bleeding in, tighten it.

## Coaching, in three tiers

The report's Coach panel offers whatever the browser can actually do, strongest
first, and always leaves something useful.

**1. Local analysis — always on, no model, no network.** Deterministic checks for
the habits that weaken spoken English: hedging, placeholder nouns, intensifiers
propping up weak words, one content word carried too far, clauses that all start
the same way, a weak opening, and — on framework drills — a missing reason or
missing example. It quotes your own words back. It runs instantly, offline, in
every browser, and stays silent when there is too little to judge honestly.

Rates are floored at 50 words and need more than one occurrence before anything
is flagged. Without that, a single "someone" in a thirty-word answer crosses a
per-hundred threshold and gets reported as a habit.

**2. The on-device model — no key, nothing sent.** Chrome ships a small language
model that runs locally. Where it's available the panel offers it directly; where
it needs a one-off download, it says so. Availability is probed with a timeout and
the panel renders before the probe answers, so a slow or hanging check can never
leave a blank space where the buttons should be.

**3. Claude — sharpest, but it does send your transcript.** Unchanged, opt-in,
your own key. Still the only thing here that leaves the device.

## Sending your transcript to Claude (optional, off by default)

The local metrics measure *how* you spoke. They cannot judge whether the answer
was any good — whether it had a shape, whether you hedged, whether you actually
answered the question. That is what this adds.

Press **Review what I said** on the report and the transcript is sent to Claude
(`claude-opus-5`) for feedback on structure, vague or hedged language, one
concrete rewrite of your weakest sentence, and what to practise next.

- **Off until you turn it on.** No key, no requests.
- **Your own API key**, from [console.anthropic.com](https://console.anthropic.com/settings/keys),
  stored only in this browser's `localStorage`.
- **Your audio never leaves.** Only the transcript and the drill context are sent,
  and only when you press the button.
- The SDK is loaded on demand from a CDN, so it costs nothing for anyone who
  doesn't use the feature.

Note this is a browser-side key (`dangerouslyAllowBrowser`), which is fine for
your own machine but is not how you'd ship this to other people — a public
deployment wants a small server proxy holding the key instead.

## What it measures

- **Pace** — words per minute over the whole session, plus articulation rate
  (words per minute of actual speech, excluding pauses).
- **Fillers** — hard fillers (*um, uh, er*) counted separately from crutch words
  (*like, basically, actually*), because the second group is only a problem in
  volume.
- **Projection** — mean RMS while speaking, in decibels, mapped so −46 dB (barely
  audible) is 0 and 0 dB (clipping) is 100. It is scored against a healthy band,
  so both mumbling and shouting into the mic cost you. Reported alongside
  **voice above room** in dB, which is the other half of projecting: a voice only
  6 dB above the background isn't carrying, however loud it feels.
- **Diction** *(reading drills)* — of the words you actually reached, how many the
  recogniser understood.
- **Passage read** *(reading drills)* — how far through the passage you got.
  Kept separate from diction on purpose: stopping early is a pacing problem, not
  a pronunciation one, and mixing them makes a careful reader look unintelligible.
- **Pausing** — silence gaps over 350ms, with 0.4–2.2s counted as deliberate.
- **Word variety** — unique content words over total, with stopwords removed.
- **Accuracy** — longest common subsequence against the target text, so inserted
  filler words don't destroy the score but dropped words do.

Everything is combined into a 0–100 clarity score, weighted per drill.

### The score has to actually discriminate

An early version scored almost every session in the nineties, which makes the
history chart useless — you can't see improvement in a number that never moves.
Two causes, both fixed:

- **Plateaus were far too wide.** Pace, projection and word variety returned a
  flat 100 across most of their plausible range, so only the filler count moved
  the total. The bands are now narrow enough that ordinary variation shows, and
  metrics that are simply better-when-higher (diction, passage read) use a linear
  ramp with no plateau at all.
- **Fillers were counted, not rated.** Two "um"s in a 40-word answer scored the
  same as two in a 300-word answer, though the first is a stammer and the second
  is fluent. It's now per 100 words, with hard fillers weighted double and a
  floor on the denominator so a single slip in a short answer isn't a
  catastrophe.

Calibrated so a flawless run is 100, a good-but-imperfect run is high 80s, a
mediocre one is around 50, and a poor one lands in the 30s. A test pins that
ordering and requires more than 50 points between best and worst.

## The tape

Every session prints as a strip: bar height is loudness, red marks are fillers,
green ticks are deliberate pauses, and grey stretches are room noise rather than
you. Click anywhere on it to hear that moment back. Listening to yourself is the
single fastest way to improve, and it's the part most people skip.

## The passage comes back with you

The report shows the input as well as the output. For the reading drills
(Pace & Pause, Diction Gym, Echo) the passage you were given is reproduced with
every word marked: **mint where it came through, coral where it didn't.** The
misses are the useful part — they're where consonants got swallowed, and the
recogniser is a harsher and more honest judge of that than your own ear.

Breath marks (`‖`) survive into the report, so you can see whether you actually
stopped where you were told to. They are not target words, so they never shift
the hit marking — there's a test pinning that alignment across every reading
drill.

For the drills with no set text, the same block shows the prompt you were
answering instead, because a score is not much use without the question it
belongs to.

The marking uses the same function as the live booth, so what you watched during
the run is exactly what you get back afterwards.

**Crutch words inside a passage don't count against you.** Several of the
readings contain "you know" or "just"; reading those aloud is obedience, not a
verbal tic. On a set passage only genuine stumbles (*um*, *uh*) affect the filler
score or get marked in your transcript.

## Playback that follows the text

Press play and the transcript follows along: words already spoken stay lit, the
current word is highlighted, and the rest stays dim until you reach it. Click any
word to jump the audio to that moment. When nothing is playing the transcript
reads as plain text, so you can just read it.

The timings come from the recogniser itself. Interim results stream in word by
word, so each word is stamped with the moment it first appeared; stamps only ever
extend, because Chrome revises interim text and a shrinking count must not
rewrite times already recorded. Recognition reports a word slightly *after* it
was spoken, so the highlight applies a fixed 0.42s lead — otherwise it always
runs late.

Both the rendered words and the recorded timings come from the same tokeniser
(`tokens()`, a plain whitespace split), so the highlight cannot drift out of sync
with the audio. Sessions recorded before this existed, and browsers with no
speech recognition, fall back to static text.

## Interface

The visual language is a broadcast booth: a warm tungsten room with cold mint
instrument readouts. The lamp behind the page is driven by your actual
microphone level, so the room brightens as you project and dims when you mumble.

Typography is a Didone pairing, the register of theatre programmes and
elocution manuals:

| Role | Face | Why |
|---|---|---|
| Display | **Fraunces** | Editorial serif with an `opsz` axis, low enough stroke contrast that thin diagonals — `A`, `y`, `4` — survive at every size from 16px headings to the 140px score |
| Body | **Jost** | Geometric sans, clean and quiet under a display serif |
| Labels & data | **IBM Plex Mono** | Sturdy enough for 10px uppercase meter labels, where a quirkier mono falls apart |

Didones want the opposite tracking to a grotesque — the display sizes run
near-normal rather than tightly negative, or the thin strokes collide.

The motion and material effects are the ones popularised by the animated
component libraries (Magic UI, Aceternity, React Bits), reimplemented natively
so the app keeps zero dependencies and no build step:

| Effect | Where it's used | How |
|---|---|---|
| Spotlight card | Drill cards | Radial gradient tracking `--mx`/`--my` from `pointermove` |
| Border beam | Ribbon while recording | `conic-gradient` on an animated `@property` angle, masked to the border |
| Number ticker | Report score | `requestAnimationFrame` with easeOutQuart |
| Blur fade | Every view entrance | Staggered `transition` on opacity, transform and blur |
| Split text | Hero headline | Per-word spans on their own delay |
| Radial gauge | Score breakdown | SVG `stroke-dashoffset` sweep |
| Film grain | Whole page | Inline `feTurbulence` SVG data URI |
| Light rays & dot grid | Background | Layered gradients, masked and blurred |
| Shimmer | Primary buttons | Translating linear-gradient highlight |
| Ripple | Record button | Scaling ring on a pseudo-element |

**One rule the whole interface follows:** no element's resting state may depend
on an animation having run. Reveals are inverted — content is visible by
default, and script adds a `.pre` class for a single frame to play the
transition. If scripting or the animation clock fails, the page is simply
already there rather than stuck invisible.

Accessibility and the [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines)
were built in rather than retrofitted: skip link, visible focus rings,
`aria-live` on the coach and transcript, labelled icon buttons, `color-scheme`
and `theme-color` per theme, explicit transition properties (never
`transition: all`), safe-area padding, and full `prefers-reduced-motion`
support that also stills the decorative canvas loop.

## Storage

Session scores live in `localStorage` under the key `speakeasy.v1` — dates,
drill, score, pace, filler count. Recordings are held in memory for the current
session only and are discarded when you leave the page. Clearing site data
resets your streak and history.

## Tests

```bash
node test.js
```

Covers the scoring path: filler counting, alignment accuracy, word variety,
streaks, the composite score at both extremes, and that every drill builds a
runnable stage. The DOM and audio layers aren't covered — run the app for those.
