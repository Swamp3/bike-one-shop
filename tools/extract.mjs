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


// Same-origin asset URLs become root-relative (build-rules, decision d21), so the build loads every
// script, stylesheet, icon and image from its own copy and never from the live site. Since d27 links (<a>,
// <area>, form actions), data-* attributes and inline script config are root-relative too; canonical, og and the
// sitemap/feed files keep the production origin (tools/dev-origin.mjs swaps it for dev builds).
const ORIGIN_RE = /(?:https?:)?\/\/(?:(?:www\.)?bike-one\.org|bikeone\.cvires\.at)(?=\/)/gi;
const FILE_RE = /(?:https?:)?\/\/(?:(?:www\.)?bike-one\.org|bikeone\.cvires\.at)(?=\/wp-(?:content|includes)\/)/gi;
// Slider background videos (data-mp4/webm/ogv) sit at the site root, outside /wp-content/ (d26): same origin, root-relative.
// The same origin inside inline scripts and data-* attributes, plain or JSON-escaped (https:\/\/host\/path).
// Not after = ? &: a share URL such as ?u=https://host/ must stay whole.
const INLINE_RE = /(?<![=?&])(?:https?:)?(?:\\?\/){2}(?:(?:www\.)?bike-one\.org|bikeone\.cvires\.at)(?=\\?\/)/gi;
// A whole href or action on the origin: root-relative, and the bare origin becomes "/".
// The same origin URL-encoded inside a script (WooCommerce wcSettings: https%3A%5C%2F%5C%2Fhost%5C%2Fpath).
const ENCODED_RE = /https?%3A(?:%5C)?%2F(?:%5C)?%2F(?:(?:www\.)?bike-one\.org|bikeone\.cvires\.at)(?=(?:%5C)?%2F)/gi;
const ANCHORED = /^(?:https?:)?\/\/(?:(?:www\.)?bike-one\.org|bikeone\.cvires\.at)(?=[/?#]|$)/i;
const rootRel = (v) => { const r = v.trim().replace(ANCHORED, ''); return r === v.trim() ? v : r === '' || /^[?#]/.test(r) ? '/' + r : r; };
const VIDEO_ATTR = /^data-(mp4|webm|ogv)$/;
const ASSET_LINK_RELS = new Set(['stylesheet', 'icon', 'shortcut icon', 'apple-touch-icon', 'preload', 'modulepreload']);
const ATTRS = { script: ['src'], img: ['src', 'srcset'], source: ['src', 'srcset'], video: ['src', 'poster'], audio: ['src'], track: ['src'] };
// Scripts that cannot work on a static site and only raise console errors (decision d22): WooCommerce cart
// fragments (POST ?wc-ajax=get_refreshed_fragments), the YITH wishlist add-to-wishlist component (REST call
// to wp-json) and WordPress's emoji loader (fetches wp-emoji-release.min.js from the live origin).
const DROP_ID = /^(wc-cart-fragments-js(-extra)?|yith-wcwl-add-to-wishlist-js(-extra|-translations)?|wp-emoji-settings)$/;
// WordPress head links a static site has no endpoint for (d27): REST root, RSD, pingback, shortlink, oEmbed and REST alternates.
const WP_HEAD_REL = new Set(['https://api.w.org/', 'edituri', 'pingback', 'shortlink']);
const dropHeadLink = (c) => c.tagName === 'link' && (WP_HEAD_REL.has((at(c, 'rel') || '').toLowerCase().trim()) || (at(c, 'rel') === 'alternate' && /\/wp-json\//.test(at(c, 'href') || '')));
const dropScript = (c) => c.tagName === 'script' && (DROP_ID.test(at(c, 'id') || '') || (at(c, 'type') === 'module' && (c.childNodes || []).some((t) => /script#wp-emoji-settings/.test(t.value || ''))));
function localise(node) {
  node.childNodes = (node.childNodes || []).filter((c) => !dropScript(c) && !dropHeadLink(c));
  for (const c of node.childNodes || []) {
    if (!c.tagName) continue;
    const names = c.tagName === 'link' && ASSET_LINK_RELS.has((at(c, 'rel') || '').toLowerCase().trim()) ? ['href', 'imagesrcset'] : ATTRS[c.tagName] || [];
    for (const a of c.attrs || []) {
      if (names.includes(a.name) || VIDEO_ATTR.test(a.name)) a.value = a.value.replace(ORIGIN_RE, '');
      // links and form actions (d27)
      else if ((a.name === 'href' && (c.tagName === 'a' || c.tagName === 'area' || (c.tagName === 'link' && (at(c, 'rel') || '') === 'alternate'))) || (a.name === 'action' && c.tagName === 'form')) a.value = rootRel(a.value);
      // inline background images (d21): file URLs only
      else if (a.name === 'style') a.value = a.value.replace(FILE_RE, '');
      // lazy-load sources and WooCommerce variation JSON (d21, d27)
      else if (a.name.startsWith('data-')) a.value = a.value.replace(INLINE_RE, '');
    }
    // inline script config (ajax_url, REST root, permalinks, srcset in module data): d27
    if (c.tagName === 'script') for (const t of c.childNodes || []) if (t.value) t.value = t.value.replace(INLINE_RE, '').replace(ENCODED_RE, '');
    // an import map's targets are the same kind of asset URL
    if (c.tagName === 'script' && at(c, 'type') === 'importmap') for (const t of c.childNodes || []) if (t.value) t.value = t.value.replace(ORIGIN_RE, '');
    localise(c);
    if (c.content) localise(c.content); // <template> children (WooCommerce gallery placeholder) live in .content, not childNodes
  }
}

const parts = { header: {}, mobile: {}, footer: {} };
const data = {};
const inert = [];
for (const r of routes) {
  const doc = parse(fs.readFileSync(`capture/${r.snapshot}`, 'utf8'));
  const html = doc.childNodes.find((n) => n.nodeName === 'html');
  const head = html.childNodes.find((n) => n.nodeName === 'head');
  const body = html.childNodes.find((n) => n.nodeName === 'body');
  localise(head); localise(body);
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
  // Menu change the owner asked for (decision d23): the GravelBikes, RoadBikes and TT/Triathlon items become one Shop item.
  const shopMenu = (h) => h
    .replace(/<li([^>]*)><a href="\/shop\/\?categories=gravel-bikes">(<span class="mm-text">)?GravelBikes((?:<\/span>)?)<\/a><\/li>/, '<li$1><a href="__SHOP_URL__">$2Shop$3</a></li>')
    .replace(/\n?<li[^>]*><a href="\/shop\/\?categories=(?:road|tt)-bikes">[^<]*(?:<span class="mm-text">[^<]*<\/span>)?<\/a><\/li>/g, '');
  parts.header[slug] = shopMenu(ser(header)); parts.mobile[slug] = ser(mobile); parts.footer[slug] = shopMenu(ser(footer));
  data[slug] = { special: !!r.special, title: ((/<title[^>]*>([\s\S]*?)<\/title>/.exec(fs.readFileSync(`capture/${r.snapshot}`, 'utf8')) || [])[1] || '').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&'), blank, path: r.path, template: r.template, sk, bodyAttrs: (body.attrs || []).filter((a) => a.name !== 'class'), bodyClass: at(body, 'class') || '', htmlClass: at(html, 'class') || '', lang: at(html, 'lang') || '' };
  const mi = ik.indexOf(main), fi = ik.indexOf(footer);
  // main plus whatever sits between it and the footer (the portfolio pager, clearfix divs)
  // WooCommerce add-to-cart forms cannot work statically (decision d16): action sends nowhere, listed in inert-forms.json
  const inertMain = (h) => { let i = 0; return h.replace(/<form\b[^>]*>/g, (tag) => { const idx = i++; if (!/method="post"/i.test(tag)) return tag; inert.push({ path: r.path, form: idx, reason: 'WooCommerce add-to-cart: the shop is out of scope, the form is switched off' }); return tag.replace(/action="[^"]*"/, 'action="#"'); }); };
  fs.writeFileSync(`src/content/pages/${slug}.html`, inertMain(blank ? ser(main) : ik.slice(mi, fi).map(serializeOuter).join('')));
  fs.writeFileSync(`src/content/heads/${slug}.html`, keep.join('\n'));
  // Hero background video (decision d26): Safari/WebKit does not start Revolution Slider's muted autoplay video
// until a click, so a small script plays a bg video of the active slide that has not started yet.
  const HERO_AUTOPLAY = `<script id="hero-video-autoplay">(function(){setInterval(function(){if(document.hidden)return;document.querySelectorAll('rs-slide').forEach(function(s){if(getComputedStyle(s).visibility!=='visible')return;var v=s.querySelector('rs-bgvideo video');if(v&&v.paused&&!v.ended&&v.currentTime===0&&v.readyState>=2){v.muted=true;var p=v.play();if(p&&p.catch)p.catch(function(){});}});},500);})();</script>`;
  const hasHero = ik.slice(mi, fi).some((n) => serializeOuter(n).includes('<rs-bgvideo'));
  fs.writeFileSync(`src/content/bottoms/${slug}.html`, rest.map(serializeOuter).join('\n') + (hasHero ? '\n' + HERO_AUTOPLAY : ''));
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
