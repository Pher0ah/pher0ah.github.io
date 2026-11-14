import './version.js';
import { clone, debounce, hexRgb, rgbHex } from './utils.js';
import { TYPES, encodeFace, parseQr, normUrl } from './formats.js';
import { createStorage } from './storage.js';
import { paintSurface } from './surfaces.js';
/* QR Cards — a wallet-style stack of QR code cards.
 * Plain ES modules, no build step. Each card is a DOM element with a
 * procedurally painted texture; everything visual is CSS transitions. */

(() => {

  const STORE = 'qrcards.v1';
  const LEGACY_STORE = 'qrcube.v1';   // the die version's data, carried over on first launch
  const HOLD_MS = 380;        // hold this long to pick a card up for reordering
  const MOVE_TOL = { mouse: 6, pen: 10, touch: 12 };  // px of wobble before a press becomes a scroll
  const DEBUG = new URLSearchParams(location.search).has('debug');
  const LOGO_FRACTION = 0.22; // logo width as a share of the QR width
  const CARD_RATIO = 1.28;    // card height / width
  const MAX_CARD_W = 400;

  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

  /* ================================================================
   * Card look: texture and background colour (per card), backdrop (global)
   * ================================================================ */
  const MATERIALS = {
    matte:  { name: 'Matte plastic',  color: '#f4f1ea' },
    glossy: { name: 'Glossy plastic', color: '#f4f1ea' },
    metal:  { name: 'Brushed metal',  color: '#b9bdc3' },
    wood:   { name: 'Wood',           color: '#c8955c' },
    clay:   { name: 'Clay',           color: '#c97b5a' },
    stone:  { name: 'Marble',         color: '#e9e6e1' }
  };
  const DEFAULT_LOOK = { backdrop: '#111214' };
  // New cards cycle through these so the stack is easy to tell apart.
  const NEW_COLOURS = ['#f4f1ea', '#1e3a8a', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#1f2937', '#06b6d4'];
  const newId = () => Math.random().toString(36).slice(2, 10);

  /* ================================================================
   * State
   * ================================================================ */
  const { cleanState } = createStorage({ MATERIALS, DEFAULT_LOOK, newId });

  function load() {
    for (const key of [STORE, LEGACY_STORE]) {
      try {
        const s = JSON.parse(localStorage.getItem(key));
        if (s && (Array.isArray(s.cards) || Array.isArray(s.faces))) return { state: cleanState(s), migrated: key !== STORE };
      } catch { /* ignore */ }
    }
    return { state: cleanState(null), migrated: false };
  }
  /** Persist the state; false (after telling the user, unless quiet) when storage is full. */
  function save(quiet = false) {
    try { localStorage.setItem(STORE, JSON.stringify(state, function(key, value) { return key === 'orig' && this.src === value ? undefined : value; })); return true; }
    catch {
      if (!quiet) alert('Could not save: storage is full. Try a smaller logo, or delete a card you no longer need.');
      return false;
    }
  }
  let { state, migrated } = load();
  if (migrated) save(true);

  const defaultCard = () => ({
    id: newId(), type: 'url', label: '', data: {},
    logo: { mode: 'none', src: '', fav: '', favFor: '' },
    inkMode: 'auto', fg: '#000000', ecc: 'M',
    material: 'matte', color: NEW_COLOURS[state.cards.length % NEW_COLOURS.length]
  });
  const cardById = id => state.cards.find(c => c.id === id);
  const cardIndex = id => state.cards.findIndex(c => c.id === id);

  function luminance(hex) {
    const [r, g, b] = hexRgb(hex).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  function toHsl(hex) {
    const [r, g, b] = hexRgb(hex), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d) return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1));
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(h * 60 + 360) % 360, s, l];
  }
  function fromHsl(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return rgbHex([r + m, g + m, b + m]);
  }

  /** The die colour's complementary hue, at the most colourful lightness that still
   *  contrasts strongly enough to scan (dark ink on light dice, light ink on dark). */
  function complementInk(die) {
    const [h, s] = toHsl(die);
    // Near-neutral dice (white, grey, silver) have no real hue to complement: use navy.
    const hue = s < 0.12 ? 220 : (h + 180) % 360, sat = Math.min(0.8, Math.max(0.45, s));
    const dark = luminance(die) > 0.18;
    let best = fromHsl(hue, sat, dark ? 0.04 : 0.97);
    for (let i = 0; i <= 40; i++) {
      const l = dark ? 0.45 - i * 0.01 : 0.55 + i * 0.01;
      const c = fromHsl(hue, sat, l);
      if (contrast(c, die) >= 7) { best = c; break; }
    }
    return best;
  }

  /** Colours for one card: `ink` is printed on the card; `scanFg`/`scanBg` are the
   *  same pair arranged dark-on-light for the full-screen code, which every scanner reads. */
  function cardColors(f) {
    const base = f?.color || MATERIALS.matte.color;
    const ink = f && f.inkMode === 'custom' ? f.fg : complementInk(base);
    let [scanFg, scanBg] = luminance(ink) < luminance(base) ? [ink, base] : [base, ink];
    if (contrast(scanFg, scanBg) < 4.5) { scanBg = '#ffffff'; if (contrast(scanFg, scanBg) < 4.5) scanFg = '#000000'; }
    return { base, ink, scanFg, scanBg };
  }

  /* ================================================================
   * QR modules → SVG (card face, full screen)
   * ================================================================ */
  function logoHref(f) {
    if (!f || !f.logo) return '';
    if (f.logo.mode === 'file') return f.logo.src || '';
    if (f.logo.mode === 'favicon' && f.type === 'url') return f.logo.fav || '';
    return '';
  }

  /** QR module grid plus the cleared logo square, or null when the data doesn't fit. */
  const qrCache = new Map();
  function qrModules(text, f) {
    const logo = logoHref(f);
    const ecc = logo ? 'H' : (f.ecc || 'M'), key = JSON.stringify([text, ecc]);
    let qr = qrCache.get(key);
    if (!qr) {
      try { qr = qrcode(0, ecc); qr.addData(text, 'Byte'); qr.make(); } catch { return null; }
      if (qrCache.size >= 24) qrCache.delete(qrCache.keys().next().value);
      qrCache.set(key, qr);
    }
    const n = qr.getModuleCount();
    // Cleared square in the middle for the logo, aligned to whole modules.
    let lo = 0, hi = -1;
    if (logo) {
      let w = Math.round(n * LOGO_FRACTION);
      if ((n - w) % 2) w++;
      lo = (n - w) / 2; hi = lo + w - 1;
    }
    const inLogo = (r, c) => r >= lo && r <= hi && c >= lo && c <= hi;
    return { n, logo, lo, w: hi - lo + 1, dark: (r, c) => !inLogo(r, c) && qr.isDark(r, c) };
  }

  const qrPath = (q, m) => {
    let d = '';
    for (let r = 0; r < q.n; r++) for (let c = 0; c < q.n; c++) if (q.dark(r, c)) d += `M${c + m},${r + m}h1v1h-1z`;
    return d;
  };

  /** Returns an SVG string (dark-on-light, for scanning), or null when the data doesn't fit. */
  function qrSvg(text, f) {
    const q = qrModules(text, f);
    if (!q) return null;
    const { scanFg: fg, scanBg: bg } = cardColors(f);
    const m = 4, size = q.n + m * 2;   // explicit quiet zone in the exported SVG
    let logoEl = '';
    if (q.logo) {
      const x = q.lo + m, pad = 0.4;
      logoEl = `<rect x="${x}" y="${x}" width="${q.w}" height="${q.w}" rx="${q.w * 0.18}" fill="${esc(bg)}"/>` +
        `<image href="${esc(q.logo)}" x="${x + pad}" y="${x + pad}" width="${q.w - pad * 2}" height="${q.w - pad * 2}" preserveAspectRatio="xMidYMid meet"/>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="QR code">` +
      `<rect width="${size}" height="${size}" fill="${esc(bg)}"/><path d="${qrPath(q, m)}" fill="${esc(fg)}"/>${logoEl}</svg>`;
  }

  /** The code as printed on a card: ink only, straight onto the card's surface. */
  function qrCardSvg(text, f) {
    const q = qrModules(text, f);
    if (!q) return null;
    const pad = 0.4;
    const logoEl = q.logo ? `<image href="${esc(q.logo)}" x="${q.lo + pad}" y="${q.lo + pad}" width="${q.w - pad * 2}" height="${q.w - pad * 2}" preserveAspectRatio="xMidYMid meet"/>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${q.n} ${q.n}" shape-rendering="crispEdges" aria-hidden="true">` +
      `<path d="${qrPath(q, 0)}" fill="${esc(cardColors(f).ink)}"/>${logoEl}</svg>`;
  }

  // A public image relay that adds CORS, so a site icon can be embedded for offline use.
  const RELAY = 'https://images.weserv.nl/';
  const corsRelay = src => `${RELAY}?url=${encodeURIComponent(src)}&output=png`;

  /* ================================================================
   * The stack: one element per card, laid out like a wallet
   * ================================================================ */
  const stage = $('#stage'), stack = $('#stack'), actions = $('#actions'), emptyEl = $('#empty'), hint = $('#hint');
  const els = new Map();   // card id → element
  let selected = null;     // id of the card pulled out of the stack, if any
  let drag = null;         // reorder in progress: {id, y, target, off, raf}
  let M = { pad: 8, peek: 60, h: 0 };   // current layout metrics

  const cardTitle = f => f.label || TYPES[f.type].name;
  // A few shared grain patterns, picked per card, so wood grain and veins vary.
  const seedOf = id => 1 + [...String(id)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7) % 6;

  const CARD_HTML = '<canvas class="card-tex"></canvas><div class="card-head"><span class="card-title"></span><span class="card-type"></span></div><div class="card-qr"></div>';

  /** Paint a card element (in the stack, or the editor's preview) from its data. */
  function fillCard(el, f) {
    const tex = `${f.material}|${f.color}|${seedOf(f.id)}`;
    if (el.dataset.tex !== tex) {
      el.dataset.tex = tex;
      const c = paintSurface(f.material, f.color, seedOf(f.id));
      c.className = 'card-tex';
      $('.card-tex', el).replaceWith(c);
    }
    el.dataset.material = f.material;
    el.style.setProperty('--ink', cardColors(f).ink);
    $('.card-title', el).textContent = cardTitle(f);
    $('.card-type', el).textContent = f.label ? TYPES[f.type].name : '';
    const text = encodeFace(f), svg = text ? qrCardSvg(text, f) : null;
    $('.card-qr', el).innerHTML = svg || `<span class="card-msg">${text ? 'Too much data. Remove some fields or the logo.' : 'No details yet'}</span>`;
  }

  // Keep the DOM in stack order (for tabbing), once the cards have settled.
  const syncDomOrder = debounce(() => {
    if (drag) return syncDomOrder();
    const want = state.cards.map(c => els.get(c.id)), have = $$('.card', stack);
    if (want.some((el, i) => el !== have[i])) {
      const focused = document.activeElement;
      stack.append(...want);
      if (focused?.isConnected && stack.contains(focused)) focused.focus({ preventScroll: true });
    }
  }, 600);

  function renderCards() {
    const ids = new Set(state.cards.map(c => c.id)), n = state.cards.length;
    for (const [id, el] of els) if (!ids.has(id)) { el.remove(); els.delete(id); }
    if (selected && !ids.has(selected)) selected = null;
    state.cards.forEach((f, i) => {
      let el = els.get(f.id);
      if (!el) {
        el = Object.assign(document.createElement('div'), { className: 'card', innerHTML: CARD_HTML, tabIndex: 0 });
        el.dataset.id = f.id;
        el.setAttribute('role', 'button');
        els.set(f.id, el);
        stack.append(el);
      }
      fillCard(el, f);
      el.setAttribute('aria-label', `${cardTitle(f)} — card ${i + 1} of ${n}`);
    });
    emptyEl.hidden = n > 0;
    hint.hidden = n === 0;
    syncDomOrder();
    syncActions();
    layout();
  }

  function syncActions() {
    const i = cardIndex(selected), n = state.cards.length, on = i >= 0;
    stage.classList.toggle('presenting', on);
    for (const [id, el] of els) el.classList.toggle('selected', id === selected);
    actions.inert = !on;
    if (!on) return;
    $('[data-act="full"]', actions).disabled = !encodeFace(state.cards[i]);
    $('[data-act="back"]', actions).disabled = i === 0;
    $('[data-act="forward"]', actions).disabled = i === n - 1;
    $('#cardPos').textContent = `Card ${i + 1} of ${n}`;
  }

  /** Position every card: a fanned stack, or one card pulled out with the rest tucked below. */
  function layout() {
    const availH = stage.clientHeight, availW = stage.clientWidth;
    if (!availH || !availW) return;
    const w = Math.round(Math.max(150, Math.min(availW - 32, MAX_CARD_W, (availH - 170) / CARD_RATIO)));
    const h = Math.round(w * CARD_RATIO), n = state.cards.length, pad = 8;
    // Each card shows its title strip; the strips tighten up before the stack has to scroll.
    const peek = n > 1 ? Math.min(84, Math.max(48, (availH - h - pad * 2 - 44) / (n - 1))) : 0;
    M = { pad, peek, h };
    stage.style.setProperty('--cw', w + 'px');
    let ids = state.cards.map(c => c.id);
    if (drag) { ids = ids.filter(id => id !== drag.id); ids.splice(drag.target, 0, drag.id); }
    const presenting = !!selected;
    let tucked = 0;
    ids.forEach((id, i) => {
      const el = els.get(id);
      if (!el) return;
      const y = presenting ? (id === selected ? pad : availH - 64 + Math.min(tucked++, 4) * 12)
        : drag && id === drag.id ? drag.y : pad + i * peek;
      el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
      // A card being moved sits at its new depth, between its neighbours.
      el.style.zIndex = presenting && id === selected ? n + 1 : i + 1;
    });
    stack.style.height = (presenting ? availH : n ? pad * 2 + (n - 1) * peek + h : 0) + 'px';
    actions.style.top = pad + h + 14 + 'px';
  }
  new ResizeObserver(layout).observe(stage);

  /** Pull a card out of the stack (or, with no id, put it back). */
  function present(id) {
    const next = id && cardById(id) ? id : null;
    if (next === selected) return;
    selected = next;
    if (selected) stage.scrollTop = 0;
    syncActions();
    layout();
  }

  /** A tap (or Enter) on a card. In the stack it pulls the card out; on the card that
   *  is out it shows the code full screen; anywhere else puts the card back. */
  function activate(id) {
    if (!selected) { if (id) present(id); return; }
    if (id !== selected) return present(null);
    const f = cardById(id);
    if (encodeFace(f)) openFull(f); else openEditor(id);
  }

  function moveCard(id, to) {
    const from = cardIndex(id);
    to = Math.min(state.cards.length - 1, Math.max(0, to));
    if (from < 0 || from === to) return false;
    const prev = state.cards.slice();
    state.cards.splice(to, 0, ...state.cards.splice(from, 1));
    if (!save()) { state.cards = prev; return false; }
    state.cards.forEach((f, i) => els.get(f.id)?.setAttribute('aria-label', `${cardTitle(f)} — card ${i + 1} of ${state.cards.length}`));
    syncDomOrder();
    return true;
  }

  actions.addEventListener('click', e => {
    const act = e.target.closest('[data-act]')?.dataset.act, f = cardById(selected);
    if (!act || !f) return;
    if (act === 'full') openFull(f);
    if (act === 'edit') openEditor(f.id);
    if (act === 'done') { present(null); els.get(f.id)?.focus({ preventScroll: true }); }
    if (act === 'back' || act === 'forward') {
      moveCard(f.id, cardIndex(f.id) + (act === 'back' ? -1 : 1));
      syncActions(); layout();
      // The pressed button may have just been disabled; keep focus in the row.
      if (e.target.closest('button').disabled) $(`[data-act="${act === 'back' ? 'forward' : 'back'}"]`, actions).focus();
    }
  });
  const addCard = () => { if (state.cards.length >= 60) alert('That is the most cards the stack can hold.'); else openEditor(null); };
  $('#addBtn').addEventListener('click', addCard);
  emptyEl.addEventListener('click', addCard);

  /* ================================================================
   * Gestures: tap (open) / hold then drag (reorder) / scroll
   * ================================================================ */
  let g = null;               // current press: {pid, id, el, x0, y0, y, mode: 'pending' | 'scroll' | 'drag'}
  let suppressClick = false;  // the press that just ended was a scroll or a reorder, not a tap
  let lastPointerType = 'mouse';
  const cardAt = e => { const el = e.target.closest?.('.card'); return el && stack.contains(el) ? el : null; };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  stage.addEventListener('pointerdown', e => {
    lastPointerType = e.pointerType;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    resetGesture();
    suppressClick = false;
    const el = cardAt(e);
    if (!e.isPrimary || !el || selected) return;
    g = { pid: e.pointerId, id: el.dataset.id, el, x0: e.clientX, y0: e.clientY, y: e.clientY, mode: 'pending',
          tol: MOVE_TOL[e.pointerType] ?? MOVE_TOL.touch };
    g.hold = setTimeout(startDrag, HOLD_MS);
  });

  function startDrag() {
    const i = g ? cardIndex(g.id) : -1;
    if (!g || g.mode !== 'pending' || i < 0 || state.cards.length < 2) return;
    g.mode = 'drag';
    try { stage.setPointerCapture(g.pid); } catch { /* pointer already gone */ }
    const base = M.pad + i * M.peek;
    drag = { id: g.id, target: i, y: base, off: base - (g.y + stage.scrollTop), raf: 0 };
    g.el.classList.add('lifted');
    stage.classList.add('reordering');
    navigator.vibrate?.(12);
    layout();
  }

  /** Follow the pointer and work out which slot the card is over. */
  function placeDrag() {
    drag.y = g.y + stage.scrollTop + drag.off;
    drag.target = clamp(Math.round((drag.y - M.pad) / (M.peek || 1)), 0, state.cards.length - 1);
    layout();
  }
  // Holding a card near the top or bottom edge scrolls a long stack.
  function autoScroll() {
    if (drag.raf) return;
    const step = () => {
      if (!drag) return;
      drag.raf = 0;
      if (!g) return;
      const r = stage.getBoundingClientRect(), edge = 70;
      const v = g.y < r.top + edge ? g.y - (r.top + edge) : g.y > r.bottom - edge ? g.y - (r.bottom - edge) : 0;
      const before = stage.scrollTop;
      if (v) stage.scrollTop += v * 0.25;
      if (stage.scrollTop === before) return;
      placeDrag();
      drag.raf = requestAnimationFrame(step);
    };
    drag.raf = requestAnimationFrame(step);
  }

  stage.addEventListener('pointermove', e => {
    if (!g || e.pointerId !== g.pid) return;
    g.y = e.clientY;
    if (g.mode === 'pending' && Math.hypot(e.clientX - g.x0, e.clientY - g.y0) > g.tol) { clearTimeout(g.hold); g.mode = 'scroll'; }
    if (g.mode === 'drag') { placeDrag(); autoScroll(); }
  });
  // Once a card has been picked up, the finger moves the card, not the page.
  stage.addEventListener('touchmove', e => { if (drag && e.cancelable) e.preventDefault(); }, { passive: false });

  function finishDrag(commit) {
    const d = drag;
    if (!d) return;
    drag = null;
    cancelAnimationFrame(d.raf);
    stage.classList.remove('reordering');
    els.get(d.id)?.classList.remove('lifted');
    if (commit) moveCard(d.id, d.target);
    layout();
  }
  function endGesture(e, cancelled) {
    if (!g || e.pointerId !== g.pid) return;
    clearTimeout(g.hold);
    const was = g;
    g = null;
    if (was.mode === 'drag') finishDrag(true);
    if (was.mode !== 'pending' || cancelled) suppressClick = true;
  }
  // Forget any half-finished press. Called whenever an overlay closes, and when the
  // page loses focus: a card must never stay stuck to a finger that has gone.
  function resetGesture() {
    if (!g) return;
    clearTimeout(g.hold);
    g = null;
    finishDrag(false);
  }
  addEventListener('blur', resetGesture);
  document.addEventListener('visibilitychange', resetGesture);
  stage.addEventListener('pointerup', e => endGesture(e, false));
  stage.addEventListener('pointercancel', e => endGesture(e, true));

  stage.addEventListener('click', e => {
    if (suppressClick) { suppressClick = false; return; }
    if (e.target.closest('.actions, .empty')) return;
    activate(cardAt(e)?.dataset.id);
  });
  stage.addEventListener('contextmenu', e => {
    e.preventDefault();
    // Desktop shortcut: right-click a card to edit it. Touch long-presses also
    // fire contextmenu on Android; those belong to the hold gesture above.
    if (lastPointerType !== 'mouse') return;
    const el = cardAt(e);
    if (el) openEditor(el.dataset.id);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && cpInput) return closePicker(false);
    if (e.key === 'Escape' && scanner.classList.contains('open')) return closeScanner();
    if (e.key === 'Escape') {
      if (isOpen()) { closeFull(); closeEditor(); closeLook(); closeInstall(); closeMenu(); }
      else if (drag) resetGesture();
      else present(null);
      return;
    }
    const el = e.target.closest?.('.card');
    if (!el || !stack.contains(el) || isOpen()) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(el.dataset.id); }
    const step = { ArrowUp: -1, ArrowDown: 1 }[e.key];
    if (step && !selected) {
      e.preventDefault();
      els.get(state.cards[cardIndex(el.dataset.id) + step]?.id)?.focus();
    }
  });

  /** Apply the backdrop, with header and hint text that stay readable on it. */
  function applyLook() {
    const { backdrop } = state.look;
    const light = luminance(backdrop) > 0.35;
    const root = document.documentElement.style;
    root.setProperty('--backdrop', backdrop);
    root.setProperty('--chrome', light ? '#1b1c1f' : '#ececee');
    root.setProperty('--chrome-muted', light ? 'rgba(0,0,0,.55)' : '#8b8d94');
    $('meta[name="theme-color"]').content = backdrop;
  }

  /* ================================================================
   * Full-screen view: just the code, like a sticker, for scanning
   * ================================================================ */
  const full = $('#full');
  let wakeLock = null, prevBrightness = null, fullArmed = false, fullSession = 0;
  const brightnessPlugin = () => window.Capacitor?.Plugins?.ScreenBrightness;

  async function openFull(f) {
    const text = f ? encodeFace(f) : '';
    const svg = text ? qrSvg(text, f) : null;
    if (!svg) return;
    $('#fullQr').innerHTML = svg;
    full.style.background = cardColors(f).scanBg;
    full.classList.add('open');
    full.setAttribute('aria-hidden', 'false');
    fullArmed = false;
    // Each await below can finish after the view was closed; undo anything acquired late.
    const s = ++fullSession, closed = () => s !== fullSession;
    try { await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); } catch { /* not allowed / unsupported (iPhone) */ }
    if (closed()) { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); return; }
    try {
      const lock = await navigator.wakeLock?.request('screen');
      if (closed()) { lock?.release?.().catch(() => {}); return; }
      wakeLock = lock;
    } catch { /* ignore */ }
    const bp = brightnessPlugin();
    if (bp) {
      try {
        const before = (await bp.getBrightness()).brightness;
        if (closed()) return;
        prevBrightness = before;
        await bp.setBrightness({ brightness: 1 });
        if (closed()) await bp.setBrightness({ brightness: before });
      } catch { /* ignore */ }
    }
  }

  async function closeFull() {
    if (!full.classList.contains('open')) return;
    full.classList.remove('open');
    full.setAttribute('aria-hidden', 'true');
    fullSession++;
    resetGesture();
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    wakeLock?.release?.().catch(() => {});
    wakeLock = null;
    const bp = brightnessPlugin();
    if (bp && prevBrightness != null) {
      // -1 restores the system-controlled brightness on Android.
      try { await bp.setBrightness({ brightness: prevBrightness }); } catch { /* ignore */ }
      prevBrightness = null;
    }
  }
  // Only a tap that starts on the overlay closes it.
  $('#fullClose').addEventListener('click', closeFull);
  full.addEventListener('pointerdown', () => { fullArmed = true; });
  full.addEventListener('click', () => { if (fullArmed) closeFull(); });
  full.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) closeFull(); });

  /* ================================================================
   * Logos: uploaded files & website favicons
   * ================================================================ */
  function readLogoFile(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(r.error);
      r.onload = () => {
        const url = r.result;
        if (/svg/i.test(file.type) || /\.svg$/i.test(file.name)) return resolve(url);
        // Rasterise (also converts .ico) and cap the size to keep storage small.
        const img = new Image();
        img.onload = () => {
          const s = Math.min(512, Math.max(img.naturalWidth, img.naturalHeight) || 512);
          const k = s / Math.max(img.naturalWidth, img.naturalHeight);
          const c = document.createElement('canvas');
          c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error('Unsupported image'));
        img.src = url;
      };
      r.readAsDataURL(file);
    });
  }

  function probeImage(src, ms = 5000) {
    return new Promise(res => {
      const img = new Image();
      const t = setTimeout(() => { img.src = ''; res(null); }, ms);
      img.onload = () => { clearTimeout(t); res(img.naturalWidth > 1 ? img : null); };
      img.onerror = () => { clearTimeout(t); res(null); };
      img.src = src;
    });
  }

  /** Try to embed a remote icon as a data URL (works offline later). Needs CORS; most
   *  sites don't send it, so the icon is then fetched through a public image relay that
   *  does (an embedded icon also works offline). */
  async function embedIcon(src) {
    return (await toDataUrl(src)) || (src.startsWith(RELAY) ? null : await toDataUrl(corsRelay(src)));
  }
  async function toDataUrl(src) {
    return new Promise(resolve => {
      const img = new Image();
      const timer = setTimeout(() => { img.src = ''; resolve(null); }, 5000);
      const res = value => { clearTimeout(timer); resolve(value); };
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const scale = Math.min(1, 256 / Math.max(img.naturalWidth, img.naturalHeight));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.naturalWidth * scale)); c.height = Math.max(1, Math.round(img.naturalHeight * scale));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL('image/png'));
        } catch { res(null); }
      };
      img.onerror = () => res(null);
      img.src = src;
    });
  }

  /** Read <link rel=icon> from the page itself. Only works if the site allows CORS
   *  (or in the native app, where CapacitorHttp bypasses CORS). */
  async function iconsFromHtml(pageUrl) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 5000);
    try {
      const html = await (await fetch(pageUrl, { signal: ctl.signal })).text();
      clearTimeout(t);
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const base = new URL(doc.querySelector('base[href]')?.getAttribute('href') || pageUrl, pageUrl);
      return $$('link[rel~="icon"], link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"], link[rel="mask-icon"]', doc)
        .map(l => ({ href: new URL(l.getAttribute('href'), base).href, size: parseInt(l.getAttribute('sizes')) || (/apple/.test(l.rel) ? 180 : /svg/.test(l.type || l.getAttribute('href')) ? 512 : 32) }))
        .sort((a, b) => b.size - a.size)
        .map(x => x.href);
    } catch { return []; } finally { clearTimeout(t); }
  }

  /** Website first, Google's favicon service as fallback. → {href, from} | null */
  async function resolveFavicon(rawUrl) {
    let u;
    try { u = new URL(normUrl(rawUrl)); } catch { return null; }
    if (!/^https?:$/.test(u.protocol)) return null;
    const direct = [...await iconsFromHtml(u.href), `${u.origin}/apple-touch-icon.png`, `${u.origin}/favicon.ico`];
    for (const src of [...new Set(direct)]) {
      if (await probeImage(src)) return { href: (await embedIcon(src)) || src, from: 'site' };
    }
    const g = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(u.hostname)}&sz=128`;
    if (await probeImage(g)) return { href: (await embedIcon(g)) || g, from: 'google' };
    return null;
  }

  // Keep site icons current: refresh them in the background on launch.
  async function refreshFavicons() {
    if (!navigator.onLine) return;
    for (const f of state.cards.slice()) {
      if (f.type !== 'url' || f.logo?.mode !== 'favicon' || !f.data.url) continue;
      const r = await resolveFavicon(f.data.url);
      if (r && r.href !== f.logo.fav) { f.logo.fav = r.href; f.logo.favFor = f.data.url; save(true); renderCards(); }
    }
  }

  /* ================================================================
   * Editor sheet
   * ================================================================ */
  const sheet = $('#sheet');
  const backdrop = $('#sheetBackdrop');
  const typeSelect = $('#typeSelect');
  const typeFields = $('#typeFields');
  const preview = $('#preview');
  const favStatus = $('#favStatus');
  const eccSel = sheet.elements.ecc;
  let editing = null, draft = null, dataCache = {};   // editing: the card's id, or null for a new card
  let session = 0;   // bumped when the editor opens or closes; late async results check it

  typeSelect.innerHTML = Object.entries(TYPES).map(([k, t]) => `<option value="${k}">${t.name}</option>`).join('');

  const isOpen = () => $$('.sheet.open, .full.open, .scanner.open, .cp.open, .menu.open').length > 0;

  // Day / month / optional year fields. Stored as "YYYY-MM-DD" or "--MM-DD".
  const MONTHS = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(undefined, { month: 'short' }).format(new Date(2000, i, 1)));
  const pad2 = n => String(n).padStart(2, '0');
  function splitDate(v) {
    const m = /^(\d{4}|-)-(\d{2})-(\d{2})$/.exec(v || '');
    return m ? [m[1] === '-' ? '' : m[1], +m[2], +m[3]] : ['', 0, ''];
  }
  /** Compose the stored date from the three controls; '' (and a red outline) if incomplete or impossible. */
  function readDate(box) {
    const part = p => $(`[data-part="${p}"]`, box);
    const d = parseInt(part('d').value, 10), m = parseInt(part('m').value, 10), yStr = part('y').value.trim();
    const blank = !part('d').value.trim() && !m && !yStr;
    const yearOk = !yStr || /^\d{4}$/.test(yStr);
    // Without a year, allow 29 February.
    const ok = d >= 1 && m >= 1 && yearOk && d <= new Date(yStr ? +yStr : 2000, m, 0).getDate();
    box.toggleAttribute('data-invalid', !blank && !ok);
    return ok ? `${yStr || '-'}-${pad2(m)}-${pad2(d)}` : '';
  }

  function fieldHtml(f, val) {
    const id = `f${Math.random().toString(36).slice(2, 8)}`;
    const ph = f.ph ? ` placeholder="${esc(f.ph)}"` : '';
    const v = esc(val ?? '');
    let input;
    switch (f.type) {
      case 'textarea': input = `<textarea id="${id}" data-k="${f.k}"${ph}>${v}</textarea>`; break;
      case 'select': input = `<select id="${id}" data-k="${f.k}">${f.opts.map(([o, l]) => `<option value="${o}"${o === val ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`; break;
      case 'checkbox':
        return `<label class="field check"><input type="checkbox" data-k="${f.k}"${val ? ' checked' : ''}><span>${esc(f.label)}</span></label>`;
      case 'dmy': {   // typed day, month list, optional typed year
        const [y, m, d] = splitDate(val);
        const L = esc(f.label);
        return `<div class="field"><span>${L}</span><div class="dmy" data-k="${f.k}" data-dmy>` +
          `<input type="text" inputmode="numeric" maxlength="2" placeholder="Day" aria-label="${L} day" data-part="d" value="${d}">` +
          `<select aria-label="${L} month" data-part="m"><option value="">Month</option>` +
          MONTHS.map((n, i) => `<option value="${i + 1}"${m === i + 1 ? ' selected' : ''}>${n}</option>`).join('') + '</select>' +
          `<input type="text" inputmode="numeric" maxlength="4" placeholder="Year (optional)" aria-label="${L} year" data-part="y" value="${y}">` +
          '</div></div>';
      }
      default: {
        const t = f.type || 'text';
        const extra = t === 'number' ? ' step="any" inputmode="decimal"' : t === 'url' ? ' autocapitalize="off" spellcheck="false"' : t === 'email' ? ' autocapitalize="off"' : '';
        input = `<input id="${id}" type="${t}" data-k="${f.k}" value="${v}"${ph}${extra}>`;
      }
    }
    return `<label class="field" for="${id}"><span>${esc(f.label)}</span>${input}</label>`;
  }

  function fieldsHtml(spec, data) {
    return spec.map(f => {
      if (f.row) return `<div class="row">${fieldsHtml(f.row, data)}</div>`;
      if (f.group) {
        const items = data[f.group]?.length ? data[f.group] : Array.from({ length: f.start || 0 }, () => ({}));
        return `<fieldset class="group"><legend>${esc(f.label)}</legend>
          <div class="rep-list" data-group="${f.group}">${items.map(it => repItemHtml(f, it)).join('')}</div>
          <button type="button" class="small-btn" data-add="${f.group}">+ ${esc(f.add)}</button></fieldset>`;
      }
      return fieldHtml(f, data[f.k]);
    }).join('');
  }
  const repItemHtml = (f, it) => `<div class="rep-item">${fieldsHtml(f.fields, it)}<button type="button" class="rep-del" aria-label="Remove">×</button></div>`;

  /** Read values for `spec` from inputs that belong to `scope` (not to nested groups). */
  function collect(spec, scope) {
    const out = {};
    const own = el => el.closest('.rep-item') === (scope.classList.contains('rep-item') ? scope : null);
    const inputs = $$('[data-k]', scope).filter(own);
    const walk = list => list.forEach(f => {
      if (f.row) return walk(f.row);
      if (f.group) {
        const list = $(`[data-group="${f.group}"]`, scope);
        out[f.group] = list ? [...list.children].map(item => collect(f.fields, item)) : [];
        return;
      }
      const el = inputs.find(x => x.dataset.k === f.k);
      if (el) out[f.k] = 'dmy' in el.dataset ? readDate(el) : el.type === 'checkbox' ? el.checked : ['pass', 'ssid', 'text', 'body', 'message', 'note', 'desc'].includes(f.k) ? el.value : el.value.trim();
    });
    walk(spec);
    return out;
  }

  function renderTypeFields() {
    const t = TYPES[draft.type];
    sheet.dataset.type = draft.type;
    typeFields.innerHTML = fieldsHtml(t.fields, dataCache[draft.type] || {});
  }

  function readForm() {
    const el = sheet.elements;
    // Collect the fields on screen under the type they were drawn for. (When the type
    // has just been changed, the select already shows the new one.)
    const shown = sheet.dataset.type;
    if (Object.hasOwn(TYPES, shown)) dataCache[shown] = collect(TYPES[shown].fields, typeFields);
    draft.type = typeSelect.value;
    draft.data = dataCache[draft.type] || {};
    draft.label = el.label.value.trim();
    draft.logo.mode = el.logoMode.value;
    draft.inkMode = el.inkMode.value;
    draft.fg = el.fg.value;
    if (!eccSel.disabled) draft.ecc = eccSel.value;
    draft.material = Object.hasOwn(MATERIALS, el.material.value) ? el.material.value : draft.material;
    draft.color = el.color.value.toLowerCase();
  }

  function updatePreview() {
    if (!draft) return;   // a debounced update can fire after the editor closed
    readForm();
    const hasLogo = !!logoHref(draft);
    eccSel.disabled = hasLogo;
    eccSel.value = hasLogo ? 'H' : draft.ecc;
    fillCard(preview, draft);
    maybeFetchFavicon();
  }
  const updatePreviewSoon = debounce(updatePreview, 120);

  let favSeq = 0, uploadSeq = 0;
  const favAttempts = new Map();
  const maybeFetchFavicon = debounce(async (force) => {
    if (draft?.type !== 'url' || draft.logo.mode !== 'favicon') return;
    const url = draft.data.url;
    if (!url) { favStatus.textContent = 'Enter a web address first.'; return; }
    if (!force && ((draft.logo.favFor === url && draft.logo.fav) || Date.now() - (favAttempts.get(url) || 0) < 60000)) return;
    favAttempts.set(url, Date.now());
    if (favAttempts.size > 32) favAttempts.delete(favAttempts.keys().next().value);
    const seq = ++favSeq, s = session;
    favStatus.textContent = 'Looking for the site icon…';
    const r = await resolveFavicon(url);
    if (seq !== favSeq || s !== session || !draft || draft.type !== 'url' || draft.logo.mode !== 'favicon' || draft.data.url !== url) return;
    draft.logo.favFor = url;
    draft.logo.fav = r?.href || '';
    favStatus.textContent = !r ? 'No icon found for this site.'
      : r.from === 'site' ? 'Using the icon from the website.'
      : 'The site blocked direct access, so Google’s favicon service was used.';
    updatePreview();
  }, 600);

  /** Edit the card with this id, or (with no id) start a new card. */
  function openEditor(id) {
    updatePreviewSoon.cancel(); maybeFetchFavicon.cancel(); commitAdjust.cancel();
    closeMenu();
    session++;
    const existing = cardById(id);
    editing = existing ? existing.id : null;
    draft = clone(existing || defaultCard());
    draft.logo = { ...defaultCard().logo, ...draft.logo };
    $('#sheetTitle').textContent = existing ? 'Edit card' : 'New card';
    dataCache = { [draft.type]: draft.data };
    const el = sheet.elements;
    typeSelect.value = draft.type;
    el.label.value = draft.label || '';
    draft.inkMode = draft.inkMode === 'custom' ? 'custom' : 'auto';
    el.inkMode.value = draft.inkMode;
    // A custom colour starts from the automatic one.
    el.fg.value = draft.inkMode === 'custom' ? draft.fg : cardColors(draft).ink;
    el.material.value = draft.material;
    el.color.value = draft.color;
    eccSel.value = draft.ecc;
    $$('input[name="logoMode"]', sheet).forEach(r => { r.checked = r.value === draft.logo.mode; });
    $('#logoFile').value = '';
    loadAdjust();
    favStatus.textContent = draft.logo.fav ? 'Using the saved site icon.' : 'The icon is fetched from the website. If the site blocks this, Google’s favicon service is used instead.';
    $('[data-act="clear"]', sheet).hidden = !existing;
    renderTypeFields();
    sheet.querySelector('.sheet-body').scrollTop = 0;
    updatePreview();
    sheet.classList.add('open');
    backdrop.classList.add('open');
  }

  function closeEditor() {
    if (!sheet.classList.contains('open')) return;
    closeScanner();
    sheet.classList.remove('open');
    backdrop.classList.remove('open');
    document.activeElement?.blur?.();
    // iOS can leave the page scrolled after its keyboard closes; put it back.
    scrollTo(0, 0);
    resetGesture();
    session++; favSeq++; uploadSeq++;
    updatePreviewSoon.cancel(); maybeFetchFavicon.cancel(); commitAdjust.cancel();
    adjPts.clear(); adjImg = null;
    editing = null; draft = null;
  }

  typeSelect.addEventListener('change', () => {
    readForm();
    draft.type = typeSelect.value;
    if (draft.type !== 'url' && draft.logo.mode === 'favicon') {
      draft.logo.mode = 'none';
      sheet.elements.logoMode.value = 'none';
    }
    renderTypeFields();
    updatePreview();
  });

  sheet.addEventListener('input', e => { if (e.target !== typeSelect && e.target.id !== 'logoFile') updatePreviewSoon(); });
  sheet.addEventListener('change', e => {
    const { name, value } = e.target;
    // Switching texture also switches to its typical colour, unless you picked your own.
    if (name === 'material' && draft && Object.values(MATERIALS).some(m => m.color === draft.color)) sheet.elements.color.value = MATERIALS[value].color;
    if (['logoMode', 'inkMode', 'material', 'color'].includes(name)) updatePreview();
  });

  sheet.addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if (add) {
      readForm();
      const spec = TYPES[draft.type].fields.find(f => f.group === add.dataset.add);
      const list = $(`[data-group="${spec.group}"]`, typeFields);
      list.insertAdjacentHTML('beforeend', repItemHtml(spec, {}));
      list.lastElementChild.querySelector('input, select, textarea:not([data-k="type"])')?.focus();
      return;
    }
    if (e.target.closest('.rep-del')) {
      e.target.closest('.rep-item').remove();
      updatePreview();
      return;
    }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'cancel') closeEditor();
    if (act === 'clear' && confirm('Delete this card?')) {
      const previous = state.cards;
      state.cards = state.cards.filter(c => c.id !== editing);
      if (!save()) { state.cards = previous; return; }
      renderCards(); closeEditor();
    }
  });

  $('#favRefresh').addEventListener('click', () => { readForm(); maybeFetchFavicon(true); });

  $('#logoFile').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024 || (/svg/i.test(file.type) && file.size > 512 * 1024)) { alert('Please choose a smaller image (up to 10 MB, or 512 KB for SVG).'); return; }
    const s = session, operation = ++uploadSeq;
    try {
      const orig = await readLogoFile(file);
      if (s !== session || operation !== uploadSeq || !draft) return;   // the editor closed or moved to another card
      draft.logo.orig = orig;
      draft.logo.fit = { ...LOGO_FIT0 };
      draft.logo.src = draft.logo.orig;
      loadAdjust();
      updatePreview();
    } catch {
      if (s !== session || operation !== uploadSeq || !draft) return;
      alert('That image could not be read. Please use an SVG, PNG, JPG or ICO file.');
    }
  });

  /* ---- Logo adjuster: position (drag), size, fit / fill, shape, background ---- */
  const LOGO_FIT0 = { fit: 'contain', zoom: 1, x: 0, y: 0, shape: 'square', bg: 'none' };
  const adjust = $('#logoAdjust'), adjCanvas = $('#logoCanvas'), adjZoom = $('#logoZoom');
  let adjImg = null;

  function drawLogo(ctx, img, S, f) {
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath();
    if (f.shape === 'circle') ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
    else if (f.shape === 'rounded' && ctx.roundRect) ctx.roundRect(0, 0, S, S, S * 0.22);
    else ctx.rect(0, 0, S, S);
    ctx.clip();
    if (f.bg === 'white') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, S, S); }
    const w = img.naturalWidth || S, h = img.naturalHeight || S;
    const k = (f.fit === 'cover' ? Math.max : Math.min)(S / w, S / h) * f.zoom;
    ctx.drawImage(img, S / 2 - w * k / 2 + f.x * S, S / 2 - h * k / 2 + f.y * S, w * k, h * k);
    ctx.restore();
  }

  /** Show the adjuster for the draft's uploaded picture (older saves have only `src`). */
  function loadAdjust() {
    const L = draft?.logo;
    adjImg = null;
    adjust.hidden = !(L && (L.orig || L.src));
    if (adjust.hidden) return;
    L.orig ||= L.src;
    L.fit = { ...LOGO_FIT0, ...L.fit };
    syncAdjustControls();
    const img = new Image();
    img.onload = () => { if (draft?.logo === L) { adjImg = img; drawAdjust(); } };
    img.src = L.orig;
  }
  function syncAdjustControls() {
    const f = draft.logo.fit, el = sheet.elements;
    adjZoom.value = f.zoom;
    el.logoFit.value = f.fit; el.logoShape.value = f.shape; el.logoBg.value = f.bg;
  }
  function drawAdjust() {
    if (adjImg) drawLogo(adjCanvas.getContext('2d'), adjImg, adjCanvas.width, draft.logo.fit);
  }
  // The edited picture becomes the logo; untouched, the original (crisp SVG) is kept.
  /** Make the adjusted picture the logo. Called (debounced) while adjusting, and directly by Save. */
  function flushAdjust() {
    if (!draft || !adjImg || draft.logo.mode !== 'file' || !draft.logo.fit) return;
    const f = draft.logo.fit;
    const plain = Object.keys(LOGO_FIT0).every(k => f[k] === LOGO_FIT0[k]);
    draft.logo.src = plain ? draft.logo.orig : adjCanvas.toDataURL('image/png');
  }
  const commitAdjust = debounce(() => { flushAdjust(); updatePreview(); }, 150);
  function changeFit(patch) {
    Object.assign(draft.logo.fit, patch);
    drawAdjust();
    commitAdjust();
  }

  adjust.addEventListener('input', e => {
    e.stopPropagation();   // the editor's own input handler isn't needed here
    const t = e.target;
    if (t === adjZoom) changeFit({ zoom: +adjZoom.value });
    else if (t.name === 'logoFit') changeFit({ fit: t.value, zoom: 1, x: 0, y: 0 });
    else if (t.name === 'logoShape') changeFit({ shape: t.value });
    else if (t.name === 'logoBg') changeFit({ bg: t.value });
    if (t.name === 'logoFit') syncAdjustControls();
  });
  $('#logoReset').addEventListener('click', () => { draft.logo.fit = { ...LOGO_FIT0 }; syncAdjustControls(); drawAdjust(); commitAdjust(); });

  // Drag to move; wheel or a two-finger pinch on the picture resizes it.
  const adjPts = new Map();
  let adjPinch = 0;
  adjCanvas.addEventListener('pointerdown', e => {
    adjPts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { adjCanvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    if (adjPts.size === 2) { const [a, b] = adjPts.values(); adjPinch = Math.hypot(a.x - b.x, a.y - b.y) || 1; }
  });
  adjCanvas.addEventListener('pointermove', e => {
    const p = adjPts.get(e.pointerId);
    if (!p || !draft) return;
    const f = draft.logo.fit;
    if (adjPts.size === 1) {
      const scale = adjCanvas.getBoundingClientRect().width;
      changeFit({ x: f.x + (e.clientX - p.x) / scale, y: f.y + (e.clientY - p.y) / scale });
    }
    p.x = e.clientX; p.y = e.clientY;
    if (adjPts.size === 2) {
      const [a, b] = adjPts.values(), d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      changeFit({ zoom: Math.min(4, Math.max(0.3, f.zoom * d / adjPinch)) });
      adjPinch = d; adjZoom.value = draft.logo.fit.zoom;
    }
  });
  const adjEnd = e => adjPts.delete(e.pointerId);
  adjCanvas.addEventListener('pointerup', adjEnd);
  adjCanvas.addEventListener('pointercancel', adjEnd);
  adjCanvas.addEventListener('wheel', e => {
    e.preventDefault();
    changeFit({ zoom: Math.min(4, Math.max(0.3, draft.logo.fit.zoom * Math.exp(-e.deltaY * 0.002))) });
    adjZoom.value = draft.logo.fit.zoom;
  }, { passive: false });

  sheet.addEventListener('submit', e => {
    e.preventDefault();
    if (!draft) return;
    commitAdjust.cancel();
    flushAdjust();   // a logo adjustment made just before Save must not be lost
    readForm();
    const text = encodeFace(draft);
    if (text && !qrModules(text, draft)) {
      alert('This is too much data for one QR code. Remove some fields (or the logo) and try again.');
      return;
    }
    if (!text && !confirm('This card has no QR data yet. Save it anyway?')) return;
    // Build the persisted card separately so a failed save leaves the draft intact.
    const next = clone(draft);
    if (next.logo.mode !== 'file') { next.logo.src = ''; delete next.logo.orig; delete next.logo.fit; }
    if (next.logo.mode !== 'favicon') { next.logo.fav = ''; next.logo.favFor = ''; }
    const prev = state.cards.slice(), at = cardIndex(editing);
    if (at >= 0) state.cards[at] = next; else state.cards.push(next);   // a new card goes to the front
    if (!save()) { state.cards = prev; return; }
    renderCards();
    closeEditor();
  });

  backdrop.addEventListener('click', () => { closeEditor(); closeLook(); closeInstall(); });

  /* ================================================================
   * Colour picker: colour area, hue and RGB sliders, hex entry, swatches.
   * Replaces the browser's own picker everywhere except iPhone / iPad,
   * whose native picker already has all of this.
   * ================================================================ */
  const NATIVE_PICKER = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const cp = $('#cp'), cpBackdrop = $('#cpBackdrop'), cpSv = $('#cpSv'), cpThumb = $('#cpThumb');
  const cpHue = $('#cpHue'), cpHex = $('#cpHex'), cpChip = $('#cpChip'), cpSwatches = $('#cpSwatches');
  const cpRgb = $$('.cp-rgb input[type=range]', cp), cpNum = $$('.cp-rgb input[type=number]', cp);
  const PRESETS = ['#000000', '#ffffff', '#1f2937', '#6b7280', '#d1d5db', '#7c2d12', '#b45309', '#f5e6c8',
                   '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1',
                   '#8b5cf6', '#ec4899', '#0f172a', '#14532d', '#1e3a8a', '#4c1d95', '#831843', '#c0c0c0'];
  const RECENT_KEY = 'qrcube.recentColours';
  let cpInput = null, cpStart = '', cpHsv = [0, 0, 0];

  const hexToRgb = h => hexRgb(h).map(v => v * 255);
  const rgbToHex = rgb => rgbHex(rgb.map(v => v / 255));
  function rgbToHsv([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
    const h = !d ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, max ? d / max : 0, max];
  }
  function hsvToRgb([h, s, v]) {
    const f = n => { const k = (n + h / 60) % 6; return (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255; };
    return [f(5), f(3), f(1)];
  }
  function normHex(v) {
    let h = String(v).trim().replace(/^#/, '');
    if (/^[\da-f]{3}$/i.test(h)) h = h.replace(/./g, c => c + c);
    return /^[\da-f]{6}$/i.test(h) ? '#' + h.toLowerCase() : null;
  }
  const recentColours = () => { try { const list = JSON.parse(localStorage.getItem(RECENT_KEY)); return Array.isArray(list) ? list.map(normHex).filter(Boolean).slice(0, 8) : []; } catch { return []; } };

  /** Show the colour everywhere in the picker and send it to the field (live). */
  function cpShow(hex, { skipHex = false, keepHsv = false } = {}) {
    const rgb = hexToRgb(hex);
    if (!keepHsv) {
      const hsv = rgbToHsv(rgb);
      // Keep the hue when the colour is grey/black, so the sliders don't jump.
      if (hsv[1] === 0 || hsv[2] === 0) hsv[0] = cpHsv[0];
      cpHsv = hsv;
    }
    const [h, s, v] = cpHsv;
    cpSv.style.setProperty('--h', h.toFixed(1));
    cpThumb.style.left = s * 100 + '%';
    cpThumb.style.top = (1 - v) * 100 + '%';
    cpThumb.style.background = hex;
    cpHue.value = Math.round(h);
    cpRgb.forEach((el, i) => {
      el.value = rgb[i];
      const lo = rgb.slice(), hi = rgb.slice(); lo[i] = 0; hi[i] = 255;
      el.style.setProperty('--track', `linear-gradient(to right, ${rgbToHex(lo)}, ${rgbToHex(hi)})`);
    });
    cpNum.forEach((el, i) => { if (document.activeElement !== el) el.value = rgb[i]; });
    if (!skipHex) { cpHex.value = hex.toUpperCase(); cpHex.removeAttribute('data-invalid'); }
    cpChip.style.background = hex;
    $$('button', cpSwatches).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.hex === hex)));
    if (cpInput && cpInput.value !== hex) {
      cpInput.value = hex;
      cpInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  const cpFromHsv = () => cpShow(rgbToHex(hsvToRgb(cpHsv)), { keepHsv: true });

  function openPicker(input) {
    cpInput = input;
    cpStart = normHex(input.value) || '#000000';
    const list = [...new Set([...recentColours(), ...PRESETS])].slice(0, 16);
    cpSwatches.innerHTML = list.map(h => `<button type="button" data-hex="${h}" style="background:${h}" aria-label="${h}"></button>`).join('');
    cpShow(cpStart);
    cp.classList.add('open'); cpBackdrop.classList.add('open');
    cp.setAttribute('aria-hidden', 'false');
  }
  function closePicker(keep) {
    if (!cpInput) return;
    const input = cpInput;
    if (!keep) cpShow(cpStart);
    cpInput = null;
    cp.classList.remove('open'); cpBackdrop.classList.remove('open');
    cp.setAttribute('aria-hidden', 'true');
    document.activeElement?.blur?.();
    if (keep && input.value !== cpStart) {
      input.dispatchEvent(new Event('change', { bubbles: true }));
      try { localStorage.setItem(RECENT_KEY, JSON.stringify([input.value, ...recentColours().filter(h => h !== input.value)].slice(0, 8))); } catch { /* storage off */ }
    }
  }

  if (!NATIVE_PICKER) {
    // Swap the browser's picker for this one on every colour field.
    document.addEventListener('click', e => {
      const input = e.target.closest?.('input[type=color]');
      if (!input) return;
      e.preventDefault();
      openPicker(input);
    }, true);
  }

  // Colour area: drag to set saturation (across) and brightness (up/down).
  let svDrag = false;
  const svAt = e => {
    const r = cpSv.getBoundingClientRect();
    cpHsv[1] = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    cpHsv[2] = 1 - Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    cpFromHsv();
  };
  cpSv.addEventListener('pointerdown', e => { svDrag = true; try { cpSv.setPointerCapture(e.pointerId); } catch { /* ignore */ } svAt(e); });
  cpSv.addEventListener('pointermove', e => { if (svDrag) svAt(e); });
  cpSv.addEventListener('pointerup', () => { svDrag = false; });
  cpSv.addEventListener('pointercancel', () => { svDrag = false; });

  cpHue.addEventListener('input', () => { cpHsv[0] = +cpHue.value; cpFromHsv(); });
  cpRgb.forEach((el, i) => el.addEventListener('input', () => {
    const rgb = cpRgb.map(x => +x.value); rgb[i] = +el.value; cpShow(rgbToHex(rgb));
  }));
  cpNum.forEach((el, i) => el.addEventListener('input', () => {
    const v = parseInt(el.value, 10);
    if (!(v >= 0 && v <= 255)) return;
    const rgb = cpRgb.map(x => +x.value); rgb[i] = v; cpShow(rgbToHex(rgb));
  }));
  cpHex.addEventListener('input', () => {
    const hex = normHex(cpHex.value);
    cpHex.toggleAttribute('data-invalid', !hex && cpHex.value.replace('#', '').length > 0);
    if (hex) cpShow(hex, { skipHex: true });
  });
  cpHex.addEventListener('blur', () => { if (cpInput) cpShow(cpInput.value); });
  cpHex.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); cpHex.blur(); } });
  cpSwatches.addEventListener('click', e => { const b = e.target.closest('[data-hex]'); if (b) cpShow(b.dataset.hex); });
  $('#cpDone').addEventListener('click', () => closePicker(true));
  $('#cpCancel').addEventListener('click', () => closePicker(false));
  cpBackdrop.addEventListener('click', () => closePicker(true));

  // Eyedropper where the browser has one (desktop Chrome / Edge).
  if ('EyeDropper' in window) {
    const eye = $('#cpEye');
    eye.hidden = false;
    eye.addEventListener('click', async () => {
      try { const { sRGBHex } = await new EyeDropper().open(); const hex = normHex(sRGBHex); if (hex) cpShow(hex); } catch { /* cancelled */ }
    });
  }

  /* ================================================================
   * Scan an existing QR code (camera or photo) into the editor
   * ================================================================ */
  const scanner = $('#scanner'), scanVideo = $('#scanVideo'), scanMsg = $('#scanMsg');
  const scanCanvas = document.createElement('canvas');
  let scanStream = null, scanTimer = 0, detector, jsqrReady = null;
  let scanSession = 0;   // bumped when the scanner opens or closes; late results from an older one are dropped

  // The bundled decoder (works everywhere) loads only when first needed.
  const loadJsQR = () => jsqrReady ||= new Promise((res, rej) => {
    if (window.jsQR) return res(window.jsQR);
    const s = Object.assign(document.createElement('script'), { src: 'vendor/jsQR.js' });
    s.onload = () => res(window.jsQR);
    s.onerror = () => { jsqrReady = null; rej(new Error('decoder')); };
    document.head.appendChild(s);
  });
  // The browser's built-in reader (Android Chrome), when there is one.
  async function builtInDetector() {
    if (detector !== undefined) return detector;
    detector = null;
    try {
      if ((await BarcodeDetector.getSupportedFormats()).includes('qr_code')) detector = new BarcodeDetector({ formats: ['qr_code'] });
    } catch { /* not supported */ }
    return detector;
  }

  /** Decoded text of a QR code in an image / video frame, or null. */
  async function decodeQr(source, w, h) {
    const det = await builtInDetector();
    if (det) {
      try { const r = await det.detect(source); if (r[0]?.rawValue) return r[0].rawValue; } catch { /* fall through */ }
    }
    const jsQR = await loadJsQR();
    const k = Math.min(1, 720 / Math.max(w, h));
    scanCanvas.width = Math.round(w * k); scanCanvas.height = Math.round(h * k);
    const ctx = scanCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, scanCanvas.width, scanCanvas.height);
    const px = ctx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
    // attemptBoth also reads light-on-dark codes (like the ones on a dark card).
    const r = jsQR(px.data, px.width, px.height, { inversionAttempts: 'attemptBoth' });
    if (!r) return null;
    try { return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(r.binaryData)); } catch { return r.data; }
  }

  async function openScanner() {
    const s = ++scanSession;
    scanner.classList.remove('found');
    scanner.classList.add('open');
    scanner.setAttribute('aria-hidden', 'false');
    scanMsg.textContent = 'Point the camera at a QR code';
    loadJsQR().catch(() => {});
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (s !== scanSession) return stream.getTracks().forEach(t => t.stop());   // closed (or reopened) meanwhile
      scanStream = stream;
      scanVideo.srcObject = stream;
      await scanVideo.play();
      if (s === scanSession) scanLoop(s);
    } catch {
      if (s !== scanSession) return;
      scanMsg.textContent = 'The camera isn’t available (or permission was refused). You can choose a photo of the code instead.';
    }
  }
  async function scanLoop(s) {
    if (s !== scanSession || !scanStream) return;
    if (scanVideo.readyState >= 2 && scanVideo.videoWidth) {
      const text = await decodeQr(scanVideo, scanVideo.videoWidth, scanVideo.videoHeight).catch(() => null);
      if (s !== scanSession || !scanStream) return;
      if (text) return scanned(text);
    }
    scanTimer = setTimeout(() => scanLoop(s), 100);
  }
  function stopCamera() {
    clearTimeout(scanTimer);
    scanStream?.getTracks().forEach(t => t.stop());
    scanStream = null;
    scanVideo.srcObject = null;
  }
  function closeScanner() {
    scanSession++;
    stopCamera();
    scanner.classList.remove('open');
    scanner.setAttribute('aria-hidden', 'true');
  }
  function scanned(text) {
    stopCamera();
    scanner.classList.add('found');
    navigator.vibrate?.(15);
    applyScanned(text);
    const s = scanSession;
    setTimeout(() => { if (s === scanSession) closeScanner(); }, 350);
  }

  $('#scanBtn').addEventListener('click', openScanner);
  $('#scanCancel').addEventListener('click', closeScanner);
  $('#scanPhoto').addEventListener('click', () => $('#scanFile').click());
  $('#scanFile').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    // The result belongs to this scanner and this editor session only: if either has
    // been closed (or reopened) by the time the photo is decoded, it is dropped.
    const s = scanSession, es = session, current = () => s === scanSession && es === session;
    scanMsg.textContent = 'Reading the photo…';
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const text = await decodeQr(img, img.naturalWidth, img.naturalHeight);
      if (!current()) return;
      if (text) return scanned(text);
      scanMsg.textContent = 'No QR code found in that photo. Try a sharper, closer one.';
    } catch {
      if (current()) scanMsg.textContent = 'That photo could not be read.';
    } finally {
      URL.revokeObjectURL(url);
    }
  });

  /** Put a scanned code into the editor (nothing is saved until Save). */
  function applyScanned(text) {
    if (!draft) return;
    const { type, data } = parseQr(text);
    draft.type = type;
    typeSelect.value = type;
    dataCache[type] = data;
    if (type !== 'url' && draft.logo.mode === 'favicon') { draft.logo.mode = 'none'; sheet.elements.logoMode.value = 'none'; }
    renderTypeFields();
    updatePreview();
  }

  /* ---- Reading QR payloads back into form data ---- */
  // Exposed for testing the payload round-trip (encoder → parser) in the console.
  if (DEBUG) window.qrcubeDebug = { parseQr, encode: (type, data) => TYPES[type].encode(data) };


  /* ================================================================
   * Install: the browser's own prompt where there is one, otherwise steps
   * ================================================================ */
  const installItem = $('#installItem');
  const installSheet = $('#installSheet');
  let installPrompt = null;
  const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true ||
    !!window.Capacitor?.isNativePlatform?.();
  installItem.hidden = installed();
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; });
  addEventListener('appinstalled', () => { installItem.hidden = true; installPrompt = null; });

  async function install() {
    closeMenu();
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice.catch(() => {});
      installPrompt = null;
      return;
    }
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    installSheet.dataset.device = ios ? 'ios' : /Android/.test(ua) ? 'android' : 'desktop';
    installSheet.classList.add('open');
    backdrop.classList.add('open');
  }
  function closeInstall() {
    if (!installSheet.classList.contains('open')) return;
    installSheet.classList.remove('open');
    backdrop.classList.remove('open');
  }
  installSheet.addEventListener('click', e => { if (e.target.closest('[data-act="install-close"]')) closeInstall(); });

  /* ================================================================
   * Backdrop sheet (changes apply live)
   * ================================================================ */
  const lookSheet = $('#lookSheet');
  $('#materialList').innerHTML = Object.entries(MATERIALS)
    .map(([k, m]) => `<label><input type="radio" name="material" value="${k}"><span>${m.name}</span></label>`).join('');

  function openLook() {
    closeMenu();
    lookSheet.elements.backdrop.value = state.look.backdrop;
    lookSheet.classList.add('open');
    backdrop.classList.add('open', 'clear');
  }
  function closeLook() {
    if (!lookSheet.classList.contains('open')) return;
    applyLookSoon.flush();
    lookSheet.classList.remove('open');
    backdrop.classList.remove('open', 'clear');
    document.activeElement?.blur?.();
    scrollTo(0, 0);
    resetGesture();
  }

  const applyLookSoon = debounce(() => { applyLook(); save(); }, 120);
  lookSheet.addEventListener('input', e => {
    if (e.target.name !== 'backdrop') return;
    state.look.backdrop = e.target.value.toLowerCase();
    applyLookSoon();
  });
  lookSheet.addEventListener('submit', e => { e.preventDefault(); closeLook(); });
  lookSheet.addEventListener('click', e => {
    if (!e.target.closest('[data-act="look-reset"]')) return;
    state.look = { ...DEFAULT_LOOK };
    lookSheet.elements.backdrop.value = state.look.backdrop;
    applyLook();
    save();
  });

  /* ================================================================
   * Menu: backup / restore
   * ================================================================ */
  const menu = $('#menu');
  const menuBtn = $('#menuBtn');
  function closeMenu() { menu.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }
  menu.addEventListener('keydown', e => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const items = [...menu.querySelectorAll('button')].filter(el => !el.hidden);
    if (!items.length) return;
    e.preventDefault();
    const current = items.indexOf(document.activeElement);
    const index = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (current + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[index].focus();
  });
  menuBtn.addEventListener('click', e => {
    e.stopPropagation();
    const open = menu.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', e => { if (!menu.contains(e.target)) closeMenu(); });

  menu.addEventListener('click', async e => {
    const act = e.target.dataset.act;
    closeMenu();
    if (act === 'install') install();
    if (act === 'look') openLook();
    if (act === 'import') $('#importFile').click();
    if (act === 'export') {
      const json = JSON.stringify({ app: 'qr-cards', version: 2, cards: state.cards, look: state.look }, null, 2);
      const name = `qr-cards-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const file = new File([json], name, { type: 'application/json' });
      // Ask where to save, where the browser can (Chrome and Edge). Cancelling saves nothing.
      if (window.showSaveFilePicker) {
        try {
          const handle = await showSaveFilePicker({
            suggestedName: name, id: 'qrcards-backup', startIn: 'documents',
            types: [{ description: 'QR Cards backup', accept: { 'application/json': ['.json'] } }]
          });
          const out = await handle.createWritable();
          await out.write(file);
          await out.close();
          return;
        } catch (err) {
          if (err?.name === 'AbortError') return;
          /* the picker isn't allowed here: fall through */
        }
      }
      // Phones: the share sheet offers "Save to Files", Drive and so on.
      if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'QR Cards backup' }); return; } catch { /* fall through */ }
      }
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(file), download: name });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
  });

  $('#importFile').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      // Backups from the die version (six sides) are accepted too: each side becomes a card.
      if (!data || typeof data !== 'object' || !(Array.isArray(data.cards) || (Array.isArray(data.faces) && data.faces.length === 6))) throw new Error();
      if (!confirm('Replace all your cards with this backup?')) return;
      const prev = state;
      // Anything malformed in the file is dropped or reset rather than stored.
      state = cleanState({ ...data, look: { ...data.look, backdrop: data.look?.backdrop || state.look.backdrop } });
      if (!save()) { state = prev; return; }
      selected = null;
      applyLook();
      renderCards();
    } catch {
      alert('That file is not a valid QR Cards backup.');
    }
  });

  // Modal focus and hidden-control handling are shared by every overlay.
  const overlays = ['menu', 'sheet', 'installSheet', 'lookSheet', 'full', 'scanner', 'cp'].map(id => $('#' + id));
  const modalOrder = ['cp', 'scanner', 'full', 'sheet', 'lookSheet', 'installSheet'];
  const returnFocus = new Map();
  let activeOverlay = null;
  const focusables = el => [...el.querySelectorAll('button, input, select, textarea, [tabindex="0"]')].filter(el => !el.disabled && !el.closest('[hidden]') && el.getClientRects().length);
  function syncOverlays() {
    const top = modalOrder.map(id => $('#' + id)).find(el => el.classList.contains('open')) || (menu.classList.contains('open') ? menu : null);
    for (const el of overlays) {
      const open = el.classList.contains('open');
      el.inert = !open || (!!top && top !== el);
      el.setAttribute('aria-hidden', String(!open || top !== el));
      if (el !== menu) { el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', String(top === el)); }
      if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby')) el.setAttribute('aria-label', el === sheet ? 'Edit card' : el === lookSheet ? 'Backdrop' : el === full ? 'QR code' : 'App menu');
    }
    for (const el of [$('.bar'), stage]) el.inert = !!top && top !== menu;
    if (top === activeOverlay) return;
    const previous = activeOverlay;
    if (top && !returnFocus.has(top)) returnFocus.set(top, document.activeElement);
    activeOverlay = top;
    if (previous && !previous.classList.contains('open')) {
      const target = returnFocus.get(previous); returnFocus.delete(previous);
      if (target?.isConnected && !target.closest('[inert]')) target.focus();
      else if (!top) menuBtn.focus();
    }
    if (top && !top.contains(document.activeElement)) (focusables(top)[0] || top).focus();
  }
  const overlayObserver = new MutationObserver(syncOverlays);
  for (const el of overlays) { el.tabIndex = -1; overlayObserver.observe(el, { attributes: true, attributeFilter: ['class'] }); }
  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab' || !activeOverlay) return;
    const controls = focusables(activeOverlay), first = controls[0], last = controls.at(-1);
    if (!first) { e.preventDefault(); activeOverlay.focus(); return; }
    if (e.shiftKey && (document.activeElement === first || !activeOverlay.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !activeOverlay.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  });
  syncOverlays();
  addEventListener('pagehide', () => { applyLookSoon.flush(); closeFull(); closeScanner(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { closeFull(); closeScanner(); } });

  /* ================================================================
   * Boot
   * ================================================================ */
  $('#appVersion').textContent = 'Version ' + globalThis.QRCUBE_VERSION;
  applyLook();
  renderCards();
  refreshFavicons();

  const native = window.Capacitor?.isNativePlatform?.();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !native) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
