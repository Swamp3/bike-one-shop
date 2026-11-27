import fs from 'node:fs';
const sharp = (await import('/Users/timo.alts/dev/bike-one-shop/website/node_modules/sharp/dist/index.mjs')).default;
const P = '/Users/timo.alts/dev/bike-one-shop/website/src/assets/photos/';
const psnr = async (buf, refBuf, w, h) => { const a = await sharp(buf).resize(w, h).removeAlpha().raw().toBuffer(); const r = await sharp(refBuf).resize(w, h).removeAlpha().raw().toBuffer(); let se = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - r[i]; se += d * d; } return 10 * Math.log10(255 * 255 / (se / a.length)); };
const tot = { 50: 0, 45: 0, 40: 0, 35: 0 }; const ps = { 50: [], 45: [], 40: [], 35: [] };
for (const f of fs.readdirSync(P)) {
  const src = fs.readFileSync(P + f); const m = await sharp(src).metadata();
  for (const w of [480, 768, 1024, 1440]) {
    if (w > m.width) continue;
    const ref = await sharp(src).resize(w).png().toBuffer(); const rm = await sharp(ref).metadata();
    for (const q of [50, 45, 40, 35]) { const b = await sharp(src).resize(w).avif({ quality: q, effort: 4 }).toBuffer(); tot[q] += b.length; ps[q].push(await psnr(b, ref, rm.width, rm.height)); }
  }
}
const base = tot[50];
for (const q of [50, 45, 40, 35]) console.log('avif q' + q, 'sum over all photo x width variants:', tot[q], ((tot[q] / base - 1) * 100).toFixed(0) + '%', 'mean PSNR', (ps[q].reduce((a, b) => a + b, 0) / ps[q].length).toFixed(1));
