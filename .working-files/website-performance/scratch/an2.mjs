import fs from 'node:fs'; import path from 'node:path';
const DIST = '/Users/timo.alts/dev/bike-one-shop/website/dist';
const { rows } = JSON.parse(fs.readFileSync(process.argv[2] ?? 'images.json', 'utf8'));
const size = (u) => { try { return fs.statSync(path.join(DIST, new URL(u, 'http://x').pathname)).size; } catch { return 0; } };
const parse = (ss) => ss.split(',').map((s) => s.trim().split(/\s+/)).filter((c) => c[1]).map(([u, w]) => ({ u, w: parseInt(w) }));
const out = [];
for (const r of rows) {
  if (!r.inPicture) continue;
  const av = r.srcsets.find((s) => s.type === 'image/avif'); if (!av) continue;
  const c = parse(av.srcset);
  let need = r.w * r.dpr;
  if (r.cls.includes('bg')) need = Math.max(r.w, r.h * (r.wa / r.ha)) * r.dpr; // object-fit: cover
  const chosen = c.find((x) => r.cur.endsWith(x.u.split('/').pop())) || c[0];
  const ideal = c.find((x) => x.w >= need) || c.at(-1);
  const name = r.cur.split('/').pop().split('.')[0];
  out.push({ page: r.url.slice(0, 28), name, vp: r.width + '@' + r.dpr, need: Math.round(need), cw: chosen.w, iw: ideal.w, cb: size(chosen.u), ib: size(ideal.u), waste: size(chosen.u) - size(ideal.u), ratio: (chosen.w / need).toFixed(2), cls: r.cls });
}
const seen = new Set();
console.log('under-sized (chosen < 0.9 x needed px) or over-sized (chosen > ideal):');
for (const o of out) { const k = o.page + o.name + o.vp; if (seen.has(k)) continue; seen.add(k); if (o.cw < 0.9 * o.need || o.waste > 0) console.log(JSON.stringify(o)); }
