import { execFileSync } from 'node:child_process'; import fs from 'node:fs';
const sharp = (await import('/Users/timo.alts/dev/bike-one-shop/website/node_modules/sharp/dist/index.mjs')).default;
for (const q of [30, 45, 60, 75]) {
  const res = [];
  for (const i of [0, 17, 35]) {
    execFileSync('avifdec', ['--index', String(i), `out/anim_${q}.avif`, `out/dec_${q}_${i}.png`], { stdio: 'ignore' });
    const a = await sharp(`out/dec_${q}_${i}.png`).removeAlpha().raw().toBuffer(); const r = await sharp(`anim/f${String(i).padStart(3, '0')}.png`).removeAlpha().raw().toBuffer();
    let se = 0; for (let k = 0; k < a.length; k++) { const d = a[k] - r[k]; se += d * d; } res.push((10 * Math.log10(255 * 255 / (se / a.length))).toFixed(1));
  }
  console.log('animated avif q' + q, fs.statSync(`out/anim_${q}.avif`).size, 'PSNR frames 0/17/35:', res.join(' / '));
}
