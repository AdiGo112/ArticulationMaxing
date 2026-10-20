/* label.js — Pure helpers for the filler labelling page (label.html).
   Dev tool for building the F15 filler-detector dataset; never deployed.
   No DOM, so label.test.js can check it. */

export const TYPES = ["um", "uh", "other"];          // other: er, erm, ah, hmm, mm
export const QUICK_LEAD = 0.35, QUICK_LEN = 0.45;    // reaction time, typical filler length (s)
export const MIN_LEN = 0.05;

/* min/max envelope of samples [from, to) in `cols` buckets — what the
   waveform draws. Returns Float32Array [min0, max0, min1, max1, …]. */
export function peaks(data, from, to, cols){
  const out = new Float32Array(cols * 2);
  from = Math.max(0, Math.floor(from)); to = Math.min(data.length, Math.ceil(to));
  const per = (to - from) / cols;
  for(let c = 0; c < cols; c++){
    const a = Math.floor(from + c * per), b = Math.max(a + 1, Math.floor(from + (c + 1) * per));
    let lo = 0, hi = 0;
    for(let i = a; i < b && i < to; i++){ const v = data[i]; if(v < lo) lo = v; if(v > hi) hi = v; }
    out[2*c] = lo; out[2*c + 1] = hi;
  }
  return out;
}

/* A label dropped by key while listening: you hear the filler, then press,
   so it starts a reaction time earlier. Clamped to the take. */
export function quickLabel(t, type, duration){
  const start = Math.max(0, t - QUICK_LEAD);
  return { start: round(start), end: round(Math.min(duration, start + QUICK_LEN)), type };
}

const round = v => Math.round(v * 1000) / 1000;

/* Clean a label list for saving: valid type, start < end inside the take,
   at least MIN_LEN long, sorted, millisecond precision. Overlaps are kept —
   they are a labelling question for a human, not something to merge away. */
export function normLabels(labels, duration){
  return (labels || [])
    .filter(l => TYPES.includes(l.type) && Number.isFinite(l.start) && Number.isFinite(l.end))
    .map(l => {
      const a = Math.max(0, Math.min(l.start, l.end)), b = Math.min(duration, Math.max(l.start, l.end));
      return { start: round(a), end: round(b), type: l.type };
    })
    .filter(l => l.end - l.start >= MIN_LEN)
    .sort((x, y) => x.start - y.start || x.end - y.end);
}

export const counts = labels =>
  Object.fromEntries(TYPES.map(t => [t, labels.filter(l => l.type === t).length]));

/* The JSON saved next to each audio file. */
export function exportDoc(take){
  const labels = normLabels(take.labels, take.duration);
  return {
    tool: "speakeasy-label/1",
    file: take.name,
    duration: round(take.duration),
    sampleRate: take.sampleRate,
    recordedAt: take.recordedAt || null,
    prompt: take.prompt || null,
    promptId: take.promptId || null,
    speaker: take.meta.speaker || "",
    mic: take.meta.mic || "",
    room: take.meta.room || "",
    consent: !!take.meta.consent,
    notes: take.meta.notes || "",
    complete: !!take.meta.complete,
    counts: counts(labels),
    labels
  };
}
