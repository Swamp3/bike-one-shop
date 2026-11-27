// Copy of tools/perf.mjs measure() with every non-local request aborted (registered last) and FCP/load time added; 3 runs, median.
import fs from 'node:fs';
const W = '/Users/timo.alts/dev/bike-one-shop/website';
const { PLAYWRIGHT, BASE, abortForeign } = await import(`${W}/tools/lib/browser.mjs`);
const { chromium } = await import(PLAYWRIGHT);
const PROFILES = { fast4g: { latency: 60, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 }, slow4g: { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 } };
const pages = process.argv[2].split(',');
const throttles = (process.argv[3] || 'none,fast4g,slow4g').split(',');
const runs = +(process.argv[4] || 3);
const kind = (type, url) => (/\.(mp4|webm)$/.test(url) ? 'video' : /html/.test(type) ? 'html' : /css/.test(type) ? 'css' : /javascript/.test(type) ? 'js' : /font|woff/.test(type) ? 'font' : /image/.test(type) ? 'image' : 'other');
const obs = () => {
  window.__lcp = null; window.__cls = 0; window.__fcp = null;
  new PerformanceObserver((l) => { const e = l.getEntries().at(-1); if (e) { const el = e.element; window.__lcp = { t: Math.round(e.startTime), url: (e.url || '').split('/').pop(), tag: el ? el.tagName.toLowerCase() : '' }; } }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__fcp = Math.round(e.startTime); }).observe({ type: 'paint', buffered: true });
};
const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
const browser = await chromium.launch({ channel: 'chrome' });
const res = [];
for (const width of [1440, 390]) for (const url of pages) for (const th of throttles) {
  const rs = [];
  for (let i = 0; i < runs; i++) {
    const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
    const page = await ctx.newPage();
    if (th !== 'none') { const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, ...PROFILES[th] }); }
    const st = { n: 0, bytes: 0, by: {}, foreign: 0 };
    page.on('response', async (r) => { const len = Number(r.headers()['content-length'] ?? (await r.body().catch(() => Buffer.alloc(0))).length); const k = kind(r.headers()['content-type'] ?? '', r.url()); st.n++; st.bytes += len; st.by[k] = (st.by[k] ?? 0) + len; });
    page.on('request', (r) => { if (!r.url().startsWith(BASE)) st.foreign++; });
    await page.addInitScript(obs);
    await abortForeign(page);
    await page.goto(BASE + url, { waitUntil: 'load' });
    const loadMs = await page.evaluate(() => Math.round(performance.timing.loadEventEnd - performance.timing.navigationStart));
    await page.waitForTimeout(th === 'slow4g' ? 2500 : 1200);
    const m = await page.evaluate(() => ({ lcp: window.__lcp, cls: Number(window.__cls.toFixed(4)), fcp: window.__fcp }));
    // bytes before the load event: approximate by resources whose responseEnd < loadEventEnd
    const preLoad = await page.evaluate(() => { const nav = performance.getEntriesByType('navigation')[0]; return performance.getEntriesByType('resource').filter((r) => r.responseEnd <= nav.loadEventEnd + 1).length; });
    rs.push({ ...m, n: st.n, kb: st.bytes / 1024, by: st.by, load: loadMs, foreign: st.foreign, preLoadRes: preLoad });
    await ctx.close();
  }
  const row = { width, url: url.slice(0, 30), th, lcp: med(rs.map((r) => r.lcp?.t)), lcpEl: `${rs[0].lcp?.tag} ${rs[0].lcp?.url}`, fcp: med(rs.map((r) => r.fcp)), load: med(rs.map((r) => r.load)), cls: Math.max(...rs.map((r) => r.cls)), n: rs[0].n, kb: Math.round(rs[0].kb), by: Object.fromEntries(Object.entries(rs[0].by).map(([k, v]) => [k, Math.round(v / 1024)])), foreign: rs.reduce((a, r) => a + r.foreign, 0), lcps: rs.map((r) => r.lcp?.t).join('/') };
  res.push(row);
  console.log(JSON.stringify(row));
}
await browser.close();
fs.writeFileSync(process.argv[5] || 'perf-out.json', JSON.stringify(res, null, 1));
