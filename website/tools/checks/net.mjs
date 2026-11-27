// Check `net`: load every native page in system Chrome and in WebKit, at 1440 and 390 wide, from the review server
// (default http://localhost:4321, it serves dist/), scroll, open the menu, and fail on any request to a non-local host,
// any 4xx/5xx, any console error or page error. The page's Content-Security-Policy from dist/_headers is applied, so a
// violation shows up as a console error. Embeds stay unclicked. No page requests a video or audio file (the home hero is
// the poster photo only, decision d71). Chrome also parses the speculation rules of the Speculation-Rules header (prefetch of
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
      page.on('request', (r) => { if (!r.url().startsWith(BASE)) at(current, `request to ${r.url()}`); else if (MEDIA_FILE.test(r.url()) || r.resourceType() === 'media') at(current, `video or audio requested: ${r.url()}`); else if (r.url().includes('/_astro/')) counts.set(r.url(), (counts.get(r.url()) ?? 0) + 1); });
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
