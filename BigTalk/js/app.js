/* =========================================================================
   app.js — UI controller (the only module that touches the DOM)

   Ties together:
     • store.js  — remembers settings between sessions
     • decks.js  — loads & serves questions, decoupled from any UI
   and owns the card, the slide-in menu, theming and the accent colour.
   ========================================================================= */

import { loadSettings, saveSettings } from "./store.js";
import { loadRegistry, Deck, FALLBACK_LOGO } from "./decks.js";

const APP_VERSION = "2.0";

/* ---------- element lookups ---------- */
const $ = (sel) => document.querySelector(sel);
const el = {
  card: $("#card"),
  logo: $("#card-logo"),
  question: $("#card-question"),
  watermark: $("#card-watermark"),
  hint: $("#hint"),
  deckTitle: $("#deck-title"),
  menuBtn: $("#menu-btn"),
  menuClose: $("#menu-close"),
  menu: $("#menu-panel"),
  scrim: $("#scrim"),
  tabSettings: $("#tab-settings"),
  tabAbout: $("#tab-about"),
  paneSettings: $("#pane-settings"),
  paneAbout: $("#pane-about"),
  deckList: $("#deck-list"),
  adultToggle: $("#adult-toggle"),
  accentPicker: $("#accent-picker"),
  accentValue: $("#accent-value"),
  accentReset: $("#accent-reset"),
  themeColor: $("#theme-color"),
  favicon: $("#favicon"),
  appleIcon: $("#apple-icon"),
  version: $("#app-version"),
};

/* ---------- app state ---------- */
const settings = loadSettings();
let registry = [];      // deck metadata list
let deck = null;        // active Deck instance
let started = false;    // has the player flipped at least once?

/* =========================================================================
   Theming
   ========================================================================= */

/** Pick black or white ink for text drawn on top of a given hex colour. */
function readableInk(hex) {
  const c = hex.replace("#", "");
  const r = parseInt(c.substr(0, 2), 16);
  const g = parseInt(c.substr(2, 2), 16);
  const b = parseInt(c.substr(4, 2), 16);
  // Perceived luminance (sRGB) → choose dark text on light accents.
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0a0a0f" : "#ffffff";
}

/** The accent currently in effect: the user's custom colour, else the deck's. */
function effectiveAccent() {
  return settings.accent || (deck ? deck.meta.accent : "#3ddc84");
}

/** Apply the active deck's identity (accent, glow, logo, titles) to the page. */
function applyTheme() {
  const accent = effectiveAccent();
  const root = document.documentElement.style;
  root.setProperty("--accent", accent);
  root.setProperty("--accent-ink", readableInk(accent));
  root.setProperty("--deck-glow", accent);

  if (deck) {
    el.deckTitle.textContent = deck.meta.name;
    document.title = `${deck.meta.title} — BigTalk`;
    setLogo(el.logo, deck.meta.logo);
    setLogo(el.watermark, deck.meta.logo);
    // Browser-tab / home-screen icon follows the active deck's logo.
    el.favicon.href = deck.meta.logo;
    el.appleIcon.href = deck.meta.logo;
    // Light logos (card:"dark") sit on a black card; everything else on white.
    // The body attribute also lightens the whole stage so a dark card pops.
    const tone = deck.meta.card === "dark" ? "dark" : "light";
    el.card.dataset.tone = tone;
    document.body.dataset.cardTone = tone;
  }

  // Sync accent picker UI.
  el.accentPicker.value = accent;
  el.accentValue.textContent = accent.toUpperCase();
}

/** Set an <img> source with a graceful fallback if the logo is missing. */
function setLogo(img, src) {
  img.onerror = () => {
    img.onerror = null;
    img.src = FALLBACK_LOGO;
  };
  img.src = src;
}

/* =========================================================================
   The card
   ========================================================================= */

function showNextQuestion() {
  const q = deck.next();
  el.question.textContent = q ? q.text : "No questions match your settings.";
}

function flipCard() {
  const revealing = !el.card.classList.contains("is-flipped");
  if (revealing) {
    showNextQuestion();              // load a fresh question before showing the back
    if (!started) {
      started = true;
      el.hint.style.opacity = "0";   // fade the "tap to begin" prompt away
    }
  }
  el.card.classList.toggle("is-flipped");
}

/** Reset the card to its logo side (used when switching decks). */
function resetCard() {
  el.card.classList.remove("is-flipped");
}

/* =========================================================================
   Deck loading / switching
   ========================================================================= */

async function activateDeck(deckId) {
  const meta = registry.find((d) => d.id === deckId) || registry[0];
  settings.deckId = meta.id;

  deck = new Deck(meta);
  deck.includeAdult = settings.adult;
  try {
    await deck.load();
  } catch (err) {
    console.error(err);
    el.question.textContent = "Sorry — this deck failed to load.";
  }

  resetCard();
  started = false;
  el.hint.style.opacity = "1";
  el.hint.textContent = deck.size
    ? "Tap the card to begin"
    : "No questions — try enabling the adult theme.";

  applyTheme();
  markSelectedDeck();
  saveSettings(settings);
}

/* =========================================================================
   Settings pane — building & wiring
   ========================================================================= */

function buildDeckList() {
  el.deckList.innerHTML = "";
  for (const meta of registry) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.className = "deck-option";
    if (meta.card === "dark") btn.classList.add("deck-option--dark");
    btn.dataset.deckId = meta.id;
    btn.innerHTML = `
      <img class="deck-option__logo" src="${meta.logo}" alt="" decoding="async"
           onerror="this.onerror=null;this.src='${FALLBACK_LOGO}'">
      <span class="deck-option__text">
        <span class="deck-option__name"></span>
        <span class="deck-option__tag"></span>
      </span>
      <span class="deck-option__check" aria-hidden="true">&#10003;</span>`;
    // Assign text via textContent to avoid any HTML injection from data files.
    btn.querySelector(".deck-option__name").textContent = meta.name;
    btn.querySelector(".deck-option__tag").textContent = meta.tagline;
    btn.addEventListener("click", () => {
      if (meta.id !== settings.deckId) activateDeck(meta.id);
    });
    li.appendChild(btn);
    el.deckList.appendChild(li);
  }
}

function markSelectedDeck() {
  el.deckList.querySelectorAll(".deck-option").forEach((b) => {
    const selected = b.dataset.deckId === settings.deckId;
    b.classList.toggle("is-selected", selected);
    b.setAttribute("aria-pressed", String(selected));
  });
}

/* =========================================================================
   Menu (open/close + tabs)
   ========================================================================= */

function openMenu() {
  el.scrim.hidden = false;
  requestAnimationFrame(() => el.scrim.classList.add("is-open"));
  el.menu.classList.add("is-open");
  el.menu.setAttribute("aria-hidden", "false");
  el.menuBtn.setAttribute("aria-expanded", "true");
}

function closeMenu() {
  el.scrim.classList.remove("is-open");
  el.menu.classList.remove("is-open");
  el.menu.setAttribute("aria-hidden", "true");
  el.menuBtn.setAttribute("aria-expanded", "false");
  setTimeout(() => { el.scrim.hidden = true; }, 300);
}

function toggleMenu() {
  el.menu.classList.contains("is-open") ? closeMenu() : openMenu();
}

function selectTab(which) {
  const onSettings = which === "settings";
  el.tabSettings.classList.toggle("is-active", onSettings);
  el.tabAbout.classList.toggle("is-active", !onSettings);
  el.tabSettings.setAttribute("aria-selected", String(onSettings));
  el.tabAbout.setAttribute("aria-selected", String(!onSettings));
  el.paneSettings.hidden = !onSettings;
  el.paneAbout.hidden = onSettings;
  el.paneSettings.classList.toggle("is-active", onSettings);
  el.paneAbout.classList.toggle("is-active", !onSettings);
}

/* =========================================================================
   Event wiring
   ========================================================================= */

function wireEvents() {
  el.card.addEventListener("click", flipCard);

  el.menuBtn.addEventListener("click", toggleMenu);
  el.menuClose.addEventListener("click", closeMenu);
  el.scrim.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && el.menu.classList.contains("is-open")) closeMenu();
  });

  el.tabSettings.addEventListener("click", () => selectTab("settings"));
  el.tabAbout.addEventListener("click", () => selectTab("about"));

  // Adult theme toggle
  el.adultToggle.addEventListener("change", () => {
    settings.adult = el.adultToggle.checked;
    if (deck) deck.setAdult(settings.adult);
    resetCard();
    started = false;
    el.hint.style.opacity = "1";
    el.hint.textContent = deck && deck.size
      ? "Tap the card to begin"
      : "No questions — try enabling the adult theme.";
    saveSettings(settings);
  });

  // Custom accent colour
  el.accentPicker.addEventListener("input", () => {
    settings.accent = el.accentPicker.value;
    applyTheme();
    saveSettings(settings);
  });
  el.accentReset.addEventListener("click", () => {
    settings.accent = null;          // fall back to the active deck's colour
    applyTheme();
    saveSettings(settings);
  });
}

/* =========================================================================
   Boot
   ========================================================================= */

async function init() {
  el.version.textContent = `v${APP_VERSION}`;
  el.adultToggle.checked = settings.adult;

  wireEvents();

  try {
    registry = await loadRegistry();
  } catch (err) {
    console.error(err);
    el.hint.textContent = "Could not load decks. Check your connection and refresh.";
    return;
  }

  buildDeckList();
  // If a previously-saved deck no longer exists, fall back to the first one.
  const startId = registry.some((d) => d.id === settings.deckId)
    ? settings.deckId
    : registry[0].id;
  await activateDeck(startId);

  registerServiceWorker();
}

/** Register the service worker for offline use / installability. */
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  // Relative path keeps the scope correct on GitHub Pages project sub-paths.
  navigator.serviceWorker.register("sw.js").catch((err) =>
    console.warn("Service worker registration failed:", err)
  );
}

init();
