/* main.js — Boot. The only module with a side effect at import time.
   Speakeasy. Native ES modules, no build step: the browser loads these directly. */

import { $ } from "./dom.js";
import { store } from "./storage.js";
import { listener } from "./speech.js";
import { drawIdle } from "./canvas.js";
import { reduced, splitHero, wireSpotlight } from "./report.js";
import { applyRoute, applyTheme, renderHome, renderSidebar, repaint } from "./ui.js";

/* ══ BOOT ════════════════════════════════════════════════════════ */

(function boot(){
  const saved = store.read().theme;
  applyTheme(saved || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));

  // "supported" only means the API exists — whether it actually works shows in the booth
  $("engineNote").textContent = listener.supported
    ? "Transcription available"
    : "No speech recognition in this browser — try Chrome or Edge";

  splitHero();
  renderHome();
  renderSidebar();
  wireSpotlight();
  applyRoute();                    // honour a deep link on first load
  // the idle wave is decorative: hold it still when the user asked for less motion
  (function spin(){
    if($("v-practice").classList.contains("on") && !reduced()) drawIdle();
    requestAnimationFrame(spin);
  })();
  if(reduced()) drawIdle();
  let rt; addEventListener("resize", ()=>{ clearTimeout(rt); rt = setTimeout(repaint, 120); });
  if(window.speechSynthesis) speechSynthesis.getVoices();
})();
