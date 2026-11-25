// Shared by the browser checks (net, ui, embeds): Playwright from the conversion kit, the review server, and the
// page headers of dist/_headers applied to every document, so a Content-Security-Policy violation is a console error.
import fs from 'node:fs';
import path from 'node:path';
import { DIST, need } from './dist.mjs';

export const BASE = (process.env.REVIEW_URL || 'http://localhost:4321').replace(/\/$/, '');
export const PLAYWRIGHT = process.env.PLAYWRIGHT_MODULE || '/Users/timo.alts/dev/astro-conversion-kit/node_modules/playwright/index.mjs';

/** dist/_headers -> [{ re, headers }] for the path rules (host rules such as https://bike-one.dev/* are skipped). */
export function headerRules() {
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

/** The review server must be up and serve this dist/ (its home page equals dist/index.html). */
export async function needServer() {
  const up = await fetch(`${BASE}/`).then((r) => r.ok, () => false);
  need(up, `the review server is not answering on ${BASE}: start it with  node scripts/review-serve.mjs --background`);
  const served = Buffer.from(await (await fetch(`${BASE}/`)).arrayBuffer());
  need(served.equals(fs.readFileSync(path.join(DIST, 'index.html'))), `${BASE}/ does not serve this dist/ (home page differs); rebuild or restart the review server`);
}

/** Give every document of the review server the headers of dist/_headers (the CSP above all). */
export async function applyHeaders(page) {
  const rules = headerRules();
  await page.route('**/*', async (route) => {
    const req = route.request();
    // fallback, not continue: a handler registered earlier (an abort rule for foreign hosts) must still see the request
    if (req.resourceType() !== 'document' || !req.url().startsWith(BASE)) return route.fallback();
    const response = await route.fetch();
    const p = new URL(req.url()).pathname;
    const headers = { ...response.headers() };
    for (const rule of rules) if (rule.re.test(p)) Object.assign(headers, rule.headers);
    await route.fulfill({ response, headers });
  });
}

export async function launchers() {
  const { chromium, webkit, firefox } = await import(PLAYWRIGHT);
  return { chrome: () => chromium.launch({ channel: 'chrome' }), webkit: () => webkit.launch(), firefox: () => firefox.launch() };
}

/** Abort every request that does not go to the review server. Register it LAST: Playwright asks the newest route first. */
export async function abortForeign(page) {
  await page.route((url) => !url.href.startsWith(BASE), (route) => route.abort());
}
