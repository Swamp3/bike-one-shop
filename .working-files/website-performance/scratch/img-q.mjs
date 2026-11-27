import fs from 'node:fs';
const sharp = (await import('/Users/timo.alts/dev/bike-one-shop/website/node_modules/sharp/dist/index.mjs')).default;
const P = '/Users/timo.alts/dev/bike-one-shop/website/src/assets/photos/';
const psnr = async (buf, refBuf, w, h) => { const a = await sharp(buf).resize(w, h).removeAlpha().raw().toBuffer(); const r = await sharp(refBuf).resize(w, h).removeAlpha().raw().toBuffer(); let se = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - r[i]; se += d * d; } return (10 * Math.log10(255 * 255 / (se / a.length))).toFixed(1); };
const w = 1440;
const src = fs.readFileSync(P + 'hero.jpg');
const ref = await sharp(src).resize(w).png().toBuffer();
const m = await sharp(ref).metadata();
console.log('hero 1440 wide, delivered avif 50786, webp 84254, jpg 136564');
for (const q of [35, 45, 50, 60, 70, 80]) { const b = await sharp(src).resize(w).avif({ quality: q, effort: 4 }).toBuffer(); console.log('avif q' + q, b.length, 'PSNR', await psnr(b, ref, m.width, m.height)); }
for (const q of [60, 70, 75, 80]) { const b = await sharp(src).resize(w).webp({ quality: q }).toBuffer(); console.log('webp q' + q, b.length, await psnr(b, ref, m.width, m.height)); }
for (const q of [60, 70, 75, 80]) { const b = await sharp(src).resize(w).jpeg({ quality: q, mozjpeg: true }).toBuffer(); console.log('jpeg(moz) q' + q, b.length, await psnr(b, ref, m.width, m.height)); }
const sj = await sharp(src).metadata(); console.log('source hero.jpg', src.length, sj.width, sj.height);
