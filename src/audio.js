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
