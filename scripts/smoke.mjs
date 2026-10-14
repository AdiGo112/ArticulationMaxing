/* smoke.mjs — Load the real app in headless Chrome and check it works.
   No dependencies: drives Chrome over the DevTools protocol with Node's own
   fetch and WebSocket (Node 22+). Run: node scripts/smoke.mjs

   Covers what test.js can't: the DOM, the module graph loading in a browser,
   every route rendering, and the label page's mouse and keyboard handling.
   Not covered: a real microphone run — headless Chrome has no mic.

   CHROME=<path> picks the browser; otherwise the usual install paths are tried.
   SMOKE_URL=<origin> tests an already-running server instead of starting serve.js. */

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (name, ok, detail) => {
  console.log((ok ? "  ok   " : "  FAIL ") + name + (ok || !detail ? "" : `\n         ${detail}`));
  if(!ok) failed++;
};

/* ── browser ─────────────────────────────────────────────────────────── */
const chromePath = process.env.CHROME || [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"
].find(p => existsSync(p));
if(!chromePath){ console.error("No Chrome found. Set CHROME=/path/to/chrome."); process.exit(2); }

/* ── server ──────────────────────────────────────────────────────────── */
let server, origin = process.env.SMOKE_URL;
if(!origin){
  server = spawn(process.execPath, [join(root, "serve.js")], { cwd: root });
  origin = await new Promise((res, rej) => {
    server.stdout.on("data", d => { const m = String(d).match(/https?:\/\/localhost:\d+/); if(m) res(m[0]); });
    server.on("exit", c => rej(new Error("serve.js exited with " + c + " — is port 8137 already in use?")));
    setTimeout(() => rej(new Error("serve.js did not start")), 8000);
  });
}

const profile = mkdtempSync(join(tmpdir(), "speakeasy-smoke-"));
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(chromePath, ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run",
  "--ignore-certificate-errors", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  "--window-size=1280,1000", "about:blank"], { stdio: "ignore" });

let page;
for(let i = 0; i < 60 && !page; i++){
  try{ page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === "page"); }
  catch(e){ await sleep(250); }
}
if(!page){ console.error("Chrome did not open a debugging port."); process.exit(2); }

/* ── DevTools protocol ───────────────────────────────────────────────── */
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let seq = 0;
const waiting = new Map(), errors = [];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if(m.id && waiting.has(m.id)){ waiting.get(m.id)(m); waiting.delete(m.id); return; }
  if(m.method === "Runtime.exceptionThrown")
    errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if(m.method === "Runtime.consoleAPICalled" && m.params.type === "error")
    errors.push("console.error: " + m.params.args.map(a => a.value ?? a.description).join(" "));
};
const send = (method, params = {}) => new Promise(r => { const id = ++seq; waiting.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  return r.result?.result?.value;
};
const until = async (expr, ms = 4000) => {
  for(const t0 = Date.now(); Date.now() - t0 < ms; await sleep(100)) if(await ev(expr)) return true;
  return false;
};
const open = async hash => {
  errors.length = 0;
  await send("Page.navigate", { url: `${origin}/${hash}` });
  await sleep(300);
};
await send("Page.enable");
await send("Runtime.enable");

/* ── the app ─────────────────────────────────────────────────────────── */
console.log(`Speakeasy smoke test — ${origin}`);

await open("#home");
check("home renders today's plan", await until(`document.querySelectorAll(".planstep").length === 3`));
check("home: no script errors", errors.length === 0, errors.join(" | "));

// each stage opens with its own heading; checking the text rather than "some
// text" stops the previous drill's leftover stage from passing for this one
const KICK = { impromptu:"Impromptu", filler:"Filler Hunt", pace:"Read aloud", diction:"Diction", word:"Word Forge", echo:"Echo" };
for(const [id, kick] of Object.entries(KICK)){
  await open(`#drill-${id}`);
  const staged = await until(`(document.querySelector("#promptBox .kick")?.textContent || "").startsWith(${JSON.stringify(kick)})`);
  check(`drill ${id} stages a prompt`, staged);
  if(["pace", "diction", "echo"].includes(id))
    check(`drill ${id} wraps words for live marking`, staged && await ev(`document.querySelectorAll("#promptBox w").length > 3`));
  check(`drill ${id}: no script errors`, errors.length === 0, errors.join(" | "));
}

for(const route of ["practice", "progress", "guide"]){
  await open(`#${route}`);
  await sleep(400);
  check(`#${route}: no script errors`, errors.length === 0, errors.join(" | "));
}

/* backup: restore a real file through the page's file input, then download */
await open("#progress");
await ev(`localStorage.removeItem("speakeasy.v1"), true`);
const backupFile = join(profile, "backup.json");
const day = Date.UTC(2026, 9, 1);
writeFileSync(backupFile, JSON.stringify({ kind: "speakeasy-backup", version: 1, cards: [], sessions: [
  { at: day, drill: "pace", name: "Pace & Pause", score: 71, wpm: 150, fillers: 1 },
  { at: day + 864e5, drill: "filler", name: "Filler Hunt", score: 64, wpm: null, fillers: 4 },
  { at: "broken", drill: "pace", score: 50 } ] }));
await send("DOM.enable");
const { root: doc } = await send("DOM.getDocument").then(r => r.result);
const { nodeId } = await send("DOM.querySelector", { nodeId: doc.nodeId, selector: "#restoreFile" }).then(r => r.result);
await send("DOM.setFileInputFiles", { nodeId, files: [backupFile] });
check("backup: restore reports what it did", await until(`document.getElementById("backupMsg").textContent === "Restored 2 sessions. Skipped 1 damaged entry."`),
  await ev(`document.getElementById("backupMsg").textContent`));
check("backup: restored sessions are listed", await until(`document.querySelectorAll("#recentWrap .rrow").length === 2`));
check("backup: a missing wpm shows a dash", await ev(`[...document.querySelectorAll("#recentWrap .rmeta")].some(e => e.textContent === "—")`));
await send("DOM.setFileInputFiles", { nodeId, files: [backupFile] });
check("backup: restoring twice adds nothing", await until(`document.getElementById("backupMsg").textContent.startsWith("Nothing new")`));
await ev(`document.getElementById("backupBtn").click(), true`);
check("backup: download says what it saved", await until(`document.getElementById("backupMsg").textContent.startsWith("Saved 2 sessions")`));
check("backup: no script errors", errors.length === 0, errors.join(" | "));

await open("#no-such-place");
check("an unknown route falls back to home", await until(`document.querySelectorAll(".planstep").length === 3`));

/* ── the label page, driven with real input events ───────────────────── */
await open("label.html#demo");
const loaded = await until(`document.querySelectorAll("#list tr").length === 3`);
check("label: demo take loads with 3 labels", loaded);
if(loaded){
  const box = await ev(`(() => { const r = document.getElementById("main").getBoundingClientRect(); return { x:r.x, y:r.y, w:r.width, h:r.height }; })()`);
  const x = t => box.x + t / 12 * box.w, y = box.y + box.h / 2;
  const mouse = (type, px) => send("Input.dispatchMouseEvent", { type, x: px, y, button: "left", buttons: type === "mouseReleased" ? 0 : 1, clickCount: 1 });
  const click = async t => { await mouse("mousePressed", x(t)); await mouse("mouseReleased", x(t)); };
  const drag = async (a, b) => { await mouse("mousePressed", x(a)); for(let k = 1; k <= 6; k++) await mouse("mouseMoved", x(a) + (x(b) - x(a)) * k / 6); await mouse("mouseReleased", x(b)); };
  const key = async (k, code, vk) => {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk, text: k.length === 1 ? k : undefined });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk });
  };
  const rows = () => ev(`[...document.querySelectorAll("#list tr")].map(tr => [...tr.children].slice(0, 3).map(td => td.textContent.trim()).join(" ")).join(" | ")`);

  await drag(6.0, 6.5); await key("2", "Digit2", 50);
  check("label: drag + 2 adds an uh", (await rows()).includes("uh 0:06.00 0:06.50"));
  await click(1.4); await key("Delete", "Delete", 46);
  check("label: click + Delete removes a label", !(await rows()).includes("um 0:01.20"));
  await click(4.2); await key("3", "Digit3", 51);
  check("label: select + 3 retypes", (await rows()).includes("other 0:04.05"));
  await drag(8.9, 9.5);
  check("label: dragging an edge resizes", (await rows()).includes("other 0:08.30 0:09.50"));
  await key("Escape", "Escape", 27); await click(11.0); await key("1", "Digit1", 49);
  check("label: 1 drops a quick label behind the playhead", (await rows()).includes("um 0:10.65 0:11.10"));
  check("label: labels autosave", await ev(`JSON.parse(localStorage.getItem("speakeasy.label.demo.wav:12.00")).labels.length === 4`));
}
check("label: no script errors", errors.length === 0, errors.join(" | "));

/* ── done ────────────────────────────────────────────────────────────── */
ws.close(); chrome.kill(); server?.kill();
await sleep(300);
try{ rmSync(profile, { recursive: true, force: true }); }catch(e){}   // Chrome may still hold files on Windows
console.log(failed ? `\n${failed} check(s) failed` : "\nsmoke ok");
process.exit(failed ? 1 : 0);
