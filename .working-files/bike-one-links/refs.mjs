import fs from 'node:fs'; import path from 'node:path'; import { parse } from '/Users/timo.alts/dev/bike-one-shop/website/node_modules/parse5/dist/index.js';
const textNodes = (n, tag = '') => n.nodeName === '#text' ? (['script', 'style'].includes(tag) ? [] : [n.value]) : [...(n.childNodes || []), ...(n.content ? [n.content] : [])].flatMap((c) => textNodes(c, n.tagName || tag));
const RE = /(?:https?:)?(?:\\?\/){2}(?:www\.)?bike-one\.org[^\s"'<>)\\]*|bike-one\.org/gi;
const out = {};
function add(kind, file, ctx) { (out[kind] ??= { n: 0, files: new Set(), ex: new Map() }); const o = out[kind]; o.n++; o.files.add(file); if (o.ex.size < 4) o.ex.set(ctx, 1); }
function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (p === 'dist/wp-content/uploads' || p === 'dist/.prerender') continue; walk(p); } else scan(p); } }
function scan(p) {
  if (!/\.(html|xml|css|js|json|txt|xsl|map|svg|csv|webmanifest)$/.test(p) && path.extname(p)) return; // also extension-less files (_redirects, _headers)
  const t = fs.readFileSync(p, 'utf8'); const isHtml = p.endsWith('.html');
  if (isHtml) {
    for (const m of t.matchAll(/<(\w+)\b([^>]*)>/g)) {
      for (const a of m[2].matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
        const v = a[3] ?? a[4]; if (!RE.test(v)) { RE.lastIndex = 0; continue; } RE.lastIndex = 0;
        const rel = (/\brel="?([^" >]+)/.exec(m[2]) || [])[1] || ''; const nm = (/\b(?:name|property)="([^"]+)"/.exec(m[2]) || [])[1] || '';
        const k = m[1] === 'a' && a[1] === 'href' ? 'a[href]' : m[1] === 'link' ? `link[rel=${rel}]` : m[1] === 'meta' ? `meta[${nm}]` : `${m[1]}[${a[1]}]`;
        add(k, p.replace('dist/', ''), v.slice(0, 110));
      }
    }
    for (const m of t.matchAll(/<(script|style)\b[^>]*>([\s\S]*?)<\/\1>/g)) { const hits = m[2].match(RE); if (hits) add(`inline <${m[1]}>`, p.replace('dist/', ''), hits[0].slice(0, 110)); }
    for (const th of textNodes(parse(t)).join(' ').match(RE) || []) add('visible text', p.replace('dist/', ''), th); // real text nodes: the old tag-stripping regex broke on > inside attribute values
  } else { const h = t.match(RE); if (h) add(path.extname(p) + ' file', p.replace('dist/', ''), h[0].slice(0, 110)); }
}
walk('dist');
for (const [k, v] of Object.entries(out).sort((a, b) => b[1].n - a[1].n)) console.log(String(v.n).padStart(5), String(v.files.size).padStart(3) + ' files', k, '|', [...v.ex.keys()].slice(0, 2).join('  ,  '));
