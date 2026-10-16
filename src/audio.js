/* audio.js — Microphone stream, level probing, and the voice-activity gate.
   Speakeasy. Native ES modules, no build step: the browser loads these directly. */

/* ══ AUDIO ENGINE ═════════════════════════════════════════════════ */

export const audio = {
  stream:null, ctx:null, analyser:null, data:null, freq:null, binHz:0,
  recorder:null, chunks:[], url:null,
  async open(){
    if(this.stream) return true;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio:{ echoCancellation:true, noiseSuppression:true, autoGainControl:false }
    });
    this.ctx = new (window.AudioContext||window.webkitAudioContext)();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;              // 23 Hz bins at 48k — enough to see the speech band
    this.analyser.smoothingTimeConstant = .2;
    this.analyser.minDecibels = -85;           // clamp near-silent bins to 0 so the ratio stays sharp
    this.ctx.createMediaStreamSource(this.stream).connect(this.analyser);
    this.data = new Uint8Array(this.analyser.fftSize);
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    this.binHz = this.ctx.sampleRate / this.analyser.fftSize;
    return true;
  },
  /* One frame of measurement.
     rms   — raw loudness, the thing the noise floor is measured in
     level — 0..1 perceptual value, used for drawing only
     ratio — share of spectral energy sitting in the 200–3800 Hz speech band.
             Voices concentrate there; fans, hum and handling noise sit below it,
             hiss sits above. This is what separates "a room" from "a person". */
  probe(){
    if(!this.analyser) return {rms:0, level:0, ratio:0};
    this.analyser.getByteTimeDomainData(this.data);
    let sum = 0;
    for(let i=0;i<this.data.length;i++){ const v=(this.data[i]-128)/128; sum += v*v; }
    const rms = Math.sqrt(sum/this.data.length);

    this.analyser.getByteFrequencyData(this.freq);
    const lo = Math.max(1, Math.floor(200/this.binHz)), hi = Math.ceil(3800/this.binHz);
    let total = 0, band = 0;
    for(let i=1;i<this.freq.length;i++){
      const v = this.freq[i];
      total += v;
      if(i>=lo && i<=hi) band += v;
    }
    return { rms, level: Math.min(1, Math.pow(rms*7.5, .72)), ratio: total>0 ? band/total : 0 };
  },
  startRecording(){
    if(this.url){ URL.revokeObjectURL(this.url); this.url=null; }
    this.chunks=[];
    try{
      const mt = ["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(t=>MediaRecorder.isTypeSupported(t));
      this.recorder = new MediaRecorder(this.stream, mt?{mimeType:mt}:undefined);
      this.recorder.ondataavailable = e => e.data.size && this.chunks.push(e.data);
      this.recorder.start(250);
    }catch(e){ this.recorder=null; }        // playback is a bonus, never a blocker
  },
  stopRecording(){
    return new Promise(res=>{
      if(!this.recorder || this.recorder.state==="inactive") return res(null);
      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, {type:this.chunks[0]?.type||"audio/webm"});
        this.url = URL.createObjectURL(blob); res(this.url);
      };
      this.recorder.stop();
    });
  },
  /* The filler buzzer (F3): a 60 ms sine at 880 Hz with a soft envelope.
     Played through the same context, so echo cancellation can subtract it
     from the mic. */
  tick(){
    if(!this.ctx) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(g).connect(this.ctx.destination);
    o.start(t); o.stop(t + 0.07);
  },
  close(){ if(this.stream){ this.stream.getTracks().forEach(t=>t.stop()); this.stream=null; }
           if(this.ctx){ this.ctx.close(); this.ctx=null; } }
};

/* ══ VOICE ACTIVITY DETECTION ════════════════════════════════════
   The old test was `level > 0.075` — a fixed threshold. In a room with a
   fan or traffic the ambient level sits above it permanently, so the app
   believed you never stopped talking and every pause measurement was wrong.

   Two gates now, both relative to the room rather than absolute:
     1. loudness above the measured noise floor, not above a constant
     2. spectral shape that looks like a voice, not like a room

   The floor is measured from your actual room during the countdown, then
   keeps adapting during the session (falls fast, rises very slowly) so an
   air conditioner switching on mid-session doesn't break it.            */

/* Pure decision for one frame — kept separate so it is testable. */
export function isSpeechFrame(rms, ratio, floor, sens){
  const gate = floor * (3.2 / sens) + 0.006;   // headroom over the room, plus a mic-noise ceiling
  return rms > gate && ratio > 0.32;
}

export function makeVAD(sens){
  return {
    sens: sens || 1,
    floor: 0.012,          // sane default until the room is measured
    calib: [],
    calibrated: false,
    speaking: false,
    aboveSince: 0,         // when the current run of speech-looking frames began
    lastVoiced: 0,         // last frame that genuinely looked like speech
    ON_MS: 60,             // must look like speech this long before we believe it
    HANG_MS: 220,          // ...and stay believed this long after, so plosives don't chop a word

    sample(rms){ if(this.calib.length < 400) this.calib.push(rms); },
    /* 75th percentile of the quiet room, so one cough during calibration
       doesn't poison the floor the way a max() would. */
    commit(){
      if(this.calib.length < 8) return false;
      const s = [...this.calib].sort((a,b)=>a-b);
      this.floor = Math.max(0.003, s[Math.floor(s.length*0.75)]);
      this.calib = []; this.calibrated = true;
      return true;
    },
    roomLevel(){ return Math.min(100, Math.round(this.floor * 900)); },

    step(rms, ratio, now){
      // adaptive floor: drop toward quiet quickly, creep up very slowly
      this.floor += (rms < this.floor ? 0.05 : 0.0004) * (rms - this.floor);
      if(this.floor < 0.002) this.floor = 0.002;

      const looks = isSpeechFrame(rms, ratio, this.floor, this.sens);
      if(looks){ this.lastVoiced = now; if(!this.aboveSince) this.aboveSince = now; }
      else this.aboveSince = 0;

      if(this.speaking) this.speaking = (now - this.lastVoiced) < this.HANG_MS;
      else this.speaking = looks && this.aboveSince && (now - this.aboveSince) >= this.ON_MS;
      return this.speaking;
    }
  };
}

/* ══ PITCH (F4) ═══════════════════════════════════════════════════
   A flat voice is one of the commonest complaints about speakers. Measured
   per speech frame with YIN, then summarised relative to the take's own
   median, so the number means the same for a bass and a soprano. Only the
   summary is ever kept — no voice profile is built.                     */

/* YIN fundamental-frequency estimate for one frame (Float32Array, -1..1).
   Returns { f0, conf } with conf in 0..1, or null when nothing periodic
   enough was found in the speaking range (70–400 Hz). */
export function yin(frame, sampleRate, lo, hi){
  lo = lo || 70; hi = hi || 400;
  const W = frame.length >> 1;
  const tMin = Math.max(2, Math.floor(sampleRate / hi)), tMax = Math.min(W, Math.ceil(sampleRate / lo));
  if(tMax <= tMin + 2) return null;
  const d = new Float32Array(tMax + 1);
  for(let t = 1; t <= tMax; t++){
    let s = 0;
    for(let i = 0; i < W; i++){ const x = frame[i] - frame[i + t]; s += x * x; }
    d[t] = s;
  }
  // cumulative mean normalised difference
  let run = 0; d[0] = 1;
  for(let t = 1; t <= tMax; t++){ run += d[t]; d[t] = run ? d[t] * t / run : 1; }
  let tau = -1;
  for(let t = tMin; t < tMax; t++){
    if(d[t] < 0.15){ while(t + 1 < tMax && d[t + 1] < d[t]) t++; tau = t; break; }
  }
  if(tau < 0) return null;
  // parabolic interpolation around the dip
  const a = d[tau - 1], b = d[tau], c = d[tau + 1], den = a + c - 2 * b;
  const exact = den ? tau + (a - c) / (2 * den) : tau;
  return { f0: sampleRate / exact, conf: 1 - b };
}

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];

/* Summary of one take from [{t (s), f0}] voiced frames.
   range — p90 − p10 in semitones; the headline number
   flat  — start times of 4 s windows whose own range was under 2 semitones
   Needs 20 voiced frames, else null: too little to say anything honest.
   ponytail: fixed, non-overlapping 4 s windows; sliding windows if the tape
   marks look too coarse once it is drawn. */
export function pitchStats(frames){
  if(!frames || frames.length < 20) return null;
  const median = pct(frames.map(f => f.f0).sort((a,b) => a-b), 0.5);
  const st = f => 12 * Math.log2(f / median);
  const all = frames.map(f => st(f.f0)).sort((a,b) => a-b);
  const flat = [], win = {};
  frames.forEach(f => (win[Math.floor(f.t / 4)] ||= []).push(st(f.f0)));
  for(const k in win){
    const v = win[k].sort((a,b) => a-b);
    if(v.length >= 10 && pct(v, 0.9) - pct(v, 0.1) < 2) flat.push(k * 4);
  }
  return { median: Math.round(median), range: +(pct(all, 0.9) - pct(all, 0.1)).toFixed(1),
           flat: flat.sort((a,b) => a-b) };
}
