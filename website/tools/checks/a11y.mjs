// Check `a11y` over the native pages' HTML and the design tokens (no dependency): heading order, alt text (empty only
// for decorative images, never a file name), landmarks, skip link, names for links, buttons and iframes, labelled form
// controls, unique ids, valid popover targets, and the contrast of every colour pair the stylesheets use (text 4.5:1,
// controls and the focus ring 3:1). What needs a browser (focus rings, touch targets, keyboard use, text on photos) is
// in `ui`.
import { attr, byTag, find, isMain, nativePages, parseHtml, report, squash, text } from '../lib/dist.mjs';
import { ratio, tokens } from '../lib/contrast.mjs';

// [foreground, background, minimum, where it is used]; a name starting with -- is a token of tokens.css
const PAIRS = [
  ...['--bg', '--surface', '--surface-2'].flatMap((bg) => [
    ['--ink', bg, 4.5, 'body text'], ['--ink-muted', bg, 4.5, 'lead text, dates, breadcrumbs'],
    ['--accent-strong', bg, 4.5, 'links and eyebrows'], ['--accent-strong-hover', bg, 4.5, 'link hover'],
    ['--focus', bg, 3, 'focus ring on light surfaces'], ['--line-strong', bg, 3, 'ghost button border'],
  ]),
  ['--accent-ink', '--accent-strong', 4.5, 'button label'], ['--accent-ink', '--accent-strong-hover', 4.5, 'button label on hover'],
  ['--header-text', '--header-bg', 4.5, 'header and footer text'], ['--header-text', '--header-surface', 4.5, 'menu panel'],
  ['--header-muted', '--header-bg', 4.5, 'footer secondary text'], ['--header-muted', '--header-surface', 4.5, 'menu hover'],
  ['--header-text', '--header-bg', 3, 'focus ring on dark surfaces (white)'], ['--accent', '--header-bg', 3, 'current page bar in the menu'],
  ['#6b6b6b', '--header-bg', 3, 'menu button border and ghost button border on dark'],
];
const DECORATIVE_CLASSES = new Set(['bg', 'thumb']); // hero and banner photos behind text, post thumbnails beside their linked title
const NOT_A_NAME = /\.(jpe?g|png|webp|avif|gif)\b|^(bild|foto|image|img|photo|picture)\d*$/i;

const VAGUE = /^(hier|mehr|mehr erfahren|klicken sie hier|link|weiter)$/i;
const name = (n) => squash(text(n)) || attr(n, 'aria-label') || attr(n, 'title') || find(n, (c) => c.tagName === 'img' && attr(c, 'alt')).map((c) => attr(c, 'alt')).join(' ');

export function run() {
  const problems = [];
  const t = tokens();
  for (const [fg, bg, min, use] of PAIRS) {
    const a = t[fg] ?? fg, b = t[bg] ?? bg;
    if (!/^#/.test(a) || !/^#/.test(b)) { problems.push(`contrast pair ${fg}/${bg}: not a token or colour`); continue; }
    const r = ratio(a, b);
    if (r < min) problems.push(`contrast ${fg} ${a} on ${bg} ${b} is ${r.toFixed(2)}:1, need ${min}:1 (${use})`);
  }
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

    for (const img of byTag(doc, 'img')) {
      const alt = attr(img, 'alt');
      const cls = (attr(img, 'class') ?? '').split(/\s+/);
      if (alt === undefined) at(`img ${attr(img, 'src')} has no alt attribute`);
      else if (alt === '' && !cls.some((c) => DECORATIVE_CLASSES.has(c))) at(`img ${attr(img, 'src')} has an empty alt but is not a decorative photo (class ${[...DECORATIVE_CLASSES].join(' or ')})`);
      else if (alt !== '' && (NOT_A_NAME.test(alt.trim()) || alt.trim().length < 8)) at(`img alt "${alt}" is a file name or too short to describe the image`);
    }

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
