// WebKit (Playwright) on the home page: video requests, the film's state, console messages; screenshot of the hero.
const W = '/Users/timo.alts/dev/bike-one-shop/website';
const { PLAYWRIGHT, BASE, abortForeign, applyHeaders } = await import(`${W}/tools/lib/browser.mjs`);
const { webkit } = await import(PLAYWRIGHT);
const browser = await webkit.launch();
for (const width of [1440, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
  const page = await ctx.newPage(); await applyHeaders(page); await abortForeign(page);
  const msgs = [], reqs = [];
  page.on('console', (m) => msgs.push(`${m.type()}: ${m.text()}`)); page.on('pageerror', (e) => msgs.push(`pageerror: ${e.message}`));
  page.on('request', (r) => { if (/hero\.(webm|mp4)/.test(r.url())) reqs.push(`${r.url().split('/').pop()} range=${r.headers().range ?? '-'}`); });
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForTimeout(5000);
  const s = await page.evaluate(() => { const v = document.querySelector('.hero-video'); return { src: v.getAttribute('src'), paused: v.paused, t: v.currentTime, playing: v.classList.contains('is-playing'), canAv1: v.canPlayType('video/webm; codecs="av01.0.05M.08"'), canMp4: v.canPlayType('video/mp4'), poster: document.querySelector('.bg').currentSrc.split('/').pop(), button: !document.querySelector('.hero-toggle').hidden }; });
  await page.screenshot({ path: `/private/tmp/claude-501/-Users-timo-alts-dev-bike-one-shop/aa170a22-13b0-4ee8-a900-0d065cfc8013/scratchpad/impl/webkit-${width}.png`, clip: { x: 0, y: 0, width, height: 700 } });
  console.log(width, JSON.stringify(s), 'video requests:', reqs.length, reqs.join(' | '), 'console:', msgs.length ? msgs.join(' | ') : 'none');
  await ctx.close();
}
await browser.close();
