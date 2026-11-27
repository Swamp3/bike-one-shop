// Poster-then-video simulation against the scratchpad copy of dist (+ candidate mp4s) on :4401. Foreign requests aborted.
import fs from 'node:fs';
const { chromium } = await import('/Users/timo.alts/dev/astro-conversion-kit/node_modules/playwright/index.mjs');
const BASE = 'http://127.0.0.1:4401';
const PROFILES = { fast4g: { latency: 60, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 }, slow4g: { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 } };
const scenarios = JSON.parse(process.argv[2]); // [{name,page,file,start}]
const throttles = (process.argv[3] || 'none,fast4g,slow4g').split(',');
const width = +(process.argv[4] || 1440);
const browser = await chromium.launch({ channel: 'chrome' });
for (const th of throttles) for (const sc of scenarios) {
  const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  if (th !== 'none') await cdp.send('Network.emulateNetworkConditions', { offline: false, ...PROFILES[th] });
  const urls = new Map(); const chunks = []; let foreign = 0, loadAt = null;
  cdp.on('Network.requestWillBeSent', (e) => { urls.set(e.requestId, e.request.url); if (!e.request.url.startsWith(BASE)) foreign++; });
  cdp.on('Network.dataReceived', (e) => chunks.push({ t: Date.now(), url: urls.get(e.requestId) || '', n: e.dataLength }));
  await page.route((u) => !u.href.startsWith(BASE), (r) => r.abort());
  page.on('load', () => { loadAt = Date.now(); });
  await page.addInitScript(() => {
    window.__lcp = null; window.__cls = 0;
    new PerformanceObserver((l) => { const e = l.getEntries().at(-1); if (e) window.__lcp = { t: Math.round(e.startTime), url: (e.url || '').split('/').pop(), tag: e.element?.tagName.toLowerCase() }; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  const q = new URLSearchParams({ file: sc.file || '', start: sc.start || 'load' }).toString();
  await page.goto(`${BASE}/${sc.page}/?${q}`, { waitUntil: 'load' });
  const waitMs = th === 'slow4g' ? 14000 : 10000;
  await page.waitForTimeout(waitMs);
  const s = await page.evaluate(() => ({ sim: window.__sim, lcp: window.__lcp, cls: Number(window.__cls.toFixed(4)), paused: document.querySelector('.hero-video')?.paused, now: performance.now(), rs: document.querySelector('.hero-video')?.readyState, ct: document.querySelector('.hero-video')?.currentTime }));
  const isVideo = (u) => /\.mp4/.test(u);
  const cum = (ms) => Math.round(chunks.filter((c) => isVideo(c.url) && c.t - loadAt <= ms).reduce((a, c) => a + c.n, 0) / 1024);
  const pre = Math.round(chunks.filter((c) => !isVideo(c.url) && c.t <= loadAt).reduce((a, c) => a + c.n, 0) / 1024);
  const preVideo = Math.round(chunks.filter((c) => isVideo(c.url) && c.t <= loadAt).reduce((a, c) => a + c.n, 0) / 1024);
  const sim = s.sim || {};
  const visible = sim.first !== undefined ? (s.now - sim.first) / 1000 : 0;
  const row = { th, name: sc.name, w: width, lcp: s.lcp?.t, lcpEl: s.lcp?.url, cls: s.cls, nonVideoKBbeforeLoad: pre, videoKBbeforeLoad: preVideo, videoKB: { s1: cum(1000), s3: cum(3000), s10: cum(10000) }, videoKBtotal: cum(1e9), callToFirstFrameMs: sim.first !== undefined && sim.call ? Math.round(sim.first - sim.call) : null, callMs: sim.call ? Math.round(sim.call) : null, waits: sim.waits, fps: sim.first !== undefined ? +(sim.frames / visible).toFixed(1) : null, err: sim.err || null, foreign };
  console.log(JSON.stringify(row));
  await ctx.close();
}
await browser.close();
