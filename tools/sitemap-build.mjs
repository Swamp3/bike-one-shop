// Native sitemap (decision d42): after the build, list exactly the indexable pages of dist/ in sitemap-0.xml and name
// it in sitemap-index.xml. Only the release build (PUBLIC_INDEXABLE=true) gets one: every other build is noindex
// and has no sitemap.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { attr, byTag, DIST, ORIGIN, pages, parseHtml, RELEASE } from './lib/dist.mjs';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const metaContent = (doc, key) => byTag(doc, 'meta').find((m) => attr(m, 'name') === key || attr(m, 'property') === key)?.attrs.find((a) => a.name === 'content')?.value;

/** [{ url, lastmod }]: lastmod only where the page states a modified date (the posts); no date is guessed for the others. */
export function indexableEntries() {
  return pages().filter((p) => p.url !== '/404.html').map((p) => ({ p, doc: parseHtml(p.file) })).filter(({ doc }) => !/noindex/i.test(metaContent(doc, 'robots') ?? ''))
    .map(({ p, doc }) => ({ url: p.url, lastmod: metaContent(doc, 'article:modified_time')?.slice(0, 10) }));
}
export const indexableUrls = () => indexableEntries().map((e) => e.url);

function main() {
  if (!RELEASE) return console.log('sitemap: dev build is noindex, no sitemap written');
  const entries = indexableEntries();
  const urls = entries.map((e) => e.url);
  const urlset = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map((e) => `  <url><loc>${esc(ORIGIN + e.url)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`;
  const index = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${ORIGIN}/sitemap-0.xml</loc></sitemap>\n</sitemapindex>\n`;
  fs.writeFileSync(path.join(DIST, 'sitemap-0.xml'), urlset);
  fs.writeFileSync(path.join(DIST, 'sitemap-index.xml'), index);
  console.log(`sitemap: ${urls.length} pages`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
