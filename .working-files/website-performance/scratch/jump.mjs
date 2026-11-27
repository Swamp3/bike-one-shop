// Visible jump of the swap: hero screenshot with the frozen first video frame shown vs the poster alone, same crop.
import fs from 'node:fs';
const sharp = (await import('/Users/timo.alts/dev/bike-one-shop/website/node_modules/sharp/dist/index.mjs')).default;
const { chromium } = await import('/Users/timo.alts/dev/astro-conversion-kit/node_modules/playwright/index.mjs');
const BASE = 'http://127.0.0.1:4401';
const browser = await chromium.launch({ channel: 'chrome' });
fs.mkdirSync('frames/jump', { recursive: true });
for (const [vname, file] of [['720p-11Mbps', '/media/hero720.mp4'], ['540p-1Mbps', '/media/a_540p_8s_1000.mp4']]) for (const width of [1440, 390]) for (const page_ of ['b', 'm']) {
  const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
  const page = await ctx.newPage();
  await page.route((u) => !u.href.startsWith(BASE), (r) => r.abort());
  await page.goto(`${BASE}/${page_}/?file=${file}&freeze=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__sim && window.__sim.frozen, null, { timeout: 20000 });
  await page.waitForTimeout(300);
  const hero = await page.locator('.hero').boundingBox();
  const clip = { x: 0, y: 0, width, height: Math.round(hero.y + hero.height) };
  // hide the text so only the picture layers are compared (shade stays)
  await page.addStyleTag({ content: '.hero .copy{visibility:hidden}' });
  const withVideo = await page.screenshot({ clip });
  await page.addStyleTag({ content: '.hero-video{opacity:0 !important}' });
  await page.waitForTimeout(100);
  const poster = await page.screenshot({ clip });
  const tag = `${page_}-${width}-${vname}`;
  fs.writeFileSync(`frames/jump/${tag}-video.png`, withVideo); fs.writeFileSync(`frames/jump/${tag}-poster.png`, poster);
  const a = await sharp(withVideo).removeAlpha().raw().toBuffer(), b = await sharp(poster).removeAlpha().raw().toBuffer();
  let sum = 0, big = 0; for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); sum += d; if (d > 24) big++; }
  console.log(tag.padEnd(26), 'mean abs diff 0-255:', (sum / a.length).toFixed(1), ' share of channel values off by >24:', (100 * big / a.length).toFixed(1) + '%', ' firstMedia', await page.evaluate(() => window.__sim.firstMedia));
  await ctx.close();
}
await browser.close();
