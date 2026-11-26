import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

/** Newest first. */
export async function getPosts(): Promise<Post[]> {
  return (await getCollection('blog')).sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export const postPath = (post: Post) => `/${post.id}/`;

const formatter = new Intl.DateTimeFormat('de-DE', { dateStyle: 'long', timeZone: 'Europe/Berlin' });
export const formatDate = (date: Date) => formatter.format(date);
