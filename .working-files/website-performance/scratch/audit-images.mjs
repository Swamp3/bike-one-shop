// Read-only image audit: every <img> per page at 390/768/1440 x DPR 1/2, from the review server (:4321). Foreign requests aborted.
import fs from 'node:fs';
import path from 'node:path';
const W = '/Users/timo.alts/dev/bike-one-shop/website';
const { pages } = await import(`${W}/tools/lib/dist.mjs`);
const { PLAYWRIGHT, BASE, abortForeign } = await import(`${W}/tools/lib/browser.mjs`);
const { chromium } = await import(PLAYWRIGHT);
const DIST = `${W}/dist`;
const size = (u) => { try { return fs.statSync(path.join(DIST, decodeURIComponent(new URL(u, 'http://x').pathname))).size; } catch { return 0; } };
const browser = await chromium.launch({ channel: 'chrome' });
const rows = [];
const foreign = [];
for (const p of pages()) {
  for (const width of [390, 768, 1440]) for (const dpr of [1, 2]) {
    const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, deviceScaleFactor: dpr });
    const page = await ctx.newPage();
    page.on('request', (r) => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:')) foreign.push(r.url()); });
    await abortForeign(page);
    await page.goto(BASE + p.url, { waitUntil: 'load' });
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 300) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } for (let k = 0; k < 40 && [...document.images].some((i) => !i.complete || !i.currentSrc); k++) await new Promise((r) => setTimeout(r, 100)); window.scrollTo(0, 0); await new Promise((r) => setTimeout(r, 200)); });
    const imgs = await page.evaluate(() => [...document.images].map((i) => {
      const r = i.getBoundingClientRect();
      const pic = i.closest('picture');
      const srcsets = pic ? [...pic.querySelectorAll('source')].map((s) => ({ type: s.type, srcset: s.srcset, sizes: s.sizes })) : [];
      return { cur: i.currentSrc, nat: i.naturalWidth, natH: i.naturalHeight, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top + scrollY), hidden: r.width === 0, loading: i.getAttribute('loading'), fp: i.getAttribute('fetchpriority'), dec: i.getAttribute('decoding'), wa: i.getAttribute('width'), ha: i.getAttribute('height'), alt: i.getAttribute('alt'), srcset: i.srcset, sizes: i.sizes, inPicture: !!pic, srcsets, cls: i.className };
    }));
    for (const i of imgs) rows.push({ url: p.url, width, dpr, vh: width === 390 ? 844 : 900, ...i, bytes: size(i.cur), ext: path.extname(new URL(i.cur || 'http://x/none').pathname) });
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(process.argv[2] ?? 'images.json', JSON.stringify({ rows, foreign }, null, 1));
console.log('rows', rows.length, 'foreign requests attempted', foreign.length, foreign.slice(0, 5));
