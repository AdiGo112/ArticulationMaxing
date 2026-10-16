/* vad.ts — Voice-activity detection and pitch (YIN). Pure maths on numbers
   the audio engine measures; no Web Audio here. Ported from the old app's audio.js.

   Two gates, both relative to the room rather than absolute:
     1. loudness above the measured noise floor, not above a constant
     2. spectral shape that looks like a voice, not like a room
   The floor is measured during the countdown, then keeps adapting (falls
   fast, rises very slowly) so an air conditioner switching on mid-session
   doesn't break it.                                                      */

/* Pure decision for one frame. */
export function isSpeechFrame(rms: number, ratio: number, floor: number, sens: number): boolean {
  const gate = floor * (3.2 / sens) + 0.006;   // headroom over the room, plus a mic-noise ceiling
  return rms > gate && ratio > 0.32;
}

export function makeVAD(sens = 1) {
  return {
    sens,
    floor: 0.012,          // sane default until the room is measured
    calib: [] as number[],
    calibrated: false,
    speaking: false,
    aboveSince: 0,         // when the current run of speech-looking frames began
    lastVoiced: 0,         // last frame that genuinely looked like speech
    ON_MS: 60,             // must look like speech this long before we believe it
    HANG_MS: 220,          // ...and stay believed this long after, so plosives don't chop a word

    sample(rms: number) { if (this.calib.length < 400) this.calib.push(rms); },
    /* 75th percentile of the quiet room, so one cough during calibration
       doesn't poison the floor the way a max() would. */
    commit(): boolean {
      if (this.calib.length < 8) return false;
      const s = [...this.calib].sort((a, b) => a - b);
      this.floor = Math.max(0.003, s[Math.floor(s.length * 0.75)]);
      this.calib = []; this.calibrated = true;
      return true;
    },
    roomLevel(): number { return Math.min(100, Math.round(this.floor * 900)); },

    step(rms: number, ratio: number, now: number): boolean {
      // adaptive floor: drop toward quiet quickly, creep up very slowly
      this.floor += (rms < this.floor ? 0.05 : 0.0004) * (rms - this.floor);
      if (this.floor < 0.002) this.floor = 0.002;

      const looks = isSpeechFrame(rms, ratio, this.floor, this.sens);
      if (looks) { this.lastVoiced = now; if (!this.aboveSince) this.aboveSince = now; }
      else this.aboveSince = 0;

      if (this.speaking) this.speaking = (now - this.lastVoiced) < this.HANG_MS;
      else this.speaking = looks && !!this.aboveSince && (now - this.aboveSince) >= this.ON_MS;
      return this.speaking;
    }
  };
}
export type VAD = ReturnType<typeof makeVAD>;

/* ══ PITCH (F4) ═══════════════════════════════════════════════════
   Measured per speech frame with YIN, summarised relative to the take's own
   median, so the number means the same for a bass and a soprano. Only the
   summary is ever kept — no voice profile is built.                     */

/* YIN f0 estimate for one frame (-1..1). { f0, conf }, or null when nothing
   periodic enough was found in the speaking range (70–400 Hz). */
export function yin(frame: Float32Array, sampleRate: number, lo = 70, hi = 400): { f0: number; conf: number } | null {
  const W = frame.length >> 1;
  const tMin = Math.max(2, Math.floor(sampleRate / hi)), tMax = Math.min(W, Math.ceil(sampleRate / lo));
  if (tMax <= tMin + 2) return null;
  const d = new Float32Array(tMax + 1);
  for (let t = 1; t <= tMax; t++) {
    let s = 0;
    for (let i = 0; i < W; i++) { const x = frame[i] - frame[i + t]; s += x * x; }
    d[t] = s;
  }
  // cumulative mean normalised difference
  let run = 0; d[0] = 1;
  for (let t = 1; t <= tMax; t++) { run += d[t]; d[t] = run ? d[t] * t / run : 1; }
  let tau = -1;
  for (let t = tMin; t < tMax; t++) {
    if (d[t] < 0.15) { while (t + 1 < tMax && d[t + 1] < d[t]) t++; tau = t; break; }
  }
  if (tau < 0) return null;
  // parabolic interpolation around the dip
  const a = d[tau - 1], b = d[tau], c = d[tau + 1], den = a + c - 2 * b;
  const exact = den ? tau + (a - c) / (2 * den) : tau;
  return { f0: sampleRate / exact, conf: 1 - b };
}

const pct = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];

/* Summary of one take from voiced frames [{t (s), f0}].
   range — p90 − p10 in semitones; flat — start times of 4 s windows whose own
   range was under 2 semitones. Needs 20 voiced frames, else null.
   ponytail: fixed, non-overlapping 4 s windows; sliding windows if the tape
   marks look too coarse once it is drawn. */
export function pitchStats(frames: { t: number; f0: number }[] | null | undefined) {
  if (!frames || frames.length < 20) return null;
  const median = pct(frames.map(f => f.f0).sort((a, b) => a - b), 0.5);
  const st = (f: number) => 12 * Math.log2(f / median);
  const all = frames.map(f => st(f.f0)).sort((a, b) => a - b);
  const flat: number[] = [], win: Record<number, number[]> = {};
  frames.forEach(f => (win[Math.floor(f.t / 4)] ||= []).push(st(f.f0)));
  for (const k in win) {
    const v = win[k].sort((a, b) => a - b);
    if (v.length >= 10 && pct(v, 0.9) - pct(v, 0.1) < 2) flat.push(+k * 4);
  }
  return { median: Math.round(median), range: +(pct(all, 0.9) - pct(all, 0.1)).toFixed(1),
    flat: flat.sort((a, b) => a - b) };
}
