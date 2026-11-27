import { getCollection, type CollectionEntry } from 'astro:content';

export type Store = CollectionEntry<'stores'>;

export async function getStores(): Promise<Store[]> {
  return (await getCollection('stores')).sort((a, b) => a.data.order - b.data.order);
}

/** "Mo–Fr 10:00–18:00" style lines for compact places such as the footer. */
export const shortHours = (store: Store): string[] =>
  store.data.hours.map((h) => `${h.short} ${h.opens}–${h.closes}`);
