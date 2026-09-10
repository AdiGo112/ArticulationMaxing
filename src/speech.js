/* speech.js — Web Speech recognition: the listener and its failure messages.
   Speakeasy. Native ES modules, no build step: the browser loads these directly. */

/* ══ SPEECH RECOGNITION ═══════════════════════════════════════════ */

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const listener = {
  rec:null, want:false, final:"", interim:"", onUpdate:null, onError:null,
  supported: !!SR,
  err: null, netFails: 0, gotAny: false, live: false, onStatus: null, lastSpin: 0,
  /* en-US mangles other English accents badly. Follow the browser when it is
     already set to some English; the drills are English-only, so anything else
     falls back rather than transcribing English with a foreign model. */
  lang: /^en\b/i.test(navigator.language || "") ? navigator.language : "en-US",
  start(){
    if(!SR) return false;
    this.want = true; this.final = ""; this.interim = "";
    this.err = null; this.netFails = 0; this.gotAny = false;
    this._spin();
    return true;
  },
  _spin(){
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = this.lang; r.maxAlternatives = 1;
    this.lastSpin = Date.now();
    /* How many results of THIS session are already folded into final. Chrome
       re-fires results it has already marked final (after a network blip, or
       when it revises an earlier utterance), and resultIndex points back at
       them — appending blind is what duplicates phrases in the transcript. */
    let done = 0;
    r.onstart = () => { this.live = true; this.err = null; this.onStatus && this.onStatus(); };
    r.onresult = e => {
      let iv = "";
      for(let i=Math.max(e.resultIndex, done); i<e.results.length; i++){
        const txt = e.results[i][0].transcript;
        if(e.results[i].isFinal){ this.final += txt + " "; done = i + 1; } else iv += txt;
      }
      this.interim = iv;
      this.gotAny = true; this.err = null; this.netFails = 0;
      this.onUpdate && this.onUpdate(this.final, this.interim);
      this.onStatus && this.onStatus();
    };
    r.onerror = e => {
      // no-speech and aborted are normal between utterances — recording them as
      // errors makes a finished run report a fault that never happened
      if(e.error === "no-speech" || e.error === "aborted"){ this.onStatus && this.onStatus(); return; }
      this.err = e.error;
      // fatal: retrying will never help, so stop and say why
      if(e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture"){
        this.want = false; this.onError && this.onError(e.error);
      }
      // network can be a blip, but a persistent one used to retry forever in silence
      else if(e.error === "network" && ++this.netFails >= 3){
        this.want = false; this.onError && this.onError("network");
      }
      this.onStatus && this.onStatus();
    };
    r.onend = () => {
      this.live = false;
      /* Chrome ends a session on its own — a silence gap, or its own ~1 minute
         cap — and throws away whatever was still interim. That is the "words
         just vanish mid-sentence" case: keep the tail instead of dropping it. */
      if(this.interim){ this.final += this.interim + " "; this.interim = ""; }
      if(this.want) this._restart();
    };
    this.rec = r;
    /* start() throws if the previous session hasn't released the mic yet. The
       old code swallowed that: no session, no onend, nothing left to retry, and
       transcription was dead for the rest of the run while the chip said "on". */
    try{ r.start(); }
    catch(e){ setTimeout(() => { if(this.want) this._spin(); }, 250); }
  },
  /* Restart at once so the gap between sessions swallows as little speech as
     possible — but back off if the session died instantly, or a mic that never
     opens turns this into a spin loop. */
  _restart(){
    const quick = Date.now() - this.lastSpin < 500;
    if(quick) setTimeout(() => { if(this.want) this._spin(); }, 300);
    else this._spin();
  },
  stop(){ this.want = false; this.live = false; try{ this.rec && this.rec.stop(); }catch(e){} },
  text(){ return (this.final + " " + this.interim).trim(); }
};

/* Brave removes the Google speech keys, so its failure mode is a network error
   that no amount of connection-checking will fix. Detect it and say so instead
   of sending people to debug their wifi. The check is async, so it resolves in
   the background and only sharpens the message once known. */
let isBrave = false;
if(navigator.brave && navigator.brave.isBrave)
  navigator.brave.isBrave().then(v => { isBrave = !!v; }).catch(()=>{});

/* Why transcription isn't working, in terms someone can act on. */
export function asrProblem(code){
  if(code === "not-allowed" || code === "service-not-allowed") return {
    t: "Transcription was blocked",
    d: "The browser refused speech recognition. Click the padlock in the address bar and allow microphone access, then start the drill again." };
  if(code === "audio-capture") return {
    t: "The microphone is busy",
    d: "Something else is holding the mic — another tab, a call app, or a recorder. Close it and start again." };
  if(code === "network") return isBrave ? {
    t: "Brave doesn't support transcription",
    d: "Speech recognition uploads audio to Google, so Brave ships without the keys for it and always reports a network error. This is deliberate on Brave's part and there's no setting to change it. Use Chrome or Edge for word-level feedback — every other measurement here works fine in Brave." } : {
    t: "Transcription can't reach its service",
    d: "The recogniser uploads audio to Google to transcribe it, so this one feature needs a working connection to Google — everything else here is local. Check any VPN, proxy, or privacy extension, and try an Incognito window with extensions off." };
  return {
    t: "Transcription isn't running",
    d: "Speech recognition is available in Chrome and Edge. Firefox, Safari and Brave either don't ship it or block it by default — the timer, level meter and recording still work." };
}
