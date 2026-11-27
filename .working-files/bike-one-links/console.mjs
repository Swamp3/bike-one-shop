// Console regression probe. Usage (from website/): node ../.working-files/bike-one-links/console.mjs <out.json>
// Visits 5 pages at 1440 and 390 against the local review server. Every request to another host is aborted
// (never contact the live site) and recorded as "blocked: <url>".
import { chromium } from '/Users/timo.alts/dev/astro-conversion-kit/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const base = 'http://localhost:4321';
const pages = ['/', '/main-bike/', '/blog/', '/termin-buchen/', '/Marke/trek/'];
const out = {};
const b = await chromium.launch();
for (const w of [1440, 390]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
  await ctx.route((u) => u.origin !== base, (r) => { out[`${w} ${cur}`]?.push('blocked: ' + r.request().url().slice(0, 140)); return r.abort(); });
  var cur = '';
  for (const p of pages) {
    cur = p; const errs = (out[`${w} ${p}`] = []);
    const page = await ctx.newPage();
    page.on('console', (m) => errs.push(`console ${m.type()}: ${m.text().slice(0, 200)}`));
    page.on('pageerror', (e) => errs.push('pageerror: ' + String(e.message).slice(0, 200)));
    page.on('requestfailed', (r) => { if (r.url().startsWith(base)) errs.push(`requestfailed: ${r.url().replace(base, '')} ${r.failure()?.errorText}`); });
    page.on('response', (r) => { if (r.status() >= 400) errs.push(`HTTP ${r.status()}: ${r.url().replace(base, '').slice(0, 140)}`); });
    await page.goto(base + p, { waitUntil: 'load', timeout: 60000 }).catch((e) => errs.push('goto: ' + e.message.slice(0, 100)));
    await page.waitForTimeout(2500);
    await page.close();
  }
  await ctx.close();
}
await b.close();
for (const k of Object.keys(out)) out[k] = [...new Set(out[k].map((m) => m.replace(/\?ver=[^ ]*/g, '')))].sort();
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) console.log(k, v.length, '\n  ' + v.join('\n  '));
