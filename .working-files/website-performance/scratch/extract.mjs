import fs from 'node:fs';
const { chromium } = await import('/Users/timo.alts/dev/astro-conversion-kit/node_modules/playwright/index.mjs');
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage();
await p.route((u) => !u.href.startsWith('http://127.0.0.1:4400'), (r) => r.abort());
await p.goto('http://127.0.0.1:4400/frame.html');
const info = await p.evaluate(() => new Promise((res) => { const v = document.getElementById('v'); const go = () => res({ d: v.duration, w: v.videoWidth, h: v.videoHeight }); if (v.readyState >= 2) go(); else v.onloadeddata = go; }));
console.log(info);
for (const t of [0, 3, 6.5, 10, info.d - 0.05]) {
  const data = await p.evaluate((t) => new Promise((res) => { const v = document.getElementById('v'); v.onseeked = () => { const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0); res(c.toDataURL('image/png')); }; v.currentTime = t; }), t);
  fs.writeFileSync(`frames/f_${t.toFixed(2)}.png`, Buffer.from(data.split(',')[1], 'base64'));
}
await b.close();
