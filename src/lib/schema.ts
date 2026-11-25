// JSON-LD builders. Every value comes from the content collections or the captured footer/Impressum text:
// no geo coordinates, ratings, price ranges or invented hours (plan: SEO).
import { INFO_EMAIL, LEGAL_NAME, SITE_NAME, TAGLINE } from './site.mjs';
import type { Store } from './stores';

export type Crumb = { name: string; path: string };
type Json = Record<string, unknown>;

const abs = (origin: string, path: string) => new URL(path, origin).href;

export function storeNode(origin: string, store: Store): Json {
  const d = store.data;
  return {
    '@type': 'BikeStore',
    '@id': abs(origin, `/#store-${store.id}`),
    name: `${LEGAL_NAME} ${d.name}`,
    url: abs(origin, '/ueber-uns/'),
    parentOrganization: { '@id': abs(origin, '/#organization') },
    address: {
      '@type': 'PostalAddress',
      streetAddress: d.street,
      postalCode: d.postalCode,
      addressLocality: d.city,
      addressCountry: 'DE',
    },
    telephone: d.phoneTel,
    email: d.email,
    openingHoursSpecification: d.hours.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.days.length === 1 ? h.days[0] : h.days,
      opens: h.opens,
      closes: h.closes,
    })),
  };
}

export function organizationNode(origin: string, logoUrl: string, brands: string[], stores: Store[]): Json {
  return {
    '@type': 'Organization',
    '@id': abs(origin, '/#organization'),
    name: SITE_NAME,
    legalName: LEGAL_NAME,
    url: abs(origin, '/'),
    logo: { '@type': 'ImageObject', url: logoUrl },
    email: INFO_EMAIL,
    description: TAGLINE,
    brand: brands.map((name) => ({ '@type': 'Brand', name })),
    department: stores.map((s) => ({ '@id': abs(origin, `/#store-${s.id}`) })),
  };
}

export const websiteNode = (origin: string): Json => ({
  '@type': 'WebSite',
  '@id': abs(origin, '/#website'),
  url: abs(origin, '/'),
  name: SITE_NAME,
  inLanguage: 'de-DE',
  publisher: { '@id': abs(origin, '/#organization') },
});

export const breadcrumbNode = (origin: string, crumbs: Crumb[]): Json => ({
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((c, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: c.name,
    item: abs(origin, c.path),
  })),
});

export const graph = (nodes: Json[]): Json => ({ '@context': 'https://schema.org', '@graph': nodes });
