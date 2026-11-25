// Content collections of the native site (decision d33). The legacy WordPress dumps in src/content/{pages,heads,
// bottoms,parts} are not collections; they leave with the old route.
import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const time = z.string().regex(/^\d{2}:\d{2}$/);

const stores = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/stores' }),
  schema: z.object({
    order: z.number().int(),
    name: z.string(),
    street: z.string(),
    postalCode: z.string().regex(/^\d{5}$/),
    city: z.string(),
    phone: z.string(),
    phoneTel: z.string().regex(/^\+\d+$/),
    email: z.string().email(),
    bookingPath: z.string().startsWith('/').endsWith('/'),
    mapQuery: z.string(),
    hours: z.array(z.object({
      label: z.string(),
      short: z.string(),
      days: z.array(z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])).min(1),
      opens: time,
      closes: time,
    })).min(1),
    closed: z.string(),
  }),
});

const brands = defineCollection({
  loader: file('./src/content/brands.json'),
  schema: z.object({ name: z.string() }),
});

// Legal pages: the captured text, word for word (no rewriting without the owner's legal review).
const legal = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/legal' }),
  schema: z.object({ title: z.string(), seoTitle: z.string(), description: z.string() }),
});

// The five captured posts. Stage 1 holds the front matter only (title, dates and excerpt copied from the capture);
// the post bodies and the blog pages follow in Stage 2.
const blog = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    modified: z.coerce.date(),
    excerpt: z.string(),
  }),
});

export const collections = { stores, brands, legal, blog };
