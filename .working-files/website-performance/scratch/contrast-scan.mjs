// Contrast of the white hero text against every 0.25 s frame of the film (same method as tools/checks/ui.mjs: 98th percentile
// luminance of the pixels behind each text box, copy hidden). usage: node contrast-scan.mjs [width]
import { createRequire } from 'node:module';
const W = '/Users/timo.alts/dev/bike-one-shop/website';
const { PNG } = createRequire(`${W}/package.json`)('pngjs');
const { PLAYWRIGHT, BASE, abortForeign } = await import(`${W}/tools/lib/browser.mjs`);
const { luminance } = await import(`${W}/tools/lib/contrast.mjs`);
const { chromium } = await import(PLAYWRIGHT);
const width = Number(process.argv[2] ?? 1440);
const browser = await chromium.launch({ channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width, height: 900 } })).newPage(); await abortForeign(page);
await page.goto(BASE + '/', { waitUntil: 'load' });
await page.waitForFunction(() => document.querySelector('.hero-video')?.classList.contains('is-playing'), null, { timeout: 15000 });
await page.click('.hero-toggle');
const boxes = await page.evaluate(() => ['.hero h1', '.hero .eyebrow-light', '.hero .btn--ghost'].map((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { s, x: r.left, y: r.top + scrollY, width: r.width, height: r.height }; }));
await page.addStyleTag({ content: '.hero .copy { visibility: hidden !important; }' });
const worst = {};
for (let t = 0; t < 8; t += 0.25) {
  await page.evaluate(async (time) => { const v = document.querySelector('.hero-video'); v.pause(); v.currentTime = time; await new Promise((r) => v.addEventListener('seeked', r, { once: true })); await v.play(); await new Promise((r) => v.requestVideoFrameCallback(() => { v.pause(); r(); })); }, t);
  const png = PNG.sync.read(await page.screenshot({ fullPage: true }));
  for (const b of boxes) {
    const vals = [];
    for (let y = Math.floor(b.y); y < Math.ceil(b.y + b.height); y += 2) for (let x = Math.floor(b.x); x < Math.ceil(b.x + b.width); x += 2) { const i = (y * png.width + x) * 4; vals.push(luminance([png.data[i], png.data[i + 1], png.data[i + 2]])); }
    vals.sort((a, c) => a - c); const L = vals[Math.floor(vals.length * 0.98)]; const c = 1.05 / (L + 0.05);
    if (!worst[b.s] || c < worst[b.s].c) worst[b.s] = { c: +c.toFixed(2), t };
  }
}
console.log(width, JSON.stringify(worst));
await browser.close();
