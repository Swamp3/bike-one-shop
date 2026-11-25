// Check `wp`: no WordPress or WooCommerce trace in dist/ (every text file) or in src/. _redirects is scanned without its
// source column (redirect sources are allowed to name old WordPress URLs), docs/ is not scanned. No other exception.
import fs from 'node:fs';
import path from 'node:path';
import { DIST, isMain, report, ROOT, walk } from '../lib/dist.mjs';

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
  // every text file of dist/ (dist/.prerender is a build artefact, never published)
  walk(DIST, (file, rel) => {
    if (rel === '_redirects') {
      files += 1;
      scan('dist/_redirects (targets only)', fs.readFileSync(file, 'utf8').split('\n').map((l) => l.trim().split(/\s+/).slice(1).join(' ')).join('\n'), problems);
    } else if (TEXT.test(file)) {
      files += 1;
      scan(`dist/${rel}`, fs.readFileSync(file, 'utf8'), problems);
    }
  }, (rel) => rel === '.prerender' || rel.startsWith('.prerender/'));
  // sources
  walk(path.join(ROOT, 'src'), (file, rel) => {
    if (!TEXT.test(file) || /\.(jpg|png)$/.test(file)) return;
    files += 1;
    scan(`src/${rel}`, fs.readFileSync(file, 'utf8'), problems);
  });
  return { problems, note: `${files} files scanned` };
}

if (isMain(import.meta.url)) { const { problems, note } = run(); process.exit(report('wp', problems, note)); }
