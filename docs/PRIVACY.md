# Privacy policy — draft

**Status: draft for the public privacy page, not yet published. Not legal advice** — have it
reviewed before launch, and update it in the same change as anything that alters what leaves the
device (ARCHITECTURE → What leaves the device is the technical source; this page must agree with it).

It describes the app **as it works today** (static site, no accounts). The section at the end lists
what to add when accounts, sync and cloud recordings ship. Placeholders are in `[brackets]`.

---

## Speakeasy privacy policy

*Last updated: [date]*

Speakeasy is a speaking-practice tool that runs in your browser. It is built so that your voice
and what you say stay on your device. This page explains exactly what is stored, where, and the
few cases where something is sent elsewhere.

### The short version

- No account, no sign-up, no cookies, no ads, no tracking.
- Your voice is analysed **in your browser**. Recordings are never uploaded.
- Your history is stored **in your browser only**. We never see it.
- Three things send data to other companies, all described below: the optional waitlist form
  (Netlify), live transcription in Chrome and Edge (Google), and the optional Claude review
  (Anthropic, with your own key).

### Your microphone

Speakeasy asks for microphone access when you start a drill. The audio is analysed in your
browser — loudness, pauses, pace — and recorded in memory so you can play the take back. The
recording is discarded when you leave the page. It is never uploaded by Speakeasy.

### Transcription

To count words and fillers, Speakeasy uses your browser's built-in speech recognition. **In Chrome
and Edge, the browser sends your audio to Google to transcribe it**; this is how those browsers
provide speech recognition, and it is covered by [Google's privacy policy](https://policies.google.com/privacy).
Speakeasy does not receive or store that audio. Other browsers (Firefox, Brave) don't offer speech
recognition; there, Speakeasy scores what it can from the audio alone and nothing is sent.

### Coaching

- **Built-in analysis** runs in your browser. Nothing is sent.
- **Chrome's on-device model**, where available, runs on your device. Nothing is sent.
- **Claude review (optional).** Off unless you add your own Anthropic API key. When you press
  *Review what I said*, the transcript of that take and the drill's prompt are sent to Anthropic
  using your key — never audio. Your key is stored only in your browser. Use is governed by your
  agreement with Anthropic and [Anthropic's privacy policy](https://www.anthropic.com/legal/privacy).
  The code that makes this request is downloaded from esm.sh only when you use the feature.

### What is stored in your browser

In your browser's local storage, on your device only:

- your practice history: date, drill, prompt id, scores and measurements (pace, filler counts,
  pauses and similar numbers) — **not** transcripts or recordings;
- your daily plan, goal pack, diction-practice words, buzzer and theme settings;
- your Anthropic API key, if you added one.

You can download a backup file of your history from *Progress → Your data*, and delete everything
by clearing this site's data in your browser settings. Browsers may also delete it on their own
(for example, Safari after seven days without a visit).

### The waitlist form

The home page has an optional form: what you're practising for, and an email address if you want
to hear when accounts and sync arrive. It is sent only when you press *Send*, to Netlify Forms,
which stores it for us; see [Netlify's privacy policy](https://www.netlify.com/privacy/). No
recordings, scores or transcripts are sent with it. We use the email only to tell you about
Speakeasy, and delete it on request: [contact address].

### Hosting and fonts

The site is hosted on Netlify, which processes standard request data (such as your IP address)
to serve the pages; see [Netlify's privacy policy](https://www.netlify.com/privacy/).
[Fonts are served from this site. — *true only once fonts are self-hosted; until then:* Fonts are
loaded from Google Fonts, which receives your IP address when the page loads; see Google's policy
above.]

### Children

Speakeasy has no accounts. The only personal information it can receive is an email address you
choose to leave in the waitlist form; if you are under 13, please leave it blank. [When accounts
exist: see the age rules below.]

### Changes and contact

We will update this page when anything here changes, with a new date at the top.
Questions: [contact address].

---

## To add when these ship

| Feature | Add to the policy |
|---|---|
| Analytics | Which service (Cloudflare Web Analytics), that it sets no cookies, what it collects (page views, referrer, country, browser) |
| Accounts (F11) | What an account stores (email or Google id, birth year check), the age rules (no accounts under 13; cloud recordings and model features 16+, 18+ where parental consent is required), how to export and delete |
| Sync | Scores and metrics stored on our servers (Render, Neon); transcripts only with the separate opt-in |
| Cloud recordings (F6) | Opt-in; stored in Cloudflare R2; retention period; deletion |
| Email (Resend) | Used only for sign-in links |
| Error reports (Sentry) | What is collected; transcripts are excluded |
| Whisper / own models (F9, F15, F16) | Model files are downloaded once and run on your device; nothing is sent |
| Training donations | Separate per-take opt-in; how to withdraw |
| Every processor | Netlify, Render, Neon, Cloudflare, Resend, Sentry, Google (Web Speech), Anthropic (your key) — with links and the data each receives |
| GDPR / DPDP basics | Legal basis, rights (access, deletion, export), data location, controller contact |
