// Check `seo`: the rules of the plan's SEO section, on the native pages of dist/.
//  head: title 30 to 60 characters and description 70 to 160, both unique; no slug-like title; claim words in title and
//        description must occur in the page's own text; one h1; lang de; canonical on the build origin; Open Graph and
//        Twitter cards that agree with each other, with a 1200x630 image under 300 KB; a dev build is noindex everywhere,
//        the 404 page in every build, and it has no canonical.
//  JSON-LD: parses; only the types the capture supports (no JobPosting, ratings, geo, price ranges); the node set each
//        page type must carry; every @id reference resolves inside the page; breadcrumbs equal the visible crumbs and
//        end at the canonical URL; Article matches h1, canonical, date and image; BikeStore matches the visible text.
//  links: no vague anchor text, the same text never points at two targets on one page, every page is linked from the
//        content (not the menu) of another page.
//  files: robots.txt and sitemap by build mode (the sitemap lists exactly the indexable pages), RSS feed matches the posts.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { attr, byTag, DIST, find, isMain, nativePages, ORIGIN, parseHtml, RELEASE, report, resolveBuilt, ROOT, squash, text } from '../lib/dist.mjs';

const sharp = createRequire(path.join(ROOT, 'package.json'))('sharp');
const FORBIDDEN_LD_KEYS = ['geo', 'aggregateRating', 'review', 'priceRange', 'sameAs', 'hasMap'];
const ALLOWED_LD_TYPES = new Set(['Organization', 'WebSite', 'BikeStore', 'BreadcrumbList', 'Article']);
const OG_MAX_BYTES = 300 * 1024;
const VAGUE = /^(hier|hier klicken|klicken sie hier|mehr|mehr erfahren|mehr lesen|mehr dazu|weiter|weiterlesen|lesen|link|details|jetzt|zur seite|seite)$/i;
// Words that make a claim. In a title or description each one must occur in the text of the page itself.
const CLAIMS = [/e-?bike/i, /rennrad|racebike|roadbike/i, /gravel/i, /leasing/i, /fitting/i, /werkstatt/i, /canyon/i, /konfiguration/i, /\bsale\b|rabatt|günstig/i, /\d\s?%/, /\d\s?€|\bab \d/, /bewertung|sterne|testsieger|bester|beste[rn]? /i, /trek|specialized|cerv[eé]lo|pinarello|ridley|wilier|factor/i];
const SLUGLIKE = /^[a-z0-9]+(-[a-z0-9]+)+(\s|$)/;
const HOME_BRAND_PAGES = new Set(['/impressum/', '/datenschutz/']); // reached from the footer only, on purpose

const fold = (s) => s.toLowerCase().replace(/[‑–-]/g, '').replace(/\s+/g, '');
const digits = (s) => s.replace(/\D/g, '');

/** The built page a link target is, or null for external, mailto, tel. */
function internalTarget(href, from) {
  if (!href || /^(mailto:|tel:|#)/.test(href)) return null;
  let u;
  try { u = new URL(href, `${ORIGIN}${from}`); } catch { return null; }
  if (u.origin !== ORIGIN) return null;
  return u.pathname;
}

export async function run() {
  const problems = [];
  const titles = new Map();
  const descriptions = new Map();
  const indexable = [];
  const inbound = new Map();
  const posts = [];
  const pages = nativePages();
  const meta = (doc, key) => byTag(doc, 'meta').find((m) => attr(m, 'property') === key || attr(m, 'name') === key)?.attrs.find((a) => a.name === 'content')?.value;

  for (const page of pages) {
    const doc = parseHtml(page.file);
    const at = (msg) => problems.push(`${page.url}: ${msg}`);
    const html = byTag(doc, 'html')[0];
    if (attr(html, 'lang') !== 'de') at('html lang is not "de"');
    if (find(doc, (n) => n.tagName === 'link' && attr(n, 'hreflang') !== undefined).length) at('hreflang on a single-language site');
    const main = byTag(doc, 'main')[0];
    const mainText = squash(text(main));
    const pageText = squash(text(byTag(doc, 'body')[0]));
    const notFound = page.url === '/404.html';

    // --- head
    const title = squash(text(byTag(doc, 'title')[0] ?? { childNodes: [] }));
    if (title.length < 30 || title.length > 60) at(`title is ${title.length} characters (30 to 60): "${title}"`);
    if (SLUGLIKE.test(title)) at(`title looks like a slug: "${title}"`);
    if (titles.has(title)) at(`title duplicates ${titles.get(title)}`); else titles.set(title, page.url);

    const description = meta(doc, 'description') ?? '';
    if (description.length < 70 || description.length > 160) at(`description is ${description.length} characters (70 to 160)`);
    if (descriptions.has(description)) at(`description duplicates ${descriptions.get(description)}`); else descriptions.set(description, page.url);
    if (!notFound) {
      for (const [label, value] of [['title', title], ['description', description]]) {
        for (const re of CLAIMS) {
          const hit = value.match(re)?.[0];
          if (hit && !fold(mainText).includes(fold(hit.trim()))) at(`${label} says "${hit.trim()}", which the page text does not (claims need the page's own copy)`);
        }
      }
    }

    const h1 = byTag(doc, 'h1');
    if (h1.length !== 1) at(`${h1.length} h1 elements (exactly one)`); else if (!squash(text(h1[0]))) at('h1 is empty');

    const canonical = find(doc, (n) => n.tagName === 'link' && attr(n, 'rel') === 'canonical').map((n) => attr(n, 'href'));
    const want = `${ORIGIN}${page.url}`;
    if (notFound) { if (canonical.length) at('the 404 page must not have a canonical'); }
    else if (canonical.length !== 1 || canonical[0] !== want) at(`canonical is ${JSON.stringify(canonical)}, want ${want}`);

    const robots = meta(doc, 'robots') ?? '';
    const noindex = /noindex/i.test(robots);
    if ((!RELEASE || notFound) && !noindex) at('dev build page (and the 404 page in every build) is not noindex');
    if (RELEASE && !notFound && noindex) at('release page is noindex');
    if (!noindex) indexable.push(page.url);

    const isPost = meta(doc, 'og:type') === 'article';
    for (const k of ['og:title', 'og:description', ...(notFound ? [] : ['og:url']), 'og:image', 'og:image:width', 'og:image:height', 'og:image:alt', 'og:type', 'og:locale', 'og:site_name', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt']) if (!meta(doc, k)) at(`missing ${k}`);
    if (!notFound && meta(doc, 'og:url') !== want) at(`og:url is ${meta(doc, 'og:url')}`);
    if (meta(doc, 'twitter:card') !== 'summary_large_image') at('twitter:card is not summary_large_image');
    if (meta(doc, 'og:locale') !== 'de_DE') at('og:locale is not de_DE');
    if (meta(doc, 'og:title') !== title || meta(doc, 'twitter:title') !== title) at('og:title or twitter:title differs from the title');
    if (meta(doc, 'og:description') !== description || meta(doc, 'twitter:description') !== description) at('og:description or twitter:description differs from the description');
    if (meta(doc, 'twitter:image') !== meta(doc, 'og:image')) at('twitter:image differs from og:image');
    if (meta(doc, 'twitter:image:alt') !== meta(doc, 'og:image:alt')) at('twitter:image:alt differs from og:image:alt');
    if (isPost) {
      posts.push(page.url);
      for (const k of ['article:published_time', 'article:modified_time']) if (Number.isNaN(Date.parse(meta(doc, k) ?? ''))) at(`${k} is missing or not a date`);
    }
    const image = meta(doc, 'og:image');
    if (image) {
      if (!image.startsWith(`${ORIGIN}/`)) at(`og:image ${image} is not on the build origin`);
      else {
        const f = resolveBuilt(new URL(image).pathname);
        if (!f) at(`og:image ${image} is not built`);
        else {
          const m = await sharp(f).metadata();
          if (m.width !== 1200 || m.height !== 630) at(`og:image is ${m.width}x${m.height}, want 1200x630`);
          if (String(m.width) !== meta(doc, 'og:image:width') || String(m.height) !== meta(doc, 'og:image:height')) at('og:image:width/height do not match the file');
          if (fs.statSync(f).size > OG_MAX_BYTES) at(`og:image is ${(fs.statSync(f).size / 1024).toFixed(0)} KB (limit ${OG_MAX_BYTES / 1024} KB, some chat apps drop larger previews)`);
        }
      }
    }

    // --- JSON-LD
    const nodes = [];
    for (const s of find(doc, (n) => n.tagName === 'script' && attr(n, 'type') === 'application/ld+json')) {
      let data;
      try { data = JSON.parse(s.childNodes.map((c) => c.value).join('')); } catch (e) { at(`JSON-LD does not parse: ${e.message}`); continue; }
      if (data['@context'] !== 'https://schema.org') at('JSON-LD without the schema.org @context');
      nodes.push(...(data['@graph'] ?? [data]));
    }
    const ids = new Map();
    for (const n of nodes) if (n['@id']) { if (ids.has(n['@id'])) at(`duplicate JSON-LD @id ${n['@id']}`); ids.set(n['@id'], n); }
    const types = nodes.map((n) => n['@type']);
    const count = (t) => types.filter((x) => x === t).length;
    for (const t of types) if (!ALLOWED_LD_TYPES.has(t)) at(`JSON-LD type ${t} is not one the captured facts support`);
    const storesWanted = page.url === '/' || page.url === '/ueber-uns/' || page.url === '/termin-buchen/' ? 2 : /^\/termin-buchen-[a-z]+\/$/.test(page.url) ? 1 : 0;
    if (notFound) { if (nodes.length) at('the 404 page carries JSON-LD'); }
    else {
      for (const [t, n] of [['Organization', 1], ['WebSite', 1], ['BikeStore', storesWanted], ['Article', isPost ? 1 : 0], ['BreadcrumbList', page.url === '/' ? 0 : 1]]) if (count(t) !== n) at(`JSON-LD has ${count(t)} ${t} node(s), want ${n}`);
    }
    // an @id-only reference must resolve inside the page; every URL is on the build origin and points at a built page
    const refs = (value) => (value && typeof value === 'object' ? (Array.isArray(value) ? value.flatMap(refs) : Object.keys(value).length === 1 && value['@id'] ? [value['@id']] : Object.values(value).flatMap(refs)) : []);
    for (const n of nodes) {
      for (const r of refs(Object.fromEntries(Object.entries(n).filter(([k]) => k !== '@id')))) if (!ids.has(r)) at(`JSON-LD ${n['@type']} refers to ${r}, which is not in the page`);
      for (const k of FORBIDDEN_LD_KEYS) if (k in n) at(`JSON-LD ${n['@type']} has "${k}": the capture holds no such fact`);
      for (const v of JSON.stringify(n).match(/https?:\/\/[^"]+/g) ?? []) {
        if (!v.startsWith(ORIGIN)) at(`JSON-LD URL ${v} is not on the build origin`);
        else if (!/^[^#]*(\.png|\.jpg)$/.test(v) && !resolveBuilt(new URL(v).pathname)) at(`JSON-LD URL ${v} is not built`);
      }
    }
    for (const n of nodes) {
      if (n['@type'] === 'Organization') {
        if (!(n.name && n.legalName && n.url === `${ORIGIN}/` && n.email && n.logo?.url)) at('Organization lacks name, legalName, url, email or logo');
        const f = n.logo?.url?.startsWith(ORIGIN) ? resolveBuilt(new URL(n.logo.url).pathname) : null;
        if (!f) at('Organization logo is not built'); else { const m = await sharp(f).metadata(); if (m.width < 112 || m.height < 112) at(`Organization logo is ${m.width}x${m.height} (Google wants at least 112x112)`); }
      }
      if (n['@type'] === 'WebSite' && (n.url !== `${ORIGIN}/` || n.inLanguage !== 'de-DE')) at('WebSite url or inLanguage is wrong');
      if (n['@type'] === 'BikeStore') {
        const a = n.address ?? {};
        if (!(a.streetAddress && a.postalCode && a.addressLocality && n.telephone && n.email && n.openingHoursSpecification?.length)) at('BikeStore without address, telephone, e-mail and hours');
        if (!/^\+\d{8,}$/.test(n.telephone ?? '')) at(`BikeStore telephone ${n.telephone} is not +digits`);
        // the data must be what a visitor reads on the same page
        if (!pageText.includes(a.streetAddress) || !pageText.includes(`${a.postalCode} ${a.addressLocality}`)) at(`BikeStore address "${a.streetAddress}, ${a.postalCode} ${a.addressLocality}" is not in the page text`);
        if (!digits(pageText).includes(digits(n.telephone).replace(/^49/, '0'))) at(`BikeStore telephone ${n.telephone} is not in the page text`);
        if (!pageText.toLowerCase().includes(n.email.toLowerCase())) at(`BikeStore e-mail ${n.email} is not in the page text`);
        for (const h of n.openingHoursSpecification) {
          if (!(h.opens < h.closes)) at(`BikeStore hours ${h.opens} to ${h.closes} are not in order`);
          if (!pageText.includes(`${h.opens}–${h.closes}`)) at(`BikeStore hours ${h.opens}–${h.closes} are not in the page text`);
        }
        if (n.url !== `${ORIGIN}${/^\/termin-buchen-[a-z]+\/$/.test(page.url) ? page.url : `/termin-buchen-${a.addressLocality.toLowerCase().replace('ü', 'ue')}/`}`) at(`BikeStore url ${n.url} is not its booking page`);
      }
      if (n['@type'] === 'BreadcrumbList') {
        const items = n.itemListElement ?? [];
        items.forEach((it, i) => { if (it.position !== i + 1) at('breadcrumb positions are not 1..n'); });
        if (items.at(-1)?.item !== want) at(`last breadcrumb ${items.at(-1)?.item} is not the page`);
        if (items[0]?.item !== `${ORIGIN}/`) at('first breadcrumb is not the home page');
        const visible = byTag(doc, 'nav').filter((x) => attr(x, 'aria-label') === 'Brotkrumen').flatMap((x) => byTag(x, 'li').map((li) => squash(text(li)).replace(/^›\s*/, '')));
        if (JSON.stringify(visible) !== JSON.stringify(items.map((it) => it.name))) at(`breadcrumb names ${JSON.stringify(items.map((it) => it.name))} differ from the visible crumbs ${JSON.stringify(visible)}`);
      }
      if (n['@type'] === 'Article') {
        const t = byTag(doc, 'time')[0];
        if (n.headline !== squash(text(h1[0] ?? { childNodes: [] }))) at('Article headline differs from the h1');
        if (n.mainEntityOfPage !== want) at('Article mainEntityOfPage is not the canonical URL');
        if (!(Date.parse(n.datePublished) <= Date.parse(n.dateModified))) at('Article dates are missing or out of order');
        if (t && Date.parse(attr(t, 'datetime')) !== Date.parse(n.datePublished)) at('Article datePublished differs from the visible date');
        if (n.image !== image && !n.image?.startsWith(ORIGIN)) at('Article image is not on the build origin');
        if (!ids.has(n.author?.['@id']) || !ids.has(n.publisher?.['@id'])) at('Article author or publisher does not resolve');
        if (n.description !== description) at('Article description differs from the meta description');
        if (meta(doc, 'article:published_time') && Date.parse(meta(doc, 'article:published_time')) !== Date.parse(n.datePublished)) at('article:published_time differs from Article datePublished');
      }
    }

    // --- links
    const targets = new Map();
    const inMain = new Set(find(main ?? { childNodes: [] }, () => true));
    const crumbNavs = new Set(byTag(doc, 'nav').filter((x) => attr(x, 'aria-label') === 'Brotkrumen').flatMap((x) => find(x, () => true)));
    for (const a of byTag(doc, 'a')) {
      const href = attr(a, 'href');
      const label = squash(text(a)) || attr(a, 'aria-label') || find(a, (c) => c.tagName === 'img').map((c) => attr(c, 'alt')).join(' ');
      const target = internalTarget(href, page.url);
      if (VAGUE.test(label)) at(`vague link text "${label}" (${href})`);
      if (inMain.has(a) && !crumbNavs.has(a) && label.length < 8 && label.split(' ').length < 2) at(`link text "${label}" is too short to say where it goes (${href})`);
      if (target === null && !href?.startsWith('http')) continue;
      const key = target ?? href;
      if (targets.has(label) && targets.get(label) !== key) at(`the link text "${label}" points to both ${targets.get(label)} and ${key}`);
      targets.set(label, key);
      if (target && target !== page.url && inMain.has(a) && !crumbNavs.has(a)) { const set = inbound.get(target) ?? new Set(); set.add(page.url); inbound.set(target, set); }
    }
    page.noindex = noindex;
  }

  // every indexable page except the footer-only legal pages is linked from the content of another page
  for (const p of pages) {
    if (p.url === '/404.html' || p.url === '/' || HOME_BRAND_PAGES.has(p.url)) continue;
    const from = [...(inbound.get(p.url) ?? [])].filter((u) => u !== '/404.html');
    if (!from.length) problems.push(`${p.url}: no other page links to it from its content (only the menu or footer does)`);
  }

  // --- robots.txt and sitemap
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
      const xml = fs.readFileSync(sitemap, 'utf8');
      if (!/^<\?xml version="1\.0" encoding="UTF-8"\?>\s*<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/.test(xml)) problems.push('sitemap-0.xml has no urlset root in the sitemaps.org namespace');
      const listed = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
      for (const l of listed) if (!l.startsWith(`${ORIGIN}/`) || !l.endsWith('/')) problems.push(`sitemap URL ${l} is not an absolute build-origin URL with a trailing slash`);
      const a = [...listed.map((l) => l.replace(ORIGIN, ''))].sort().join('\n'); const b = [...indexable].sort().join('\n');
      if (a !== b) problems.push(`sitemap lists ${listed.length} pages, the native indexable pages are ${indexable.length}: ${[...new Set([...listed.map((l) => l.replace(ORIGIN, '')).filter((u) => !indexable.includes(u)), ...indexable.filter((u) => !listed.includes(ORIGIN + u))])].join(', ')}`);
      if (new Set(listed).size !== listed.length) problems.push('sitemap lists a URL twice');
      for (const u of posts) if (!new RegExp(`<loc>${(ORIGIN + u).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>\\s*<lastmod>\\d{4}-\\d{2}-\\d{2}`).test(xml)) problems.push(`sitemap entry of the post ${u} has no lastmod`);
      if (!fs.readFileSync(sitemapIndex, 'utf8').includes(`${ORIGIN}/sitemap-0.xml`)) problems.push('sitemap-index.xml does not name sitemap-0.xml');
    }
  } else {
    if (!/^Disallow:\s*\/\s*$/m.test(robots)) problems.push('dev robots.txt does not block everything');
    if (fs.existsSync(sitemap) || fs.existsSync(sitemapIndex)) problems.push('dev build has a sitemap although every page is noindex');
  }

  // --- RSS: one item per post, same URL, title, date as the post page
  const feedFile = path.join(DIST, 'feed', 'index.xml');
  if (!fs.existsSync(feedFile)) problems.push('feed/index.xml is missing');
  else {
    const xml = fs.readFileSync(feedFile, 'utf8');
    const tag = (s, t) => s.match(new RegExp(`<${t}(?:\\s[^>]*)?>([^<]*)</${t}>`))?.[1];
    const channel = xml.replace(/<item>[\s\S]*<\/item>/, '');
    if (!/<rss version="2\.0"/.test(xml)) problems.push('feed is not RSS 2.0');
    for (const t of ['title', 'link', 'description', 'language']) if (!tag(channel, t)) problems.push(`feed channel has no ${t}`);
    if (tag(channel, 'language') !== 'de-DE') problems.push('feed language is not de-DE');
    if (!channel.includes(`<atom:link href="${ORIGIN}/feed/" rel="self" type="application/rss+xml"`)) problems.push('feed atom:link self is not the feed URL');
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
    if (items.length !== posts.length) problems.push(`feed has ${items.length} items, the site has ${posts.length} posts`);
    for (const item of items) {
      const link = tag(item, 'link');
      const url = link?.replace(ORIGIN, '');
      if (!link?.startsWith(`${ORIGIN}/`) || !posts.includes(url)) { problems.push(`feed item link ${link} is not a post page`); continue; }
      if (tag(item, 'guid') !== link) problems.push(`feed item ${url}: guid differs from the link`);
      if (Number.isNaN(Date.parse(tag(item, 'pubDate') ?? ''))) problems.push(`feed item ${url}: pubDate is not a date`);
      const doc = parseHtml(pages.find((p) => p.url === url).file);
      const h = squash(text(byTag(doc, 'h1')[0])).replace(/&/g, '&amp;');
      if (tag(item, 'title')?.replace(/&amp;/g, '&amp;') !== h) problems.push(`feed item ${url}: title differs from the post's h1`);
      if (!tag(item, 'description')) problems.push(`feed item ${url}: no description`);
    }
    if (!find(parseHtml(path.join(DIST, 'index.html')), (n) => n.tagName === 'link' && attr(n, 'type') === 'application/rss+xml' && attr(n, 'href') === '/feed/').length) problems.push('home page does not advertise the feed');
  }
  return { problems, note: `${pages.length} native pages, ${RELEASE ? 'release' : 'dev'} build` };
}

if (isMain(import.meta.url)) { const { problems, note } = await run(); process.exit(report('seo', problems, note)); }
