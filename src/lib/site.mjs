// Site-wide constants. The build stays noindex until a release build sets PUBLIC_INDEXABLE=true.
export const INDEXABLE = process.env.PUBLIC_INDEXABLE === 'true';
export const PROPOSALS_ON = process.env.PROPOSALS === 'on';
export const SITE_NAME = "BikeOne";
export const ORIGIN = "https://bike-one.org";
// The Shop menu item (decision d23): the shop is its own site. Local, dev and staging builds link to the dev shop,
// the release build (PUBLIC_INDEXABLE=true) to the production shop.
export const SHOP_URL = INDEXABLE ? 'https://shop.bike-one.org/' : 'https://shop.bike-one.dev/';
// The footer tagline of the live site, reused as the home h1 and the organisation description.
export const TAGLINE = 'Erstklassige Bikes, Beratung & Service in Oldenburg & Osnabrück.';
export const LEGAL_NAME = 'BikeOne GmbH';
export const INFO_EMAIL = 'info@bike-one.de';
