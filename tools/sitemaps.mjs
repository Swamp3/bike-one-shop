// Writes the live wp-sitemap files into public/ at their live names (decision d20): URLs under the
// excluded WooCommerce prefixes are dropped (those pages are not built here), a sitemap left empty is
// dropped from its index, and pages live serves but its sitemap omits are added (the sitemaps gate lists every indexable page).
import fs from 'node:fs';
const meta = JSON.parse(fs.readFileSync('baseline/meta.json', 'utf8'));
const excluded = [...meta.excluded, '/checkout-2/', '/my-account-2/'];
const routes = JSON.parse(fs.readFileSync('baseline/routes.json', 'utf8'));
const under = (loc) => { const p = new URL(loc).pathname; return excluded.some((x) => p.startsWith(x)); };
const entry = /<(url|sitemap)>[\s\S]*?<\/\1>/g;
const locOf = (e) => /<loc>([^<]*)<\/loc>/.exec(e)[1];
const missing = { 'wp-sitemap-taxonomies-la_portfolio_category-1.xml': ['/portfolio-category/branding-design/page/2/'] };
const dropped = [];
for (const f of fs.readdirSync('capture/sitemaps').filter((n) => n.endsWith('.xml'))) {
  let xml = fs.readFileSync(`capture/sitemaps/${f}`, 'utf8');
  xml = xml.replace(entry, (e) => (under(locOf(e)) ? (dropped.push(locOf(e)), '') : e));
  const add = (missing[f] || []).map((p) => `\t<url>\n\t\t<loc>${meta.canonicalOrigin}${p}</loc>\n\t</url>\n`).join('');
  if (add) xml = xml.replace('</urlset>', add + '</urlset>');
  if (!(xml.match(entry) || []).length) { dropped.push(`file ${f}`); fs.rmSync(`public/${f}`, { force: true }); continue; }
  fs.writeFileSync(`public/${f}`, xml);
}
// an index no longer lists a sitemap file that is gone
for (const f of fs.readdirSync('public').filter((n) => /^wp-sitemap\.xml$/.test(n))) {
  let xml = fs.readFileSync(`public/${f}`, 'utf8');
  xml = xml.replace(entry, (e) => (fs.existsSync(`public/${locOf(e).split('/').pop()}`) ? e : ''));
  fs.writeFileSync(`public/${f}`, xml);
}
console.log('dropped', dropped.length, dropped.filter((d) => d.startsWith('file')).join(', '));
