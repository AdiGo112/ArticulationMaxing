/* reel.ts — Reel, the mascot, as pixels. Pure: frames(state) returns one SVG
   path per colour per frame; the component (ui/Reel.tsx) only draws them.
   Ported from the design canvas's Reel.dc.html; DESIGN.md → Reel. */

export type ReelState =
  | "idle" | "record" | "listen" | "play" | "pause" | "think"
  | "coffee" | "read" | "um" | "cheer" | "rewind" | "sleep";

/* Colour slots: A body, D shade (legs, base, screws), C cream, W steam/white,
   B cyan (headphones), R alert (REC), T tape, K ink (eyes, open mouth). */
export const SLOTS = ["D", "T", "A", "C", "W", "B", "R", "K"] as const;
export type Slot = (typeof SLOTS)[number];

export const FIXED: Record<Exclude<Slot, "A" | "D">, string> = {
  C: "#FFE6A6", W: "#ECE9E2", B: "#7CC8FF", R: "#FF3D6E", T: "#5C3B10", K: "#0A0A0B",
};
export const REEL_CORAL = "#FF7F6A";
/* The shade is the body colour at 48 % — DESIGN.md's reel-shade. */
export const shade = (hex: string) => "#" + [1, 3, 5]
  .map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * 0.48).toString(16).padStart(2, "0")).join("");

export const FRAMES = 8;
export const VIEWBOX = "-3 -4 28 18";
export const ASPECT = 18 / 28;                    // height / width

interface Pose {
  ox?: number; oy?: number;
  eyes?: "still" | "shut" | "happy" | "x"; look?: number;
  legs?: "stand" | "squash";
  arms?: "down" | "up" | "hold" | "none";
  prop?: "mug" | "paper"; phones?: boolean; rec?: boolean;
  slit?: "open" | "shut"; tape?: number; spill?: boolean; confetti?: boolean;
}

/* One frame on a pixel grid → { slot: path }. */
export function paint(o: Pose, f: number): Partial<Record<Slot, string>> {
  const g = new Map<string, Slot>();
  const ox = o.ox || 0, oy = o.oy || 0;
  const key = (x: number, y: number) => x + "," + y;
  const set = (x: number, y: number, c: Slot) => { g.set(key(x + ox, y + oy), c); };
  const rect = (x: number, y: number, w: number, h: number, c: Slot) => {
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) set(x + i, y + j, c);
  };

  if ((o.legs || "stand") === "stand") { rect(5, 10, 2, 2, "D"); rect(11, 10, 2, 2, "D"); }
  else { rect(5, 10, 2, 1, "D"); rect(11, 10, 2, 1, "D"); }
  // the cassette body, corners rounded
  rect(1, 0, 16, 9, "A");
  for (const [x, y] of [[1, 0], [16, 0], [1, 8], [16, 8]]) g.delete(key(x + ox, y + oy));
  rect(3, 9, 12, 1, "D");
  set(2, 1, "D"); set(15, 1, "D");                        // screws
  if (o.rec) set(13, 1, "R");
  // the tape slot, its mouth: open, or tape running (tape < 0 runs backwards)
  for (let x = 6; x < 12; x++) {
    const run = o.tape ? ((x + f * o.tape) % 3 + 3) % 3 === 0 : false;
    set(x, 6, o.slit === "open" ? "K" : run ? "C" : "D");
  }
  // eyes: 1 × 2 pixels
  for (const [cx, cy, out] of [[5, 3, -1], [12, 3, 1]]) {
    const e = o.eyes || "still", s = o.look || 0;
    const K = (x: number, y: number) => set(cx + x + s, cy + y, "K");
    if (e === "still") { K(0, 0); K(0, 1); }
    if (e === "shut") { K(0, 1); K(out, 1); }
    if (e === "happy") { K(-1, 1); K(0, 0); K(1, 1); }
    if (e === "x") { K(out, -1); K(0, 0); K(out, 1); }   // > <
  }
  // hands: 2 × 2 nubs
  const arms = o.arms || "down";
  if (arms === "down") { rect(-1, 4, 2, 2, "A"); rect(17, 4, 2, 2, "A"); }
  if (arms === "up") { rect(-1, -1, 2, 3, "A"); rect(17, -1, 2, 3, "A"); }
  if (arms === "hold") { rect(-1, 4, 2, 2, "A"); rect(17, 4, 3, 2, "A"); }
  if (o.phones) { rect(3, -2, 12, 1, "B"); set(2, -1, "B"); set(15, -1, "B"); rect(-1, 3, 2, 4, "B"); rect(17, 3, 2, 4, "B"); }
  if (o.prop === "mug") {
    rect(19, 3, 3, 4, "C"); rect(19, 3, 3, 1, "D"); set(22, 4, "C"); set(22, 5, "C");
    if (f % 2) { set(20, 1, "W"); set(19, 0, "W"); } else { set(21, 1, "W"); set(20, 0, "W"); }
  }
  if (o.prop === "paper") {
    rect(19, 0, 5, 8, "C");
    [2, 4, 6].forEach((y, i) => rect(20, y, i === (f >> 1) % 3 ? 2 : 3, 1, "D"));
  }
  if (o.spill) {
    const w = [0, 1, 0, -1][f % 4];
    for (const [x, y] of [[8, 10], [7 + w, 11], [7, 12], [8, 13], [10, 13], [11, 12], [11 - w, 11], [10, 10], [9, 9]]) set(x, y, "T");
  }
  if (o.confetti) {                                      // not moved with the body
    const cs: Slot[] = ["R", "B", "C", "W"];
    for (let i = 0; i < 9; i++) g.set(key(((i * 7 + f * 5) % 26) - 2, ((i * 5 + f * 3) % 8) - 4), cs[(i + f) % 4]);
  }

  const out: Partial<Record<Slot, string>> = {};
  for (const [k, c] of g) { const [x, y] = k.split(","); out[c] = (out[c] || "") + "M" + x + " " + y + "h1v1h-1z"; }
  return out;
}

const blink = (f: number, at: number) => (f === at ? "shut" : "still");

/* Each state: duration of one 8-frame loop, the pose per frame, and an
   accessory caption drawn beside it. DESIGN.md lists when each appears. */
export const STATES: Record<ReelState, { dur: number; pose: (f: number) => Pose; acc?: string; accColor?: string }> = {
  idle:   { dur: 2.4, pose: f => ({ oy: f === 4 || f === 5 ? -1 : 0, eyes: blink(f, 6) }) },
  record: { dur: 0.8, pose: f => ({ eyes: blink(f, 5), rec: f % 2 === 0, tape: 1 }) },
  listen: { dur: 1.6, pose: f => ({ eyes: blink(f, 6), phones: true, arms: "none", tape: f >> 1 ? 1 : 0 }), acc: ")))", accColor: "#7CC8FF" },
  play:   { dur: 1,   pose: f => ({ eyes: "still", slit: f % 2 ? "open" : "shut" }), acc: "♪ ♫" },
  pause:  { dur: 2.4, pose: f => ({ eyes: blink(f, 7) }), acc: "||", accColor: "#7CC8FF" },
  think:  { dur: 2.4, pose: f => ({ eyes: "still", look: f < 4 ? -1 : 1 }), acc: "...", accColor: "#ECE9E2" },
  coffee: { dur: 1.6, pose: f => ({ eyes: blink(f, 5), arms: "hold", prop: "mug" }) },
  read:   { dur: 2,   pose: () => ({ eyes: "still", look: 1, arms: "hold", prop: "paper" }) },
  um:     { dur: 0.6, pose: f => ({ eyes: "x", spill: true, ox: [0, 1, 0, -1][f % 4] }), acc: "!", accColor: "#FF3D6E" },
  cheer:  { dur: 0.9, pose: f => ({ eyes: "happy", arms: "up", confetti: true, oy: [0, -2, -3, -2, 0, -1, -2, 0][f] }) },
  rewind: { dur: 0.5, pose: () => ({ eyes: "still", tape: -1 }), acc: "◀◀" },
  sleep:  { dur: 3.2, pose: () => ({ eyes: "shut", legs: "squash", oy: 1 }), acc: "z Z", accColor: "#9A968D" },
};

/* All frames of a state, one list of paths per colour slot. An empty frame is
   "M0 0" so SVG animation values always line up. */
export function frames(state: ReelState) {
  const s = STATES[state];
  const fs = Array.from({ length: FRAMES }, (_, f) => paint(s.pose(f), f));
  const layers = {} as Record<Slot, string[]>;
  for (const c of SLOTS) layers[c] = fs.map(fr => fr[c] || "M0 0");
  return { dur: s.dur, acc: s.acc || "", accColor: s.accColor || "#FFB224", layers };
}
