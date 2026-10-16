/* ascii.ts — ASCII decoration built around real words. DESIGN.md → ASCII. */

/* An ASCII speech bubble around real words (decoration around text, so the
   text stays readable to screen readers via the surrounding aria-live). */
export function bubble(text: string, width = 30): string {
  const lines: string[] = [];
  let cur = "";
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if ((cur + " " + w).trim().length > width) { lines.push(cur.trim()); cur = w; } else cur += " " + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  const bar = "-".repeat(width + 2), tail = Math.min(width - 4, 14);
  return "." + bar + ".\n" + lines.map(l => "| " + l.padEnd(width) + " |").join("\n") +
    "\n'" + "-".repeat(tail) + "." + "-".repeat(width + 1 - tail) + "'\n" + " ".repeat(tail + 1) + "\\";
}

/* Sound rings spreading from the centre of a cols × rows grid, for the Home
   hero: decoration, never data. Characters are about twice as tall as wide,
   so rows count double. Rings fade with distance, so whatever sits far from
   the centre (the headline) stays on near-empty ground. */
const RAMP = " .,:;-=+*#%@";
export function ripples(cols: number, rows: number, spacing = 9, clear = spacing * 1.2): string {
  const cx = cols / 2, cy = rows / 2, reach = Math.hypot(cx, cy * 2);
  const out: string[] = [];
  for (let y = 0; y < rows; y++) {
    let line = "";
    for (let x = 0; x < cols; x++) {
      const d = Math.hypot(x - cx, (y - cy) * 2);
      const ring = Math.max(0, Math.cos(d / spacing * Math.PI * 2)) ** 3;   // thin crests
      const fade = Math.max(0, 1 - d / reach) ** 1.6;
      line += d < clear ? " " : RAMP[Math.round(ring * fade * (RAMP.length - 1))];  // clear around the mascot
    }
    out.push(line);                              // untrimmed: the block must stay cols wide, or centring it moves the rings
  }
  return out.join("\n");
}
