// Check `links`: every internal link and asset reference of the native pages resolves to a built file (also url() in
// their stylesheets); mailto: and tel: pass; no link names bike-one.org in a dev build; other hosts only if allowed.
import fs from 'node:fs';
import path from 'node:path';
import { attr, DIST, find, isMain, nativePages, ORIGIN, parseHtml, RELEASE, report, resolveBuilt, SHOP } from '../lib/dist.mjs';

// Hosts a page may link to (a href only; nothing is requested from them while rendering).
const LINK_HOSTS = new Set([new URL(SHOP).host]);
// Hosts an iframe may point to (click-to-load embeds; the CSP frame-src names the same three).
const EMBED_HOSTS = new Set(['www.etermin.net', 'www.google.com', 'bike-leasing-calculator.jobrad.org']);

const refs = (doc) => {
  const out = [];
  for (const n of find(doc, () => true)) {
    const add = (kind, value) => value && out.push({ kind, value });
    switch (n.tagName) {
      case 'a': case 'area': add('a', attr(n, 'href')); break;
      case 'link': if (!/canonical|alternate/.test(attr(n, 'rel') ?? '') || attr(n, 'rel') === 'alternate') add('link', attr(n, 'href')); break;
      case 'img': case 'source': add('img', attr(n, 'src')); (attr(n, 'srcset') ?? '').split(',').forEach((s) => add('img', s.trim().split(/\s+/)[0])); break;
      case 'iframe': if (n.parentNode?.nodeName === '#document-fragment') { add('embed', attr(n, 'src')); break; } add('iframe', attr(n, 'src')); break;
      case 'script': case 'video': case 'audio': case 'track': add(n.tagName, attr(n, 'src')); add('poster', attr(n, 'poster')); break;
      case 'form': add('form', attr(n, 'action')); break;
      case 'meta': if (/^(og|twitter):image$/.test(attr(n, 'property') ?? attr(n, 'name') ?? '')) add('meta', attr(n, 'content')); break;
    }
  }
  return out;
};

const ids = (doc) => new Set(find(doc, (n) => attr(n, 'id') !== undefined).map((n) => attr(n, 'id')));

export function run() {
  const problems = [];
  const originHost = new URL(ORIGIN).host;
  const cssChecked = new Set();
  for (const page of nativePages()) {
    const raw = fs.readFileSync(page.file, 'utf8');
    const doc = parseHtml(page.file);
    if (!RELEASE && /bike-one\.org/i.test(raw.replace(/shop\.bike-one\.dev/g, ''))) problems.push(`${page.url}: a dev build names bike-one.org`);
    for (const { kind, value } of refs(doc)) {
      if (/^(mailto:|tel:|data:|javascript:)/i.test(value)) { if (/^javascript:/i.test(value)) problems.push(`${page.url}: javascript: link`); continue; }
      let target;
      if (value.startsWith('#')) {
        if (value.length > 1 && !ids(doc).has(decodeURIComponent(value.slice(1)))) problems.push(`${page.url}: #${value.slice(1)} has no target on the page`);
        continue;
      }
      try { target = new URL(value, `${ORIGIN}${page.url}`); } catch { problems.push(`${page.url}: ${kind} ${value} is not a URL`); continue; }
      if (kind === 'embed') { if (!EMBED_HOSTS.has(target.host)) problems.push(`${page.url}: embed host ${target.host} is not one of the three allowed`); continue; }
      if (target.host !== originHost) {
        if (kind === 'a' && LINK_HOSTS.has(target.host)) continue;
        problems.push(`${page.url}: ${kind} to ${target.href}${kind === 'a' ? ' (host not in the link allowlist)' : ' (a third-party request)'}`);
        continue;
      }
      const file = resolveBuilt(target.pathname);
      if (!file) { problems.push(`${page.url}: ${kind} ${value} does not resolve to a built file`); continue; }
      if (file.endsWith('.css') && !cssChecked.has(file)) {
        cssChecked.add(file);
        for (const m of fs.readFileSync(file, 'utf8').matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
          if (/^(data:|#)/.test(m[1])) continue;
          const f = m[1].startsWith('/') ? path.join(DIST, m[1].split(/[?#]/)[0]) : path.join(path.dirname(file), m[1].split(/[?#]/)[0]);
          if (!fs.existsSync(f)) problems.push(`${path.relative(DIST, file)}: url(${m[1]}) does not exist`);
        }
      }
    }
  }
  if (!RELEASE) {
    for (const f of ['robots.txt', '_headers', '_redirects', 'sitemap-index.xml', 'sitemap-0.xml']) {
      const file = path.join(DIST, f);
      if (fs.existsSync(file) && /bike-one\.org/i.test(fs.readFileSync(file, 'utf8').replace(/shop\.bike-one\.dev/g, ''))) problems.push(`${f}: a dev build names bike-one.org`);
    }
  }
  return { problems, note: `${nativePages().length} native pages, ${cssChecked.size} stylesheets` };
}

if (isMain(import.meta.url)) { const { problems, note } = run(); process.exit(report('links', problems, note)); }
