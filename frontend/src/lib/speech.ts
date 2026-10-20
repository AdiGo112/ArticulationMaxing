/* speech.ts — Web Speech recognition: the listener and its failure messages.
   Ported from the old app's speech.js. The recogniser is passed in rather than read off
   window at import, so tests drive a fake and nothing runs at import time. */

/* The slice of the Web Speech API we use; lib.dom doesn't ship it. */
interface SRResultList { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } }
export interface SRInstance {
  continuous: boolean; interimResults: boolean; lang: string; maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((e: { resultIndex: number; results: SRResultList }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void;
}
export type SRConstructor = new () => SRInstance;

export function findRecogniser(w: unknown = globalThis): SRConstructor | undefined {
  const g = w as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor };
  return g.SpeechRecognition || g.webkitSpeechRecognition;
}

/* en-US mangles other English accents badly. Follow the browser when it is
   already set to some English; anything else falls back. */
export const recogniserLang = (browserLang: string | undefined) =>
  /^en\b/i.test(browserLang || "") ? browserLang! : "en-US";

export function createListener(SR: SRConstructor | undefined, lang = "en-US") {
  const L = {
    rec: null as SRInstance | null, want: false, final: "", interim: "",
    onUpdate: null as ((final: string, interim: string) => void) | null,
    onError: null as ((code: string) => void) | null,
    onStatus: null as (() => void) | null,
    supported: !!SR,
    err: null as string | null, netFails: 0, gotAny: false, live: false, lastSpin: 0,
    lang,
    start(): boolean {
      if (!SR) return false;
      this.want = true; this.final = ""; this.interim = "";
      this.err = null; this.netFails = 0; this.gotAny = false;
      this._spin();
      return true;
    },
    _spin() {
      const r = new SR!();
      r.continuous = true; r.interimResults = true; r.lang = this.lang; r.maxAlternatives = 1;
      this.lastSpin = Date.now();
      /* How many results of THIS session are already folded into final. Chrome
         re-fires results it has already marked final, and resultIndex points
         back at them — appending blind duplicates phrases. */
      let done = 0;
      r.onstart = () => { this.live = true; this.err = null; this.onStatus?.(); };
      r.onresult = e => {
        let iv = "";
        for (let i = Math.max(e.resultIndex, done); i < e.results.length; i++) {
          const txt = e.results[i][0].transcript;
          if (e.results[i].isFinal) { this.final += txt + " "; done = i + 1; } else iv += txt;
        }
        this.interim = iv;
        this.gotAny = true; this.err = null; this.netFails = 0;
        this.onUpdate?.(this.final, this.interim);
        this.onStatus?.();
      };
      r.onerror = e => {
        // no-speech and aborted are normal between utterances, not faults
        if (e.error === "no-speech" || e.error === "aborted") { this.onStatus?.(); return; }
        this.err = e.error;
        // fatal: retrying will never help, so stop and say why
        if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture") {
          this.want = false; this.onError?.(e.error);
        }
        // network can be a blip, but a persistent one must not retry forever in silence
        else if (e.error === "network" && ++this.netFails >= 3) {
          this.want = false; this.onError?.("network");
        }
        this.onStatus?.();
      };
      r.onend = () => {
        this.live = false;
        /* Chrome ends a session on its own and throws away whatever was still
           interim — keep the tail instead of dropping it. */
        if (this.interim) { this.final += this.interim + " "; this.interim = ""; }
        if (this.want) this._restart();
      };
      this.rec = r;
      /* start() throws if the previous session hasn't released the mic yet;
         swallowing that left transcription dead for the rest of the run. */
      try { r.start(); }
      catch { setTimeout(() => { if (this.want) this._spin(); }, 250); }
    },
    /* Restart at once so the gap swallows as little speech as possible — but
       back off if the session died instantly, or this becomes a spin loop. */
    _restart() {
      const quick = Date.now() - this.lastSpin < 500;
      if (quick) setTimeout(() => { if (this.want) this._spin(); }, 300);
      else this._spin();
    },
    stop() { this.want = false; this.live = false; try { this.rec?.stop(); } catch { /* already stopped */ } },
    text(): string { return (this.final + " " + this.interim).trim(); }
  };
  return L;
}
export type Listener = ReturnType<typeof createListener>;

/* Why transcription isn't working, in terms someone can act on. Brave removes
   the Google speech keys, so its failure is a network error no wifi fix helps. */
export function asrProblem(code: string | null, isBrave = false): { t: string; d: string } {
  if (code === "not-allowed" || code === "service-not-allowed") return {
    t: "Transcription was blocked",
    d: "The browser refused speech recognition. Click the padlock in the address bar and allow microphone access, then start the drill again." };
  if (code === "audio-capture") return {
    t: "The microphone is busy",
    d: "Something else is holding the mic — another tab, a call app, or a recorder. Close it and start again." };
  if (code === "network") return isBrave ? {
    t: "Brave doesn't support transcription",
    d: "Speech recognition uploads audio to Google, so Brave ships without the keys for it and always reports a network error. This is deliberate on Brave's part and there's no setting to change it. Use Chrome or Edge for word-level feedback — every other measurement here works fine in Brave." } : {
    t: "Transcription can't reach its service",
    d: "The recogniser uploads audio to Google to transcribe it, so this one feature needs a working connection to Google — everything else here is local. Check any VPN, proxy, or privacy extension, and try an Incognito window with extensions off." };
  return {
    t: "Transcription isn't running",
    d: "Speech recognition is available in Chrome and Edge. Firefox, Safari and Brave either don't ship it or block it by default — the timer, level meter and recording still work." };
}
