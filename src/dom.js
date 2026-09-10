/* dom.js — The one DOM lookup everything uses. Kept alone so it has no imports of its own.
   Speakeasy. Native ES modules, no build step: the browser loads these directly. */


export const $ = id => document.getElementById(id);
