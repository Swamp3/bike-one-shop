const W = '/Users/timo.alts/dev/bike-one-shop/website';
const { PLAYWRIGHT, BASE, abortForeign } = await import(`${W}/tools/lib/browser.mjs`);
const { chromium } = await import(PLAYWRIGHT);
const b = await chromium.launch({ channel: 'chrome' });
const CSS = 'main > section:not(.hero), .site-footer, footer { content-visibility: auto; contain-intrinsic-size: auto 700px; }';
const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
for (const width of [390, 1440]) for (const mode of ['baseline', 'content-visibility']) {
  const r = { layout: [], style: [], task: [], cls: [] };
  for (let i = 0; i < 7; i++) {
    const ctx = await b.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } }); const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page); await cdp.send('Performance.enable');
    await page.addInitScript(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
    if (mode !== 'baseline') await page.addInitScript((css) => { document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = css; document.head.append(s); }); }, CSS);
    await abortForeign(page);
    await page.goto(BASE + '/', { waitUntil: 'load' }); await page.waitForTimeout(600);
    const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
    r.layout.push(m.LayoutDuration * 1000); r.style.push(m.RecalcStyleDuration * 1000); r.task.push(m.TaskDuration * 1000); r.cls.push(await page.evaluate(() => window.__cls));
    await ctx.close();
  }
  console.log(width, mode.padEnd(19), 'layout ms', med(r.layout).toFixed(1), 'style ms', med(r.style).toFixed(1), 'main-thread task ms', med(r.task).toFixed(1), 'CLS max', Math.max(...r.cls).toFixed(4));
}
await b.close();
