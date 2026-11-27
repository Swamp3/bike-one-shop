// Rendered width of the service blocks and post covers against the srcset candidate the browser picked, at tablet and
// laptop widths (1x): reports chosen file width vs needed pixels.
const W = '/Users/timo.alts/dev/bike-one-shop/website';
const { PLAYWRIGHT, BASE, abortForeign } = await import(`${W}/tools/lib/browser.mjs`);
const { chromium } = await import(PLAYWRIGHT);
const browser = await chromium.launch({ channel: 'chrome' });
const pages = ['/', '/service/', '/fahrrad-leasing-die-smarte-alternative-zum-autopendeln-und-warum-es-sich-jetzt-mehr-denn-je-lohnt/'];
for (const width of [600, 768, 800, 900, 1000, 1023, 1024, 1100, 1184, 1280, 1440, 1700]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage(); await abortForeign(page);
  const out = [];
  for (const url of pages) {
    await page.goto(BASE + url, { waitUntil: 'load' });
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); } await new Promise((r) => setTimeout(r, 400)); });
    const r = await page.evaluate(() => [...document.querySelectorAll('img.pic, img.cover')].map((i) => ({ need: Math.round(i.getBoundingClientRect().width), got: i.currentSrc && [...i.closest('picture').querySelectorAll('source')].find((s) => s.type === 'image/avif').srcset.split(',').map((c) => c.trim().split(/\s+/)).find((c) => i.currentSrc.endsWith(c[0].split('/').pop()))?.[1] })));
    for (const x of r) out.push(`${x.need}->${x.got}`);
  }
  console.log(width, [...new Set(out)].join(' '));
  await ctx.close();
}
await browser.close();
