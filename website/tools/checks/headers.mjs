// Check `headers`: dist/_headers and dist/_redirects as Cloudflare Pages reads them, and mixed content in dist/.
//  - the /* rule has nosniff, a Referrer-Policy, a Permissions-Policy with camera, microphone and geolocation off, a CSP
//  - the CSP: everything 'self', no unsafe-inline, unsafe-eval, wildcard or http: source, frame-src exactly the three embed
//    hosts, object-src 'none', base-uri, form-action and frame-ancestors set
//  - X-Robots-Tag: noindex for https://bike-one.dev/* and https://*.pages.dev/*
//  - speculation rules: the /* rule names /speculation-rules.json (Speculation-Rules header), the file is typed
//    application/speculationrules+json and holds prefetch rules only: conservative, same-origin paths, no host, no prerender
//  - caching: /_astro/* immutable for a year (hashed files), the unhashed icons and hero film files one day
//  - Cloudflare limits: _headers 100 rules, _redirects 2000 static and 100 dynamic rules, lines under 1000 characters
//  - no http:// URL in any text file of dist/ (other than XML namespaces): no mixed content
import fs from 'node:fs';
import path from 'node:path';
import { DIST, isMain, report, walk } from '../lib/dist.mjs';

const FRAME_HOSTS = ['https://www.etermin.net', 'https://www.google.com/maps', 'https://www.google.com/maps/', 'https://bike-leasing-calculator.jobrad.org'];
const NAMESPACES = /^http:\/\/(www\.w3\.org|www\.sitemaps\.org|purl\.org|www\.rssboard\.org)\//;

export function run() {
  const problems = [];
  const lines = fs.readFileSync(path.join(DIST, '_headers'), 'utf8').split('\n');
  const rules = [];
  let cur = null;
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) { cur = { path: line.trim(), headers: {} }; rules.push(cur); continue; }
    const i = line.indexOf(':');
    if (cur && i > 0) cur.headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  if (rules.length > 100) problems.push(`_headers has ${rules.length} rules (Cloudflare Pages allows 100)`);
  for (const l of lines) if (l.length > 2000) problems.push('a _headers line is over 2000 characters');
  const all = rules.find((r) => r.path === '/*')?.headers;
  if (!all) problems.push('_headers has no /* rule');
  else {
    if (all['x-content-type-options'] !== 'nosniff') problems.push('X-Content-Type-Options: nosniff is missing');
    if (!/^(no-referrer|same-origin|strict-origin|strict-origin-when-cross-origin)$/.test(all['referrer-policy'] ?? '')) problems.push(`Referrer-Policy is ${all['referrer-policy']}`);
    for (const f of ['camera=()', 'microphone=()', 'geolocation=()']) if (!(all['permissions-policy'] ?? '').includes(f)) problems.push(`Permissions-Policy lacks ${f}`);
    if (!all['x-frame-options'] && !/frame-ancestors/.test(all['content-security-policy'] ?? '')) problems.push('no X-Frame-Options and no frame-ancestors');
    const csp = Object.fromEntries((all['content-security-policy'] ?? '').split(';').map((d) => d.trim()).filter(Boolean).map((d) => { const [name, ...v] = d.split(/\s+/); return [name, v]; }));
    if (!Object.keys(csp).length) problems.push('no Content-Security-Policy');
    for (const [name, v] of Object.entries(csp)) {
      for (const bad of ["'unsafe-inline'", "'unsafe-eval'", '*', 'http:', 'https:']) if (v.includes(bad)) problems.push(`CSP ${name} allows ${bad}`);
      if (v.some((s) => s.startsWith('http://'))) problems.push(`CSP ${name} names an http:// source`);
    }
    for (const d of ['default-src', 'script-src', 'style-src', 'font-src', 'media-src', 'connect-src', 'base-uri', 'form-action']) if (csp[d]?.join(' ') !== "'self'") problems.push(`CSP ${d} is "${csp[d]?.join(' ')}", want 'self'`);
    if (csp['img-src']?.join(' ') !== "'self' data:") problems.push(`CSP img-src is "${csp['img-src']?.join(' ')}"`);
    if (csp['object-src']?.join(' ') !== "'none'") problems.push('CSP object-src is not none');
    if (!csp['frame-ancestors']) problems.push('CSP has no frame-ancestors');
    const frames = csp['frame-src'] ?? [];
    if ([...frames].sort().join(' ') !== [...FRAME_HOSTS].sort().join(' ')) problems.push(`CSP frame-src is ${frames.join(' ')}, want exactly ${FRAME_HOSTS.join(' ')}`);
  }
  if (all?.['speculation-rules'] !== '"/speculation-rules.json"') problems.push(`Speculation-Rules is ${all?.['speculation-rules']}, want "/speculation-rules.json" (the CSP blocks inline rules)`);
  if (rules.find((r) => r.path === '/speculation-rules.json')?.headers['content-type'] !== 'application/speculationrules+json') problems.push('/speculation-rules.json has no Content-Type: application/speculationrules+json');
  try {
    const raw = fs.readFileSync(path.join(DIST, 'speculation-rules.json'), 'utf8');
    const spec = JSON.parse(raw);
    if (Object.keys(spec).join() !== 'prefetch') problems.push(`speculation-rules.json has ${Object.keys(spec).join(', ')}, want prefetch only`);
    for (const rule of spec.prefetch ?? []) if (rule.eagerness !== 'conservative') problems.push(`a prefetch rule has eagerness ${rule.eagerness}, want conservative`);
    if (/https?:|\/\//.test(raw.replace(/"\/\*"/g, ''))) problems.push('speculation-rules.json names a host: rules must match same-origin paths only');
  } catch (error) { problems.push(`speculation-rules.json: ${error.message}`); }
  for (const host of ['https://bike-one.dev/*', 'https://*.pages.dev/*']) if (rules.find((r) => r.path === host)?.headers['x-robots-tag'] !== 'noindex') problems.push(`${host} has no X-Robots-Tag: noindex`);
  if (rules.find((r) => r.path === '/_astro/*')?.headers['cache-control'] !== 'public, max-age=31536000, immutable') problems.push('/_astro/* is not immutable');
  for (const file of ['/favicon.ico', '/apple-touch-icon.png', '/hero.webm', '/hero.mp4']) if (rules.find((r) => r.path === file)?.headers['cache-control'] !== 'public, max-age=86400') problems.push(`${file} is not cached for one day`);

  const redirects = fs.readFileSync(path.join(DIST, '_redirects'), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  const dynamic = redirects.filter((l) => /[*:]/.test(l.split(/\s+/)[0]) ).length;
  if (redirects.length - dynamic > 2000) problems.push(`${redirects.length - dynamic} static redirects (limit 2000)`);
  if (dynamic > 100) problems.push(`${dynamic} dynamic redirects (limit 100)`);
  for (const l of redirects) if (l.length > 1000) problems.push(`a _redirects line is ${l.length} characters (limit 1000)`);

  // mixed content: no http:// reference in any text file
  let scanned = 0;
  walk(DIST, (file, rel) => {
    if (!/\.(html|css|js|xml|txt|json|webmanifest)$/.test(rel) && rel !== '_headers' && rel !== '_redirects') return;
    scanned += 1;
    const body = fs.readFileSync(file, 'utf8');
    for (const m of body.matchAll(/http:\/\/[^\s"'<>)]+/g)) if (!NAMESPACES.test(m[0]) && !/^http:\/\/localhost/.test(m[0])) problems.push(`${rel}: http:// URL ${m[0].slice(0, 80)} (mixed content)`);
  }, (rel) => rel === '.prerender' || rel.startsWith('.prerender/'));
  return { problems, note: `${rules.length} header rules, ${redirects.length} redirect rules (${dynamic} dynamic), ${scanned} files scanned for http://` };
}

if (isMain(import.meta.url)) { const { problems, note } = run(); process.exit(report('headers', problems, note)); }
