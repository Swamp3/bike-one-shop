import fs from 'node:fs'; import path from 'node:path';
const res = {}; const add = (host, kind, file, url) => { const k = host + ' | ' + kind; (res[k] ??= { n: 0, files: new Set(), ex: url }); res[k].n++; res[k].files.add(file); };
const hostOf = (u) => { try { return new URL(u.startsWith('//') ? 'https:' + u : u).host; } catch { return null; } };
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (/dist\/(wp-content\/uploads|\.prerender)$/.test(p)) continue; walk(p); continue; } scan(p); } })('dist');
function scan(p) {
  if (!/\.(html|css|js|json|xml|xsl|mjs)$/.test(p)) return; const f = p.replace('dist/', ''); const t = fs.readFileSync(p, 'utf8');
  if (p.endsWith('.html')) {
    for (const m of t.matchAll(/<(script|link|img|iframe|source|video|audio|embed|object|form|a|meta)\b([^>]*)>/g)) for (const a of m[2].matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) {
      const v = a[2]; for (const u of v.match(/(?:https?:)?\/\/[\w.-]+\.[a-z]{2,}[^\s"',)]*/gi) || []) { const h = hostOf(u); if (!h || /bike-one\.(org|dev)$/.test(h)) continue; const rel = (/rel="([^"]*)"/.exec(m[2]) || [])[1] || ''; add(h, `${m[1]}[${a[1]}]${rel ? ' rel=' + rel : ''}`, f, u.slice(0, 90)); }
    }
    for (const m of t.matchAll(/<(script|style)\b[^>]*>([\s\S]*?)<\/\1>/g)) for (const u of m[2].match(/(?:https?:)?(?:\\?\/){2}[\w.-]+\.[a-z]{2,}(?:\\?\/)[^\s"',)]*/gi) || []) { const h = hostOf(u.replace(/\\/g, '')); if (!h || /bike-one\.(org|dev)$/.test(h) || /w3\.org|schema\.org/.test(h)) continue; add(h, `inline <${m[1]}>`, f, u.slice(0, 90)); }
  } else for (const u of t.match(/(?:https?:)?\/\/[\w.-]+\.[a-z]{2,}[^\s"',)]*/gi) || []) { const h = hostOf(u); if (!h || /bike-one\.(org|dev)$/.test(h) || /w3\.org|schema\.org|sitemaps\.org|purl\.org|wordpress\.org|gnu\.org|apache\.org|github\.com|npmjs|mozilla\.org|jquery\.org|reactjs|opensource|spdx|momentjs|lodash|json-schema/.test(h)) continue; add(h, path.extname(p) + ' file', f, u.slice(0, 90)); }
}
for (const [k, v] of Object.entries(res).sort((a, b) => b[1].n - a[1].n).slice(0, 45)) console.log(String(v.n).padStart(4), String(v.files.size).padStart(3) + 'f', k, '|', v.ex);
