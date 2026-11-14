import { TYPES } from './formats.js';
export function createStorage({ MATERIALS, DEFAULT_LOOK, newId = () => Math.random().toString(36).slice(2, 10) }) {
  /* ---- Validation of stored and imported data (a bad backup must not break the app) ---- */
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const isHex = v => typeof v === 'string' && /^#[\da-f]{6}$/i.test(v);
  const str = v => (typeof v === 'string' ? v : '');
  const num = (v, d, lo, hi) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
  const imgUrl = v => (typeof v === 'string' && /^(data:image\/|https?:)/i.test(v) ? v : '');
  const MAX_CARDS = 60;
  /** Rebuild form data from a type's field schema: only known fields survive; a select
   *  always holds one of its options, a checkbox a boolean, everything else a string,
   *  and each list entry (phone, email…) is rebuilt from its own fields the same way. */
  function fitToSchema(spec, d) {
    const out = {};
    if (!isObj(d)) return out;
    const walk = list => list.forEach(f => {
      if (f.row) return walk(f.row);
      if (f.group) {
        if (Array.isArray(d[f.group])) out[f.group] = d[f.group].filter(isObj).map(item => fitToSchema(f.fields, item));
        return;
      }
      const v = d[f.k];
      if (f.type === 'checkbox') out[f.k] = v === true;
      else if (f.type === 'select') out[f.k] = f.opts.some(([o]) => o === v) ? v : f.opts[0][0];
      else out[f.k] = typeof v === 'string' ? v : Number.isFinite(v) ? String(v) : '';
    });
    walk(spec);
    return out;
  }
  /** `fallback` is the look a card gets when it has none of its own: a side of the
   *  die version takes the die's material and colour. */
  function cleanCard(f, fallback) {
    if (!isObj(f) || !Object.hasOwn(TYPES, f.type)) return null;
    const L = isObj(f.logo) ? f.logo : {};
    const logo = { mode: ['none', 'file', 'favicon'].includes(L.mode) ? L.mode : 'none', src: imgUrl(L.src), fav: imgUrl(L.fav), favFor: str(L.favFor) };
    if (imgUrl(L.orig)) logo.orig = L.orig;
    if (isObj(L.fit)) {
      const F = L.fit;
      logo.fit = { fit: F.fit === 'cover' ? 'cover' : 'contain', zoom: num(F.zoom, 1, 0.3, 4), x: num(F.x, 0, -2, 2), y: num(F.y, 0, -2, 2),
                   shape: ['square', 'rounded', 'circle'].includes(F.shape) ? F.shape : 'square', bg: F.bg === 'white' ? 'white' : 'none' };
    }
    const own = Object.hasOwn(MATERIALS, f.material), material = own ? f.material : fallback.material;
    return { id: typeof f.id === 'string' && /^[\w-]{1,24}$/.test(f.id) ? f.id : newId(),
             type: f.type, label: str(f.label).slice(0, 60), data: fitToSchema(TYPES[f.type].fields, f.data), logo,
             inkMode: f.inkMode === 'custom' ? 'custom' : 'auto', fg: isHex(f.fg) ? f.fg : '#000000',
             ecc: ['L', 'M', 'Q', 'H'].includes(f.ecc) ? f.ecc : 'M',
             material, color: isHex(f.color) ? f.color.toLowerCase() : (!own && fallback.color) || MATERIALS[material].color };
  }
  function cleanState(s) {
    const L = isObj(s?.look) ? s.look : {};
    const material = Object.hasOwn(MATERIALS, L.material) ? L.material : Object.keys(MATERIALS)[0];
    const fallback = { material, color: isHex(L.die) ? L.die.toLowerCase() : '' };
    // `faces` is the die version's six sides (empty ones are null): each filled side becomes a card.
    const source = Array.isArray(s?.cards) ? s.cards : Array.isArray(s?.faces) ? s.faces : [];
    const cards = source.map(c => cleanCard(c, fallback)).filter(Boolean).slice(0, MAX_CARDS);
    const seen = new Set();
    for (const c of cards) { while (seen.has(c.id)) c.id = newId(); seen.add(c.id); }
    return { cards, look: { backdrop: isHex(L.backdrop) ? L.backdrop.toLowerCase() : DEFAULT_LOOK.backdrop } };
  }

return { cleanState };
}
