# Speakeasy

A speaking-practice booth that runs in the browser. Six drills for articulation, pace, diction and
confidence, scored live from your microphone, with feedback that names one thing to fix.

Audio and transcripts stay in the tab. The one exception planned is an opt-in Claude review that
sends the transcript (never audio) using your own API key.

**Status:** a React app on its way to a public, free-to-run launch; see [docs/TASKS.md](docs/TASKS.md).

| Doc | Read it for |
|---|---|
| [docs/PRD.md](docs/PRD.md) | Who it's for, goals, non-goals, feature specs |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How it works, scoring, storage, the target stack |
| [docs/TASKS.md](docs/TASKS.md) | What's done, what's next, what's blocked |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Why it's built this way, and what was rejected |
| [docs/DESIGN.md](docs/DESIGN.md) | How it looks: the terminal booth, colours, type, Reel |
| [docs/PRIVACY.md](docs/PRIVACY.md) | Draft of the public privacy policy |
| [CLAUDE.md](CLAUDE.md) | Rules for anyone (human or agent) changing the code |

---

## Run it

The app lives in `frontend/` (React + TypeScript, built with Vite). Needs Node 22+.

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173 — also serves /label.html and /mic-test.html
npm test          # Vitest: the logic, Reel, and whole simulated runs
npm run build && node ../scripts/smoke-frontend.mjs   # the built app in headless Chrome, fake mic
```

The microphone needs a secure context; `localhost` counts as one, so the dev server works as it is.
To try the production build: `npm run build && npx vite preview` (http://localhost:4173).

## Deploy

Connect the repo to Netlify. `netlify.toml` builds `frontend/` and publishes `frontend/dist` with a
Content-Security-Policy and security headers; nothing else in the repo ships. HTTPS is required —
browsers block the microphone on plain HTTP. Then turn on **Site configuration → Forms → form
detection** so the waitlist form is received.

## Troubleshooting transcription

Transcription uses the browser's speech recogniser: Chrome and Edge, partly Safari, not Firefox or
Brave. Without it the drills still run and score what audio alone can measure. The **Transcript**
chip in the booth shows its state.

| You see | Cause | Fix |
|---|---|---|
| `failed` + "can't reach its service" | Chrome sends audio to Google to transcribe, so this needs internet | Check VPN, proxy, privacy extensions; try Incognito |
| `failed` + "Brave doesn't support transcription" | Brave ships without Google's speech keys | Use Chrome or Edge |
| `failed` + "microphone is busy" | Another tab or app holds the mic | Close it and start again |
| `failed` + "was blocked" | Mic permission denied | Allow it via the padlock in the address bar |
| `listening…` that never turns `on` | Nothing understood | Move closer, or set the mic to **Quiet voice** |

Still stuck: run `npm run dev` and open `/mic-test.html`. It runs the recogniser alone, with the mic held open, and in
continuous mode, logs every event, and tells you whether the fault is the browser, the network or
the app.

## Labelling takes

`/label.html` (from `npm run dev`) builds the training data for the in-browser filler detector (PRD → F15). It is dev
only: never deployed, and nothing leaves the page except the files you download.

1. **Record** a take on the page (it uses the app's mic settings), or **open** audio files —
   with their `.json` to carry on where you left off.
2. **Mark** every filler. While it plays, press **1** um, **2** uh, **3** other (er, ah, hmm): the
   label lands 0.35 s behind the playhead; drag its edges to fit. Or drag across a span and press a
   number. Click a label to select it; **Delete** removes it, **L** replays it. Labels autosave.
3. Tick **Fully labelled** when every filler is marked — only complete takes can teach the model
   what *isn't* a filler — and **consent** for takes other people donate.
4. **Download** saves `take-….webm` and `take-….json`:

```js
{ tool:"speakeasy-label/1", file, duration, sampleRate, recordedAt, prompt, promptId,
  speaker, mic, room, consent, notes, complete,
  counts: { um, uh, other }, labels: [{ start, end, type }] }   // seconds
```

`counts` doubles as the hand count for the Whisper filler gate (PRD → F9). `/label.html#demo`
loads a synthetic take to try the controls.
