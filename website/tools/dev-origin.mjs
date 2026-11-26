// Post-build safety net (decision d27): a dev or staging build must not name the production domain.
// Unless PUBLIC_INDEXABLE=true it rewrites every form of https://bike-one.org in the text files of dist/
// (canonical, sitemaps, feeds, robots.txt, inline script config) to SITE_ORIGIN (default https://bike-one.dev).
// The release build is left alone. The build origin in astro.config.mjs is the primary fix; this only catches what slipped through.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEV_ORIGIN = 'https://bike-one.dev';
const TEXT = /\.(html|xml|txt|json|xsl|js|css)$/i;
const NO_EXT = new Set(['_redirects', '_headers']);
const SKIP = new Set(['uploads', '.prerender']);
// scheme + host: plain, protocol-relative or JSON-escaped (https:\/\/host)
const URL_FORM = /(?:https?:)?(\\?\/){2}(?:www\.)?bike-one\.org/gi;
// whatever is left: URL-encoded (https%3A%2F%2Fhost) and bare mentions; not shop.bike-one.org or a@bike-one.org
const BARE = /(?:(?<=%[0-9A-F]{2})|(?<![\w.@-]))(?:www\.)?bike-one\.org/gi;

export function rewrite(text, origin = DEV_ORIGIN) {
  const host = new URL(origin).host;
  return text
    .replace(URL_FORM, (m, slash) => (slash.length > 1 ? origin.replace(/\//g, '\\/') : origin))
    .replace(BARE, host);
}

function walk(dir, visit) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(p, visit); } else if (TEXT.test(e.name) || NO_EXT.has(e.name)) visit(p);
  }
}

function main() {
  if (process.env.PUBLIC_INDEXABLE === 'true') return console.log('dev-origin: release build, dist left as is');
  const origin = (process.env.SITE_ORIGIN || DEV_ORIGIN).replace(/\/+$/, '');
  new URL(origin); // throws on an invalid SITE_ORIGIN
  let files = 0;
  walk('dist', (p) => {
    const before = fs.readFileSync(p, 'utf8');
    const after = rewrite(before, origin);
    if (after !== before) { fs.writeFileSync(p, after); files += 1; }
  });
  console.log(`dev-origin: ${files} files now name ${origin}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
