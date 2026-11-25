// Splits each captured page into pieces under src/content/: head extras, body class, main, bottom.
// Header, mobile header and footer are checked for variance; the home page's copy becomes the component.
import fs from 'node:fs';
import { parse, serializeOuter } from 'parse5';
import crypto from 'node:crypto';

const routes = JSON.parse(fs.readFileSync('baseline/routes.json', 'utf8')).filter((r) => r.kind !== 'feed' && r.snapshot?.startsWith('pages/') && r.status === 200);
routes.push({ path: '/404.html', snapshot: 'pages/404.html', template: 'notfound', special: true }); // the captured 404 page, built as src/pages/404.astro
const report = JSON.parse(fs.readFileSync('.conversion/css-prune-report.json', 'utf8'));
const at = (n, k) => (n.attrs || []).find((a) => a.name === k)?.value;
const kids = (n) => (n.childNodes || []).filter((c) => c.tagName);
const slugOf = (s) => s.replace(/^pages\//, '').replace(/\.html$/, '');
const hash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);
fs.mkdirSync('src/content/pages', { recursive: true });
fs.mkdirSync('src/content/heads', { recursive: true });
fs.mkdirSync('src/content/bottoms', { recursive: true });
fs.mkdirSync('src/components', { recursive: true });

const parts = { header: {}, mobile: {}, footer: {} };
const data = {};
const inert = [];
for (const r of routes) {
  const doc = parse(fs.readFileSync(`capture/${r.snapshot}`, 'utf8'));
  const html = doc.childNodes.find((n) => n.nodeName === 'html');
  const head = html.childNodes.find((n) => n.nodeName === 'head');
  const body = html.childNodes.find((n) => n.nodeName === 'body');
  const slug = slugOf(r.snapshot);
  const page = kids(body).find((c) => at(c, 'id') === 'page');
  const blank = !page; // a page with no theme shell (/alle-fahrrader/): first element is the content, the rest is bottom
  const inner = page && kids(page).find((c) => (at(c, 'class') || '').includes('site-inner'));
  const ik = inner ? kids(inner) : [];
  const pick = (f) => ik.find(f);
  const header = pick((c) => c.tagName === 'header');
  const mobile = pick((c) => (at(c, 'class') || '').includes('site-header-mobile'));
  const main = blank ? kids(body)[0] : pick((c) => at(c, 'id') === 'main');
  const footer = pick((c) => c.tagName === 'footer');
  const sk = ik.map((c) => c.tagName + '#' + (at(c, 'id') || '') + '.' + (at(c, 'class') || '').split(' ')[0]).join(',');
  const rest = blank ? kids(body).slice(1) : kids(body).filter((c) => c !== page);
  // head: drop what Base.astro prints (charset, viewport, title, description, canonical, robots) and the CSS the css list prints
  const keep = [];
  for (const c of kids(head)) {
    const rel = (at(c, 'rel') || '').toLowerCase();
    if (c.tagName === 'style') continue;
    if (c.tagName === 'title') continue;
    if (c.tagName === 'link' && rel === 'stylesheet') continue;
    if (c.tagName === 'link' && rel === 'canonical') continue;
    if (c.tagName === 'meta' && (at(c, 'charset') !== undefined || ['viewport', 'description', 'robots'].includes((at(c, 'name') || '').toLowerCase()))) continue;
    keep.push(serializeOuter(c));
  }
  const ser = (n) => (n ? serializeOuter(n) : '');
  parts.header[slug] = ser(header); parts.mobile[slug] = ser(mobile); parts.footer[slug] = ser(footer);
  data[slug] = { special: !!r.special, title: ((/<title[^>]*>([\s\S]*?)<\/title>/.exec(fs.readFileSync(`capture/${r.snapshot}`, 'utf8')) || [])[1] || '').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&'), blank, path: r.path, template: r.template, sk, bodyAttrs: (body.attrs || []).filter((a) => a.name !== 'class'), bodyClass: at(body, 'class') || '', htmlClass: at(html, 'class') || '', lang: at(html, 'lang') || '' };
  const mi = ik.indexOf(main), fi = ik.indexOf(footer);
  // main plus whatever sits between it and the footer (the portfolio pager, clearfix divs)
  // WooCommerce add-to-cart forms cannot work statically (decision d16): action sends nowhere, listed in inert-forms.json
  const inertMain = (h) => { let i = 0; return h.replace(/<form\b[^>]*>/g, (tag) => { const idx = i++; if (!/method="post"/i.test(tag)) return tag; inert.push({ path: r.path, form: idx, reason: 'WooCommerce add-to-cart: the shop is out of scope, the form is switched off' }); return tag.replace(/action="[^"]*"/, 'action="#"'); }); };
  fs.writeFileSync(`src/content/pages/${slug}.html`, inertMain(blank ? ser(main) : ik.slice(mi, fi).map(serializeOuter).join('')));
  fs.writeFileSync(`src/content/heads/${slug}.html`, keep.join('\n'));
  fs.writeFileSync(`src/content/bottoms/${slug}.html`, rest.map(serializeOuter).join('\n'));
  data[slug].css = report.heads[r.path] || null;
}
const variance = (m) => { const h = {}; for (const [s, v] of Object.entries(m)) (h[hash(v)] ??= []).push(s); return h; };
for (const k of Object.keys(parts)) { const v = variance(parts[k]); console.log(k, 'variants:', Object.keys(v).length, Object.values(v).map((x) => x.length).join(',')); }
console.log('skeletons:', [...new Set(Object.values(data).map((d) => d.sk))].length, [...new Set(Object.values(data).map((d) => d.sk))].join(' | ').slice(0, 400));
// the common header and footer are home's; a page whose copy differs (current-menu-item) gets its own file
fs.mkdirSync('src/content/parts', { recursive: true });
for (const [k, file] of [['header', 'header'], ['mobile', 'mobile'], ['footer', 'footer']]) {
  fs.writeFileSync(`src/content/parts/${file}.html`, parts[k].home);
  for (const [slug, v] of Object.entries(parts[k])) {
    if (v && v !== parts[k].home && !data[slug].blank) { fs.writeFileSync(`src/content/parts/${slug}.${file}.html`, v); (data[slug].own ??= []).push(file); }
  }
}
fs.writeFileSync('inert-forms.json', JSON.stringify(inert, null, 2) + '\n');
fs.writeFileSync('src/content/index.json', JSON.stringify(data, null, 1));
fs.writeFileSync('.conversion/parts.json', JSON.stringify(parts));
