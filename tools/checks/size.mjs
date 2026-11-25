// Check `size`: no file in dist/ over 20 MiB (the Cloudflare Pages limit is 25 MiB); the home page's CSS stays under
// 30 KB and its JavaScript under 10 KB (uncompressed). Prints the home page's static transfer budget.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { attr, DIST, find, isMain, parseHtml, report, walk } from '../lib/dist.mjs';

const MAX_FILE = 20 * 1024 * 1024;
const CSS_BUDGET = 30 * 1024;
const JS_BUDGET = 10 * 1024;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

export function run() {
  const problems = [];
  walk(DIST, (file, rel) => {
    const size = fs.statSync(file).size;
    if (size > MAX_FILE) problems.push(`${rel} is ${(size / 1048576).toFixed(1)} MiB (limit 20 MiB)`);
  }, (rel) => rel === '.prerender' || rel.startsWith('.prerender/'));

  const home = path.join(DIST, 'index.html');
  const doc = parseHtml(home);
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
  const gz = (f) => zlib.gzipSync(fs.readFileSync(f)).length;
  const note = `home: HTML ${kb(htmlBytes)} (gzip ${kb(zlib.gzipSync(fs.readFileSync(home)).length)}), CSS ${kb(cssBytes)} in ${css.length} file(s) (gzip ${kb(css.reduce((n, f) => n + gz(f), 0))}), JS ${kb(jsBytes)} in ${js.length} file(s)`;
  return { problems, note };
}

if (isMain(import.meta.url)) { const { problems, note } = run(); process.exit(report('size', problems, note)); }
