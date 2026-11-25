// Check `a11y` smoke test over the native pages' HTML (no dependency): heading order, alt text, landmarks, skip link,
// names for links, buttons and iframes, labelled form controls, unique ids, valid popover targets.
import { attr, byTag, find, isMain, nativePages, parseHtml, report, squash, text } from '../lib/dist.mjs';

const VAGUE = /^(hier|mehr|mehr erfahren|klicken sie hier|link|weiter)$/i;
const name = (n) => squash(text(n)) || attr(n, 'aria-label') || attr(n, 'title') || find(n, (c) => c.tagName === 'img' && attr(c, 'alt')).map((c) => attr(c, 'alt')).join(' ');

export function run() {
  const problems = [];
  for (const page of nativePages()) {
    const doc = parseHtml(page.file);
    const at = (msg) => problems.push(`${page.url}: ${msg}`);
    const all = find(doc, () => true);
    const ids = new Map();
    for (const n of all) { const id = attr(n, 'id'); if (id !== undefined) ids.set(id, (ids.get(id) ?? 0) + 1); }
    for (const [id, c] of ids) if (c > 1) at(`id "${id}" is used ${c} times`);

    // headings: start at h1, never skip a level going down
    const headings = find(doc, (n) => /^h[1-6]$/.test(n.tagName));
    let prev = 0;
    for (const h of headings) {
      const level = Number(h.tagName[1]);
      if (prev === 0 && level !== 1) at(`first heading is ${h.tagName}, not h1`);
      if (prev && level > prev + 1) at(`heading jumps from h${prev} to h${level}: "${squash(text(h)).slice(0, 40)}"`);
      if (!squash(text(h))) at(`empty ${h.tagName}`);
      prev = level;
    }

    for (const img of byTag(doc, 'img')) if (attr(img, 'alt') === undefined) at(`img ${attr(img, 'src')} has no alt attribute`);

    const count = (tag) => byTag(doc, tag).length;
    if (count('main') !== 1) at(`${count('main')} main landmarks`);
    if (count('header') < 1 || count('footer') < 1) at('missing header or footer landmark');
    const navs = byTag(doc, 'nav');
    if (navs.length > 1) for (const n of navs) if (!attr(n, 'aria-label') && !attr(n, 'aria-labelledby')) at('a nav without a label while there are several');

    const skip = find(doc, (n) => n.tagName === 'a' && attr(n, 'href')?.startsWith('#') && /springen|skip/i.test(text(n)))[0];
    if (!skip) at('no skip link'); else if (!ids.has(attr(skip, 'href').slice(1))) at('skip link target does not exist');

    for (const a of byTag(doc, 'a')) {
      if (attr(a, 'href') === undefined) continue;
      const n = name(a);
      if (!n) at(`link ${attr(a, 'href')} has no accessible name`);
      else if (VAGUE.test(n)) at(`link text "${n}" says nothing out of context`);
    }
    for (const b of byTag(doc, 'button')) if (!name(b)) at('a button has no accessible name');
    for (const f of byTag(doc, 'iframe')) if (!attr(f, 'title')) at('an iframe has no title');
    for (const c of find(doc, (n) => ['input', 'select', 'textarea'].includes(n.tagName) && attr(n, 'type') !== 'hidden')) {
      const id = attr(c, 'id');
      const labelled = attr(c, 'aria-label') || attr(c, 'aria-labelledby') || (id && find(doc, (n) => n.tagName === 'label' && attr(n, 'for') === id).length);
      if (!labelled) at(`form control ${c.tagName}${id ? `#${id}` : ''} has no label`);
    }
    for (const n of find(doc, (x) => attr(x, 'popovertarget') !== undefined)) if (!ids.has(attr(n, 'popovertarget'))) at(`popovertarget ${attr(n, 'popovertarget')} does not exist`);
    for (const n of find(doc, (x) => attr(x, 'tabindex') && Number(attr(x, 'tabindex')) > 0)) at(`positive tabindex on ${n.tagName}`);
  }
  return { problems, note: `${nativePages().length} native pages` };
}

if (isMain(import.meta.url)) { const { problems, note } = run(); process.exit(report('a11y', problems, note)); }
