# Speakeasy — design

How the app looks and behaves on screen. Agreed with the owner on 2026-10-16 from their references
(Duolingo's structure, Claude's pixel doodles, black-and-white ASCII art). The mockups live on the
design canvas: https://claude.ai/artifact/L7PUa6RAsMdsNpNsW7m3wZ (private to the owner — Home,
Booth, Report, Reel's twelve moves, and the character options that were considered). Why these
choices: [DECISIONS.md](DECISIONS.md) D-021.

## Direction: the terminal booth

A near-black recording booth that reads like a terminal: one warm phosphor amber, monospace
everywhere, ASCII art for atmosphere, and a small pixel mascot who reacts to how you speak.

- **Duolingo's structure, not its voice.** A daily path of drills, goals with progress, a streak —
  but written for adults: plain, specific, a little dry. No exclamation-mark praise, no guilt trips.
- **ASCII is art, never data.** It decorates; it never carries a number someone has to read.
- **One thing to fix.** Every screen leads with the single most useful next step.

## ASCII: where it goes

| Use ASCII | Never ASCII |
|---|---|
| The sound-ripple field behind the home hero | Scores and any big number |
| Reel's speech bubbles (`.---.` boxes with a `\` tail) | Waveforms and the take's tape |
| Section rules: `── TODAY'S PATH ──────` | Meters, progress bars, goal bars |
| The small status box (`┌ mic … ok ┐`) and decorative cards | The timeline of fillers and pauses |
| `// SECTION LABELS` in mono caps | Charts, sparklines, the streak week |
| | Buttons, path nodes, any control — and the logo |

Decorative ASCII is `aria-hidden`; anything that means something has a real text or ARIA equivalent.

## Logo and icon

- **Logo: the on-air sign.** SPEAKEASY in JetBrains Mono 800, letter-spacing 0.22em, inside a 1.5 px
  `ink` outline with an 8 px radius, led by a round light. The light is the mic's state: a steady
  dim `#8A1F3D` at rest; `alert` `#FF3D6E` with a soft glow, pulsing every 1.6 s, while a run is
  recording. It never lights for anything else. Header size: 16 px text.
- **App icon and favicon: Reel's face.** Reel's body without legs (coral, screws, 1 × 2 eyes, tape
  slot) centred on `ground` in a rounded square, radius about 23 % of the side, with a 1 px
  `#33333A` edge so it holds on dark home screens. The favicon is the same face at 16 × 10 pixels.
- Not the figlet ASCII logo of the first mockups, which was hard to read at header size.

## Colour

One colour per job. A colour that means something is never reused for decoration.

| Token | Hex | Job |
|---|---|---|
| `ground` | `#0A0A0B` | page background |
| `panel` | `#0E0E10` | raised sections (hero, voice, the take) |
| `line` | `#26262B` | borders, timeline axis |
| `track` | `#1E1E22` | empty part of every bar |
| `ink` | `#ECE9E2` | headings, transcript, primary text |
| `body` | `#B8B4AA` | paragraph text |
| `muted` | `#9A968D` | labels, notes, captions |
| `faint` | `#6E6B63` | still-being-heard transcript, axis labels — large or non-essential text only (≈3.6:1) |
| `amber` | `#FFB224` | brand and actions: primary buttons, current nav, the voice waveform, links |
| `amber-key` | `#8A5A12` | the 4 px "keycap" shadow under amber buttons |
| `cream` | `#FFE6A6` | link hover, highlights, Reel's mug and script |
| `cyan` | `#7CC8FF` | listening, "good", target bands, the playhead, pauses, trends |
| `alert` | `#FF3D6E` | fillers (pills, underlines, meter), REC, Stop — shadow `#8A1F3D` |
| `reel` | `#FF7F6A` | **Reel only** — never a UI colour, so the mascot never reads as an error |
| `reel-shade` | `#7A3D33` | Reel's legs, base and screws (`reel` × 0.48) |

Crutch words are amber with a dashed underline; hard fillers are `alert` with a solid one — they
differ in line style as well as hue. Cyan and amber differ in lightness, so the booth survives
colour-blindness.

## Type

- **Bricolage Grotesque** (800 / 700) — headlines, big numbers (the score is 168 px), drill names.
- **JetBrains Mono** (400 / 500 / 700) — everything else: UI, labels, transcript, ASCII.
- Labels: 11–13 px mono caps, letter-spacing 0.14em. Body 14–15 px, line-height 1.6.
- Both are self-hosted in the port (TASKS: no visitor IP to Google Fonts).

## Shape and motion

- Cards: 16–18 px radius, 1 px `line` border. Pills and bars: fully rounded. Buttons: 12 px radius
  with a 4 px solid bottom shadow, like a key — pressed state drops it.
- Path nodes: 68 px circles, raised the same way; now = amber, next = dark, checkpoint = cyan ring.
- Layout: side nav · main · right rail on desktop; at phone width the nav and rail stack under main.
- Motion is short and functional: Reel's frame animations, the waveform filling, a playhead.
  Under `prefers-reduced-motion`, Reel shows its first frame and nothing loops.

## Reel, the mascot

A coral cassette tape on stubby legs. Original — drawn in the spirit of pixel doodles, not a copy
of anyone's mascot.

- **Sprite:** 16 × 10 body plus legs (props reach a 28 × 18 box), drawn as SVG pixel paths,
  8-frame animations swapped with SVG `<animate>` — no script per frame.
- **Parts:** rounded cassette body (`reel`), corner screws and base (`reel-shade`), small
  1 × 2-pixel eyes, the tape slot as its mouth (tape dashes scroll while it records), chunky 2 × 2
  hands, two legs. REC light in `alert`.
- **Source:** the canvas's `Reel.dc.html` holds the paint function; port it as a pure module
  (`frame(state, f) → { colour: path }`) with a test, and a thin React component around it.

| State | Looks like | When |
|---|---|---|
| `idle` | bobs, blinks, tape at rest | home, drill pages |
| `record` | tape runs, REC blinks | the booth while you speak |
| `listen` | headphones, `)))` | countdown, Echo playing its line |
| `play` | slot opens and closes, `♪ ♫` | playing your take back |
| `pause` | holds still, `‖` | a deliberate pause in the booth |
| `think` | glances left, then right, `...` | prep time, next to tips |
| `coffee` | holds a steaming mug | first drill of the day |
| `read` | holds a script | rehearsing your own text (F1) |
| `um` | tape spills, eyes `> <`, shakes | the moment a hard filler lands |
| `cheer` | jumps, arms up, confetti | a personal best, a clean take, a retired retry word |
| `rewind` | tape runs backwards, `◀◀` | "Run it again" |
| `sleep` | sinks, eyes shut, `z Z` | a broken streak — wakes when you next talk |

Reel speaks only in the ASCII bubbles, one short line at a time, in the coach's words
(`coachLine()`), never in its own catchphrases.

## Screens

| Screen | Status |
|---|---|
| Home — hero, today's path, streak, goals, goal pack, privacy note | mocked |
| Booth — prompt, live waveform, filler/pause timeline, transcript, meters, coach + Reel | mocked |
| Report — score, breakdown, the take with markers, one thing to fix, since you started | mocked |
| Drills list, Progress (facts F2, trends), Your texts (F1), Guide, Your data | to design |
| Countdown overlay, mic refused, no-transcript banner, first run | to design |
| Phone layouts of all of the above | to design (pages already stack) |
