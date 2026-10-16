/* coach.ts — The two model tiers that read a transcript: Chrome's on-device
   model (nothing leaves the machine) and Claude with the user's own key (the
   transcript goes to Anthropic, on a button press, never audio). The prompts
   and reply parsing are pure, in lib/coach.ts. */

import { COACH_SYSTEM, ONDEVICE_SYSTEM } from "../lib/coach.ts";

/* ── Chrome's built-in model ──────────────────────────────────────── */

interface LMSession { prompt(p: string): Promise<string>; destroy(): void }
interface LMMonitor { addEventListener(t: "downloadprogress", f: (e: { loaded?: number }) => void): void }
interface LMStatic {
  availability(): Promise<string>;
  create(o: { initialPrompts: { role: string; content: string }[]; monitor?: (m: LMMonitor) => void }): Promise<LMSession>;
}
const LM = () => (globalThis as { LanguageModel?: LMStatic }).LanguageModel;

export type OnDeviceState = "unsupported" | "unavailable" | "downloadable" | "downloading" | "available";

/* availability() can hang on some machines, so it races a timeout: a probe that
   never settles must not leave the coach panel empty. */
export async function onDeviceState(): Promise<OnDeviceState> {
  const lm = LM();
  if (!lm) return "unsupported";
  try {
    return await Promise.race([
      lm.availability() as Promise<OnDeviceState>,
      new Promise<OnDeviceState>(r => setTimeout(() => r("unavailable"), 3000)),
    ]);
  } catch { return "unavailable"; }
}

export async function askOnDevice(prompt: string, onProgress?: (pct: number) => void): Promise<string> {
  const lm = LM();
  if (!lm) throw new Error("This browser has no on-device model.");
  const session = await lm.create({
    initialPrompts: [{ role: "system", content: ONDEVICE_SYSTEM }],
    monitor: onProgress ? m => m.addEventListener("downloadprogress", e => onProgress(Math.round((e.loaded || 0) * 100))) : undefined,
  });
  try { return (await session.prompt(prompt)).trim(); }
  finally { try { session.destroy(); } catch { /* already gone */ } }
}

/* ── Claude, with the user's own key ──────────────────────────────── */

/* Kept apart from the record, so it is never in a backup file. Same key name
   as the old app, so a saved key carries over. */
const KEY = "speakeasy.anthropicKey";
export const readKey = () => { try { return localStorage.getItem(KEY) || ""; } catch { return ""; } };
export const writeKey = (k: string) => { try { k ? localStorage.setItem(KEY, k) : localStorage.removeItem(KEY); } catch { /* storage blocked */ } };

/* `fetch` is for tests: they check the request and the error messages without a network. */
export async function askClaude(prompt: string, opts: { key?: string; fetch?: typeof fetch } = {}): Promise<string> {
  // the SDK is a separate chunk: it downloads the first time someone asks
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: opts.key ?? readKey(), dangerouslyAllowBrowser: true, fetch: opts.fetch, maxRetries: opts.fetch ? 0 : 2 });
  try {
    const res = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",                     // a policy decline is re-run on a fallback model
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },       // Opus 5.5 defaults to medium
      system: COACH_SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });
    if (res.stop_reason === "refusal") throw new Error("The model declined to review this transcript.");
    return res.content.flatMap(b => (b.type === "text" ? [b.text] : [])).join("\n").trim();
  } catch (e) {
    // words for a person, not a stack trace — most specific first
    if (e instanceof Anthropic.AuthenticationError) throw new Error("That API key was rejected.");
    if (e instanceof Anthropic.PermissionDeniedError) throw new Error("That key isn't allowed to use this model.");
    if (e instanceof Anthropic.RateLimitError) throw new Error("Rate limited by the API. Wait a moment and try again.");
    if (e instanceof Anthropic.APIConnectionError) throw new Error("Couldn't reach the API. Check your connection — this one feature needs the network.");
    if (e instanceof Anthropic.APIError) throw new Error(`The API returned an error (${e.status ?? "no status"}). Try again in a moment.`);
    throw e;
  }
}
