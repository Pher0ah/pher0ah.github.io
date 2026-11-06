/* QR Cube — a die of QR codes.
 * Plain ES modules, no build step. The die is a three.js rounded-box mesh;
 * everything else visual (press ring, sheets, menus, full-screen fade) is
 * CSS transitions. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

(() => {

  const STORE = 'qrcube.v1';
  const HOLD_MS = 550;        // long-press duration
  const DOUBLE_TAP_MS = 500;  // max gap from the first tap's release to the second touch-down
  const DOUBLE_TAP_PX = 60;   // max distance between the two taps
  const MOVE_TOL = { mouse: 6, pen: 10, touch: 16 };  // px of wobble before a press becomes a drag
  const DEBUG = new URLSearchParams(location.search).has('debug');
  const FRICTION_MS = 650;    // inertia decay time-constant
  const LOGO_FRACTION = 0.22; // logo width as a share of the QR width

  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const clone = o => JSON.parse(JSON.stringify(o));
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  /* ================================================================
   * State
   * ================================================================ */
  const blankState = () => ({ faces: [null, null, null, null, null, null], q3: null });

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE));
      if (s && Array.isArray(s.faces) && s.faces.length === 6) return s;
    } catch { /* ignore */ }
    return blankState();
  }
  /** Persist the state; false (after telling the user, unless quiet) when storage is full. */
  function save(quiet = false) {
    try { localStorage.setItem(STORE, JSON.stringify(state)); return true; }
    catch {
      if (!quiet) alert('Could not save: storage is full. Try a smaller logo, or clear a side you no longer need.');
      return false;
    }
  }
  let state = load();

  const defaultFace = () => ({
    type: 'url', label: '', data: {},
    logo: { mode: 'none', src: '', fav: '', favFor: '' },
    inkMode: 'auto', fg: '#000000', ecc: 'M'
  });

  /* ================================================================
   * Die look: material, colours
   * ================================================================ */
  const MATERIALS = {
    matte:  { name: 'Matte plastic',  color: '#f4f1ea' },
    glossy: { name: 'Glossy plastic', color: '#f4f1ea' },
    metal:  { name: 'Brushed metal',  color: '#b9bdc3' },
    wood:   { name: 'Wood',           color: '#c8955c' },
    clay:   { name: 'Clay',           color: '#c97b5a' },
    stone:  { name: 'Marble',         color: '#e9e6e1' }
  };
  const DEFAULT_LOOK = { material: 'matte', die: MATERIALS.matte.color, backdrop: '#111214' };
  state.look = { ...DEFAULT_LOOK, ...state.look };
  if (!MATERIALS[state.look.material]) state.look.material = DEFAULT_LOOK.material;

  const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  const rgbHex = c => '#' + c.map(v => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('');
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

  /** Colours for one side: `ink` is printed on the die; `scanFg`/`scanBg` are the
   *  same pair arranged dark-on-light for the full-screen code, which every scanner reads. */
  function sideColors(f) {
    const die = state.look.die;
    const ink = f && f.inkMode === 'custom' ? f.fg : complementInk(die);
    let [scanFg, scanBg] = luminance(ink) < luminance(die) ? [ink, die] : [die, ink];
    if (contrast(scanFg, scanBg) < 4.5) { scanBg = '#ffffff'; if (contrast(scanFg, scanBg) < 4.5) scanFg = '#000000'; }
    return { die, ink, scanFg, scanBg };
  }

  /* ================================================================
   * QR types: form schema + encoder
   * ================================================================ */
  const opt = list => list.map(v => Array.isArray(v) ? v : [v, v[0].toUpperCase() + v.slice(1)]);

  const TYPES = {
    url: {
      name: 'Webpage',
      fields: [{ k: 'url', label: 'Web address', type: 'url', ph: 'https://example.com' }],
      encode: d => d.url ? normUrl(d.url) : ''
    },
    vcard: {
      name: 'Contact card',
      fields: [
        { row: [
          { k: 'prefix', label: 'Prefix', ph: 'Dr.' },
          { k: 'first', label: 'First name' },
          { k: 'middle', label: 'Middle name' }
        ] },
        { row: [
          { k: 'last', label: 'Last name' },
          { k: 'suffix', label: 'Suffix', ph: 'Jr.' },
          { k: 'nickname', label: 'Nickname' }
        ] },
        { row: [
          { k: 'org', label: 'Company' },
          { k: 'dept', label: 'Department' }
        ] },
        { row: [
          { k: 'title', label: 'Job title' },
          { k: 'role', label: 'Role' }
        ] },
        { group: 'phones', label: 'Phone numbers', add: 'Add phone', start: 1, fields: [
          { k: 'type', label: 'Type', type: 'select', opts: opt(['cell', 'work', 'home', 'main', 'fax', 'pager', 'other']) },
          { k: 'value', label: 'Number', type: 'tel', ph: '+1 555 123 4567' }
        ] },
        { group: 'emails', label: 'Email addresses', add: 'Add email', start: 1, fields: [
          { k: 'type', label: 'Type', type: 'select', opts: opt(['work', 'home', 'other']) },
          { k: 'value', label: 'Email', type: 'email' }
        ] },
        { group: 'addresses', label: 'Addresses', add: 'Add address', fields: [
          { k: 'type', label: 'Type', type: 'select', opts: opt(['work', 'home', 'other']) },
          { k: 'street', label: 'Street' },
          { k: 'ext', label: 'Apt / Suite' },
          { k: 'pobox', label: 'PO box' },
          { row: [{ k: 'city', label: 'City' }, { k: 'region', label: 'State / Region' }] },
          { row: [{ k: 'postal', label: 'Postcode' }, { k: 'country', label: 'Country' }] }
        ] },
        { group: 'urls', label: 'Websites', add: 'Add website', fields: [
          { k: 'type', label: 'Type', type: 'select', opts: opt(['work', 'home', 'other']) },
          { k: 'value', label: 'URL', type: 'url', ph: 'https://' }
        ] },
        { group: 'social', label: 'Social profiles', add: 'Add profile', fields: [
          { k: 'type', label: 'Service', type: 'select', opts: opt(['linkedin', 'x', 'instagram', 'facebook', 'github', 'tiktok', 'youtube', 'mastodon', 'threads', 'bluesky', 'other']) },
          { k: 'value', label: 'Profile URL', type: 'url', ph: 'https://' }
        ] },
        { k: 'bday', label: 'Birthday', type: 'dmy' },
        { k: 'anniv', label: 'Anniversary', type: 'dmy' },
        { k: 'note', label: 'Note', type: 'textarea' }
      ],
      encode: encodeVCard
    },
    wifi: {
      name: 'Wi-Fi network',
      fields: [
        { k: 'ssid', label: 'Network name (SSID)' },
        { k: 'auth', label: 'Security', type: 'select', opts: [['WPA', 'WPA / WPA2 / WPA3'], ['WEP', 'WEP'], ['nopass', 'None (open)']] },
        { k: 'pass', label: 'Password', type: 'text' },
        { k: 'hidden', label: 'Hidden network', type: 'checkbox' }
      ],
      encode: d => {
        if (!d.ssid) return '';
        const e = s => String(s).replace(/([\\;,:"])/g, '\\$1');
        const auth = d.auth || 'WPA';
        return `WIFI:T:${auth};S:${e(d.ssid)};${auth !== 'nopass' ? `P:${e(d.pass || '')};` : ''}${d.hidden ? 'H:true;' : ''};`;
      }
    },
    email: {
      name: 'Email',
      fields: [
        { k: 'to', label: 'To', type: 'email' },
        { row: [{ k: 'cc', label: 'Cc', type: 'email' }, { k: 'bcc', label: 'Bcc', type: 'email' }] },
        { k: 'subject', label: 'Subject' },
        { k: 'body', label: 'Message', type: 'textarea' }
      ],
      encode: d => {
        if (!d.to && !d.subject && !d.body) return '';
        const p = ['cc', 'bcc', 'subject', 'body'].filter(k => d[k]).map(k => `${k}=${encodeURIComponent(d[k])}`);
        return `mailto:${encodeURIComponent(d.to || '').replace(/%40/g, '@').replace(/%2C/g, ',')}${p.length ? '?' + p.join('&') : ''}`;
      }
    },
    sms: {
      name: 'Text message (SMS)',
      fields: [
        { k: 'number', label: 'Phone number', type: 'tel' },
        { k: 'message', label: 'Message', type: 'textarea' }
      ],
      encode: d => d.number ? `SMSTO:${d.number.replace(/\s/g, '')}:${d.message || ''}` : ''
    },
    phone: {
      name: 'Phone call',
      fields: [{ k: 'number', label: 'Phone number', type: 'tel' }],
      encode: d => d.number ? `tel:${d.number.replace(/[^\d+*#,;]/g, '')}` : ''
    },
    geo: {
      name: 'Location',
      fields: [
        { row: [
          { k: 'lat', label: 'Latitude', type: 'number', ph: '51.5007' },
          { k: 'lng', label: 'Longitude', type: 'number', ph: '-0.1246' }
        ] }
      ],
      encode: d => (d.lat !== '' && d.lng !== '' && d.lat != null && d.lng != null) ? `geo:${d.lat},${d.lng}` : ''
    },
    event: {
      name: 'Calendar event',
      fields: [
        { k: 'summary', label: 'Title' },
        { k: 'location', label: 'Location' },
        { k: 'allday', label: 'All-day event', type: 'checkbox' },
        { row: [
          { k: 'start', label: 'Starts', type: 'datetime-local' },
          { k: 'end', label: 'Ends', type: 'datetime-local' }
        ] },
        { k: 'desc', label: 'Description', type: 'textarea' }
      ],
      encode: d => {
        if (!d.summary || !d.start) return '';
        const dt = v => d.allday ? `;VALUE=DATE:${v.slice(0, 10).replace(/-/g, '')}`
          : `:${v.replace(/[-:]/g, '').slice(0, 13)}00`;
        return ['BEGIN:VEVENT', `SUMMARY:${icsEsc(d.summary)}`, `DTSTART${dt(d.start)}`,
          d.end && `DTEND${dt(d.end)}`, d.location && `LOCATION:${icsEsc(d.location)}`,
          d.desc && `DESCRIPTION:${icsEsc(d.desc)}`, 'END:VEVENT'].filter(Boolean).join('\r\n');
      }
    },
    text: {
      name: 'Plain text',
      fields: [{ k: 'text', label: 'Text', type: 'textarea' }],
      encode: d => d.text || ''
    }
  };

  function normUrl(u) {
    u = String(u).trim();
    return /^[a-z][a-z\d+.-]*:/i.test(u) ? u : 'https://' + u;
  }
  function icsEsc(s) { return String(s).replace(/\\/g, '\\\\').replace(/[;,]/g, '\\$&').replace(/\r?\n/g, '\\n'); }

  function encodeVCard(d) {
    const v = icsEsc;
    const name = [d.prefix, d.first, d.middle, d.last, d.suffix].filter(Boolean).join(' ');
    const fn = name || d.org || '';
    const any = fn || (d.phones || []).some(p => p.value) || (d.emails || []).some(e => e.value);
    if (!any) return '';
    const TEL = { cell: 'CELL', work: 'WORK,VOICE', home: 'HOME,VOICE', main: 'MAIN', fax: 'FAX', pager: 'PAGER', other: 'VOICE' };
    const L = ['BEGIN:VCARD', 'VERSION:3.0',
      `N:${[d.last, d.first, d.middle, d.prefix, d.suffix].map(x => v(x || '')).join(';')}`,
      `FN:${v(fn)}`];
    if (d.nickname) L.push(`NICKNAME:${v(d.nickname)}`);
    if (d.org || d.dept) L.push(`ORG:${v(d.org || '')}${d.dept ? ';' + v(d.dept) : ''}`);
    if (d.title) L.push(`TITLE:${v(d.title)}`);
    if (d.role) L.push(`ROLE:${v(d.role)}`);
    for (const p of d.phones || []) if (p.value) L.push(`TEL;TYPE=${TEL[p.type] || 'VOICE'}:${p.value}`);
    for (const e of d.emails || []) if (e.value) L.push(`EMAIL;TYPE=INTERNET${e.type !== 'other' ? ',' + e.type.toUpperCase() : ''}:${e.value}`);
    for (const a of d.addresses || []) {
      const parts = [a.pobox, a.ext, a.street, a.city, a.region, a.postal, a.country];
      if (parts.some(Boolean)) L.push(`ADR;TYPE=${(a.type || 'other').toUpperCase()}:${parts.map(x => v(x || '')).join(';')}`);
    }
    for (const u of d.urls || []) if (u.value) L.push(`URL;TYPE=${(u.type || 'other').toUpperCase()}:${normUrl(u.value)}`);
    for (const s of d.social || []) if (s.value) L.push(`X-SOCIALPROFILE;TYPE=${s.type || 'other'}:${normUrl(s.value)}`);
    // Dates are "YYYY-MM-DD", or "--MM-DD" without a year. Apple contacts mark a missing
    // year with the placeholder year 1604 plus X-APPLE-OMIT-YEAR; Android reads --MM-DD.
    const apple = (prop, v) => v.startsWith('--') ? `${prop};X-APPLE-OMIT-YEAR=1604:1604${v.slice(1)}` : `${prop}:${v}`;
    if (d.bday) L.push(apple('BDAY', d.bday));
    if (d.anniv) L.push(`X-ANNIVERSARY:${d.anniv}`, apple('item1.X-ABDATE', d.anniv), 'item1.X-ABLabel:_$!<Anniversary>!$_');
    if (d.note) L.push(`NOTE:${v(d.note)}`);
    L.push('END:VCARD');
    return L.join('\r\n');
  }

  const encodeFace = f => (f && TYPES[f.type] ? TYPES[f.type].encode(f.data || {}) : '');

  /* ---- Validation of stored and imported data (a bad backup must not break the app) ---- */
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const isHex = v => typeof v === 'string' && /^#[\da-f]{6}$/i.test(v);
  const str = v => (typeof v === 'string' ? v : '');
  const num = (v, d, lo, hi) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
  const imgUrl = v => (typeof v === 'string' && /^(data:image\/|https?:)/i.test(v) ? v : '');
  /** Form data: strings and booleans, plus lists of such objects (phones, emails…). */
  function cleanData(d) {
    const out = {};
    if (!isObj(d)) return out;
    for (const [k, v] of Object.entries(d)) {
      if (Array.isArray(v)) out[k] = v.filter(isObj).map(cleanData);
      else if (typeof v === 'string' || typeof v === 'boolean') out[k] = v;
      else if (Number.isFinite(v)) out[k] = String(v);
    }
    return out;
  }
  function cleanFace(f) {
    if (!isObj(f) || !Object.hasOwn(TYPES, f.type)) return null;
    const L = isObj(f.logo) ? f.logo : {};
    const logo = { mode: ['none', 'file', 'favicon'].includes(L.mode) ? L.mode : 'none', src: imgUrl(L.src), fav: imgUrl(L.fav), favFor: str(L.favFor) };
    if (imgUrl(L.orig)) logo.orig = L.orig;
    if (isObj(L.fit)) {
      const F = L.fit;
      logo.fit = { fit: F.fit === 'cover' ? 'cover' : 'contain', zoom: num(F.zoom, 1, 0.3, 4), x: num(F.x, 0, -2, 2), y: num(F.y, 0, -2, 2),
                   shape: ['square', 'rounded', 'circle'].includes(F.shape) ? F.shape : 'square', bg: F.bg === 'white' ? 'white' : 'none' };
    }
    // Fields the form shows as lists (phones, emails…) must be lists of entries.
    const data = cleanData(f.data);
    const lists = spec => spec.flatMap(x => (x.row ? lists(x.row) : x.group ? [x.group] : []));
    for (const g of lists(TYPES[f.type].fields)) if (g in data && !Array.isArray(data[g])) delete data[g];
    return { type: f.type, label: str(f.label).slice(0, 60), data, logo,
             inkMode: f.inkMode === 'custom' ? 'custom' : 'auto', fg: isHex(f.fg) ? f.fg : '#000000',
             ecc: ['L', 'M', 'Q', 'H'].includes(f.ecc) ? f.ecc : 'M' };
  }
  function cleanLook(l) {
    l = isObj(l) ? l : {};
    const material = Object.hasOwn(MATERIALS, l.material) ? l.material : DEFAULT_LOOK.material;
    return { material, die: isHex(l.die) ? l.die : MATERIALS[material].color, backdrop: isHex(l.backdrop) ? l.backdrop : DEFAULT_LOOK.backdrop };
  }
  function cleanState(s) {
    const faces = Array.isArray(s?.faces) && s.faces.length === 6 ? s.faces.map(cleanFace) : blankState().faces;
    const q3 = Array.isArray(s?.q3) && s.q3.length === 4 && s.q3.every(Number.isFinite) && s.q3.some(Boolean) ? s.q3 : null;
    return { faces, look: cleanLook(s?.look), q3 };
  }
  state = cleanState(state);

  /* ================================================================
   * QR modules → SVG (full screen, preview) and canvas (die textures)
   * ================================================================ */
  function logoHref(f) {
    if (!f || !f.logo) return '';
    if (f.logo.mode === 'file') return f.logo.src || '';
    if (f.logo.mode === 'favicon' && f.type === 'url') return f.logo.fav || '';
    return '';
  }

  /** QR module grid plus the cleared logo square, or null when the data doesn't fit. */
  function qrModules(text, f) {
    const logo = logoHref(f);
    let qr;
    try { qr = qrcode(0, logo ? 'H' : (f.ecc || 'M')); qr.addData(text, 'Byte'); qr.make(); }
    catch { return null; }
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

  /** Returns an SVG string (dark-on-light, for scanning), or null when the data doesn't fit. */
  function qrSvg(text, f) {
    const q = qrModules(text, f);
    if (!q) return null;
    const { scanFg: fg, scanBg: bg } = sideColors(f);
    const m = 1, size = q.n + m * 2;   // 1-module quiet zone; the container adds more
    let d = '';
    for (let r = 0; r < q.n; r++) for (let c = 0; c < q.n; c++) if (q.dark(r, c)) d += `M${c + m},${r + m}h1v1h-1z`;
    let logoEl = '';
    if (q.logo) {
      const x = q.lo + m, pad = 0.4;
      logoEl = `<rect x="${x}" y="${x}" width="${q.w}" height="${q.w}" rx="${q.w * 0.18}" fill="${esc(bg)}"/>` +
        `<image href="${esc(q.logo)}" x="${x + pad}" y="${x + pad}" width="${q.w - pad * 2}" height="${q.w - pad * 2}" preserveAspectRatio="xMidYMid meet"/>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="QR code">` +
      `<rect width="${size}" height="${size}" fill="${esc(bg)}"/><path d="${d}" fill="${esc(fg)}"/>${logoEl}</svg>`;
  }

  /* ================================================================
   * The die: a rounded-box mesh with one canvas texture per side
   * ================================================================ */
  const TEX = 1024;            // texture size per side
  const RADIUS = 0.12;         // edge rounding (the die is 1 unit wide)
  // BoxGeometry material order is +x, -x, +y, -y, +z, -z; our sides are front, right, back, left, top, bottom.
  const MAT_TO_SIDE = [1, 3, 4, 5, 0, 2];

  const stage = $('#stage');
  const canvas = $('#die');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 1.0;
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(-1.5, 2.5, 5);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);

  /* ---- Procedural surfaces (no image downloads) ---- */
  function rng(seed) {
    return () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /** Smooth value noise in [0,1] with an fbm() helper. */
  function makeNoise(seed) {
    const r = rng(seed), T = new Float32Array(256 * 256).map(() => r());
    const sm = t => t * t * (3 - 2 * t);
    const at = (x, y) => T[(x & 255) + ((y & 255) << 8)];
    const n = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), u = sm(x - xi), v = sm(y - yi);
      const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
    n.fbm = (x, y, oct = 4) => { let s = 0, amp = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += amp * n(x * f, y * f); amp /= 2; f *= 2; } return s; };
    return n;
  }

  const SURF = 512;
  function paintSurface(material, color, seed) {
    const c = document.createElement('canvas');
    c.width = c.height = SURF;
    const x = c.getContext('2d'), img = x.createImageData(SURF, SURF), d = img.data;
    const n = makeNoise(seed), r = rng(seed * 7 + 1);
    const base = hexRgb(color), vein = base.map(v => v * 0.45 + 0.12);   // marble veins: darker, greyer
    for (let v = 0, i = 0; v < SURF; v++) {
      for (let u = 0; u < SURF; u++, i += 4) {
        let k = 1, mix = 0;   // brightness factor, share of vein colour
        switch (material) {
          case 'metal':   // brushed: fine streaks running across the side
            k = 0.86 + 0.18 * (0.6 * n(u * 0.01, v * 0.9) + 0.4 * n(u * 0.05, v * 3));
            break;
          case 'wood': {  // growth rings bent by low-frequency noise, plus fibre streaks
            const t = v * 0.01 + n.fbm(u * 0.004, v * 0.012) * 2.4;
            k = 0.74 + 0.24 * Math.sqrt(Math.abs(Math.sin(t * Math.PI * 2.2))) + 0.1 * (n(u * 0.015, v * 0.5) - 0.5);
            break;
          }
          case 'clay':    // soft mottling with the odd dark speck
            k = 0.9 + 0.14 * n.fbm(u * 0.012, v * 0.012) + (r() < 0.006 ? -0.18 : (r() - 0.5) * 0.05);
            break;
          case 'stone': { // marble: thin turbulent veins over a faint cloud
            const t = u * 0.006 + v * 0.003 + n.fbm(u * 0.005, v * 0.005, 5) * 3.2;
            mix = Math.pow(1 - Math.abs(Math.sin(t * Math.PI)), 10) * 0.85;
            k = 0.96 + 0.07 * n.fbm(u * 0.02, v * 0.02);
            break;
          }
          default:        // plastic: very fine grain
            k = 1 + (r() - 0.5) * 0.05;
        }
        for (let ch = 0; ch < 3; ch++) d[i + ch] = Math.min(255, (base[ch] * (1 - mix) + vein[ch] * mix) * k * 255);
        d[i + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  // How each material catches the light.
  const FINISH = {
    matte:  { roughness: 0.72, metalness: 0, clearcoat: 0.08, clearcoatRoughness: 0.6,  bumpScale: 0.8 },
    glossy: { roughness: 0.25, metalness: 0, clearcoat: 0.9,  clearcoatRoughness: 0.08, bumpScale: 0.2 },
    metal:  { roughness: 0.38, metalness: 1, clearcoat: 0,    clearcoatRoughness: 0.5,  bumpScale: 0.4 },
    wood:   { roughness: 0.68, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.5,  bumpScale: 1.2 },
    clay:   { roughness: 0.95, metalness: 0, clearcoat: 0,    clearcoatRoughness: 0.5,  bumpScale: 2.5 },
    stone:  { roughness: 0.32, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.2,  bumpScale: 0.3 }
  };

  const bumps = {};
  function bumpFor(material) {
    if (!bumps[material]) bumps[material] = new THREE.CanvasTexture(paintSurface(material, '#808080', 99));
    return bumps[material];
  }

  // One surface per side (different seeds, so wood grain and veins vary), cached per look.
  const surfaces = [];
  function surfaceFor(i) {
    const key = `${state.look.material}|${state.look.die}`;
    if (surfaces[i]?.key !== key) surfaces[i] = { key, canvas: paintSurface(state.look.material, state.look.die, i + 1) };
    return surfaces[i].canvas;
  }

  // Per side: a colour texture, plus a finish mask (white = bare material, black = ink)
  // used as the metalness map so printed ink isn't shiny metal.
  const MASK = 512;
  const sideCanvases = [], sideTextures = [], maskCanvases = [], maskTextures = [];
  const materials = MAT_TO_SIDE.map(side => {
    const c = document.createElement('canvas');
    c.width = c.height = TEX;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const m = document.createElement('canvas');
    m.width = m.height = MASK;
    sideCanvases[side] = c; sideTextures[side] = tex;
    maskCanvases[side] = m; maskTextures[side] = new THREE.CanvasTexture(m);
    return new THREE.MeshPhysicalMaterial({ map: tex, metalnessMap: maskTextures[side] });
  });
  const die = new THREE.Mesh(new RoundedBoxGeometry(1, 1, 1, 8, RADIUS), materials);
  scene.add(die);

  /** Apply the material finish, backdrop and repaint every side. */
  function applyLook() {
    const { material, backdrop } = state.look;
    for (const m of materials) {
      Object.assign(m, FINISH[material]);
      m.bumpMap = bumpFor(material);
      m.needsUpdate = true;
    }
    // Backdrop, with header and hint text that stay readable on it.
    const light = luminance(backdrop) > 0.35;
    const root = document.documentElement.style;
    root.setProperty('--backdrop', backdrop);
    root.setProperty('--chrome', light ? '#1b1c1f' : '#ececee');
    root.setProperty('--chrome-muted', light ? 'rgba(0,0,0,.55)' : '#8b8d94');
    $('meta[name="theme-color"]').content = backdrop;
    renderAll();
  }

  let renderQueued = false;
  function requestRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => { renderQueued = false; renderer.render(scene, camera); });
  }

  let pxPerUnit = 300;
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Fit the die plus room to tumble across the shorter side (tighter on phones).
    const span = camera.aspect < 1 ? 1.85 : 2.3, t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = span / (2 * t * Math.min(1, camera.aspect));
    camera.position.set(0, 0, dist);
    camera.updateProjectionMatrix();
    pxPerUnit = h / (2 * t * (dist - 0.5));
    requestRender();
  }
  new ResizeObserver(resize).observe(stage);

  // Logos drawn into WebGL textures must be same-origin or CORS-enabled.
  const logoImages = new Map();
  function logoImage(href, onReady) {
    if (logoImages.has(href)) return logoImages.get(href);
    const img = new Image();
    if (!href.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => { logoImages.set(href, img); onReady(); };
    img.onerror = () => logoImages.set(href, null);
    logoImages.set(href, null);
    img.src = href;
    return null;
  }

  function paintSide(i, withLogo = true) {
    const f = state.faces[i];
    const x = sideCanvases[i].getContext('2d');
    const S = TEX;
    x.drawImage(surfaceFor(i), 0, 0, S, S);
    const mask = maskCanvases[i].getContext('2d');
    mask.fillStyle = '#fff';
    mask.fillRect(0, 0, MASK, MASK);
    const { ink } = sideColors(f);

    if (!f) {
      // A shallow engraved plus, like a blank die face.
      const a = S * 0.09, mid = S / 2;
      x.lineCap = 'round';
      x.lineWidth = S * 0.018;
      x.strokeStyle = 'rgba(255,255,255,.35)';
      x.beginPath(); x.moveTo(mid - a, mid + 3); x.lineTo(mid + a, mid + 3); x.moveTo(mid, mid - a + 3); x.lineTo(mid, mid + a + 3); x.stroke();
      x.strokeStyle = 'rgba(0,0,0,.2)';
      x.beginPath(); x.moveTo(mid - a, mid); x.lineTo(mid + a, mid); x.moveTo(mid, mid - a); x.lineTo(mid, mid + a); x.stroke();
      return;
    }

    // The flat part of each side is roughly the middle 84% of the texture;
    // the rest wraps around the rounded edges.
    const text = encodeFace(f);
    const q = text ? qrModules(text, f) : null;
    const size = S * (f.label ? 0.6 : 0.64);
    const ox = (S - size) / 2, oy = f.label ? S * 0.16 : ox;
    // Everything printed in ink is drawn twice: in colour on the side, and in black
    // on the finish mask, so ink stays non-metallic on a metal die.
    const marks = (ctx, colour, k = 1) => {
      ctx.fillStyle = colour;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (!q) {
        ctx.font = `600 ${S * 0.045 * k}px system-ui, sans-serif`;
        ctx.fillText(text ? 'Too much data' : 'Double-tap to edit', S / 2 * k, S / 2 * k);
      } else {
        const u = size / q.n * k;
        for (let r = 0; r < q.n; r++) for (let c = 0; c < q.n; c++) {
          if (q.dark(r, c)) ctx.fillRect(ox * k + c * u, oy * k + r * u, u + 0.6, u + 0.6);
        }
      }
      if (f.label) {
        ctx.font = `600 ${S * 0.052 * k}px system-ui, -apple-system, "Segoe UI", sans-serif`;
        ctx.fillText(f.label, S / 2 * k, (oy + size + S * 0.075) * k, S * 0.66 * k);
      }
    };
    marks(x, ink);
    marks(mask, '#000', MASK / S);
    if (q?.logo) {
      const u = size / q.n;
      const lx = ox + q.lo * u, ly = oy + q.lo * u, lw = q.w * u, pad = u * 0.4;
      const img = withLogo ? logoImage(q.logo, () => renderFace(i)) : null;
      if (img) {
        const k = Math.min((lw - pad * 2) / img.naturalWidth, (lw - pad * 2) / img.naturalHeight);
        const iw = img.naturalWidth * k, ih = img.naturalHeight * k;
        x.drawImage(img, lx + (lw - iw) / 2, ly + (lw - ih) / 2, iw, ih);
      }
    }
    // A logo without CORS taints the canvas, and WebGL refuses tainted canvases.
    if (withLogo && q?.logo) {
      try { x.getImageData(0, 0, 1, 1); } catch { paintSide(i, false); }
    }
  }

  function renderFace(i) {
    paintSide(i);
    sideTextures[i].needsUpdate = true;
    maskTextures[i].needsUpdate = true;
    requestRender();
  }
  const renderAll = () => state.faces.forEach((_, i) => renderFace(i));

  /** Which side (0–5) is under a screen point, or -1. */
  const raycaster = new THREE.Raycaster();
  function pickSide(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    // The matrices normally refresh on render; a resize (e.g. the iPhone keyboard
    // closing) can move the camera before the next frame, so refresh them here.
    camera.updateMatrixWorld(); die.updateMatrixWorld();
    raycaster.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), camera);
    const hit = raycaster.intersectObject(die)[0];
    return hit ? MAT_TO_SIDE[hit.face.materialIndex] : -1;
  }

  /* ================================================================
   * Rotation physics
   * ================================================================ */
  const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
  const HOME_Q = new THREE.Quaternion().setFromAxisAngle(X, 0.42).multiply(new THREE.Quaternion().setFromAxisAngle(Y, -0.6));
  if (Array.isArray(state.q3) && state.q3.length === 4) die.quaternion.fromArray(state.q3).normalize();
  else die.quaternion.copy(HOME_Q);

  let omega = [0, 0, 0];   // angular velocity, rad/ms (axis * speed)
  let spinRaf = 0;
  const tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3();

  const applyQ = requestRender;
  const saveQ = debounce(() => { state.q3 = die.quaternion.toArray(); save(true); }, 400);

  function turn(axis, ang) {
    die.quaternion.premultiply(tmpQ.setFromAxisAngle(axis, ang)).normalize();
    applyQ();
  }

  /** Rotate about the screen axis perpendicular to a drag of (dx, dy) px. */
  function rotateBy(dx, dy) {
    const len = Math.hypot(dx, dy);
    if (!len) return [0, 0, 0];
    const ang = len / (pxPerUnit * 0.6);
    tmpV.set(dy / len, dx / len, 0);   // screen y is down, world y is up
    turn(tmpV, ang);
    return [tmpV.x * ang, tmpV.y * ang, 0];
  }

  function spin(now) {
    const dt = Math.min(now - (spin.t || now), 50);
    spin.t = now;
    const speed = Math.hypot(...omega);
    if (speed < 0.00004) { stopSpin(); saveQ(); return; }
    turn(tmpV.set(...omega).divideScalar(speed), speed * dt);
    const k = Math.exp(-dt / FRICTION_MS);
    omega = omega.map(w => w * k);
    spinRaf = requestAnimationFrame(spin);
  }
  function startSpin() { cancelAnimationFrame(spinRaf); spin.t = 0; spinRaf = requestAnimationFrame(spin); }
  function stopSpin() { cancelAnimationFrame(spinRaf); spinRaf = 0; }

  function resetView() {
    stopSpin();
    omega = [0, 0, 0];
    const from = die.quaternion.clone(), t0 = performance.now();
    const step = now => {
      const t = Math.min((now - t0) / 700, 1), e = 1 - Math.pow(1 - t, 3);
      die.quaternion.slerpQuaternions(from, HOME_Q, e);
      renderer.render(scene, camera);
      if (t < 1) spinRaf = requestAnimationFrame(step); else { spinRaf = 0; saveQ(); }
    };
    spinRaf = requestAnimationFrame(step);
  }

  /* ================================================================
   * Gestures: drag / long-press (show) / double-tap (edit) / two-finger twist & pinch
   * ================================================================ */
  const press = $('#press');
  let g = null;        // current gesture
  let lastTap = null;  // {face, t, x, y} of the last completed tap
  let lastPointerType = 'mouse';
  const pts = new Map();  // touches currently on the die: id → {x, y}
  let pinch = null;       // two-finger gesture: {a: angle, d: distance, z0: zoom at start}
  let multi = false;      // a two-finger gesture ran; ignore the rest until every finger lifts

  // Zoom (pinch) is temporary: it eases back to 1 when the fingers let go.
  const Z_AXIS = new THREE.Vector3(0, 0, 1);
  let zoom = 1, zoomRaf = 0, wheelZoomT = 0;
  function setZoom(z) {
    zoom = Math.min(3, Math.max(0.5, z));
    die.scale.setScalar(zoom);
    stage.style.setProperty('--zoom', zoom.toFixed(3));
    requestRender();
  }
  function zoomBack() {
    cancelAnimationFrame(zoomRaf);
    if (zoom === 1) return;
    const from = zoom, t0 = performance.now();
    const step = now => {
      const t = Math.min((now - t0) / 380, 1);
      setZoom(from + (1 - from) * (1 - Math.pow(1 - t, 3)));
      zoomRaf = t < 1 ? requestAnimationFrame(step) : 0;
    };
    zoomRaf = requestAnimationFrame(step);
  }
  const pair = () => {
    const [p, q] = pts.values();
    return { a: Math.atan2(q.y - p.y, q.x - p.x), d: Math.max(Math.hypot(q.x - p.x, q.y - p.y), 1) };
  }
  function startPinch() {
    cancelHold();
    if (g?.moved) saveQ();
    g = null; lastTap = null; multi = true;
    stage.classList.remove('dragging');
    stopSpin(); omega = [0, 0, 0];
    cancelAnimationFrame(zoomRaf);
    pinch = { ...pair(), z0: zoom };
    log('pinch start');
  }

  function showPress(x, y) {
    press.style.setProperty('--hold', HOLD_MS + 'ms');
    press.style.left = x + 'px';
    press.style.top = y + 'px';
    press.classList.remove('on');
    void press.offsetWidth;            // restart the CSS transition
    press.classList.add('on');
  }
  const hidePress = () => press.classList.remove('on');

  // Debug log (open the app with ?debug): shows what the device actually reports.
  const dbg = DEBUG ? document.body.appendChild(Object.assign(document.createElement('pre'), { className: 'dbg' })) : null;
  const log = DEBUG ? (...a) => {
    dbg.textContent = (performance.now() / 1000).toFixed(2) + ' ' + a.join(' ') + '\n' + dbg.textContent.slice(0, 1500);
  } : () => {};

  // Mobile browsers run their own double-tap recogniser (zoom / smart scroll) on touches.
  // When it claims a tap, the page's second tap gets delayed or cancelled. Cancelling the
  // raw touch events on the die takes the touches away from the browser entirely; pointer
  // events still arrive, and the browser's synthetic click is suppressed.
  const ownTouch = e => { if (e.cancelable) e.preventDefault(); };
  stage.addEventListener('touchstart', ownTouch, { passive: false });
  stage.addEventListener('touchend', ownTouch, { passive: false });
  stage.addEventListener('dblclick', e => e.preventDefault());

  stage.addEventListener('pointerdown', e => {
    lastPointerType = e.pointerType;
    log('down', e.pointerType, e.pointerId, e.isPrimary ? 'P' : '', g ? 'busy' : '');
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.pointerType === 'touch') {
      // A primary touch means no other finger is down, even if a finger-lift was
      // never reported: start clean so nothing can stay stuck.
      if (e.isPrimary) { pts.clear(); pinch = null; multi = false; }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { stage.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
      if (pts.size === 2) return startPinch();
      if (multi || pts.size > 2) return;
    }
    if (g) { cancelHold(); g = null; }
    stopSpin();
    omega = [0, 0, 0];
    const now = performance.now();
    // The second tap of a double-tap: judged at touch-down, by time and distance from the
    // first tap (not by side, so a tap near an edge still counts for the first tap's side).
    const second = lastTap && now - lastTap.t < DOUBLE_TAP_MS &&
      Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < DOUBLE_TAP_PX;
    const face = second && lastTap.face >= 0 ? lastTap.face : pickSide(e.clientX, e.clientY);
    lastTap = null;
    if (second && face >= 0) {
      // Open straight away, like native double-tap; nothing waits for the finger to lift.
      log('double-tap → edit', face);
      g = { id: e.pointerId, done: true };
      navigator.vibrate?.(8);
      openEditor(face);
      return;
    }
    g = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t: now, moved: false, done: false, face,
          tol: MOVE_TOL[e.pointerType] ?? MOVE_TOL.touch };
    try { stage.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    if (face >= 0) {
      showPress(e.clientX, e.clientY);
      g.hold = setTimeout(() => {
        if (!g || g.moved) return;
        g.done = true;
        hidePress();
        navigator.vibrate?.(12);
        // Hold shows the code for scanning; an empty side has nothing to show, so edit it.
        state.faces[face] ? openFull(face) : openEditor(face);
      }, HOLD_MS);
    }
  });

  stage.addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId);
    if (p) { p.x = e.clientX; p.y = e.clientY; }
    if (pinch && p && pts.size >= 2) {
      // Twist turns the die about the line of sight; spread / pinch zooms.
      const { a, d } = pair();
      let da = a - pinch.a;
      if (da > Math.PI) da -= 2 * Math.PI; else if (da < -Math.PI) da += 2 * Math.PI;
      pinch.a = a;
      turn(Z_AXIS, -da);   // screen y points down, so a clockwise twist is a negative turn
      setZoom(pinch.z0 * d / pinch.d);
      return;
    }
    if (multi || !g || e.pointerId !== g.id || g.done) return;
    if (!g.moved) {
      if (Math.hypot(e.clientX - g.x0, e.clientY - g.y0) < g.tol) return;
      g.moved = true;
      cancelHold();
      stage.classList.add('dragging');
    }
    const now = performance.now();
    const dt = Math.max(now - g.t, 1);
    const w = rotateBy(e.clientX - g.x, e.clientY - g.y);
    // Smoothed angular velocity for the throw.
    omega = omega.map((o, i) => o * 0.25 + (w[i] / dt) * 0.75);
    g.x = e.clientX; g.y = e.clientY; g.t = now;
  });

  function endGesture(e, cancelled) {
    pts.delete(e.pointerId);
    if (pinch && pts.size < 2) { pinch = null; zoomBack(); saveQ(); log('pinch end'); }
    if (multi) { if (!pts.size) multi = false; return; }
    if (!g || e.pointerId !== g.id) return;
    cancelHold();
    stage.classList.remove('dragging');
    const gest = g;
    g = null;
    log(cancelled ? 'cancel' : 'up', e.pointerId, gest.done ? 'done' : gest.moved ? 'drag' : 'tap ' + gest.face);
    if (gest.done) return;
    if (gest.moved) {
      if (!cancelled && performance.now() - gest.t < 80) startSpin();
      else saveQ();
      return;
    }
    // An unmoved touch counts as a tap even if the browser cancelled it, and even off
    // the die's outline (the second tap may still land on a side).
    lastTap = { face: gest.face, t: performance.now(), x: gest.x0, y: gest.y0 };
  }
  function cancelHold() {
    if (!g) return;
    clearTimeout(g.hold);
    hidePress();
  }
  // Forget any half-finished touch. Called whenever an overlay closes: Safari can drop
  // the finger-lift of a touch that opened the editor or full-screen view, and the die
  // must never wait on it.
  function resetGesture() {
    cancelHold();
    stage.classList.remove('dragging');
    g = null; lastTap = null;
    pts.clear(); multi = false;
    if (pinch) { pinch = null; zoomBack(); }
  }
  addEventListener('blur', resetGesture);
  document.addEventListener('visibilitychange', resetGesture);
  stage.addEventListener('pointerup', e => endGesture(e, false));
  stage.addEventListener('pointercancel', e => endGesture(e, true));
  stage.addEventListener('contextmenu', e => {
    e.preventDefault();
    // Desktop shortcut: right-click a side to edit it. Touch long-presses also
    // fire contextmenu on Android; those belong to the hold gesture above.
    if (lastPointerType !== 'mouse') return;
    const side = pickSide(e.clientX, e.clientY);
    if (side >= 0) openEditor(side);
  });

  // Trackpad / mouse wheel and keyboard also spin the die.
  stage.addEventListener('wheel', e => {
    e.preventDefault();
    if (e.ctrlKey) {
      // Trackpad pinch (browsers report it as ctrl + wheel): zoom, then ease back.
      cancelAnimationFrame(zoomRaf);
      setZoom(zoom * Math.exp(-e.deltaY * 0.01));
      clearTimeout(wheelZoomT);
      wheelZoomT = setTimeout(zoomBack, 250);
      return;
    }
    stopSpin();
    rotateBy(-e.deltaX * 0.5, -e.deltaY * 0.5);
    saveQ();
  }, { passive: false });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && cpInput) return closePicker(false);
    if (e.key === 'Escape' && scanner.classList.contains('open')) return closeScanner();
    if (e.key === 'Escape') { closeFull(); closeEditor(); closeLook(); closeInstall(); closeMenu(); return; }
    if (isOpen() || /input|select|textarea/i.test(e.target.tagName)) return;
    const k = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key];
    if (!k) return;
    e.preventDefault();
    omega = [omega[0] + k[0] * 0.006, omega[1] + k[1] * 0.006, 0];
    if (!spinRaf) startSpin();
  });

  /* ================================================================
   * Full-screen view: just the code, like a sticker, for scanning
   * ================================================================ */
  const full = $('#full');
  let wakeLock = null, prevBrightness = null, fullArmed = false, fullSession = 0;
  const brightnessPlugin = () => window.Capacitor?.Plugins?.ScreenBrightness;

  async function openFull(i) {
    const f = state.faces[i];
    const svg = f && encodeFace(f) ? qrSvg(encodeFace(f), f) : null;
    if (!svg) return;
    $('#fullQr').innerHTML = svg;
    full.style.background = sideColors(f).scanBg;
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
  // Only a tap that starts on the overlay closes it, so lifting the finger
  // from the long-press that opened it doesn't close it straight away.
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

  /** Try to embed a remote icon as a data URL (works offline later). Needs CORS. */
  async function toDataUrl(src) {
    return new Promise(res => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const s = Math.min(256, img.naturalWidth || 128);
          const c = document.createElement('canvas');
          c.width = c.height = s;
          c.getContext('2d').drawImage(img, 0, 0, s, s);
          res(c.toDataURL('image/png'));
        } catch { res(null); }
      };
      img.onerror = () => res(null);
      img.src = src;
    });
  }

  /** Read <link rel=icon> from the page itself. Only works if the site allows CORS
   *  (or in the native app, where CapacitorHttp bypasses CORS). */
  async function iconsFromHtml(origin, pageUrl) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 5000);
      const html = await (await fetch(pageUrl, { signal: ctl.signal })).text();
      clearTimeout(t);
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const base = new URL(doc.querySelector('base[href]')?.getAttribute('href') || pageUrl, pageUrl);
      return $$('link[rel~="icon"], link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"], link[rel="mask-icon"]', doc)
        .map(l => ({ href: new URL(l.getAttribute('href'), base).href, size: parseInt(l.getAttribute('sizes')) || (/apple/.test(l.rel) ? 180 : /svg/.test(l.type || l.getAttribute('href')) ? 512 : 32) }))
        .sort((a, b) => b.size - a.size)
        .map(x => x.href);
    } catch { return []; }
  }

  /** Website first, Google's favicon service as fallback. → {href, from} | null */
  async function resolveFavicon(rawUrl) {
    let u;
    try { u = new URL(normUrl(rawUrl)); } catch { return null; }
    if (!/^https?:$/.test(u.protocol)) return null;
    const direct = [...await iconsFromHtml(u.origin, u.href), `${u.origin}/apple-touch-icon.png`, `${u.origin}/favicon.ico`];
    for (const src of [...new Set(direct)]) {
      if (await probeImage(src)) return { href: (await toDataUrl(src)) || src, from: 'site' };
    }
    const g = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(u.hostname)}&sz=128`;
    if (await probeImage(g)) return { href: (await toDataUrl(g)) || g, from: 'google' };
    return null;
  }

  // Keep site icons current: refresh them in the background on launch.
  async function refreshFavicons() {
    if (!navigator.onLine) return;
    for (let i = 0; i < 6; i++) {
      const f = state.faces[i];
      if (!f || f.type !== 'url' || f.logo?.mode !== 'favicon' || !f.data.url) continue;
      const r = await resolveFavicon(f.data.url);
      if (r && r.href !== f.logo.fav) { f.logo.fav = r.href; f.logo.favFor = f.data.url; save(); renderFace(i); }
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
  let editing = -1, draft = null, dataCache = {};
  let session = 0;   // bumped when the editor opens or closes; late async results check it

  typeSelect.innerHTML = Object.entries(TYPES).map(([k, t]) => `<option value="${k}">${t.name}</option>`).join('');

  const isOpen = () => $$('.sheet.open, .full.open').length > 0;

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
      if (el) out[f.k] = 'dmy' in el.dataset ? readDate(el) : el.type === 'checkbox' ? el.checked : el.value.trim();
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
  }

  function updatePreview() {
    if (!draft) return;   // a debounced update can fire after the editor closed
    readForm();
    const hasLogo = !!logoHref(draft);
    eccSel.disabled = hasLogo;
    eccSel.value = hasLogo ? 'H' : draft.ecc;
    const text = encodeFace(draft);
    const svg = text ? qrSvg(text, draft) : null;
    preview.style.background = sideColors(draft).scanBg;
    preview.innerHTML = svg || `<div class="empty-msg">${text ? 'Too much data. Remove some fields or the logo.' : 'Fill in the details to see a preview'}</div>`;
    maybeFetchFavicon();
  }
  const updatePreviewSoon = debounce(updatePreview, 120);

  let favSeq = 0;
  const maybeFetchFavicon = debounce(async (force) => {
    if (draft?.type !== 'url' || draft.logo.mode !== 'favicon') return;
    const url = draft.data.url;
    if (!url) { favStatus.textContent = 'Enter a web address first.'; return; }
    if (!force && draft.logo.favFor === url && draft.logo.fav) return;
    const seq = ++favSeq, s = session;
    favStatus.textContent = 'Looking for the site icon…';
    const r = await resolveFavicon(url);
    if (seq !== favSeq || s !== session || !draft) return;
    draft.logo.favFor = url;
    draft.logo.fav = r?.href || '';
    favStatus.textContent = !r ? 'No icon found for this site.'
      : r.from === 'site' ? 'Using the icon from the website.'
      : 'The site blocked direct access, so Google’s favicon service was used.';
    updatePreview();
  }, 600);

  function openEditor(i) {
    closeMenu();
    session++;
    editing = i;
    draft = clone(state.faces[i] || defaultFace());
    draft.logo = { ...defaultFace().logo, ...draft.logo };
    dataCache = { [draft.type]: draft.data };
    const el = sheet.elements;
    typeSelect.value = draft.type;
    el.label.value = draft.label || '';
    draft.inkMode = draft.inkMode === 'custom' ? 'custom' : 'auto';
    el.inkMode.value = draft.inkMode;
    // A custom colour starts from the automatic one.
    el.fg.value = draft.inkMode === 'custom' ? draft.fg : sideColors(draft).ink;
    eccSel.value = draft.ecc;
    $$('input[name="logoMode"]', sheet).forEach(r => { r.checked = r.value === draft.logo.mode; });
    $('#logoFile').value = '';
    loadAdjust();
    favStatus.textContent = draft.logo.fav ? 'Using the saved site icon.' : 'The icon is fetched from the website. If the site blocks this, Google’s favicon service is used instead.';
    $('[data-act="clear"]', sheet).hidden = !state.faces[i];
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
    session++;
    editing = -1; draft = null;
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
  sheet.addEventListener('change', e => { if (e.target.name === 'logoMode' || e.target.name === 'inkMode') updatePreview(); });

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
    if (act === 'clear' && confirm('Clear this side?')) {
      state.faces[editing] = null;
      save(); renderFace(editing); closeEditor();
    }
  });

  $('#favRefresh').addEventListener('click', () => { readForm(); maybeFetchFavicon(true); });

  $('#logoFile').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const s = session;
    try {
      const orig = await readLogoFile(file);
      if (s !== session || !draft) return;   // the editor closed or moved to another side
      draft.logo.orig = orig;
      draft.logo.fit = { ...LOGO_FIT0 };
      draft.logo.src = draft.logo.orig;
      loadAdjust();
      updatePreview();
    } catch {
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
  const commitAdjust = debounce(() => {
    if (!draft || !adjImg) return;
    const f = draft.logo.fit;
    const plain = Object.keys(LOGO_FIT0).every(k => f[k] === LOGO_FIT0[k]);
    draft.logo.src = plain ? draft.logo.orig : adjCanvas.toDataURL('image/png');
    updatePreview();
  }, 150);
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
    readForm();
    const text = encodeFace(draft);
    if (text && !qrModules(text, draft)) {
      alert('This is too much data for one QR code. Remove some fields (or the logo) and try again.');
      return;
    }
    if (!text && !confirm('This side has no QR data yet. Save it anyway?')) return;
    // Drop logo data the chosen mode doesn't use.
    if (draft.logo.mode !== 'file') { draft.logo.src = ''; delete draft.logo.orig; delete draft.logo.fit; }
    if (draft.logo.mode !== 'favicon') { draft.logo.fav = ''; draft.logo.favFor = ''; }
    const prev = state.faces[editing];
    state.faces[editing] = draft;
    if (!save()) { state.faces[editing] = prev; return; }   // keep the editor open
    renderFace(editing);
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

  const hexToRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const rgbToHex = rgb => '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
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
  const recentColours = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; } };

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
    // attemptBoth also reads light-on-dark codes (like the ones on a dark die).
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
  const safeDecode = s => { try { return decodeURIComponent(s); } catch { return s; } };
  /** Split on `sep`, honouring backslash escapes (\n becomes a newline). */
  function splitEsc(s, sep) {
    const out = [''];
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '\\' && i + 1 < s.length) { const n = s[++i]; out[out.length - 1] += n === 'n' || n === 'N' ? '\n' : n; }
      else if (c === sep) out.push('');
      else out[out.length - 1] += c;
    }
    return out;
  }
  /** "K:v;K:v;;" (Wi-Fi, MECARD, MATMSG) → {K: [v, …]} */
  function keyFields(body) {
    const out = {};
    for (const part of splitEsc(body, ';')) {
      const i = part.indexOf(':');
      if (i > 0) (out[part.slice(0, i).toUpperCase()] ||= []).push(part.slice(i + 1));
    }
    return out;
  }
  function normDate(v, noYear) {
    let m;
    if ((m = /^(\d{4})-?(\d{2})-?(\d{2})/.exec(v))) return `${noYear ? '-' : m[1]}-${m[2]}-${m[3]}`;
    if ((m = /^--(\d{2})-?(\d{2})/.exec(v))) return `--${m[1]}-${m[2]}`;
    return '';
  }
  const pick = (types, list, dflt) => list.find(t => types.includes(t)) || dflt;
  const SOCIAL = ['linkedin', 'x', 'instagram', 'facebook', 'github', 'tiktok', 'youtube', 'mastodon', 'threads', 'bluesky'];
  const LINE = /^(?:([\w-]+)\.)?([^:;]+)((?:;[^:]*)?):([\s\S]*)$/;   // [group.]PROP[;params]:value
  const unfold = t => t.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  // Apple marks "no year" with a placeholder year named in X-APPLE-OMIT-YEAR.
  const omitsYear = (params, val) => { const y = /x-apple-omit-year=(\d{4})/.exec(params)?.[1]; return !!y && val.startsWith(y); };

  function parseVCard(t) {
    const d = { phones: [], emails: [], addresses: [], urls: [], social: [] };
    const lines = unfold(t), labels = {};
    for (const line of lines) {
      const m = LINE.exec(line);
      if (m && m[1] && /^X-ABLABEL$/i.test(m[2])) labels[m[1]] = m[4].toLowerCase();
    }
    for (const line of lines) {
      const m = LINE.exec(line);
      if (!m) continue;
      const [, grp, rawProp, rawParams, val] = m;
      const prop = rawProp.toUpperCase(), params = rawParams.toLowerCase();
      const types = params.replace(/type=/g, '').split(/[;,="]+/).filter(Boolean);
      const parts = splitEsc(val, ';');
      const one = parts.join(';');
      switch (prop) {
        case 'N': [d.last, d.first, d.middle, d.prefix, d.suffix] = parts.map(s => s.trim()); break;
        case 'FN': d.fn = one; break;
        case 'NICKNAME': d.nickname = one; break;
        case 'ORG': [d.org = '', d.dept = ''] = parts; break;
        case 'TITLE': d.title = one; break;
        case 'ROLE': d.role = one; break;
        case 'NOTE': d.note = one; break;
        case 'TEL': d.phones.push({
          type: types.some(x => /cell|mobile|iphone/.test(x)) ? 'cell' : pick(types, ['fax', 'pager', 'main', 'work', 'home'], 'other'),
          value: val.replace(/^tel:/i, '') }); break;
        case 'EMAIL': d.emails.push({ type: pick(types, ['work', 'home'], 'other'), value: one }); break;
        case 'ADR': {
          const [pobox, ext, street, city, region, postal, country] = parts;
          d.addresses.push({ type: pick(types, ['work', 'home'], 'other'), pobox, ext, street, city, region, postal, country });
          break;
        }
        case 'URL': d.urls.push({ type: pick(types, ['work', 'home'], 'other'), value: one }); break;
        case 'X-SOCIALPROFILE': d.social.push({ type: pick(types, SOCIAL, 'other'), value: one }); break;
        case 'BDAY': d.bday = normDate(val, omitsYear(params, val)); break;
        case 'ANNIVERSARY': case 'X-ANNIVERSARY': d.anniv ||= normDate(val); break;
        case 'X-ABDATE': if (/anniversary/.test(labels[grp] || '')) d.anniv ||= normDate(val, omitsYear(params, val)); break;
      }
    }
    if (!d.first && !d.last && d.fn) { const w = d.fn.split(/\s+/); d.last = w.length > 1 ? w.pop() : ''; d.first = w.join(' '); }
    delete d.fn;
    if (!d.phones.length) d.phones.push({ type: 'cell', value: '' });
    if (!d.emails.length) d.emails.push({ type: 'work', value: '' });
    return d;
  }

  function parseMeCard(t) {
    const f = keyFields(t.replace(/^MECARD:/i, ''));
    const [last = '', first = ''] = (f.N?.[0] || '').split(',');
    return {
      last: last.trim(), first: first.trim(), nickname: f.NICKNAME?.[0] || '', org: f.ORG?.[0] || '', title: f.TITLE?.[0] || '',
      note: f.NOTE?.[0] || '', bday: normDate(f.BDAY?.[0] || ''),
      phones: (f.TEL || ['']).map(value => ({ type: 'cell', value })),
      emails: (f.EMAIL || ['']).map(value => ({ type: 'other', value })),
      urls: (f.URL || []).map(value => ({ type: 'other', value })),
      addresses: (f.ADR || []).map(a => {
        const [pobox, ext, street, city, region, postal, country] = a.split(',').map(s => s.trim());
        return { type: 'other', pobox, ext, street, city, region, postal, country };
      }),
      social: []
    };
  }

  function parseEvent(t) {
    const d = { summary: '', location: '', desc: '', allday: false, start: '', end: '' };
    const p2 = n => String(n).padStart(2, '0');
    const when = (val, params) => {
      const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/.exec(val);
      if (!m) return '';
      if (!m[4]) { d.allday = true; return `${m[1]}-${m[2]}-${m[3]}T00:00`; }
      const dt = m[7] ? new Date(Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5])) : new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5]);
      return `${dt.getFullYear()}-${p2(dt.getMonth() + 1)}-${p2(dt.getDate())}T${p2(dt.getHours())}:${p2(dt.getMinutes())}`;
    };
    for (const line of unfold(t)) {
      const m = LINE.exec(line);
      if (!m) continue;
      const [, , prop, params, val] = m;
      const text = splitEsc(val, '\u0000')[0];
      switch (prop.toUpperCase()) {
        case 'SUMMARY': d.summary = text; break;
        case 'LOCATION': d.location = text; break;
        case 'DESCRIPTION': d.desc = text; break;
        case 'DTSTART': d.start = when(val, params); break;
        case 'DTEND': d.end = when(val, params); break;
      }
    }
    return d;
  }

  function parseMailto(t) {
    const [addr, query = ''] = t.slice(7).split('?');
    const d = { to: safeDecode(addr), cc: '', bcc: '', subject: '', body: '' };
    for (const kv of query.split('&')) {
      const [k, v = ''] = kv.split('=');
      const key = k.toLowerCase();
      if (key in d && key !== 'to') d[key] = safeDecode(v);
    }
    return d;
  }

  /** Recognise any payload this app can make (and common variants) → {type, data}. */
  function parseQr(raw) {
    const t = raw.trim();
    let m;
    if (/^WIFI:/i.test(t)) {
      const f = keyFields(t.slice(5));
      const T = (f.T?.[0] || '').toUpperCase();
      return { type: 'wifi', data: { ssid: f.S?.[0] || '', auth: T === 'WEP' ? 'WEP' : !T || T === 'NOPASS' ? 'nopass' : 'WPA', pass: f.P?.[0] || '', hidden: /^true$/i.test(f.H?.[0] || '') } };
    }
    if (/^BEGIN:VCARD/i.test(t)) return { type: 'vcard', data: parseVCard(t) };
    if (/^MECARD:/i.test(t)) return { type: 'vcard', data: parseMeCard(t) };
    if (/BEGIN:VEVENT/i.test(t)) return { type: 'event', data: parseEvent(t) };
    if (/^mailto:/i.test(t)) return { type: 'email', data: parseMailto(t) };
    if (/^MATMSG:/i.test(t)) {
      const f = keyFields(t.slice(7));
      return { type: 'email', data: { to: f.TO?.[0] || '', cc: '', bcc: '', subject: f.SUB?.[0] || '', body: f.BODY?.[0] || '' } };
    }
    if ((m = /^SMSTO:([^:]*):?([\s\S]*)$/i.exec(t))) return { type: 'sms', data: { number: m[1], message: m[2] } };
    if ((m = /^sms:([^?&]*)(?:[?&]body=([\s\S]*))?$/i.exec(t))) return { type: 'sms', data: { number: safeDecode(m[1]), message: safeDecode(m[2] || '') } };
    if ((m = /^tel:(.+)$/i.exec(t))) return { type: 'phone', data: { number: m[1] } };
    if ((m = /^geo:(-?[\d.]+),(-?[\d.]+)/i.exec(t))) return { type: 'geo', data: { lat: m[1], lng: m[2] } };
    if (/^(https?:\/\/|www\.)\S+$/i.test(t)) return { type: 'url', data: { url: t } };
    return { type: 'text', data: { text: raw } };
  }

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
   * Die & backdrop sheet (changes apply live)
   * ================================================================ */
  const lookSheet = $('#lookSheet');
  $('#materialList').innerHTML = Object.entries(MATERIALS)
    .map(([k, m]) => `<label><input type="radio" name="material" value="${k}"><span>${m.name}</span></label>`).join('');

  function syncLookForm() {
    const el = lookSheet.elements;
    el.material.value = state.look.material;
    el.die.value = state.look.die;
    el.backdrop.value = state.look.backdrop;
  }
  function openLook() {
    closeMenu();
    syncLookForm();
    lookSheet.classList.add('open');
    backdrop.classList.add('open', 'clear');
    document.body.classList.add('looking');   // CSS slides the die out of the sheet's way
  }
  function closeLook() {
    if (!lookSheet.classList.contains('open')) return;
    lookSheet.classList.remove('open');
    backdrop.classList.remove('open', 'clear');
    document.body.classList.remove('looking');
    document.activeElement?.blur?.();
    scrollTo(0, 0);
    resetGesture();
  }

  const applyLookSoon = debounce(() => { applyLook(); save(); }, 120);
  lookSheet.addEventListener('input', e => {
    const { name, value } = e.target;
    if (name === 'material') {
      // Switching material also switches to its typical colour, unless you picked your own.
      if (state.look.die.toLowerCase() === MATERIALS[state.look.material].color) {
        state.look.die = MATERIALS[value].color;
        lookSheet.elements.die.value = state.look.die;
      }
      state.look.material = value;
    }
    if (name === 'die' || name === 'backdrop') state.look[name] = value.toLowerCase();
    applyLookSoon();
  });
  lookSheet.addEventListener('submit', e => { e.preventDefault(); closeLook(); });
  lookSheet.addEventListener('click', e => {
    if (!e.target.closest('[data-act="look-reset"]')) return;
    state.look = { ...DEFAULT_LOOK };
    syncLookForm();
    applyLook();
    save();
  });

  /* ================================================================
   * Menu: backup / restore / reset
   * ================================================================ */
  const menu = $('#menu');
  const menuBtn = $('#menuBtn');
  function closeMenu() { menu.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }
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
    if (act === 'reset') resetView();
    if (act === 'import') $('#importFile').click();
    if (act === 'export') {
      const json = JSON.stringify({ app: 'qr-cube', version: 1, faces: state.faces, look: state.look }, null, 2);
      const name = `qr-cube-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const file = new File([json], name, { type: 'application/json' });
      if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'QR Cube backup' }); return; } catch { /* fall through */ }
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
      if (!isObj(data) || !Array.isArray(data.faces) || data.faces.length !== 6) throw new Error();
      if (!confirm('Replace all six sides with this backup?')) return;
      const prev = state;
      // Anything malformed in the file is dropped or reset rather than stored.
      state = { ...cleanState({ ...data, look: data.look || state.look }), q3: state.q3 };
      if (!save()) { state = prev; return; }
      applyLook();
    } catch {
      alert('That file is not a valid QR Cube backup.');
    }
  });

  /* ================================================================
   * Boot
   * ================================================================ */
  applyQ();
  applyLook();
  refreshFavicons();

  const native = window.Capacitor?.isNativePlatform?.();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !native) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
