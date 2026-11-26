// Generates the redirects of the site from tools/redirect-map.mjs (decision d41).
//
//   node tools/redirects-build.mjs          rewrites redirects.csv (rows with `{SHOP_URL}`) and cloudflare-query-redirects.csv
//                                           (the ?p= Single Redirects, production shop URL)
//   node tools/redirects-build.mjs --dist   writes dist/_redirects for this build: the dev shop, or the production shop
//                                           when PUBLIC_INDEXABLE=true (npm run build runs it after astro build)
//
// One row per known old URL that the map sends elsewhere (a native page has no destination, so it gets no row), plus
// the prefix rules. Captured rows (shortlink, crawl) are kept and re-pointed at the final destination.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { destination, PREFIXES } from './redirect-map.mjs';
import { CSV_HEADER, CLOUDFLARE_QUERY_CSV } from '../scripts/lib/redirects-csv.mjs';
import { parseRedirectsCsv } from '../scripts/lib/redirects-csv.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOP_DEV = 'https://shop.bike-one.dev/';
const SHOP_PROD = 'https://shop.bike-one.org/';

/** Every old URL, from the list frozen in docs/old-urls.json (decision d72). */
export function oldUrlEntries() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/old-urls.json'), 'utf8')).urls;
}
export const oldUrls = () => oldUrlEntries().map((u) => u.path);

const csvLine = (cells) => cells.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',');

/** Rows of redirects.csv. */
export function buildRows(captured) {
  const rows = [];
  for (const row of captured) {
    // ?p= shortlinks and the one crawl row: aim at the final destination once the page they name has gone
    rows.push({ ...row, to: (row.source === 'decision' ? null : destination(row.to)) ?? row.to });
  }
  const exact = [];
  for (const url of oldUrls().sort()) {
    const d = destination(url);
    if (d) exact.push({ from: url, to: d, status: 301, source: 'decision', note: 'redesign IA' });
  }
  const splats = PREFIXES
    .map(([prefix, to]) => ({ from: `${prefix}*`, to, status: 301, source: 'decision', note: 'redesign IA, everything below' }));
  return [...rows, ...exact, ...splats];
}

export function readCaptured() {
  const rows = parseRedirectsCsv(fs.readFileSync(path.join(ROOT, 'redirects.csv'), 'utf8'));
  return rows.filter((r) => r.source !== 'decision').map(({ from, to, status, source, note }) => ({ from, to, status, source, note }));
}

export const toCsv = (rows) => [CSV_HEADER.join(','), ...rows.map((r) => csvLine([r.from, r.to, String(r.status), r.source, r.note]))].join('\n') + '\n';

function compile(csvText, shop, out, workDir) {
  fs.mkdirSync(workDir, { recursive: true });
  const csv = path.join(workDir, 'redirects.csv');
  fs.writeFileSync(csv, csvText.replaceAll('{SHOP_URL}', shop));
  // the one feed the site serves: /feed/ answers 200 from /feed/index.xml (neither Pages nor the review server serve a directory's index.xml)
  const routes = path.join(workDir, 'routes.json');
  fs.writeFileSync(routes, JSON.stringify([{ path: '/feed/', status: 200, kind: 'feed' }]));
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/build-redirects.mjs'), '--csv', csv, '--host', 'cloudflare', '--out', out,
    '--trailing-slash', 'always', '--routes', routes], { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] });
  if (r.status) throw new Error(`build-redirects failed (${r.status})`);
  return workDir;
}

function main() {
  const dist = process.argv.includes('--dist');
  const work = path.join(ROOT, '.astro/redirects');
  if (dist) {
    const release = process.env.PUBLIC_INDEXABLE === 'true';
    const csv = fs.readFileSync(path.join(ROOT, 'redirects.csv'), 'utf8');
    const shop = release ? SHOP_PROD : SHOP_DEV;
    compile(csv, shop, path.join(ROOT, 'dist/_redirects'), work);
    console.log(`redirects: dist/_redirects written for ${shop}`);
    return;
  }
  const text = toCsv(buildRows(readCaptured()));
  fs.writeFileSync(path.join(ROOT, 'redirects.csv'), text);
  compile(text, SHOP_PROD, path.join(work, '_redirects'), work);
  fs.copyFileSync(path.join(work, CLOUDFLARE_QUERY_CSV), path.join(ROOT, CLOUDFLARE_QUERY_CSV));
  console.log(`redirects: redirects.csv has ${text.split('\n').length - 2} rows`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
