import { hexRgb } from './utils.js';
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
  const patterns = new Map();
  function paintSurface(material, color, seed) {
    const c = document.createElement('canvas');
    c.width = c.height = SURF;
    const x = c.getContext('2d'), img = x.createImageData(SURF, SURF), d = img.data;
    const key = material + '|' + seed;
    let pattern = patterns.get(key);
    const fresh = !pattern;
    if (fresh) pattern = new Float32Array(SURF * SURF * 2);
    const n = fresh && !['matte', 'glossy'].includes(material) ? makeNoise(seed) : null, r = rng(seed * 7 + 1);
    const base = hexRgb(color), vein = base.map(v => v * 0.45 + 0.12);   // marble veins: darker, greyer
    for (let v = 0, i = 0; v < SURF; v++) {
      for (let u = 0; u < SURF; u++, i += 4) {
        let k = 1, mix = 0;   // brightness factor, share of vein colour
        const pi = (v * SURF + u) * 2;
        if (!fresh) { k = pattern[pi]; mix = pattern[pi + 1]; }
        else switch (material) {
          case 'metal':   // brushed: fine streaks running across the card
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
        if (fresh) { pattern[pi] = k; pattern[pi + 1] = mix; }
        for (let ch = 0; ch < 3; ch++) d[i + ch] = Math.min(255, (base[ch] * (1 - mix) + vein[ch] * mix) * k * 255);
        d[i + 3] = 255;
      }
    }
    if (fresh) {
      if (patterns.size >= 16) patterns.delete(patterns.keys().next().value);
      patterns.set(key, pattern);
    }
    x.putImageData(img, 0, 0);
    return c;
  }


export { paintSurface };
