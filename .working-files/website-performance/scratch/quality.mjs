import fs from 'node:fs';
const sharp = (await import('/Users/timo.alts/dev/bike-one-shop/website/node_modules/sharp/dist/index.mjs')).default;
const { chromium } = await import('/Users/timo.alts/dev/astro-conversion-kit/node_modules/playwright/index.mjs');
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage();
await p.route((u) => !u.href.startsWith('http://127.0.0.1:4400'), (r) => r.abort());
const files = process.argv.slice(2);
const times = [1, 3.5, 5.5, 7.5];
const grab = async (file) => {
  await p.goto('about:blank');
  await p.goto('http://127.0.0.1:4400/frame.html');
  await p.evaluate((f) => { document.getElementById('v').src = '/' + f; }, file);
  await p.waitForFunction(() => document.getElementById('v').readyState >= 2, null, { timeout: 60000 });
  const out = [];
  for (const t of times) {
    const d = await p.evaluate((t) => new Promise((res) => { const v = document.getElementById('v'); v.onseeked = () => { const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0); res(c.toDataURL('image/png')); }; v.currentTime = t; }), t);
    out.push(Buffer.from(d.split(',')[1], 'base64'));
  }
  return out;
};
const ref = await grab('hero720.mp4');
fs.mkdirSync('frames/q', { recursive: true });
for (const f of files) {
  const fr = await grab(f);
  const res = [];
  for (let i = 0; i < times.length; i++) {
    const m = await sharp(fr[i]).metadata();
    const a = await sharp(fr[i]).removeAlpha().raw().toBuffer();
    const r = await sharp(ref[i]).resize(m.width, m.height).removeAlpha().raw().toBuffer();
    let se = 0; for (let k = 0; k < a.length; k++) { const d = a[k] - r[k]; se += d * d; }
    res.push((10 * Math.log10(255 * 255 / (se / a.length))).toFixed(1));
    if (i === 1) await sharp(fr[i]).extract({ left: Math.round(m.width * 0.3), top: Math.round(m.height * 0.2), width: Math.round(m.width * 0.4), height: Math.round(m.height * 0.5) }).png().toFile(`frames/q/${f}.png`);
  }
  console.log(f.padEnd(30), (fs.statSync('media/' + f).size / 1048576).toFixed(2), 'MiB', 'PSNR vs 720p ref @t', times.join('/'), res.join(' / '));
}
await b.close();
