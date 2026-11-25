// Check `seo`: the rules of the plan's SEO section, on the native pages of dist/. Title 30 to 60 characters and
// description 70 to 160, both unique; one h1; lang de; canonical on the build origin; Open Graph and Twitter cards with
// a 1200x630 image; JSON-LD that parses and holds only captured facts; robots.txt and sitemap by build mode; a dev
// build is noindex everywhere and has no sitemap. The 404 page is noindex in every build and has no canonical.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { attr, byTag, DIST, find, isMain, nativePages, ORIGIN, parseHtml, RELEASE, report, resolveBuilt, ROOT, squash, text } from '../lib/dist.mjs';

const sharp = createRequire(path.join(ROOT, 'package.json'))('sharp');
const FORBIDDEN_LD_KEYS = ['geo', 'aggregateRating', 'review', 'priceRange', 'sameAs'];

export async function run() {
  const problems = [];
  const titles = new Map();
  const descriptions = new Map();
  const indexable = [];
  const meta = (doc, key) => byTag(doc, 'meta').find((m) => attr(m, 'property') === key || attr(m, 'name') === key)?.attrs.find((a) => a.name === 'content')?.value;

  for (const page of nativePages()) {
    const doc = parseHtml(page.file);
    const at = (msg) => problems.push(`${page.url}: ${msg}`);
    const html = byTag(doc, 'html')[0];
    if (attr(html, 'lang') !== 'de') at('html lang is not "de"');

    const title = squash(text(byTag(doc, 'title')[0] ?? { childNodes: [] }));
    if (title.length < 30 || title.length > 60) at(`title is ${title.length} characters (30 to 60): "${title}"`);
    if (titles.has(title)) at(`title duplicates ${titles.get(title)}`); else titles.set(title, page.url);

    const description = meta(doc, 'description') ?? '';
    if (description.length < 70 || description.length > 160) at(`description is ${description.length} characters (70 to 160)`);
    if (descriptions.has(description)) at(`description duplicates ${descriptions.get(description)}`); else descriptions.set(description, page.url);

    const h1 = byTag(doc, 'h1');
    if (h1.length !== 1) at(`${h1.length} h1 elements (exactly one)`); else if (!squash(text(h1[0]))) at('h1 is empty');

    const notFound = page.url === '/404.html';
    const canonical = find(doc, (n) => n.tagName === 'link' && attr(n, 'rel') === 'canonical').map((n) => attr(n, 'href'));
    const want = `${ORIGIN}${page.url}`;
    if (notFound) { if (canonical.length) at('the 404 page must not have a canonical'); }
    else if (canonical.length !== 1 || canonical[0] !== want) at(`canonical is ${JSON.stringify(canonical)}, want ${want}`);

    const robots = meta(doc, 'robots') ?? '';
    const noindex = /noindex/i.test(robots);
    if ((!RELEASE || notFound) && !noindex) at('dev build page (and the 404 page in every build) is not noindex');
    if (!noindex) indexable.push(page.url);

    for (const k of ['og:title', 'og:description', ...(notFound ? [] : ['og:url']), 'og:image', 'og:type', 'og:locale', 'twitter:card', 'twitter:image']) if (!meta(doc, k)) at(`missing ${k}`);
    if (!notFound && meta(doc, 'og:url') !== want) at(`og:url is ${meta(doc, 'og:url')}`);
    if (meta(doc, 'twitter:card') !== 'summary_large_image') at('twitter:card is not summary_large_image');
    const image = meta(doc, 'og:image');
    if (image) {
      if (!image.startsWith(`${ORIGIN}/`)) at(`og:image ${image} is not on the build origin`);
      else {
        const f = resolveBuilt(new URL(image).pathname);
        if (!f) at(`og:image ${image} is not built`);
        else { const m = await sharp(f).metadata(); if (m.width !== 1200 || m.height !== 630) at(`og:image is ${m.width}x${m.height}, want 1200x630`); }
      }
    }

    // JSON-LD
    const ids = new Set();
    const types = [];
    for (const s of find(doc, (n) => n.tagName === 'script' && attr(n, 'type') === 'application/ld+json')) {
      let data;
      try { data = JSON.parse(text(s) || s.childNodes.map((c) => c.value).join('')); } catch (e) { at(`JSON-LD does not parse: ${e.message}`); continue; }
      if (data['@context'] !== 'https://schema.org') at('JSON-LD without the schema.org @context');
      for (const node of data['@graph'] ?? [data]) {
        types.push(node['@type']);
        if (node['@id']) { if (ids.has(node['@id'])) at(`duplicate JSON-LD @id ${node['@id']}`); ids.add(node['@id']); }
        for (const k of FORBIDDEN_LD_KEYS) if (k in node) at(`JSON-LD ${node['@type']} has "${k}": the capture holds no such fact`);
        if (node['@type'] === 'BikeStore' && !(node.address?.streetAddress && node.telephone && node.openingHoursSpecification?.length)) at('BikeStore without address, telephone and hours');
        if (node['@type'] === 'BreadcrumbList') for (const it of node.itemListElement) if (!resolveBuilt(new URL(it.item).pathname)) at(`breadcrumb ${it.item} is not built`);
        for (const v of JSON.stringify(node).match(/https?:\/\/[^"]+/g) ?? []) if (!v.startsWith(ORIGIN)) at(`JSON-LD URL ${v} is not on the build origin`);
      }
    }
    if (page.url === '/') for (const t of ['Organization', 'WebSite', 'BikeStore']) if (!types.includes(t)) at(`home JSON-LD lacks ${t}`);
    if (page.url !== '/' && !notFound && !types.includes('BreadcrumbList')) at('no BreadcrumbList JSON-LD');
  }

  // robots.txt and sitemap
  const robotsFile = path.join(DIST, 'robots.txt');
  const robots = fs.existsSync(robotsFile) ? fs.readFileSync(robotsFile, 'utf8') : '';
  const sitemapIndex = path.join(DIST, 'sitemap-index.xml');
  const sitemap = path.join(DIST, 'sitemap-0.xml');
  if (!robots) problems.push('robots.txt is missing');
  if (RELEASE) {
    if (/^Disallow:\s*\/\s*$/m.test(robots)) problems.push('release robots.txt blocks everything');
    if (!robots.includes(`Sitemap: ${ORIGIN}/sitemap-index.xml`)) problems.push('release robots.txt lacks the Sitemap line');
    if (!fs.existsSync(sitemap) || !fs.existsSync(sitemapIndex)) problems.push('release build has no sitemap-index.xml and sitemap-0.xml');
    else {
      const listed = [...fs.readFileSync(sitemap, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(ORIGIN, ''));
      const a = [...listed].sort().join('\n'); const b = [...indexable].sort().join('\n');
      if (a !== b) problems.push(`sitemap lists ${listed.length} pages, the native indexable pages are ${indexable.length}: ${[...new Set([...listed.filter((u) => !indexable.includes(u)), ...indexable.filter((u) => !listed.includes(u))])].join(', ')}`);
      if (!fs.readFileSync(sitemapIndex, 'utf8').includes(`${ORIGIN}/sitemap-0.xml`)) problems.push('sitemap-index.xml does not name sitemap-0.xml');
    }
  } else {
    if (!/^Disallow:\s*\/\s*$/m.test(robots)) problems.push('dev robots.txt does not block everything');
    if (fs.existsSync(sitemap) || fs.existsSync(sitemapIndex)) problems.push('dev build has a sitemap although every page is noindex');
  }
  return { problems, note: `${nativePages().length} native pages, ${RELEASE ? 'release' : 'dev'} build` };
}

if (isMain(import.meta.url)) { const { problems, note } = await run(); process.exit(report('seo', problems, note)); }
