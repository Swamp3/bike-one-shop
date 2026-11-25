// Shared helpers of the checks (tools/checks/*): the built site, its pages, the allowlist, a tiny HTML walker.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';
import { isLegacyFile, isLegacyPage, LEGACY_PAGES } from '../legacy.mjs';
import { DEV_ORIGIN } from '../dev-origin.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DIST = path.join(ROOT, 'dist');
export const RELEASE = process.env.PUBLIC_INDEXABLE === 'true';
export const ORIGIN = RELEASE ? 'https://bike-one.org' : (process.env.SITE_ORIGIN || DEV_ORIGIN).replace(/\/+$/, '');
export const SHOP = RELEASE ? 'https://shop.bike-one.org/' : 'https://shop.bike-one.dev/';

export function need(cond, msg) { if (!cond) { console.error(msg); process.exit(2); } }

export function walk(dir, visit, skip = () => false, base = dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    const rel = path.relative(base, p).split(path.sep).join('/');
    if (skip(rel, e)) continue;
    if (e.isDirectory()) walk(p, visit, skip, base); else visit(p, rel);
  }
}

/** Every built HTML page: { url: '/ueber-uns/', file, rel, legacy }. dist/.prerender is a build artefact, not a page. */
export function pages() {
  need(fs.existsSync(DIST), 'dist/ is missing: run npm run build first');
  const out = [];
  walk(DIST, (file, rel) => {
    if (!rel.endsWith('.html')) return;
    const url = rel === 'index.html' ? '/' : rel.endsWith('/index.html') ? `/${rel.slice(0, -'index.html'.length)}` : `/${rel}`;
    out.push({ url, file, rel, legacy: isLegacyPage(url) });
  }, (rel) => rel === '.prerender' || rel.startsWith('.prerender/'));
  return out.sort((a, b) => a.url.localeCompare(b.url));
}
export const nativePages = () => pages().filter((p) => !p.legacy);

/** Allowlist hygiene: every entry must still be built, and nothing built may be missing from it unless it is native. */
export function staleAllowlist() {
  const built = new Set(pages().map((p) => p.url));
  return LEGACY_PAGES.filter((p) => !built.has(p)).map((p) => `allowlist entry ${p} is not built any more: delete it from tools/legacy.mjs`);
}

/** The built file a URL path resolves to, or null. */
export function resolveBuilt(urlPath) {
  const clean = decodeURIComponent(urlPath.split(/[?#]/)[0]).replace(/^\//, '');
  const candidates = clean === '' || clean.endsWith('/') ? [`${clean}index.html`] : [clean, `${clean}/index.html`];
  for (const c of candidates) {
    const f = path.join(DIST, c);
    if (f.startsWith(DIST) && fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  }
  return null;
}

export const isLegacyBuilt = (rel) => isLegacyFile(rel);

// --- HTML ---
export const parseHtml = (file) => parse(fs.readFileSync(file, 'utf8'), { sourceCodeLocationInfo: false });

export function* nodes(node) {
  yield node;
  for (const child of node.childNodes ?? []) yield* nodes(child);
  if (node.content) yield* nodes(node.content);
}
export const attr = (n, name) => n.attrs?.find((a) => a.name === name)?.value;
export const find = (doc, test) => [...nodes(doc)].filter((n) => n.tagName && test(n));
export const byTag = (doc, tag) => find(doc, (n) => n.tagName === tag);
export function text(n) {
  if (n.nodeName === '#text') return n.value;
  if (['script', 'style', 'template'].includes(n.tagName)) return '';
  return (n.childNodes ?? []).map(text).join('');
}
export const squash = (s) => s.replace(/\s+/g, ' ').trim();

export function report(name, problems, note = '') {
  if (problems.length) {
    console.error(`${name}: FAIL (${problems.length})`);
    for (const p of problems.slice(0, 60)) console.error(`  - ${p}`);
    if (problems.length > 60) console.error(`  ... and ${problems.length - 60} more`);
    return 1;
  }
  console.log(`${name}: ok${note ? ` (${note})` : ''}`);
  return 0;
}

export const isMain = (metaUrl) => process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(metaUrl);
