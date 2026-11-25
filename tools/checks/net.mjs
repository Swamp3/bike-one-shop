// Check `net`: load every native page in system Chrome and in WebKit, at 1440 and 390 wide, from the review server
// (default http://localhost:4321, it serves dist/), scroll, open the menu, and fail on any request to a non-local host,
// any 4xx/5xx, any console error or page error. The page's Content-Security-Policy from dist/_headers is applied, so a
// violation shows up as a console error. Embeds stay unclicked. The hero video must start at 1440 (Chrome without a click,
// WebKit with the first click),
// must not be requested at 390 or with prefers-reduced-motion. Prints requests and bytes of the home page.
import fs from 'node:fs';
import path from 'node:path';
import { DIST, isMain, nativePages, report } from '../lib/dist.mjs';
import { applyHeaders, BASE, needServer, PLAYWRIGHT } from '../lib/browser.mjs';
// the home page's hero video exists in this build
const HERO_VIDEO = fs.existsSync(path.join(DIST, 'hero.mp4'));
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
      page.on('request', (r) => { if (!r.url().startsWith(BASE)) at(current, `request to ${r.url()}`); else if (r.url().includes('/_astro/')) counts.set(r.url(), (counts.get(r.url()) ?? 0) + 1); });
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
      // hero video: starts without a click on a wide screen, never requested on a narrow one
      if (HERO_VIDEO) {
        let requested = false;
        const onRequest = (r) => { if (r.url().endsWith('/hero.mp4')) requested = true; };
        page.on('request', onRequest);
        current = '/';
        await page.goto(`${BASE}/`, { waitUntil: 'load' });
        await page.waitForTimeout(viewport.width >= 768 ? 3500 : 1500);
        let state = await page.evaluate(() => { const v = document.querySelector('[data-hero-video]'); return v && { paused: v.paused, t: v.currentTime, playing: v.classList.contains('is-playing') }; });
        // Chrome must autoplay. Playwright's WebKit refuses muted autoplay even on a bare <video autoplay muted playsinline>
        // page (NotAllowedError, checked by hand), so there the check is that the first user gesture starts the video.
        if (viewport.width >= 768 && bname === 'webkit' && state?.paused) {
          await page.mouse.click(24, 300);
          await page.waitForTimeout(2500);
          state = await page.evaluate(() => { const v = document.querySelector('[data-hero-video]'); return { paused: v.paused, t: v.currentTime, playing: v.classList.contains('is-playing') }; });
        }
        if (viewport.width >= 768 && !(state && !state.paused && state.t > 0.5 && state.playing)) at('/', `the hero video did not start (${bname}, ${JSON.stringify(state)})`);
        if (viewport.width < 768 && (requested || !state?.paused)) at('/', 'the hero video was requested on a narrow screen');
        page.off('request', onRequest);
      }
      await context.close();
    }
    // prefers-reduced-motion: no request for the video, no playback
    if (HERO_VIDEO) {
      const context = await browser.newContext({ viewport: VIEWPORTS[0], reducedMotion: 'reduce' });
      const page = await context.newPage();
      let requested = false;
      page.on('request', (r) => { if (r.url().endsWith('/hero.mp4')) requested = true; });
      await page.goto(`${BASE}/`, { waitUntil: 'load' });
      await page.waitForTimeout(1500);
      if (requested) problems.push(`${bname} reduced motion: the hero video was requested`);
      await context.close();
    }
    // data-conscious policy (Network Information API, Chrome only): a metered or slow connection never downloads the video
    if (HERO_VIDEO && bname === 'chrome') {
      for (const [label, conn] of [['saveData', { saveData: true, effectiveType: '4g' }], ['cellular', { type: 'cellular', effectiveType: '4g' }], ['3g', { effectiveType: '3g' }], ['2g', { effectiveType: '2g' }], ['wifi 4g', { type: 'wifi', effectiveType: '4g', saveData: false }]]) {
        const context = await browser.newContext({ viewport: VIEWPORTS[0] });
        const page = await context.newPage();
        await page.addInitScript((c) => { const t = new EventTarget(); Object.assign(t, c); Object.defineProperty(navigator, 'connection', { get: () => t, configurable: true }); }, conn);
        let requested = false;
        page.on('request', (r) => { if (r.url().endsWith('/hero.mp4')) requested = true; });
        await page.goto(`${BASE}/`, { waitUntil: 'load' });
        await page.waitForTimeout(2500);
        const playing = await page.evaluate(() => !document.querySelector('[data-hero-video]').paused);
        const metered = label !== 'wifi 4g';
        if (metered && (requested || playing)) problems.push(`connection ${label}: the hero video was ${requested ? 'requested' : 'played'}`);
        if (!metered && !(requested && playing)) problems.push(`connection ${label}: the hero video did not start on a good connection`);
        await context.close();
      }
    }
    await browser.close();
  }
  return { problems, note: `${pages.length} native pages x chrome, webkit x 1440, 390; home ${homeNote.trim()}` };
}

if (isMain(import.meta.url)) { const { problems, note } = await run(); process.exit(report('net', problems, note)); }
