// Sum of wasted AVIF bytes (chosen file minus the smallest candidate that still covers the needed pixels) per viewport x DPR,
// and of missing density (needed px not covered). usage: node waste.mjs images.json [more.json]
import fs from 'node:fs'; import path from 'node:path';
const DIST = '/Users/timo.alts/dev/bike-one-shop/website/dist';
const size = (u) => { try { return fs.statSync(path.join(DIST, new URL(u, 'http://x').pathname)).size; } catch { return 0; } };
const parse = (ss) => ss.split(',').map((s) => s.trim().split(/\s+/)).filter((c) => c[1]).map(([u, w]) => ({ u, w: parseInt(w) }));
for (const f of process.argv.slice(2)) {
  const { rows } = JSON.parse(fs.readFileSync(f, 'utf8'));
  const tot = {}; const seen = new Set();
  for (const r of rows) {
    if (!r.inPicture || r.hidden) continue;
    const av = r.srcsets.find((s) => s.type === 'image/avif'); if (!av) continue;
    const k = `${r.url}|${r.cur}|${r.width}@${r.dpr}`; if (seen.has(k)) continue; seen.add(k);
    const c = parse(av.srcset);
    let need = r.w * r.dpr;
    if (r.cls.includes('bg')) need = Math.max(r.w, r.h * (r.wa / r.ha)) * r.dpr;
    const chosen = c.find((x) => r.cur.endsWith(x.u.split('/').pop())) || c[0];
    const ideal = c.find((x) => x.w >= need) || c.at(-1);
    const key = `${r.width}@${r.dpr}`;
    tot[key] ??= { waste: 0, under: 0 };
    tot[key].waste += Math.max(0, size(chosen.u) - size(ideal.u));
    if (chosen.w < 0.9 * need) tot[key].under += 1;
  }
  console.log(f.split('/').pop(), Object.entries(tot).map(([k, v]) => `${k}: waste ${(v.waste / 1024).toFixed(0)} KB, under-dense ${v.under}`).join(' | '));
}
