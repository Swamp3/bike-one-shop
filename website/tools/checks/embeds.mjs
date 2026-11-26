// Check `embeds`: the click-to-load embeds under the real Content-Security-Policy of dist/_headers, in Chrome and WebKit.
// Every embed on every page that has one (the two booking pages, the two maps on Ueber uns, the JobRad calculator) is
// loaded three ways: mouse click, Enter and Space on the focused button. Before the click the page makes no non-local
// request; the click makes exactly one, to the embed's own host; no CSP violation; one iframe in the page, the gate is
// gone and the keyboard focus is on the iframe. Requests to other hosts are aborted, so nothing leaves the machine.
import { isMain, nativePages, report } from '../lib/dist.mjs';
import { abortForeign, applyHeaders, BASE, launchers, needServer } from '../lib/browser.mjs';

export async function run() {
  await needServer();
  const problems = [];
  const launch = await launchers();
  let tested = 0;
  const hosts = new Set();
  for (const bname of ['chrome', 'webkit']) {
    const browser = await launch[bname]();
    for (const p of nativePages()) {
      const count = await (async () => {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();
        await page.goto(`${BASE}${p.url}`, { waitUntil: 'load' });
        const n = await page.locator('[data-embed-load]').count();
        await context.close();
        return n;
      })();
      for (let index = 0; index < count; index += 1) {
        for (const how of ['click', 'Enter', 'Space']) {
          const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
          const page = await context.newPage();
          const at = (msg) => problems.push(`${bname} ${p.url} embed ${index + 1} (${how}): ${msg}`);
          const foreign = [];
          const aborted = [];
          const errors = [];
          page.on('request', (r) => { if (!r.url().startsWith(BASE)) foreign.push(r.url()); });
          page.on('requestfailed', (r) => { if (!r.url().startsWith(BASE)) aborted.push(r.url()); });
          page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
          page.on('pageerror', (e) => errors.push(e.message));
          await applyHeaders(page);
          await abortForeign(page);
          await page.goto(`${BASE}${p.url}`, { waitUntil: 'load' });
          await page.waitForLoadState('networkidle');
          if (foreign.length) at(`${foreign.length} non-local request(s) before the click: ${foreign[0]}`);
          const expected = await page.evaluate((i) => document.querySelectorAll('[data-embed] template')[i]?.content.querySelector('iframe')?.src, index);
          const button = page.locator('[data-embed-load]').nth(index);
          if (how === 'click') await button.click();
          else { await button.focus(); await page.keyboard.press(how); }
          await page.waitForTimeout(1200);
          tested += 1;
          if (!expected) { at('no iframe in the embed template'); await context.close(); continue; }
          hosts.add(new URL(expected).host);
          if (foreign.length !== 1) at(`${foreign.length} non-local requests after the activation (want exactly 1): ${foreign.join(', ')}`);
          else if (new URL(foreign[0]).host !== new URL(expected).host) at(`the request went to ${foreign[0]}, not to ${expected}`);
          if (foreign.some((u) => !aborted.includes(u))) at('a foreign request was not aborted by the test (it left the machine)');
          const bad = errors.filter((e) => /Content Security Policy|Refused to|violat/i.test(e));
          if (bad.length) at(`CSP error: ${bad[0].slice(0, 160)}`);
          const state = await page.evaluate((i) => {
            const box = document.querySelectorAll('[data-embed]')[i];
            return { iframes: document.querySelectorAll('iframe').length, gate: !!box.querySelector('.gate'), loaded: box.hasAttribute('data-loaded'), focus: document.activeElement?.tagName };
          }, index);
          if (state.iframes !== 1 || state.gate || !state.loaded) at(`page state after the activation: ${JSON.stringify(state)}`);
          if (state.focus !== 'IFRAME') at(`focus is on ${state.focus}, not on the iframe`);
          await context.close();
        }
      }
    }
    await browser.close();
  }
  return { problems, note: `${tested} activations (click, Enter, Space) in chrome and webkit, hosts ${[...hosts].join(', ')}` };
}

if (isMain(import.meta.url)) { const { problems, note } = await run(); process.exit(report('embeds', problems, note)); }
