// Site-wide constants. The build stays noindex until a release build sets PUBLIC_INDEXABLE=true.
export const INDEXABLE = process.env.PUBLIC_INDEXABLE === 'true';
export const SITE_NAME = "BikeOne";
export const ORIGIN = "https://bike-one.org";
// The Shop menu item (decision d23): the shop is its own site. Local, dev and staging builds link to the dev shop,
// the release build (PUBLIC_INDEXABLE=true) to the production shop.
export const SHOP_URL = INDEXABLE ? 'https://shop.bike-one.org/' : 'https://shop.bike-one.dev/';
// The footer tagline of the live site, reused as the home h1 and the organisation description.
export const TAGLINE = 'Erstklassige Bikes, Beratung & Service in Oldenburg & Osnabrück.';
export const LEGAL_NAME = 'BikeOne GmbH';
export const INFO_EMAIL = 'info@bike-one.de';

// A date as ISO 8601 in the shops' time zone ("2025-10-17T01:25:05+02:00"), so the date part is the day a visitor reads on the
// page; toISOString() would give the UTC day (the 16th for a post published at 01:25 on the 17th).
export function berlinIso(date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'longOffset' }).formatToParts(date).map((p) => [p.type, p.value]));
  const offset = parts.timeZoneName === 'GMT' ? '+00:00' : parts.timeZoneName.replace('GMT', '');
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
}
