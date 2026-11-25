// Native sitemap (decision d42): after the build, list exactly the indexable pages of dist/ in sitemap-0.xml and name
// it in sitemap-index.xml. Only the release build (PUBLIC_INDEXABLE=true) gets one: every other build is noindex
// and has no sitemap.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { attr, byTag, DIST, ORIGIN, pages, parseHtml, RELEASE } from './lib/dist.mjs';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function indexableUrls() {
  return pages().filter((p) => p.url !== '/404.html').filter((p) => {
    const robots = byTag(parseHtml(p.file), 'meta').find((m) => attr(m, 'name') === 'robots');
    return !/noindex/i.test(attr(robots ?? { attrs: [] }, 'content') ?? '');
  }).map((p) => p.url);
}

function main() {
  if (!RELEASE) return console.log('sitemap: dev build is noindex, no sitemap written');
  const urls = indexableUrls();
  const urlset = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(ORIGIN + u)}</loc></url>`).join('\n')}\n</urlset>\n`;
  const index = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${ORIGIN}/sitemap-0.xml</loc></sitemap>\n</sitemapindex>\n`;
  fs.writeFileSync(path.join(DIST, 'sitemap-0.xml'), urlset);
  fs.writeFileSync(path.join(DIST, 'sitemap-index.xml'), index);
  console.log(`sitemap: ${urls.length} pages`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
