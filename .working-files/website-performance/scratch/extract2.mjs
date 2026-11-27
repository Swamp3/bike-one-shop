import fs from 'node:fs';
const { chromium } = await import('/Users/timo.alts/dev/astro-conversion-kit/node_modules/playwright/index.mjs');
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage();
await p.route((u) => !u.href.startsWith('http://127.0.0.1:4400'), (r) => r.abort());
await p.goto('http://127.0.0.1:4400/frame.html');
await p.evaluate(() => { document.getElementById('v').src = '/orig.mp4'; });
await p.waitForFunction(() => document.getElementById('v').readyState >= 2, null, { timeout: 90000 });
console.log(await p.evaluate(() => ({ w: document.getElementById('v').videoWidth, h: document.getElementById('v').videoHeight, d: document.getElementById('v').duration })));
for (const t of [0, 3.5]) {
  const d = await p.evaluate((t) => new Promise((res) => { const v = document.getElementById('v'); v.onseeked = () => { const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0); res(c.toDataURL('image/png')); }; v.currentTime = t; }), t);
  fs.writeFileSync(`frames/orig_${t}.png`, Buffer.from(d.split(',')[1], 'base64'));
}
await b.close();
