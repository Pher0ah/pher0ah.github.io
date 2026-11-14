export const clone = o => JSON.parse(JSON.stringify(o));
export const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
export const rgbHex = c => '#' + c.map(v => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('');
export function debounce(fn, ms) {
  let timer, args;
  const cancel = () => { clearTimeout(timer); timer = undefined; args = undefined; };
  const flush = () => { if (!args) return; const current = args; cancel(); return fn(...current); };
  const run = (...next) => { cancel(); args = next; timer = setTimeout(flush, ms); };
  run.cancel = cancel; run.flush = flush;
  return run;
}
