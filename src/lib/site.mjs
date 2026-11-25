// Site-wide constants. The build stays noindex until a release build sets PUBLIC_INDEXABLE=true.
export const INDEXABLE = process.env.PUBLIC_INDEXABLE === 'true';
export const PROPOSALS_ON = process.env.PROPOSALS === 'on';
export const SITE_NAME = "BikeOne";
export const ORIGIN = "https://bike-one.org";
// The Shop menu item (decision d23): the shop is its own site. Local, dev and staging builds link to the dev shop,
// the release build (PUBLIC_INDEXABLE=true) to the production shop.
export const SHOP_URL = INDEXABLE ? 'https://shop.bike-one.org/' : 'https://shop.bike-one.dev/';
