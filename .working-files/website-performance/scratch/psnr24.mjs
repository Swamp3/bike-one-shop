import { execFileSync } from 'node:child_process'; import fs from 'node:fs';
const sharp = (await import('/Users/timo.alts/dev/bike-one-shop/website/node_modules/sharp/dist/index.mjs')).default;
const D = process.argv[2];
for (const q of [35, 45]) {
  const res = [];
  for (const i of [0, 60, 120, 191]) {
    execFileSync('avifdec', ['--index', String(i), `${D}/a24_${q}.avif`, `${D}/dec_${q}_${i}.png`], { stdio: 'ignore' });
    const a = await sharp(`${D}/dec_${q}_${i}.png`).removeAlpha().raw().toBuffer(); const r = await sharp(`${D}/f${String(i).padStart(3, '0')}.png`).removeAlpha().raw().toBuffer();
    let se = 0; for (let k = 0; k < a.length; k++) { const d = a[k] - r[k]; se += d * d; } res.push((10 * Math.log10(255 * 255 / (se / a.length))).toFixed(1));
  }
  console.log('24fps animated avif q' + q, fs.statSync(`${D}/a24_${q}.avif`).size, 'PSNR frames 0/60/120/191:', res.join(' / '));
}
