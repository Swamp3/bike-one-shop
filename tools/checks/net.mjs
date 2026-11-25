// Check `net`: load every native page in system Chrome and in WebKit, at 1440 and 390 wide, from the review server
// (default http://localhost:4321, it serves dist/), scroll, open the menu, and fail on any request to a non-local host,
// any 4xx/5xx, any console error or page error. The page's Content-Security-Policy from dist/_headers is applied, so a
// violation shows up as a console error. Embeds stay unclicked. The hero video must start at 1440 (Chrome without a click,
// WebKit with the first click),
// must not be requested at 390 or with prefers-reduced-motion. Prints requests and bytes of the home page.
import fs from 'node:fs';
import path from 'node:path';
import { DIST, isMain, nativePages, need, report } from '../lib/dist.mjs';

const BASE = (process.env.REVIEW_URL || 'http://localhost:4321').replace(/\/$/, '');
const PLAYWRIGHT = process.env.PLAYWRIGHT_MODULE || '/Users/timo.alts/dev/astro-conversion-kit/node_modules/playwright/index.mjs';
// the home page's hero video exists in this build
const HERO_VIDEO = fs.existsSync(path.join(DIST, 'hero.mp4'));
const VIEWPORTS = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];

/** dist/_headers -> [{ re, headers }] for the path rules (host rules such as https://bike-one.dev/* are skipped). */
function headerRules() {
  const file = path.join(DIST, '_headers');
  const rules = [];
  let cur = null;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) { cur = line.startsWith('/') ? { re: new RegExp(`^${line.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`), headers: {} } : null; if (cur) rules.push(cur); continue; }
    const i = line.indexOf(':');
    if (cur && i > 0) cur.headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  return rules;
}

export async function run() {
  const up = await fetch(`${BASE}/`).then((r) => r.ok, () => false);
  need(up, `the review server is not answering on ${BASE}: start it with  node scripts/review-serve.mjs --background`);
  const served = Buffer.from(await (await fetch(`${BASE}/`)).arrayBuffer());
  need(served.equals(fs.readFileSync(path.join(DIST, 'index.html'))), `${BASE}/ does not serve this dist/ (home page differs); rebuild or restart the review server`);

  const { chromium, webkit } = await import(PLAYWRIGHT);
  const rules = headerRules();
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
      page.on('request', (r) => { if (!r.url().startsWith(BASE)) at(current, `request to ${r.url()}`); });
      page.on('response', async (r) => {
        if (r.status() >= 400) at(current, `${r.status()} ${r.url()}`);
        if (current === '/' && stats) { stats.count += 1; const len = Number(r.headers()['content-length'] ?? (await r.body().catch(() => Buffer.alloc(0))).length); stats.bytes += len; const t = r.headers()['content-type'] ?? ''; const k = /html/.test(t) ? 'html' : /css/.test(t) ? 'css' : /javascript/.test(t) ? 'js' : /font|woff/.test(t) ? 'font' : /image/.test(t) ? 'image' : 'other'; stats.by[k] = (stats.by[k] ?? 0) + len; }
      });
      await page.route('**/*', async (route) => {
        const req = route.request();
        if (req.resourceType() !== 'document' || !req.url().startsWith(BASE)) return route.continue();
        const response = await route.fetch();
        const p = new URL(req.url()).pathname;
        const headers = { ...response.headers() };
        for (const rule of rules) if (rule.re.test(p)) Object.assign(headers, rule.headers);
        await route.fulfill({ response, headers });
      });
      for (const p of pages) {
        current = p.url;
        stats = p.url === '/' ? { count: 0, bytes: 0, by: {} } : undefined;
        await page.goto(`${BASE}${p.url}`, { waitUntil: 'load' });
        await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
        await page.waitForLoadState('networkidle');
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
    await browser.close();
  }
  return { problems, note: `${pages.length} native pages x chrome, webkit x 1440, 390; home ${homeNote.trim()}` };
}

if (isMain(import.meta.url)) { const { problems, note } = await run(); process.exit(report('net', problems, note)); }
