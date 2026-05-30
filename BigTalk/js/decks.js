/* =========================================================================
   decks.js — the question "backend" (no DOM, fully decoupled from the UI)

   Responsibilities:
     • load the deck registry (data/decks.json)
     • load a single deck's questions once (data/decks/<id>.json)
     • filter by the adult setting
     • shuffle and serve questions one at a time, with no repeats until the
       whole pile has been used (then it reshuffles).

   The UI layer (app.js) consumes these objects but never reaches into them.
   ========================================================================= */

const REGISTRY_URL = "data/decks.json";
export const FALLBACK_LOGO = "assets/img/decks/_fallback.svg";

/** Fisher–Yates shuffle (returns the same array, shuffled in place). */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/** Fetch the list of available decks (metadata only — questions load lazily). */
export async function loadRegistry() {
  const res = await fetch(REGISTRY_URL, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Could not load deck registry (${res.status})`);
  const data = await res.json();
  if (!Array.isArray(data.decks) || data.decks.length === 0) {
    throw new Error("Deck registry is empty");
  }
  return data.decks;
}

/**
 * A single playable deck. Construct with its registry metadata, then call
 * load() once to fetch its questions.
 */
export class Deck {
  /** @param {{id:string,name:string,title:string,tagline:string,logo:string,accent:string,file:string}} meta */
  constructor(meta) {
    this.meta = meta;
    this._all = [];        // every question in the file
    this._pile = [];       // remaining shuffled draw pile for this round
    this.includeAdult = false;
  }

  /** Fetch and parse this deck's questions. Safe to call once. */
  async load() {
    const res = await fetch(this.meta.file, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Could not load deck "${this.meta.id}" (${res.status})`);
    const data = await res.json();
    this._all = (data.questions || []).filter((q) => q && q.text && q.text.trim());
    this.reset();
    return this;
  }

  /** Toggle adult content; rebuilds the draw pile from the now-eligible set. */
  setAdult(flag) {
    this.includeAdult = Boolean(flag);
    this.reset();
  }

  /** Questions eligible under the current adult setting. */
  get available() {
    return this.includeAdult ? this._all : this._all.filter((q) => !q.adult);
  }

  /** Number of playable questions right now. */
  get size() {
    return this.available.length;
  }

  /** Refill and reshuffle the draw pile. */
  reset() {
    this._pile = shuffle(this.available.slice());
  }

  /**
   * Draw the next question. No question repeats until every eligible one has
   * been shown, after which the pile reshuffles automatically.
   * @returns {{text:string,adult:boolean}|null} null if the deck is empty
   */
  next() {
    if (this.available.length === 0) return null;
    if (this._pile.length === 0) this.reset();
    return this._pile.pop();
  }
}
