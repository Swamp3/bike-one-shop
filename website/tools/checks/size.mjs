// Check `size`: no file in dist/ over 20 MiB (the Cloudflare Pages limit is 25 MiB); on every page CSS stays under 30 KB
// and JavaScript under 10 KB (uncompressed), nothing inline. Image rules (CLS and LCP): every img has width and height,
// content images are AVIF and WebP in a picture with a srcset, lazy unless they are the one fetchpriority=high image,
// which is preloaded with exactly its AVIF srcset. Fonts: one preload (crossorigin, a file a @font-face names), every
// @font-face swaps, and every character a page shows that the old latin font covered is covered by the German subset.
// Video (decision d83): only the home hero film. Every video file in dist/ is at most 1.0 MiB and named by the home page's <video>
// (data-webm, data-mp4); that <video> is muted, loop, playsinline, preload=none, without autoplay, src or source children; the mp4 is
// H.264 (avc1), faststart, without an audio track; no other page has a video, and no page has audio.
// Prints the home page's static transfer budget.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { info as mp4Info } from '../mp4-info.mjs';
import { attr, byTag, DIST, find, isMain, nativePages, nodes, parseHtml, report, walk } from '../lib/dist.mjs';

const MAX_FILE = 20 * 1024 * 1024;
const MAX_VIDEO = 1024 * 1024;
const CSS_BUDGET = 30 * 1024;
const JS_BUDGET = 10 * 1024;
// The `latin` font files of @fontsource covered this range; src/assets/fonts/*-de-*.woff2 are German-only subsets of them (docs/fonts.md).
// No character the old file covered may fall back to a system font now.
const OLD_LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const ranges = (list) => list.split(',').map((r) => r.trim().replace(/^U\+/i, '').split('-').map((h) => parseInt(h, 16))).map(([a, b]) => [a, b ?? a]);
const OLD = ranges(OLD_LATIN);
const covered = (rs, c) => rs.some(([a, b]) => c >= a && c <= b);
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

export function run() {
  const problems = [];
  const videos = [];
  walk(DIST, (file, rel) => {
    const size = fs.statSync(file).size;
    if (size > MAX_FILE) problems.push(`${rel} is ${(size / 1048576).toFixed(1)} MiB (limit 20 MiB)`);
    if (/\.(m4v|ogv|mov|mp3|ogg|wav)$/i.test(file)) problems.push(`${rel}: dist/ holds no audio file and no video other than the hero's mp4 and webm`);
    if (/\.(mp4|webm)$/i.test(file)) videos.push({ rel, size });
  }, (rel) => rel === '.prerender' || rel.startsWith('.prerender/'));

  const home = path.join(DIST, 'index.html');
  const doc = parseHtml(home);
  const heroVideos = byTag(doc, 'video');
  const named = new Set();
  for (const v of heroVideos) {
    if (attr(v, 'preload') !== 'none' || attr(v, 'autoplay') !== undefined || attr(v, 'muted') === undefined || attr(v, 'loop') === undefined || attr(v, 'playsinline') === undefined || attr(v, 'src') !== undefined || byTag(v, 'source').length) problems.push('the hero <video> must be muted, loop, playsinline, preload=none, without autoplay, src or <source> (the script sets the src after load)');
    for (const name of ['data-webm', 'data-mp4']) { const u = attr(v, name); if (u?.startsWith('/')) named.add(u.slice(1)); else problems.push(`the hero <video> has no ${name}`); }
  }
  if (heroVideos.length !== 1) problems.push(`home has ${heroVideos.length} <video> elements (exactly one)`);
  for (const v of videos) {
    if (v.size > MAX_VIDEO) problems.push(`${v.rel} is ${(v.size / 1048576).toFixed(2)} MiB (a video is at most 1.0 MiB)`);
    if (!named.has(v.rel)) problems.push(`${v.rel}: a video file the home page does not name`);
  }
  for (const n of named) if (!videos.some((v) => v.rel === n)) problems.push(`${n}: named by the home page, not in dist/`);
  for (const v of videos.filter((x) => x.rel.endsWith('.mp4'))) {
    const m = mp4Info(path.join(DIST, v.rel));
    if (!m.faststart) problems.push(`${v.rel} is not faststart (moov after mdat)`);
    if (m.tracks.some((t) => t.handler === 'soun')) problems.push(`${v.rel} has an audio track`);
    if (!m.tracks.some((t) => t.handler === 'vide' && t.codec === 'avc1')) problems.push(`${v.rel} is not H.264 (avc1)`);
  }
  const local = (v) => (v?.startsWith('/') && !v.startsWith('//') ? path.join(DIST, v.split(/[?#]/)[0]) : null);
  const css = find(doc, (n) => n.tagName === 'link' && attr(n, 'rel') === 'stylesheet').map((n) => local(attr(n, 'href'))).filter(Boolean);
  const js = find(doc, (n) => n.tagName === 'script' && attr(n, 'src')).map((n) => local(attr(n, 'src'))).filter(Boolean);
  const inline = find(doc, (n) => ['style', 'script'].includes(n.tagName) && !attr(n, 'src') && attr(n, 'type') !== 'application/ld+json').length;
  if (inline) problems.push(`home has ${inline} inline <style> or <script> element(s); the CSP allows none`);
  const bytes = (files) => files.reduce((n, f) => n + fs.statSync(f).size, 0);
  const htmlBytes = fs.statSync(home).size;
  const cssBytes = bytes(css), jsBytes = bytes(js);
  if (cssBytes > CSS_BUDGET) problems.push(`home CSS is ${kb(cssBytes)} (budget ${kb(CSS_BUDGET)})`);
  if (jsBytes > JS_BUDGET) problems.push(`home JS is ${kb(jsBytes)} (budget ${kb(JS_BUDGET)})`);
  const local2 = (v) => (v?.startsWith('/') && !v.startsWith('//') ? path.join(DIST, v.split(/[?#]/)[0]) : null);
  const fontFaces = new Set();
  const subset = [];
  const cssChars = new Set(); // characters a stylesheet draws with `content` (the breadcrumb arrow)
  for (const f of fs.readdirSync(path.join(DIST, '_astro')).filter((n) => n.endsWith('.css')).map((n) => path.join(DIST, '_astro', n))) {
    const css = fs.readFileSync(f, 'utf8');
    for (const m of css.matchAll(/content:\s*(["'])(.*?)\1/g)) for (const ch of m[2].replace(/\\([0-9a-f]{1,6}) ?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))) cssChars.add(ch);
    for (const m of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
      if (/url\(/.test(m[1]) && !/font-display:\s*swap/.test(m[1])) problems.push(`${path.basename(f)}: an @font-face without font-display: swap`);
      for (const u of m[1].matchAll(/url\(([^)]+)\)/g)) fontFaces.add(u[1].replace(/["']/g, '').replace(/^.*\/_astro\//, '/_astro/'));
      const range = /unicode-range:\s*([^;}]+)/.exec(m[1])?.[1];
      if (range && /-de-\d+\.[\w-]*\.?woff2/.test(m[1])) subset.push(...ranges(range));
    }
  }
  const cssMissing = [...cssChars].filter((ch) => covered(OLD, ch.codePointAt(0)) && !covered(subset, ch.codePointAt(0)) && ch.codePointAt(0) > 32);
  if (cssMissing.length) problems.push(`CSS content characters the German subset fonts do not cover: ${cssMissing.join(' ')}`);
  for (const page of nativePages()) {
    const pdoc = parseHtml(page.file);
    const at = (msg) => problems.push(`${page.url}: ${msg}`);
    const pcss = find(pdoc, (n) => n.tagName === 'link' && attr(n, 'rel') === 'stylesheet').map((n) => local2(attr(n, 'href'))).filter(Boolean);
    const pjs = find(pdoc, (n) => n.tagName === 'script' && attr(n, 'src')).map((n) => local2(attr(n, 'src'))).filter(Boolean);
    if (bytes(pcss) > CSS_BUDGET) at(`CSS is ${kb(bytes(pcss))} (budget ${kb(CSS_BUDGET)})`);
    if (bytes(pjs) > JS_BUDGET) at(`JS is ${kb(bytes(pjs))} (budget ${kb(JS_BUDGET)})`);
    if (find(pdoc, (n) => ['style', 'script'].includes(n.tagName) && !attr(n, 'src') && attr(n, 'type') !== 'application/ld+json').length) at('inline <style> or <script>');
    if (find(pdoc, (n) => attr(n, 'style') !== undefined).length) at('style attribute (the CSP allows none)');

    const header = new Set(find(byTag(pdoc, 'header')[0] ?? { childNodes: [] }, () => true));
    const high = [];
    for (const img of byTag(pdoc, 'img')) {
      const src = attr(img, 'src');
      if (!/^\d+$/.test(attr(img, 'width') ?? '') || !/^\d+$/.test(attr(img, 'height') ?? '')) at(`img ${src} has no width and height (layout shift)`);
      const fp = attr(img, 'fetchpriority') === 'high';
      if (fp) high.push(img);
      if (!fp && attr(img, 'loading') !== 'lazy' && !header.has(img)) at(`img ${src} is neither lazy nor the high-priority image`);
      if (fp && attr(img, 'loading') === 'lazy') at(`img ${src} is lazy and high priority`);
      if (header.has(img)) continue;
      if (!attr(img, 'srcset')) at(`img ${src} has no srcset`);
      const types = img.parentNode?.tagName === 'picture' ? byTag(img.parentNode, 'source').map((n) => attr(n, 'type')) : [];
      if (!types.includes('image/avif') || !types.includes('image/webp')) at(`img ${src} is not in a picture with AVIF and WebP sources`);
    }
    if (high.length > 1) at(`${high.length} images with fetchpriority=high (one LCP image)`);
    const preloads = find(pdoc, (n) => n.tagName === 'link' && attr(n, 'rel') === 'preload' && attr(n, 'as') === 'image');
    if (high.length) {
      // one preload per AVIF <source> of the picture (the home hero has a phone and a wide one, told apart by media), identical in srcset, sizes and media
      const avifs = byTag(high[0].parentNode, 'source').filter((n) => attr(n, 'type') === 'image/avif');
      const want = avifs.map((n) => `${attr(n, 'media') ?? ''}|${attr(n, 'sizes')}|${attr(n, 'srcset')}`).sort();
      const have = preloads.map((n) => `${attr(n, 'media') ?? ''}|${attr(n, 'imagesizes')}|${attr(n, 'imagesrcset')}`).sort();
      if (!avifs.length || want.join('\n') !== have.join('\n')) at('the high-priority image is not preloaded with exactly its AVIF srcset, sizes and media (one preload per AVIF source)');
    } else if (preloads.length) at('an image preload without a high-priority image');
    const fonts = find(pdoc, (n) => n.tagName === 'link' && attr(n, 'rel') === 'preload' && attr(n, 'as') === 'font');
    if (fonts.length !== 1) at(`${fonts.length} font preloads (exactly one)`);
    for (const f of fonts) {
      if (attr(f, 'crossorigin') === undefined || attr(f, 'type') !== 'font/woff2') at('font preload without crossorigin or type font/woff2');
      if (!fontFaces.has(attr(f, 'href'))) at(`the preloaded font ${attr(f, 'href')} is in no @font-face`);
    }
    const missing = new Set();
    for (const n of nodes(pdoc)) {
      if (n.nodeName !== '#text' || ['script', 'style'].includes(n.parentNode?.tagName)) continue;
      for (const ch of n.value) { const c = ch.codePointAt(0); if (covered(OLD, c) && !covered(subset, c) && c > 32) missing.add(`${ch} (U+${c.toString(16).toUpperCase().padStart(4, '0')})`); }
    }
    if (missing.size) at(`text characters the German subset fonts do not cover (they fall back to a system font): ${[...missing].join(', ')}`);
    for (const tag of ['video', 'audio', 'source']) for (const n of byTag(pdoc, tag)) if (tag === 'audio' || (tag === 'video' && page.url !== '/') || (tag === 'source' && n.parentNode.tagName !== 'picture')) at(`<${tag}> element: only the home hero has a video, no page has audio`);
  }
  const gz = (f) => zlib.gzipSync(fs.readFileSync(f)).length;
  const note = `home: HTML ${kb(htmlBytes)} (gzip ${kb(zlib.gzipSync(fs.readFileSync(home)).length)}), CSS ${kb(cssBytes)} in ${css.length} file(s) (gzip ${kb(css.reduce((n, f) => n + gz(f), 0))}), JS ${kb(jsBytes)} in ${js.length} file(s)`;
  return { problems, note };
}

if (isMain(import.meta.url)) { const { problems, note } = run(); process.exit(report('size', problems, note)); }
