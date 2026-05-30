/* =========================================================================
   store.js — settings persistence (no DOM, no game logic)
   Persists the player's choices in localStorage so they survive between
   sessions. Always returns a complete object by merging over DEFAULTS, so
   older/partial saved data can never break the app.
   ========================================================================= */

const KEY = "bigtalk:settings:v1";

const DEFAULTS = Object.freeze({
  deckId: "bigtalk", // active deck id (see data/decks.json)
  adult: false,      // include adult-themed questions?
  accent: null,      // custom accent hex, or null to use the deck's default
});

/** Load saved settings, falling back to defaults for anything missing. */
export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

/** Persist the full settings object. Failures (e.g. private mode) are ignored. */
export function saveSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable — the app still works for this session */
  }
}

export { DEFAULTS };
