// The redirect map of the native redesign: the "Old URL(s) -> New" rows of the plan's information architecture as data.
// destination(path) answers where an old URL ends up, or null when the path is a native page (or a file) of the new
// site. The generator (tools/redirects-build.mjs) writes one row per known old URL plus the prefix rules, and the
// `redirects` check proves that no built page sits at a source. `{SHOP_URL}` is replaced per build: the dev or the
// production shop.
export const SHOP = '{SHOP_URL}';

// Exact old paths.
export const EXACT = new Map([
  ['/main-bike/', '/service/'],
  ['/category/allgemein/', '/blog/'],
  ['/comments/feed/', '/feed/'],
  ['/category/allgemein/feed/', '/blog/'],
  // brand feeds: the brand pages go to the shop, a feed reader is better served by the blog feed
  ...['cervelo', 'factor', 'pinarello', 'ridley', 'specialized', 'trek', 'wilier'].map((b) => [`/Marke/${b}/feed/`, '/feed/']),
  ['/wp-sitemap.xml', '/sitemap-index.xml'],
  ...['posts-la_portfolio-1', 'posts-la_team_member-1', 'posts-page-1', 'posts-post-1', 'taxonomies-category-1', 'posts-product-1', 'taxonomies-product_cat-1',
    'taxonomies-la_portfolio_category-1', 'taxonomies-product_brand-1', 'users-1'].map((n) => [`/wp-sitemap-${n}.xml`, '/sitemap-index.xml']),
  // the old shop shells and category pages: the shop is a separate site
  ...['/alle-fahrrader/', '/ebikes/', '/gravel-bikes/', '/racebikes/', '/tt-triathlon/', '/sale/'].map((p) => [p, SHOP]),
]);

// The seven brand pages (decision d50): the old pages held only product listings for them (prices, manufacturer copy,
// leasing rates), no copy of the shop's own, so every brand goes to the shop. The lower-case form is a typo guard:
// Cloudflare Pages paths are case sensitive.

// Everything below a prefix. The shop's URL scheme is unknown, so every shop target is the shop home.
export const PREFIXES = [
  ['/Marke/', SHOP],
  ['/marke/', SHOP],
  ['/portfolio/', '/'], // theme demo pages
  ['/portfolio-category/', '/'],
  ['/team-member/', '/'],
  ['/author/', '/blog/'],
  ...['/shop/', '/product/', '/product-category/', '/product-brand/', '/brand/', '/cart/', '/checkout/', '/my-account/', '/wishlist/',
    '/checkout-2/', '/my-account-2/', '/produkt/', '/produkt-kategorie/', '/warenkorb/', '/kasse/', '/mein-konto/', '/wunschliste/'].map((p) => [p, SHOP]),
];

export function destination(path) {
  if (EXACT.has(path)) return EXACT.get(path);
  const hit = PREFIXES.find(([prefix]) => path.startsWith(prefix));
  return hit ? hit[1] : null;
}
