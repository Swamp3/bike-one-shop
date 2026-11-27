// Full-page screenshots of every native page at 1440 and 390 (animations off, foreign requests aborted) into a folder, and a
// pixel comparison of two folders. usage: node shoot.mjs shoot outdir [pages,comma] | node shoot.mjs cmp dirA dirB
import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
const W = '/Users/timo.alts/dev/bike-one-shop/website';
const require = createRequire(`${W}/package.json`);
const { PNG } = require('pngjs');
const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'shoot') {
  const { PLAYWRIGHT, BASE, abortForeign } = await import(`${W}/tools/lib/browser.mjs`);
  const { nativePages } = await import(`${W}/tools/lib/dist.mjs`);
  const { chromium } = await import(PLAYWRIGHT);
  fs.mkdirSync(a, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  const urls = b ? b.split(',') : nativePages().map((p) => p.url);
  for (const width of [1440, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage(); await abortForeign(page);
    for (const url of urls) {
      await page.goto(BASE + url, { waitUntil: 'load' });
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
      await page.waitForLoadState('networkidle'); await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(a, `${width}-${url.replace(/[^a-z0-9]+/gi, '_').slice(0, 40) || 'home'}.png`), fullPage: true });
    }
    await ctx.close();
  }
  await browser.close();
} else {
  for (const f of fs.readdirSync(a).filter((n) => n.endsWith('.png'))) {
    if (!fs.existsSync(path.join(b, f))) { console.log(f, 'missing'); continue; }
    const A = PNG.sync.read(fs.readFileSync(path.join(a, f))), B = PNG.sync.read(fs.readFileSync(path.join(b, f)));
    if (A.width !== B.width || A.height !== B.height) { console.log(f, `size ${A.width}x${A.height} vs ${B.width}x${B.height}`); continue; }
    let diff = 0; for (let i = 0; i < A.data.length; i += 4) if (Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]) > 6) diff++;
    console.log(f.padEnd(52), diff === 0 ? 'identical' : `${diff} px differ (${(diff / (A.width * A.height) * 100).toFixed(3)} %)`);
  }
}
