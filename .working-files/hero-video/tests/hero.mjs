// usage: node hero.mjs chrome|webkit [base]   (review server on :4321 serves dist/, incl. /VidOne.mp4)
import { chromium, webkit } from '/Users/timo.alts/dev/astro-conversion-kit/node_modules/playwright/index.mjs';
const [kind = 'chrome', base = 'http://localhost:4321'] = process.argv.slice(2);
const b = kind === 'webkit' ? await webkit.launch() : await chromium.launch({ channel: 'chrome' });
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const external = [];
page.on('request', (r) => { if (!r.url().startsWith(base) && /bike-one\.org/.test(r.url())) external.push(r.url()); });
const vreq = [];
page.on('response', (r) => { if (/VidOne\.mp4/.test(r.url())) vreq.push(`${r.status()} ${r.url()}`); });
console.log(kind, b.version(), 'canPlay hvc1:', await page.evaluate(() => document.createElement('video').canPlayType('video/mp4; codecs="hvc1.1.6.L93.B0"') || 'no'));
await page.goto(base + '/', { waitUntil: 'load' });
console.log('canPlay hvc1:', await page.evaluate(() => document.createElement('video').canPlayType('video/mp4; codecs="hvc1.1.6.L93.B0"') || 'no'));
const state = () => page.evaluate(() => [...document.querySelectorAll('rs-slide video')].map((v) => ({ src: v.currentSrc.replace(location.origin, ''), paused: v.paused, muted: v.muted, ready: v.readyState, t: +v.currentTime.toFixed(2), op: getComputedStyle(v).opacity, err: v.error && v.error.code })));
let last = 0;
for (const t of [2000, 4000, 6000]) { await page.waitForTimeout(t - last); last = t; console.log('t+', t, JSON.stringify(await state())); }
await page.screenshot({ path: `/Users/timo.alts/dev/bike-one-shop/website/review/hero-${kind}-noclick.png` });
console.log('VidOne responses', JSON.stringify(vreq), 'requests to bike-one.org:', JSON.stringify(external));
await b.close();
