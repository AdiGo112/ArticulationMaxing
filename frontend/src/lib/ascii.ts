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
