// AVIF q50 against q45 (sharp effort 4, as Astro): bytes and PSNR for every photo at the widths the site delivers, and
// side-by-side crops (q50 | q45, each 1:1 and magnified 2x) into the output folder for a look.
// usage: node q-compare.mjs outdir
import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('/Users/timo.alts/dev/bike-one-shop/website/package.json');
const sharp = require('sharp');
const PH = '/Users/timo.alts/dev/bike-one-shop/website/src/assets/photos';
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const WIDTHS = { 'hero': [640, 960, 1440, 1920], 'fitting': [480, 768, 1024, 1440, 1920], default: [480, 768, 1024, 1440] };
const psnr = async (a, b) => { const A = await sharp(a).removeAlpha().raw().toBuffer(); const B = await sharp(b).removeAlpha().raw().toBuffer(); let s = 0; for (let i = 0; i < A.length; i++) { const d = A[i] - B[i]; s += d * d; } const mse = s / A.length; return 10 * Math.log10(255 * 255 / mse); };
let tot50 = 0, tot45 = 0;
for (const f of fs.readdirSync(PH).filter((n) => n.endsWith('.jpg'))) {
  const name = f.replace('.jpg', '');
  const meta = await sharp(path.join(PH, f)).metadata();
  const row = [];
  for (const w of (WIDTHS[name] ?? WIDTHS.default).filter((w) => w <= meta.width)) {
    const base = await sharp(path.join(PH, f)).resize(w).png().toBuffer();
    const a50 = await sharp(base).avif({ quality: 50, effort: 4 }).toBuffer();
    const a45 = await sharp(base).avif({ quality: 45, effort: 4 }).toBuffer();
    tot50 += a50.length; tot45 += a45.length;
    const p50 = await psnr(await sharp(a50).png().toBuffer(), base), p45 = await psnr(await sharp(a45).png().toBuffer(), base);
    row.push(`${w}: ${(a50.length / 1024).toFixed(1)} -> ${(a45.length / 1024).toFixed(1)} KB (${((a45.length / a50.length - 1) * 100).toFixed(0)}%) psnr ${p50.toFixed(1)}/${p45.toFixed(1)}`);
    if (w === 768 || w === 1440) {
      // centre crop 360x240, original | q50 | q45, 1:1 then 2x magnified, stacked
      const meta2 = await sharp(base).metadata();
      const region = { left: Math.max(0, Math.round(meta2.width / 2 - 180)), top: Math.max(0, Math.round(meta2.height / 2 - 120)), width: 360, height: 240 };
      const crop = async (buf) => sharp(await sharp(buf).png().toBuffer()).extract(region).resize(720, 480, { kernel: 'nearest' }).png().toBuffer();
      const [c0, c50, c45] = [await crop(base), await crop(a50), await crop(a45)];
      await sharp({ create: { width: 2160 + 20, height: 480, channels: 3, background: '#fff' } }).composite([{ input: c0, left: 0, top: 0 }, { input: c50, left: 730, top: 0 }, { input: c45, left: 1460, top: 0 }]).png().toFile(path.join(out, `${name}-${w}-orig-q50-q45.png`));
    }
  }
  console.log(name.padEnd(14), row.join(' | '));
}
console.log(`TOTAL q50 ${(tot50 / 1024).toFixed(0)} KB, q45 ${(tot45 / 1024).toFixed(0)} KB (${((tot45 / tot50 - 1) * 100).toFixed(1)} %)`);
