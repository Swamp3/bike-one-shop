// Before/after measurement: 3 runs (median), foreign requests aborted (registered last) and counted, CDP throttling.
// Bytes and requests BEFORE the load event come from Resource Timing (responseEnd <= loadEventStart, encodedBodySize; the
// review server does not compress); video requests are listed with their start relative to the load event.
// usage: node perf3.mjs out.json [pages,comma] [throttles,comma] [runs] [widths,comma]
import fs from 'node:fs';
const W = '/Users/timo.alts/dev/bike-one-shop/website';
const { PLAYWRIGHT, BASE, abortForeign } = await import(`${W}/tools/lib/browser.mjs`);
const { chromium } = await import(PLAYWRIGHT);
const PROFILES = { fast4g: { latency: 60, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 }, slow4g: { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 } };
const out = process.argv[2];
const pages = (process.argv[3] || '/').split(',');
const throttles = (process.argv[4] || 'none,fast4g,slow4g').split(',');
const runs = +(process.argv[5] || 3);
const widths = (process.argv[6] || '1440,390').split(',').map(Number);
const obs = () => {
  window.__lcp = null; window.__cls = 0; window.__fcp = null;
  new PerformanceObserver((l) => { const e = l.getEntries().at(-1); if (e) { const el = e.element; window.__lcp = { t: Math.round(e.startTime), url: (e.url || '').split('/').pop(), tag: el ? el.tagName.toLowerCase() : '' }; } }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__fcp = Math.round(e.startTime); }).observe({ type: 'paint', buffered: true });
};
const kind = (name, type) => (/\.(mp4|webm)(\?|$)/.test(name) ? 'video' : type === 'navigation' ? 'html' : /\.css/.test(name) ? 'css' : /\.js/.test(name) ? 'js' : /\.woff2?/.test(name) ? 'font' : /\.(avif|webp|jpe?g|png|ico)/.test(name) ? 'image' : 'other');
const med = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const browser = await chromium.launch({ channel: 'chrome' });
const res = [];
for (const width of widths) for (const url of pages) for (const th of throttles) {
  const rs = [];
  for (let i = 0; i < runs; i++) {
    const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
    const page = await ctx.newPage();
    if (th !== 'none') { const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, ...PROFILES[th] }); }
    let foreign = 0;
    page.on('request', (r) => { if (!r.url().startsWith(BASE)) foreign++; });
    await page.addInitScript(obs);
    await abortForeign(page);
    await page.goto(BASE + url, { waitUntil: 'load' });
    await page.waitForTimeout(width >= 768 && url === '/' ? 9000 : th === 'slow4g' ? 3000 : 1500);
    const m = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const all = [nav, ...performance.getEntriesByType('resource')].map((r) => ({ name: r.name, type: r.entryType === 'navigation' ? 'navigation' : r.initiatorType, start: r.startTime, end: r.responseEnd, bytes: r.encodedBodySize }));
      return { lcp: window.__lcp, cls: Number(window.__cls.toFixed(4)), fcp: window.__fcp, loadStart: nav.loadEventStart, all };
    });
    const pre = { n: 0, bytes: 0, by: {} }, post = { n: 0, bytes: 0, by: {} }, video = [];
    for (const r of m.all) {
      const k = kind(r.name, r.type);
      const bucket = r.end <= m.loadStart + 1 ? pre : post;
      bucket.n++; bucket.bytes += r.bytes; bucket.by[k] = (bucket.by[k] ?? 0) + r.bytes;
      if (k === 'video') video.push({ file: r.name.split('/').pop(), startAfterLoadMs: Math.round(r.start - m.loadStart), bytes: r.bytes });
    }
    rs.push({ ...m, all: undefined, pre, post, video, foreign });
    await ctx.close();
  }
  const kbm = (f) => Math.round(med(rs.map(f)) / 1024);
  const row = { width, url: url.slice(0, 34), th, lcp: med(rs.map((r) => r.lcp?.t)), lcpEl: `${rs[0].lcp?.tag} ${rs[0].lcp?.url}`, fcp: med(rs.map((r) => r.fcp)), cls: Math.max(...rs.map((r) => r.cls)), preReq: med(rs.map((r) => r.pre.n)), preKB: kbm((r) => r.pre.bytes), preBy: Object.fromEntries(Object.entries(rs[0].pre.by).map(([k, v]) => [k, Math.round(v / 1024)])), postReq: med(rs.map((r) => r.post.n)), postKB: kbm((r) => r.post.bytes), video: rs.map((r) => r.video), foreign: rs.reduce((a, r) => a + r.foreign, 0), lcps: rs.map((r) => r.lcp?.t).join('/') };
  res.push(row);
  console.log(JSON.stringify(row));
}
await browser.close();
fs.writeFileSync(out, JSON.stringify(res, null, 1));
