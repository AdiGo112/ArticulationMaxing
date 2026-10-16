/* useSession — React's handle on one run. The engine lives in a ref and React
   state changes only on phase changes; per-frame data goes to onTick, which
   should draw to a canvas or a ref, not set state. StrictMode mounts twice:
   the first session is disposed before it could start (begin() is only ever
   called from a click), so nothing runs twice. */

import { useEffect, useRef, useState } from "react";
import { createSession, type Live, type Phase, type RunResult, type SessionHandle } from "./session.ts";
import { browserClock, browserSpeaker, createAudio } from "./browser.ts";
import { createListener, findRecogniser, recogniserLang } from "../lib/speech.ts";
import type { Drill, Run } from "../lib/drills.ts";

// one mic and one recogniser for the whole app: the permission prompt appears once
export const audio = createAudio();
export const listener = createListener(findRecogniser(), recogniserLang(typeof navigator === "undefined" ? "" : navigator.language));

export function useSession(run: Run | null, drill: Drill | null, opts: {
  buzz?: boolean; sens?: number;
  onTick?: (live: Live) => void; onFinish?: (r: RunResult) => void;
} = {}) {
  const ref = useRef<SessionHandle | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  // the latest callbacks without re-creating the session when they change
  const cb = useRef(opts);
  cb.current = opts;

  useEffect(() => {
    if (!run || !drill) return;
    const s = createSession({ run, drill, audio, listener, clock: browserClock, speaker: browserSpeaker,
      buzz: cb.current.buzz, sens: cb.current.sens,
      onPhase: setPhase,
      onTick: live => cb.current.onTick?.(live),
      onFinish: r => cb.current.onFinish?.(r) });
    ref.current = s;
    setPhase({ kind: "idle" });
    return () => { s.dispose(); ref.current = null; };
  }, [run, drill, opts.buzz]);         // the buzzer toggle is set before a run, so re-arm on change

  return {
    phase,
    begin: () => ref.current?.begin(),           // call from a click handler (iOS audio)
    finish: () => ref.current?.finish(),
    live: () => ref.current?.live ?? null,
    setDuration: (s: number) => ref.current?.setDuration(s),
    setSensitivity: (s: number) => ref.current?.setSensitivity(s),
  };
}
