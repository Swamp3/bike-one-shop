// Visual review helper (not a gate): full-page screenshots of every built page at 390, 768 and 1440 into review/<out>/
// (git-ignored), system Chrome, smooth scrolling off, fonts awaited, scrolled through so lazy images load.
//   node tools/screens.mjs [--out review/stage3] [--pages /,/blog/]
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { isMain, nativePages, ROOT } from './lib/dist.mjs';

const BASE = (process.env.REVIEW_URL || 'http://localhost:4321').replace(/\/$/, '');
const PLAYWRIGHT = process.env.PLAYWRIGHT_MODULE || '/Users/timo.alts/dev/astro-conversion-kit/node_modules/playwright/index.mjs';

if (isMain(import.meta.url)) {
  const { values } = parseArgs({ options: { out: { type: 'string', default: 'review/stage3' }, pages: { type: 'string' } } });
  const out = path.resolve(ROOT, values.out);
  fs.mkdirSync(out, { recursive: true });
  const { chromium } = await import(PLAYWRIGHT);
  const browser = await chromium.launch({ channel: 'chrome' });
  const pages = values.pages?.split(',') ?? nativePages().map((p) => p.url);
  for (const width of [390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    for (const url of pages) {
      await page.goto(`${BASE}${url}`, { waitUntil: 'load' });
      await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); await document.fonts.ready; });
      await page.waitForLoadState('networkidle');
      const slug = (url === '/' ? 'home' : url.replace(/^\/|\/$|\.html$/g, '')).slice(0, 28);
      await page.screenshot({ path: path.join(out, `${slug}-${width}.png`), fullPage: true });
    }
    await context.close();
  }
  await browser.close();
  console.log(`screenshots in ${out}`);
}
