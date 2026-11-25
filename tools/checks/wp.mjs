// Check `wp`: no WordPress or WooCommerce trace in the native part of dist/ and src/. While the old route lives, the
// scan covers what the native pages ship: their HTML, the files they reference (stylesheets, scripts, fonts) and the
// root text files; the old route's pages, files and sources are the allowlist in tools/legacy.mjs. _redirects is
// scanned without its source column (redirect sources are allowed to name old WordPress URLs), docs/ is not scanned.
import fs from 'node:fs';
import path from 'node:path';
import { isLegacyFile, isLegacySource } from '../legacy.mjs';
import { DIST, isMain, nativePages, parseHtml, find, attr, report, ROOT, walk } from '../lib/dist.mjs';

const PATTERNS = [
  /wp-content/i, /wp-includes/i, /wp-json/i, /(^|[^a-z0-9])wp-/i, /woocommerce/i, /yith/i, /(^|[^a-z0-9])vc_/i,
  /revslider/i, /elementor/i, /jquery/i, /xmlrpc/i, /wlwmanifest/i, /generator[^\n]{0,40}(wordpress|woocommerce)/i,
];
const TEXT = /\.(html|css|js|mjs|json|xml|txt|astro|ts|md|svg|webmanifest)$/i;

const scan = (label, content, problems) => {
  for (const re of PATTERNS) {
    const m = re.exec(content);
    if (m) { problems.push(`${label}: "${m[0].trim()}" (${re})`); return; }
  }
};

export function run() {
  const problems = [];
  let files = 0;
  const seen = new Set();
  const visit = (file) => {
    if (seen.has(file) || !fs.existsSync(file)) return;
    seen.add(file);
    const rel = path.relative(DIST, file).split(path.sep).join('/');
    if (isLegacyFile(rel) || !TEXT.test(file)) return;
    files += 1;
    const content = fs.readFileSync(file, 'utf8');
    scan(`dist/${rel}`, content, problems);
    if (/\.css$/.test(file)) for (const m of content.matchAll(/url\(\s*['"]?([^'")]+)/g)) if (!/^(data:|#)/.test(m[1])) visit(m[1].startsWith('/') ? path.join(DIST, m[1].split(/[?#]/)[0]) : path.resolve(path.dirname(file), m[1].split(/[?#]/)[0]));
  };
  // native pages and what they reference
  for (const page of nativePages()) {
    visit(page.file);
    for (const n of find(parseHtml(page.file), (x) => ['link', 'script', 'img', 'source'].includes(x.tagName))) {
      for (const v of [attr(n, 'href'), attr(n, 'src')]) if (v?.startsWith('/') && !v.startsWith('//')) visit(path.join(DIST, decodeURIComponent(v.split(/[?#]/)[0])));
    }
  }
  // root files
  for (const f of fs.readdirSync(DIST)) {
    const file = path.join(DIST, f);
    if (!fs.statSync(file).isFile() || f.endsWith('.html')) continue;
    if (f === '_redirects') {
      files += 1;
      scan('dist/_redirects (targets only)', fs.readFileSync(file, 'utf8').split('\n').map((l) => l.trim().split(/\s+/).slice(1).join(' ')).join('\n'), problems);
    } else visit(file);
  }
  // sources
  walk(path.join(ROOT, 'src'), (file, rel) => {
    if (isLegacySource(`src/${rel}`) || !TEXT.test(file) || /\.(jpg|png)$/.test(file)) return;
    files += 1;
    scan(`src/${rel}`, fs.readFileSync(file, 'utf8'), problems);
  });
  return { problems, note: `${files} native files scanned, old route allowlisted` };
}

if (isMain(import.meta.url)) { const { problems, note } = run(); process.exit(report('wp', problems, note)); }
