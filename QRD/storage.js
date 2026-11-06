import { TYPES } from './formats.js';
export function createStorage({ STORE, MATERIALS, DEFAULT_LOOK, blankState }) {
  /* ---- Validation of stored and imported data (a bad backup must not break the app) ---- */
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const isHex = v => typeof v === 'string' && /^#[\da-f]{6}$/i.test(v);
  const str = v => (typeof v === 'string' ? v : '');
  const num = (v, d, lo, hi) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
  const imgUrl = v => (typeof v === 'string' && /^(data:image\/|https?:)/i.test(v) ? v : '');
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
    return { type: f.type, label: str(f.label).slice(0, 60), data: fitToSchema(TYPES[f.type].fields, f.data), logo,
             inkMode: f.inkMode === 'custom' ? 'custom' : 'auto', fg: isHex(f.fg) ? f.fg : '#000000',
             ecc: ['L', 'M', 'Q', 'H'].includes(f.ecc) ? f.ecc : 'M', rot: [0, 90, 180, 270].includes(f.rot) ? f.rot : 0 };
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

return { cleanState };
}
