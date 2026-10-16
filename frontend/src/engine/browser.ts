/* browser.ts — The real ports for createSession(): microphone, clock, voice.
   Ported from src/audio.js. Not unit-tested (Node has no Web Audio); the
   logic it feeds is, through session.test.ts.                           */

import type { AudioPort, ClockPort, Probe, SpeakerPort } from "./session.ts";

/* One engine for the whole app: the mic stays open between runs, so the
   permission prompt appears once. Call open() from inside a click — iOS only
   lets an AudioContext start during a user gesture, so it is created before
   the first await, not after getUserMedia resolves. */
export function createAudio(): AudioPort & { close(): void } {
  let stream: MediaStream | null = null, ctx: AudioContext | null = null, analyser: AnalyserNode | null = null;
  let data = new Uint8Array(0), freq = new Uint8Array(0), binHz = 0;
  let recorder: MediaRecorder | null = null, chunks: Blob[] = [], url: string | null = null;

  return {
    async open() {
      if (stream) { await ctx?.resume(); return; }
      ctx ||= new AudioContext();
      const resumed = ctx.resume();
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false }
      });
      await resumed;
      analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;              // 23 Hz bins at 48k — enough to see the speech band
      analyser.smoothingTimeConstant = .2;
      analyser.minDecibels = -85;           // clamp near-silent bins to 0 so the ratio stays sharp
      ctx.createMediaStreamSource(stream).connect(analyser);
      data = new Uint8Array(analyser.fftSize);
      freq = new Uint8Array(analyser.frequencyBinCount);
      binHz = ctx.sampleRate / analyser.fftSize;
    },
    /* One frame. rms: raw loudness (the noise floor's unit); level: 0..1 for
       drawing; ratio: share of energy in the 200–3800 Hz speech band, which is
       what separates "a room" from "a person". */
    probe(): Probe {
      if (!analyser) return { rms: 0, level: 0, ratio: 0 };
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
      const rms = Math.sqrt(sum / data.length);
      analyser.getByteFrequencyData(freq);
      const lo = Math.max(1, Math.floor(200 / binHz)), hi = Math.ceil(3800 / binHz);
      let total = 0, band = 0;
      for (let i = 1; i < freq.length; i++) { const v = freq[i]; total += v; if (i >= lo && i <= hi) band += v; }
      return { rms, level: Math.min(1, Math.pow(rms * 7.5, .72)), ratio: total > 0 ? band / total : 0 };
    },
    startRecording() {
      if (url) { URL.revokeObjectURL(url); url = null; }
      chunks = [];
      try {
        const mt = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(t => MediaRecorder.isTypeSupported(t));
        recorder = new MediaRecorder(stream!, mt ? { mimeType: mt } : undefined);
        recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
        recorder.start(250);
      } catch { recorder = null; }          // playback is a bonus, never a blocker
    },
    stopRecording() {
      return new Promise(res => {
        if (!recorder || recorder.state === "inactive") return res(null);
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: chunks[0]?.type || "audio/webm" });
          url = URL.createObjectURL(blob); res(url);
        };
        recorder.stop();
      });
    },
    /* The filler buzzer (F3): a 60 ms 880 Hz sine with a soft envelope, through
       the same context so echo cancellation can subtract it; a short buzz on
       phones that have one. */
    tick() {
      navigator.vibrate?.(40);
      if (!ctx) return;
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + 0.07);
    },
    close() {
      stream?.getTracks().forEach(t => t.stop()); stream = null;
      void ctx?.close(); ctx = null; analyser = null;
    }
  };
}

export const browserClock: ClockPort = {
  now: () => performance.now(),
  frame: cb => requestAnimationFrame(cb),
  cancelFrame: id => cancelAnimationFrame(id),
  wait: ms => new Promise(res => setTimeout(res, ms)),
};

/* Echo reads its line aloud. Prefers an English voice that isn't Google's
   network voice; resolves when the line ends (the engine has a timeout too). */
export const browserSpeaker: SpeakerPort = {
  say(text) {
    return new Promise(res => {
      if (!("speechSynthesis" in window)) return res();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = .92; u.pitch = 1;
      const v = speechSynthesis.getVoices().find(v => /en-GB|en-US/.test(v.lang) && !/google/i.test(v.name));
      if (v) u.voice = v;
      u.onend = () => res(); u.onerror = () => res();
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    });
  },
  cancel() { try { speechSynthesis.cancel(); } catch { /* not supported */ } },
};
