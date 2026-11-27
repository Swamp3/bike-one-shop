import fs from 'node:fs';
const { chromium } = await import('/Users/timo.alts/dev/astro-conversion-kit/node_modules/playwright/index.mjs');
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage();
await p.route((u) => !u.href.startsWith('http://127.0.0.1:4400'), (r) => r.abort());
await p.goto('http://127.0.0.1:4400/frame.html');
await p.evaluate(() => { document.getElementById('v').src = '/orig.mp4'; });
await p.waitForFunction(() => document.getElementById('v').readyState >= 2, null, { timeout: 90000 });
const FPS = 24, START = 3.5, N = 192;
for (let i = 0; i < N; i++) {
  const d = await p.evaluate(([t]) => new Promise((res) => { const v = document.getElementById('v'); v.onseeked = () => { const c = document.createElement('canvas'); c.width = 960; c.height = 540; c.getContext('2d').drawImage(v, 0, 0, 960, 540); res(c.toDataURL('image/png')); }; v.currentTime = t; }), [START + i / FPS]);
  fs.writeFileSync(`/private/tmp/claude-501/-Users-timo-alts-dev-bike-one-shop/aa170a22-13b0-4ee8-a900-0d065cfc8013/scratchpad/pm/anim24/f${String(i).padStart(3, '0')}.png`, Buffer.from(d.split(',')[1], 'base64'));
}
await b.close();
