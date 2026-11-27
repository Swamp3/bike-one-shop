import fs from 'node:fs';
const sharp = (await import('/Users/timo.alts/dev/bike-one-shop/website/node_modules/sharp/dist/index.mjs')).default;
const SP = process.argv[2];
fs.mkdirSync(SP + '/sim/_astro', { recursive: true });
const rows = [];
for (const [name, file] of [['ff0', 'frames/orig_0.png'], ['ff35', 'frames/orig_3.5.png']]) {
  for (const w of [640, 960, 1440, 1920]) {
    for (const q of (name === 'ff0' ? [35, 45, 50, 60] : [50])) {
      const b = await sharp(file).resize(w).avif({ quality: q, effort: 4 }).toBuffer();
      if (q === 50) fs.writeFileSync(`${SP}/sim/_astro/${name}_${w}.avif`, b);
      rows.push({ name, fmt: 'avif', q, w, bytes: b.length });
    }
    if (name === 'ff0') {
      for (const q of [70, 80]) rows.push({ name, fmt: 'webp', q, w, bytes: (await sharp(file).resize(w).webp({ quality: q }).toBuffer()).length });
      rows.push({ name, fmt: 'jpeg', q: 80, w, bytes: (await sharp(file).resize(w).jpeg({ quality: 80 }).toBuffer()).length });
    }
  }
}
for (const r of rows) console.log(r.name, r.fmt, 'q' + r.q, r.w, r.bytes);
// current poster for comparison (avif q50): 640 13069, 960 26976, 1440 50786, 1920 80432
