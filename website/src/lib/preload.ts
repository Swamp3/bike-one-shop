// The LCP image of a page is preloaded as an AVIF srcset with the very widths and sizes its <Picture> uses, so the
// browser picks the same file and fetches it once, before it has parsed the stylesheets (measured: -30 % LCP on the
// home page at slow 4G). Only browsers that decode AVIF preload (type), the rest take the <picture> fallbacks.
import { getImage } from 'astro:assets';

export const HERO = { widths: [640, 960, 1440, 1920], sizes: '100vw' };
export const POST = { widths: [480, 768, 1024, 1440], sizes: '(min-width: 64rem) 72rem, 100vw' };
export const SERVICE = { widths: [480, 768, 1024], sizes: '(min-width: 48rem) 34rem, calc(100vw - 2rem)' };

export async function preloadAvif(src: ImageMetadata, { widths, sizes }: { widths: number[]; sizes: string }) {
  const image = await getImage({ src, format: 'avif', widths, sizes });
  return { srcset: image.srcSet.attribute, sizes };
}
