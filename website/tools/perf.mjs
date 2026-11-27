// Measurement tool (not a gate): per page and viewport the LCP element and time, CLS, requests and bytes, from the
// review server (:4321, serves dist/, no compression: bytes are raw), in system Chrome and optionally WebKit and Firefox.
//   node tools/perf.mjs [--out file.json] [--pages /,/blog/] [--browsers chrome,webkit] [--throttle none|fast4g|slow4g]
// "load" = until the load event plus 1.5 s without scrolling (a video file is counted separately as `video`: the home hero's film
// starts after the load event, so at 1440 it shows up here only when the wait is long enough, decision d83); "scrolled" = after
// scrolling through the page so lazy images are fetched.
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { isMain, nativePages } from './lib/dist.mjs';

const BASE = (process.env.REVIEW_URL || 'http://localhost:4321').replace(/\/$/, '');
const PLAYWRIGHT = process.env.PLAYWRIGHT_MODULE || '/Users/timo.alts/dev/astro-conversion-kit/node_modules/playwright/index.mjs';
const PROFILES = {
  fast4g: { latency: 60, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 },
  slow4g: { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 },
};
const VIEWPORTS = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];

const observers = () => {
  window.__lcp = null; window.__cls = 0;
  new PerformanceObserver((list) => {
    const e = list.getEntries().at(-1);
    if (!e) return;
    const el = e.element;
    window.__lcp = { time: Math.round(e.startTime), size: e.size, url: e.url || '', tag: el ? el.tagName.toLowerCase() : '', cls: el?.className?.toString?.() ?? '', id: el?.id ?? '' };
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
};

const kind = (type, url) => (/\.(mp4|webm)$/.test(url) ? 'video' : /html/.test(type) ? 'html' : /css/.test(type) ? 'css' : /javascript/.test(type) ? 'js' : /font|woff/.test(type) ? 'font' : /image/.test(type) ? 'image' : 'other');

export async function measure({ browsers = ['chrome'], throttle = 'none', pages = nativePages().map((p) => p.url), viewports = VIEWPORTS } = {}) {
  const pw = await import(PLAYWRIGHT);
  const launch = { chrome: () => pw.chromium.launch({ channel: 'chrome' }), webkit: () => pw.webkit.launch(), firefox: () => pw.firefox.launch() };
  const rows = [];
  for (const bname of browsers) {
    const browser = await launch[bname]();
    for (const viewport of viewports) {
      for (const url of pages) {
        const context = await browser.newContext({ viewport });
        const page = await context.newPage();
        if (throttle !== 'none' && bname === 'chrome') {
          const cdp = await context.newCDPSession(page);
          await cdp.send('Network.enable');
          await cdp.send('Network.emulateNetworkConditions', { offline: false, ...PROFILES[throttle] });
        }
        const stats = { requests: 0, bytes: 0, by: {} };
        let phase = 'load';
        const result = { browser: bname, width: viewport.width, url, throttle };
        page.on('response', async (r) => {
          const len = Number(r.headers()['content-length'] ?? (await r.body().catch(() => Buffer.alloc(0))).length);
          const k = kind(r.headers()['content-type'] ?? '', r.url());
          stats.requests += 1; stats.bytes += len; stats.by[k] = (stats.by[k] ?? 0) + len;
        });
        await page.addInitScript(observers);
        await page.goto(`${BASE}${url}`, { waitUntil: 'load' });
        await page.waitForTimeout(throttle === 'slow4g' ? 3000 : 1500);
        result.load = { requests: stats.requests, bytes: stats.bytes, by: { ...stats.by } };
        result.lcp = await page.evaluate(() => window.__lcp);
        result.cls = await page.evaluate(() => Number(window.__cls.toFixed(4)));
        await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } });
        await page.waitForTimeout(throttle === 'slow4g' ? 3000 : 800);
        result.scrolled = { requests: stats.requests, bytes: stats.bytes, by: { ...stats.by } };
        result.clsAfterScroll = await page.evaluate(() => Number(window.__cls.toFixed(4)));
        rows.push(result);
        await context.close();
      }
    }
    await browser.close();
  }
  return rows;
}

if (isMain(import.meta.url)) {
  const { values } = parseArgs({ options: { out: { type: 'string' }, pages: { type: 'string' }, browsers: { type: 'string', default: 'chrome' }, throttle: { type: 'string', default: 'none' } } });
  const rows = await measure({ browsers: values.browsers.split(','), throttle: values.throttle, pages: values.pages?.split(',') });
  const kb = (n) => `${(n / 1024).toFixed(0)}`;
  for (const r of rows) console.log(`${r.browser} ${r.width} ${r.url.slice(0, 40).padEnd(40)} LCP ${String(r.lcp?.time ?? '-').padStart(5)} ms ${r.lcp?.tag ?? ''}${r.lcp?.url ? ` ${r.lcp.url.split('/').pop()}` : ''} CLS ${r.cls}/${r.clsAfterScroll}  load ${r.load.requests} req ${kb(r.load.bytes)} KB  scrolled ${r.scrolled.requests} req ${kb(r.scrolled.bytes)} KB`);
  if (values.out) fs.writeFileSync(values.out, JSON.stringify(rows, null, 1));
}
