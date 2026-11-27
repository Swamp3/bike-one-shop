// Poster against the first presented video frame in Chrome: hero screenshot with the copy hidden, video shown (paused at 0) and
// video hidden (poster only). Mean absolute difference per channel (0..255) and share of values off by more than 24.
// usage: node swap.mjs [width] [outdir]
import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
const W = '/Users/timo.alts/dev/bike-one-shop/website';
const { PNG } = createRequire(`${W}/package.json`)('pngjs');
const { PLAYWRIGHT, BASE, abortForeign, applyHeaders } = await import(`${W}/tools/lib/browser.mjs`);
const { chromium } = await import(PLAYWRIGHT);
const width = Number(process.argv[2] ?? 1440); const out = process.argv[3];
const browser = await chromium.launch({ channel: 'chrome', args: (process.env.CHROME_ARGS ?? '').split(' ').filter(Boolean) });
const ctx = await browser.newContext({ viewport: { width, height: 900 } });
const page = await ctx.newPage(); await abortForeign(page);
// node swap.mjs 1440 outdir mp4: pretend the browser cannot play AV1, so the H.264 fallback is used
if (process.argv[4] === 'mp4') await page.addInitScript(() => { const orig = HTMLMediaElement.prototype.canPlayType; HTMLMediaElement.prototype.canPlayType = function (t) { return /webm/.test(t) ? '' : orig.call(this, t); }; });
await page.goto(BASE + '/', { waitUntil: 'load' });
await page.waitForFunction(() => document.querySelector('.hero-video')?.classList.contains('is-playing'), null, { timeout: 15000 });
const info = await page.evaluate(() => { const v = document.querySelector('.hero-video'); return { src: v.currentSrc.split('/').pop(), w: v.videoWidth, h: v.videoHeight }; });
// pause with the page's own button, so its script (IntersectionObserver, visibilitychange) does not resume the film
await page.click('.hero-toggle');
const mediaTime = await page.evaluate(async () => { const v = document.querySelector('.hero-video'); v.pause(); v.style.transition = 'none'; v.currentTime = 0; await new Promise((r) => v.addEventListener('seeked', r, { once: true })); await v.play(); return new Promise((r) => v.requestVideoFrameCallback((n, m) => { v.pause(); r(m.mediaTime); })); });
await page.addStyleTag({ content: '.hero .copy, .hero-toggle { visibility: hidden !important; } .hero::after { display: none !important; } html { scroll-behavior: auto !important; }' });
await page.waitForTimeout(400);
const hero = await page.locator('.hero').boundingBox();
const shot = async (name) => { const buf = await page.screenshot({ clip: { x: 0, y: hero.y, width: hero.width, height: hero.height } }); if (out) fs.writeFileSync(path.join(out, name), buf); return PNG.sync.read(buf); };
const withVideo = await shot(`swap-${width}-video-frame0.png`);
await page.evaluate(() => { document.querySelector('.hero-video').style.visibility = 'hidden'; });
await page.waitForTimeout(300);
const poster = await shot(`swap-${width}-poster.png`);
let sum = 0, over = 0, n = 0;
for (let i = 0; i < poster.data.length; i += 4) for (let c = 0; c < 3; c++) { const d = Math.abs(poster.data[i + c] - withVideo.data[i + c]); sum += d; if (d > 24) over++; n++; }
console.log(JSON.stringify({ width, ...info, mediaTime: +mediaTime.toFixed(3), hero: `${Math.round(hero.width)}x${Math.round(hero.height)}`, meanDiff: +(sum / n).toFixed(2), overShare: +(over / n * 100).toFixed(2) }));
await browser.close();
