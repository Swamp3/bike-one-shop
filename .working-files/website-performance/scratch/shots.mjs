const { chromium } = await import('/Users/timo.alts/dev/astro-conversion-kit/node_modules/playwright/index.mjs');
const b = await chromium.launch({ channel: 'chrome' });
for (const [p, w] of [['b35', 1440], ['m', 1440], ['b35', 390]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: w === 390 ? 844 : 900 } }); const page = await ctx.newPage();
  await page.route((u) => !u.href.startsWith('http://127.0.0.1:4401'), (r) => r.abort());
  await page.goto(`http://127.0.0.1:4401/${p}/?start=none`, { waitUntil: 'load' }); await page.waitForTimeout(400);
  await page.screenshot({ path: `frames/jump/hero-${p}-${w}.png`, clip: { x: 0, y: 0, width: w, height: w === 390 ? 760 : 780 } });
  await ctx.close();
}
await b.close();
