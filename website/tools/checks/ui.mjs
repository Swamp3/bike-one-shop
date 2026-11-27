// Check `ui`: what the HTML cannot show, in system Chrome against the review server (dist/_headers applied).
//  - focus: Tab through every page at 1440 and 390; the skip link comes first and is visible when focused; every
//    focused element has a visible ring (outline of at least 2 px); the sequence ends (no trap).
//  - no horizontal overflow at 1440 and 390.
//  - touch targets at 390: every link and button is at least 44 px high and wide, unless it is a link inside a sentence.
//  - menu at 390: Enter opens it, the first Tab lands on a menu link, Escape closes it and returns to the button.
//  - prefers-reduced-motion: smooth scrolling and transitions are off, the hero film never starts, no button.
//  - hero film (home, 1440, decision d83): it starts by itself, its pause button is reachable, Space pauses, Enter plays again, the
//    label follows; the first frame of the film differs from the poster by at most 6 of 255 per colour value on average (the swap is invisible).
//  - text on photos: the white text of the home hero and the Ueber uns banner keeps 4.5:1 (3:1 for the large h1) against the
//    lightest part of the photo behind it: the home poster at 1440 and 390 (the phone crop), the Ueber uns banner, and frames of
//    the hero film at 5, 25, 50, 75 and 95 % of its length.
import { PNG } from 'pngjs';
import { isMain, nativePages, report } from '../lib/dist.mjs';
import { abortForeign, applyHeaders, BASE, launchers, needServer } from '../lib/browser.mjs';
import { luminance } from '../lib/contrast.mjs';

const MIN_TARGET = 44;
const MAX_SWAP_DIFF = 6; // mean absolute difference, poster against the film's first frame, of 255

async function tabThrough(page, at) {
  await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
  const seen = [];
  for (let i = 0; i < 150; i += 1) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const label = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('href') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
      return { tag: el.tagName.toLowerCase(), label, outline: cs.outlineStyle, width: parseFloat(cs.outlineWidth), shadow: cs.boxShadow, visible: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden', top: r.top, skip: el.classList.contains('skip-link'), key: `${el.tagName}|${el.getAttribute('href') ?? ''}|${el.textContent?.trim().slice(0, 20)}` };
    });
    if (!info) break;
    if (seen.some((s) => s.key === info.key) && seen.length > 3) break;
    seen.push(info);
    if (!info.visible) at(`focus reaches an invisible element: ${info.label}`);
    else if (!((info.outline !== 'none' && info.width >= 2) || (info.shadow && info.shadow !== 'none'))) at(`no visible focus ring on ${info.tag} "${info.label}"`);
    if (info.skip && info.top < 0) at('the skip link is not visible when focused');
  }
  if (!seen[0]?.skip) at(`the first Tab stop is not the skip link (${seen[0]?.label})`);
  if (seen.length >= 150) at('Tab never ends: focus trap?');
  return seen;
}

/** Highest luminance (98th percentile) of the pixels in a box of a PNG screenshot. */
function lightest(png, box) {
  const values = [];
  for (let y = Math.max(0, Math.floor(box.y)); y < Math.min(png.height, Math.ceil(box.y + box.height)); y += 2) {
    for (let x = Math.max(0, Math.floor(box.x)); x < Math.min(png.width, Math.ceil(box.x + box.width)); x += 2) {
      const i = (y * png.width + x) * 4;
      values.push(luminance([png.data[i], png.data[i + 1], png.data[i + 2]]));
    }
  }
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length * 0.98)] ?? 0;
}

/** Show the film at time t, paused: seek, play until the first frame is presented, pause (a paused video would show a stale frame). */
const presentAt = (page, t) => page.evaluate(async (time) => {
  const v = document.querySelector('.hero-video');
  v.pause(); v.currentTime = time;
  await new Promise((r) => v.addEventListener('seeked', r, { once: true }));
  await v.play();
  await new Promise((r) => v.requestVideoFrameCallback(() => { v.pause(); r(); }));
}, t);

/** Mean absolute difference (per colour value, 0 to 255) of two same-size screenshots. */
function meanDiff(a, b) {
  let sum = 0;
  for (let i = 0; i < a.data.length; i += 4) for (let c = 0; c < 3; c += 1) sum += Math.abs(a.data[i + c] - b.data[i + c]);
  return sum / ((a.data.length / 4) * 3);
}

async function textOnPhoto(page, at, label, selectors) {
  // measure the text boxes, hide the text (keep the layout), look at the pixels where the text was
  const boxes = await page.evaluate((sels) => sels.flatMap((s) => [...document.querySelectorAll(s)].map((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const px = parseFloat(cs.fontSize);
    return { sel: s, x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height, large: px >= 24 || (px >= 18.66 && Number(cs.fontWeight) >= 700), filled: cs.backgroundColor !== 'rgba(0, 0, 0, 0)' };
  })).filter((b) => !b.filled), selectors);
  await page.addStyleTag({ content: '.hero .copy, .banner .copy { visibility: hidden !important; }' });
  const png = PNG.sync.read(await page.screenshot({ fullPage: true }));
  for (const b of boxes) {
    const L = lightest(png, b);
    const c = 1.05 / (L + 0.05);
    const need = b.large ? 3 : 4.5;
    if (process.env.UI_VERBOSE) console.log(`${label} ${b.sel}: ${c.toFixed(2)}:1 (need ${need}:1)`);
    if (c < need) at(`${label}: white ${b.sel} on the photo is only ${c.toFixed(2)}:1 (need ${need}:1)`);
  }
  return boxes.length;
}

export async function run() {
  await needServer();
  const problems = [];
  const pages = nativePages();
  const browser = await (await launchers()).chrome();
  let stops = 0;
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    const page = await context.newPage();
    await applyHeaders(page);
    for (const p of pages) {
      const at = (msg) => problems.push(`${width} ${p.url}: ${msg}`);
      await page.goto(`${BASE}${p.url}`, { waitUntil: 'load' });
      await page.waitForLoadState('networkidle');
      stops += (await tabThrough(page, at)).length;
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 0) at(`the page is ${overflow} px wider than the screen (horizontal scrolling)`);

      if (width === 390) {
        // touch targets: links inside a sentence are exempt (WCAG 2.5.8 inline exception); everything else is at least 44 px
        const small = await page.evaluate((min) => [...document.querySelectorAll('a[href], button')].filter((el) => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0 || el.closest('[popover]:not(:popover-open)') || el.closest('[hidden]')) return false;
          if (el.matches('.skip-link')) return false;
          const parent = el.parentElement;
          const onItsOwnLine = el.previousElementSibling?.tagName === 'BR' || el.nextElementSibling?.tagName === 'BR';
          const inSentence = !onItsOwnLine && getComputedStyle(el).display === 'inline' && parent && (parent.textContent ?? '').replace(el.textContent ?? '', '').replace(/[\s.,:;()–-]/g, '').length > 0;
          return !inSentence && (r.height < min - 0.5 || r.width < min - 0.5);
        }).map((el) => `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30)}" ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`), MIN_TARGET);
        for (const s of [...new Set(small)]) at(`touch target under ${MIN_TARGET} px: ${s}`);
      }
    }

    if (width === 390) {
      // the menu with the keyboard only
      const at = (msg) => problems.push(`390 menu: ${msg}`);
      await page.goto(`${BASE}/`, { waitUntil: 'load' });
      await page.focus('.menu-btn');
      await page.keyboard.press('Enter');
      if (!(await page.locator('#site-nav').evaluate((n) => n.matches(':popover-open')))) at('Enter on the menu button does not open the menu');
      await page.keyboard.press('Tab');
      if (!(await page.evaluate(() => document.activeElement?.closest('#site-nav') !== null))) at('Tab after opening does not land in the menu');
      await page.keyboard.press('Escape');
      if (await page.locator('#site-nav').evaluate((n) => n.matches(':popover-open'))) at('Escape does not close the menu');
      if (!(await page.evaluate(() => document.activeElement?.classList.contains('menu-btn')))) at('after Escape the focus is not back on the menu button');
      // links inside the open menu are 44 px high
      await page.keyboard.press('Enter');
      const tooSmall = await page.evaluate((min) => [...document.querySelectorAll('#site-nav a')].filter((a) => a.getBoundingClientRect().height < min).map((a) => a.textContent), MIN_TARGET);
      if (tooSmall.length) at(`menu links under ${MIN_TARGET} px: ${tooSmall.join(', ')}`);
      await page.keyboard.press('Escape');
    }
    await context.close();
  }

  // prefers-reduced-motion
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const r = await page.evaluate(() => ({ scroll: getComputedStyle(document.documentElement).scrollBehavior, transition: parseFloat(getComputedStyle(document.querySelector('.btn')).transitionDuration) }));
    if (r.scroll !== 'auto') problems.push(`reduced motion: scroll-behavior is ${r.scroll}`);
    if (r.transition > 0.001) problems.push(`reduced motion: transitions last ${r.transition}s`);
    await context.close();
  }

  // reduced motion: the film never starts and has no button
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await abortForeign(page);
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    const r = await page.evaluate(() => { const v = document.querySelector('.hero-video'); return { src: v.getAttribute('src'), paused: v.paused, button: !document.querySelector('.hero-toggle').hidden }; });
    if (r.src || !r.paused || r.button) problems.push(`reduced motion: the hero film started or shows a button (${JSON.stringify(r)})`);
    await context.close();
  }

  // the hero film at 1440: button, keyboard, swap, text on its frames
  let measured = 0;
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await abortForeign(page);
    const at = (msg) => problems.push(`hero film: ${msg}`);
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelector('.hero-video')?.classList.contains('is-playing'), null, { timeout: 15000 }).catch(() => at('the film did not start, so the button never appeared'));
    const state = () => page.evaluate(() => { const v = document.querySelector('.hero-video'); const b = document.querySelector('.hero-toggle'); return { paused: v.paused, hidden: b.hidden, label: b.getAttribute('aria-label') }; });
    let s = await state();
    if (s.hidden) at('the pause button is hidden while the film plays');
    else {
      await page.focus('.hero-toggle');
      await page.keyboard.press('Space');
      await page.waitForTimeout(300);
      s = await state();
      if (!s.paused || !/abspielen/.test(s.label)) at(`Space does not pause (${JSON.stringify(s)})`);
      await page.waitForTimeout(500);
      if (!(await state()).paused) at('the film resumed by itself after the visitor paused it');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(600);
      s = await state();
      if (s.paused || !/anhalten/.test(s.label)) at(`Enter does not play again (${JSON.stringify(s)})`);
      await page.click('.hero-toggle'); // paused for the pixel measurements below; the page's own button, so its script does not resume the film
      await page.waitForTimeout(300);
      // the swap: poster (film hidden) against the film's first frame, same crop, copy and shade hidden
      const duration = await page.evaluate(() => document.querySelector('.hero-video').duration || 8);
      await page.addStyleTag({ content: '.hero .copy, .hero-toggle { visibility: hidden !important; } .hero::after { display: none !important; } html { scroll-behavior: auto !important; }' });
      await presentAt(page, 0);
      const hero = await page.locator('.hero').boundingBox();
      const clip = { x: 0, y: hero.y, width: hero.width, height: hero.height };
      const withFilm = PNG.sync.read(await page.screenshot({ clip }));
      await page.evaluate(() => { document.querySelector('.hero-video').style.visibility = 'hidden'; });
      await page.waitForTimeout(300);
      const poster = PNG.sync.read(await page.screenshot({ clip }));
      await page.evaluate(() => { document.querySelector('.hero-video').style.visibility = ''; });
      const diff = meanDiff(withFilm, poster);
      if (process.env.UI_VERBOSE) console.log(`hero film first frame against poster: mean difference ${diff.toFixed(2)} of 255`);
      if (diff > MAX_SWAP_DIFF) at(`the first frame of the film differs from the poster by ${diff.toFixed(2)} of 255 (at most ${MAX_SWAP_DIFF}): the swap would be visible`);
      // white text on frames of the film (the copy is visible again)
      await page.addStyleTag({ content: '.hero .copy, .hero-toggle { visibility: visible !important; } .hero::after { display: block !important; }' });
      for (const frac of [0.05, 0.25, 0.5, 0.75, 0.95]) {
        await presentAt(page, duration * frac);
        measured += await textOnPhoto(page, (m) => problems.push(`1440 ${m}`), `home hero film at ${Math.round(frac * 100)} %`, ['.hero h1', '.hero .eyebrow-light', '.hero .btn--ghost']);
      }
    }
    await context.close();
  }

  // white text on the photos
  for (const [url, label, selectors, widths] of [['/', 'home hero', ['.hero h1', '.hero .eyebrow-light', '.hero .btn--ghost'], [1440, 390]], ['/ueber-uns/', 'Ueber uns banner', ['.banner h1'], [1440, 390]]]) {
    for (const width of widths) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.goto(`${BASE}${url}`, { waitUntil: 'load' });
      await page.waitForLoadState('networkidle');
      measured += await textOnPhoto(page, (m) => problems.push(`${width} ${m}`), `${label}`, selectors);
      await context.close();
    }
  }
  await browser.close();
  return { problems, note: `${pages.length} pages x 1440, 390: ${stops} focus stops; touch targets, menu, hero button and film, reduced motion; ${measured} text boxes on photos` };
}

if (isMain(import.meta.url)) { const { problems, note } = await run(); process.exit(report('ui', problems, note)); }
