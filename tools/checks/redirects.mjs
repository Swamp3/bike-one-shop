// Check `redirects`: every old URL resolves in at most one hop to a built page or the shop, no built page sits at a
// redirect source, and redirects.csv is exactly what the generator writes. Old URLs: baseline/routes.json, the captured
// sitemaps and redirects.csv. Old upload and theme files (/wp-content/...) were never content URLs and need none.
import fs from 'node:fs';
import path from 'node:path';
import { buildRows, oldUrls, readCaptured, toCsv } from '../redirects-build.mjs';
import { isLegacyFile, isLegacyPage } from '../legacy.mjs';
import { DIST, isMain, need, pages, report, resolveBuilt, ROOT, SHOP, RELEASE, staleAllowlist } from '../lib/dist.mjs';
import { parseRedirectsCsv } from '../../scripts/lib/redirects-csv.mjs';

const RELEASE_ONLY = new Set(['/sitemap-index.xml', '/sitemap-0.xml']); // only the release build has a sitemap

/** The file a path is served from: a directory URL (trailing slash) by its index.html, anything else by exact file. */
function builtAt(p) {
  if (p.endsWith('/')) return resolveBuilt(p);
  const f = path.join(DIST, p.replace(/^\//, ''));
  return fs.existsSync(f) && fs.statSync(f).isFile() ? f : null;
}

const toRegExp = (from) => new RegExp(`^${from.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);

export function run() {
  const problems = [];
  const csvFile = path.join(ROOT, 'redirects.csv');
  const csvText = fs.readFileSync(csvFile, 'utf8');
  const rows = parseRedirectsCsv(csvText);
  if (csvText !== toCsv(buildRows(readCaptured()))) problems.push('redirects.csv is not the generator output: run npm run redirects:build');
  problems.push(...staleAllowlist());

  const redirectsFile = path.join(DIST, '_redirects');
  need(fs.existsSync(redirectsFile), 'dist/_redirects is missing: npm run build writes it (tools/redirects-build.mjs --dist)');
  const rules = fs.readFileSync(redirectsFile, 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => {
    const [from, to, status = '302'] = l.trim().split(/\s+/);
    return { from, to, status: Number(status), re: toRegExp(from), splat: from.includes('*') };
  });
  const redirects = rules.filter((r) => r.status >= 300 && r.status < 400);
  const rewrites = rules.filter((r) => r.status === 200);
  const matching = (p) => redirects.find((r) => !r.splat && r.from === p) ?? redirects.find((r) => r.splat && r.re.test(p));
  const external = (to) => /^https?:\/\//.test(to);

  const targetOk = (to) => {
    if (external(to)) return to === SHOP || `${new URL(to).origin}/` === SHOP;
    if (!RELEASE && RELEASE_ONLY.has(to)) return true;
    return Boolean(builtAt(to));
  };

  // rules
  for (const r of redirects) {
    if (!targetOk(r.to)) problems.push(`${r.from} -> ${r.to}: the target is neither a built page nor the shop (${SHOP})`);
    if (!external(r.to) && matching(r.to)) problems.push(`${r.from} -> ${r.to}: the target is itself redirected (more than one hop)`);
    if (!r.splat && builtAt(r.from)) problems.push(`${r.from}: a built page sits at a redirect source`);
    if (r.splat) for (const p of pages()) if (r.re.test(p.url)) problems.push(`${p.url}: a built page sits under the redirect source ${r.from}`);
  }
  for (const r of rewrites) if (!builtAt(r.to)) problems.push(`rewrite ${r.from} -> ${r.to}: no such built file`);

  // old URLs
  const sources = new Set([...oldUrls(), ...rows.filter((r) => !r.from.includes('?') && !r.from.includes('*')).map((r) => r.from)]);
  let built = 0, pending = 0, redirected = 0;
  for (const url of [...sources].sort()) {
    const rule = matching(url);
    if (builtAt(url)) { // a page or file is served at the old URL
      if (isLegacyPage(url) || isLegacyFile(url.replace(/^\//, ''))) pending += 1; else built += 1;
    } else if (rewrites.some((r) => r.from === url)) built += 1;
    else if (rule) redirected += 1; // the rule's target was checked above
    else problems.push(`${url}: neither a built page nor a redirect`);
  }
  // ?p= shortlinks: one hop to a built page or the shop, never into a second redirect
  for (const r of rows.filter((x) => x.from.includes('?'))) {
    const to = r.to.replaceAll('{SHOP_URL}', SHOP);
    if (!targetOk(to)) problems.push(`${r.from} -> ${r.to}: the target is not built`);
    else if (!external(to) && matching(to)) problems.push(`${r.from} -> ${r.to}: the target is itself redirected`);
  }
  return { problems, note: `${sources.size} old URLs: ${built} built, ${pending} still on the old route (allowlist), ${redirected} redirected; ${redirects.length} redirect rules, ${rows.filter((r) => r.from.includes('?')).length} ?p rows` };
}

if (isMain(import.meta.url)) { const { problems, note } = run(); process.exit(report('redirects', problems, note)); }
