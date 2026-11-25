// The redirect map of the native redesign: the "Old URL(s) -> New" rows of the plan's information architecture as data.
// destination(path) answers where an old URL ends up, whether or not the old route still builds it. The generator
// (tools/redirects-build.mjs) writes a redirect only for sources that no longer have a page, so the map applies
// itself as pages leave tools/legacy.mjs. `{SHOP_URL}` is replaced per build: the dev or the production shop.
export const SHOP = '{SHOP_URL}';

// Exact old paths.
export const EXACT = new Map([
  ['/main-bike/', '/service/'],
  ['/category/allgemein/', '/blog/'],
  ['/comments/feed/', '/feed/'],
  ['/category/allgemein/feed/', '/blog/'],
  ['/wp-sitemap.xml', '/sitemap-index.xml'],
  ...['posts-la_portfolio-1', 'posts-la_team_member-1', 'posts-page-1', 'posts-post-1', 'taxonomies-category-1', 'posts-product-1', 'taxonomies-product_cat-1',
    'taxonomies-la_portfolio_category-1', 'taxonomies-product_brand-1', 'users-1'].map((n) => [`/wp-sitemap-${n}.xml`, '/sitemap-index.xml']),
  // WooCommerce shells and category pages: the shop is a separate site
  ...['/alle-fahrrader/', '/ebikes/', '/gravel-bikes/', '/racebikes/', '/tt-triathlon/', '/sale/'].map((p) => [p, SHOP]),
]);

// Everything below a prefix. The shop's URL scheme is unknown, so every shop target is the shop home.
export const PREFIXES = [
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
