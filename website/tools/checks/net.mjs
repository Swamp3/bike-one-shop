// Check `net`: load every native page in system Chrome and in WebKit, at 1440 and 390 wide, from the review server
// (default http://localhost:4321, it serves dist/), scroll, open the menu, and fail on any request to a non-local host,
// any 4xx/5xx, any console error or page error. The page's Content-Security-Policy from dist/_headers is applied, so a
// violation shows up as a console error. Embeds stay unclicked. Only the home page at 1440 may request a video, and Chrome's
// requests for it are counted exactly (decision d83): none before the load event, none at 390, with reduced motion, with a touch
// screen, with Save-Data, cellular, 3g or 2g; exactly one, at most 1 MiB, on a good connection. No page requests audio. Chrome also parses the speculation rules of the Speculation-Rules header (prefetch of
// same-origin pages on pointer down, nothing foreign; decision d82). Prints requests and bytes of the home page.
import { isMain, nativePages, report } from '../lib/dist.mjs';
import { abortForeign, applyHeaders, BASE, needServer, PLAYWRIGHT } from '../lib/browser.mjs';
const MEDIA_FILE = /\.(mp4|m4v|webm|ogv|mov|mp3|ogg)(\?|$)/i;
const VIEWPORTS = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];

export async function run() {
  await needServer();
  const { chromium, webkit } = await import(PLAYWRIGHT);
  const problems = [];
  const pages = nativePages();
  let homeNote = '';
  const browsers = [['chrome', () => chromium.launch({ channel: 'chrome' })], ['webkit', () => webkit.launch()]];
  for (const [bname, launch] of browsers) {
    const browser = await launch();
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      let stats;
      const at = (url, msg) => problems.push(`${bname} ${viewport.width} ${url}: ${msg}`);
      let current = '';
      page.on('pageerror', (e) => at(current, `page error: ${e.message}`));
      page.on('console', (m) => { if (m.type() === 'error') at(current, `console error: ${m.text()}`); });
      page.on('requestfailed', (r) => at(current, `request failed: ${r.url()} ${r.failure()?.errorText ?? ''}`));
      let counts = new Map();
      page.on('request', (r) => { if (!r.url().startsWith(BASE)) at(current, `request to ${r.url()}`); else if ((MEDIA_FILE.test(r.url()) || r.resourceType() === 'media') && !(current === '/' && viewport.width >= 768)) at(current, `video or audio requested: ${r.url()}`); else if (r.url().includes('/_astro/')) counts.set(r.url(), (counts.get(r.url()) ?? 0) + 1); });
      page.on('response', async (r) => {
        if (r.status() >= 400) at(current, `${r.status()} ${r.url()}`);
        if (current === '/' && stats) { stats.count += 1; const len = Number(r.headers()['content-length'] ?? (await r.body().catch(() => Buffer.alloc(0))).length); stats.bytes += len; const t = r.headers()['content-type'] ?? ''; const k = /html/.test(t) ? 'html' : /css/.test(t) ? 'css' : /javascript/.test(t) ? 'js' : /font|woff/.test(t) ? 'font' : /image/.test(t) ? 'image' : 'other'; stats.by[k] = (stats.by[k] ?? 0) + len; }
      });
      await applyHeaders(page);
      for (const p of pages) {
        current = p.url;
        counts = new Map();
        stats = p.url === '/' ? { count: 0, bytes: 0, by: {} } : undefined;
        await page.goto(`${BASE}${p.url}`, { waitUntil: 'load' });
        await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
        await page.waitForLoadState('networkidle');
        for (const [url, n] of counts) if (n > 1) at(p.url, `${url.replace(BASE, '')} was fetched ${n} times (a preload that does not match its image, or a font fetched twice)`);
        if (viewport.width < 768) {
          const button = page.locator('.menu-btn');
          if (!(await button.isVisible())) at(p.url, 'menu button not visible on a narrow screen');
          else {
            await button.click();
            if (!(await page.locator('#site-nav a').first().isVisible())) at(p.url, 'menu did not open');
            await page.keyboard.press('Escape');
            if (await page.locator('#site-nav a').first().isVisible()) at(p.url, 'menu did not close on Escape');
          }
        } else if (!(await page.locator('#site-nav a').first().isVisible())) at(p.url, 'menu is not visible on a wide screen');
        if (p.url === '/' && bname === 'chrome') homeNote += `${viewport.width}px: ${stats.count} requests, ${(stats.bytes / 1024).toFixed(0)} KB (${Object.entries(stats.by).map(([k, v]) => `${k} ${(v / 1024).toFixed(0)} KB`).join(', ')}); `;
      }
      await context.close();
    }
    // the hero film in Chrome: when it may be requested, and that it is requested once
    if (bname === 'chrome') {
      const cases = [
        { label: '1440 wide, mouse, good connection', film: true, long: true, slowLoad: true },
        { label: 'wifi 4g reported by the Network Information API', film: true, connection: { type: 'wifi', effectiveType: '4g', saveData: false } },
        { label: '390 wide', viewport: { width: 390, height: 844 } },
        { label: 'prefers-reduced-motion', reducedMotion: 'reduce' },
        { label: 'touch screen (pointer: coarse) at 1440', hasTouch: true, isMobile: true },
        { label: 'Save-Data', connection: { saveData: true, effectiveType: '4g' } },
        { label: 'cellular', connection: { type: 'cellular', effectiveType: '4g' } },
        { label: '3g', connection: { effectiveType: '3g' } },
        { label: '2g', connection: { effectiveType: '2g' } },
      ];
      for (const c of cases) {
        const at = (msg) => problems.push(`chrome hero film (${c.label}): ${msg}`);
        const context = await browser.newContext({ viewport: c.viewport ?? VIEWPORTS[0], reducedMotion: c.reducedMotion, hasTouch: c.hasTouch, isMobile: c.isMobile });
        const page = await context.newPage();
        if (c.connection) await page.addInitScript((conn) => { const t = new EventTarget(); Object.assign(t, conn); Object.defineProperty(navigator, 'connection', { get: () => t, configurable: true }); }, c.connection);
        const files = [];
        page.on('response', (r) => { if (MEDIA_FILE.test(r.url())) files.push({ url: r.url(), status: r.status(), bytes: Number(r.headers()['content-length'] ?? 0) }); });
        await applyHeaders(page);
        await abortForeign(page);
        // a slow line until the load event, so a film that starts too early has its request in before the load event
        const cdp = c.slowLoad ? await context.newCDPSession(page) : null;
        const line = (latency, kbit) => cdp.send('Network.emulateNetworkConditions', { offline: false, latency, downloadThroughput: kbit < 0 ? -1 : (kbit * 1024) / 8, uploadThroughput: kbit < 0 ? -1 : (750 * 1024) / 8 });
        if (cdp) { await cdp.send('Network.enable'); await line(150, 1600); }
        await page.goto(`${BASE}/`, { waitUntil: 'load' });
        if (cdp) await line(0, -1);
        await page.waitForTimeout(c.film ? 3500 : 2500);
        const state = await page.evaluate(() => {
          const v = document.querySelector('.hero-video');
          const nav = performance.getEntriesByType('navigation')[0];
          return { src: v.getAttribute('src'), paused: v.paused, t: v.currentTime, playing: v.classList.contains('is-playing'), early: performance.getEntriesByType('resource').filter((r) => r.initiatorType === 'video' && r.startTime < nav.loadEventStart).length, button: !document.querySelector('.hero-toggle').hidden };
        });
        if (state.early) at('a video request started before the load event');
        if (!c.film) {
          if (files.length || state.src || !state.paused || state.playing || state.button) at(`no film expected, but ${JSON.stringify({ files: files.length, src: state.src, paused: state.paused, button: state.button })}`);
        } else {
          if (!state.playing || state.paused || state.t < 0.5 || !state.button) at(`the film did not start (${JSON.stringify(state)})`);
          if (c.long) {
            // wait through one loop restart: the film must not be requested again
            await page.waitForTimeout(6500);
            const t = await page.evaluate(() => document.querySelector('.hero-video').currentTime);
            if (t > 6) at(`the film did not loop (t ${t.toFixed(1)} s after 10 s)`);
          }
          if (files.length !== 1) at(`${files.length} video requests (exactly one): ${files.map((f) => `${f.url.replace(BASE, '')} ${f.status}`).join(', ')}`);
          for (const f of files) if (f.bytes > 1048576) at(`${f.url} is ${f.bytes} bytes (at most 1 MiB)`);
        }
        await context.close();
      }
    }
    // speculation rules (Chromium only; Safari and Firefox ignore them): the header's file is parsed without error, every attempt
    // is a same-origin page that is not the feed, a pointer down on a menu link prefetches that page, nothing foreign is asked for
    if (bname === 'chrome') {
      const at = (msg) => problems.push(`chrome speculation rules: ${msg}`);
      const context = await browser.newContext({ viewport: VIEWPORTS[0] });
      const page = await context.newPage();
      await applyHeaders(page);
      await abortForeign(page);
      const cdp = await context.newCDPSession(page);
      const ruleSets = [], attempts = new Set(), status = [];
      cdp.on('Preload.ruleSetUpdated', (e) => ruleSets.push(e.ruleSet));
      cdp.on('Preload.preloadingAttemptSourcesUpdated', (e) => e.preloadingAttemptSources.forEach((a) => attempts.add(`${a.key.action} ${a.key.url}`)));
      cdp.on('Preload.prefetchStatusUpdated', (e) => status.push(`${e.prefetchUrl} ${e.status}`));
      await cdp.send('Preload.enable');
      let foreign = 0;
      page.on('request', (r) => { if (!r.url().startsWith(BASE)) foreign += 1; });
      await page.goto(`${BASE}/`, { waitUntil: 'load' });
      if (!(await page.evaluate(() => HTMLScriptElement.supports('speculationrules')))) at('this Chrome does not support speculation rules, nothing to test');
      for (let i = 0; i < 30 && !attempts.size; i += 1) await page.waitForTimeout(100);
      if (ruleSets.length !== 1 || ruleSets[0].errorType || !ruleSets[0].url?.endsWith('/speculation-rules.json')) at(`the rule set was not parsed from /speculation-rules.json (${JSON.stringify(ruleSets.map((r) => r.errorType ?? r.url))})`);
      if (!attempts.size) at('no page is a prefetch candidate');
      for (const a of attempts) if (!a.startsWith(`Prefetch ${BASE}/`) || a.includes('/feed/')) at(`unexpected candidate: ${a}`);
      if (status.length) at(`something was prefetched before any pointer down: ${status.join(', ')}`);
      const box = await page.locator('#site-nav a[href="/ueber-uns/"]').first().boundingBox();
      await page.mouse.move(box.x + 5, box.y + 5);
      await page.mouse.down();
      for (let i = 0; i < 30 && !status.some((x) => x.endsWith('Ready')); i += 1) await page.waitForTimeout(100);
      if (!status.includes(`${BASE}/ueber-uns/ Ready`)) at(`pointer down on a menu link did not prefetch its page (${status.join(', ') || 'no status'})`);
      if (foreign) at(`${foreign} request(s) to a foreign host`);
      await context.close();
    }
    await browser.close();
  }
  return { problems, note: `${pages.length} native pages x chrome, webkit x 1440, 390; home ${homeNote.trim()}` };
}

if (isMain(import.meta.url)) { const { problems, note } = await run(); process.exit(report('net', problems, note)); }
