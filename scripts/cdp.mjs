/* cdp.mjs — Headless Chrome over the DevTools protocol, with no dependencies:
   Node's own fetch and WebSocket (Node 22+). Shared by the smoke tests.
   CHROME=<path> picks the browser; otherwise the usual install paths are tried. */

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const sleep = ms => new Promise(r => setTimeout(r, ms));

let failed = 0;
export const check = (name, ok, detail) => {
  console.log((ok ? "  ok   " : "  FAIL ") + name + (ok || !detail ? "" : `\n         ${detail}`));
  if(!ok) failed++;
};
export const failures = () => failed;

/* Start Chrome and attach to its page. extraArgs go on the command line. */
export async function launch(extraArgs = []){
  const chromePath = process.env.CHROME || [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"
  ].find(p => existsSync(p));
  if(!chromePath){ console.error("No Chrome found. Set CHROME=/path/to/chrome."); process.exit(2); }

  const profile = mkdtempSync(join(tmpdir(), "speakeasy-smoke-"));
  const port = 9300 + Math.floor(Math.random() * 500);
  const chrome = spawn(chromePath, ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run",
    "--ignore-certificate-errors", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    "--window-size=1280,1000", ...extraArgs, "about:blank"], { stdio: "ignore" });

  let page;
  for(let i = 0; i < 60 && !page; i++){
    try{ page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === "page"); }
    catch(e){ await sleep(250); }
  }
  if(!page){ console.error("Chrome did not open a debugging port."); process.exit(2); }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let seq = 0;
  const waiting = new Map(), errors = [], listeners = {};
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if(m.id && waiting.has(m.id)){ waiting.get(m.id)(m); waiting.delete(m.id); return; }
    (listeners[m.method] || []).forEach(f => f(m.params));
    if(m.method === "Runtime.exceptionThrown")
      errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if(m.method === "Runtime.consoleAPICalled" && m.params.type === "error")
      errors.push("console.error: " + m.params.args.map(a => a.value ?? a.description).join(" "));
  };
  const send = (method, params = {}) => new Promise(r => { const id = ++seq; waiting.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  const ev = async expr => {
    const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true });
    return r.result?.result?.value;
  };
  const until = async (expr, ms = 4000) => {
    for(const t0 = Date.now(); Date.now() - t0 < ms; await sleep(100)) if(await ev(expr)) return true;
    return false;
  };
  await send("Page.enable");
  await send("Runtime.enable");
  return {
    send, ev, until, errors, profile,
    on: (method, f) => { (listeners[method] ||= []).push(f); },
    open: async url => { errors.length = 0; await send("Page.navigate", { url }); await sleep(300); },
    close: () => { ws.close(); chrome.kill(); try{ rmSync(profile, { recursive: true, force: true }); }catch(e){} }
  };
}
