// The LCP image of a page is preloaded as an AVIF srcset with the very widths and sizes its <Picture> uses, so the
// browser picks the same file and fetches it once, before it has parsed the stylesheets (measured: -30 % LCP on the
// home page at slow 4G). Only browsers that decode AVIF preload (type), the rest take the <picture> fallbacks.
import { getImage } from 'astro:assets';

export const HERO = { widths: [640, 960, 1440, 1920], sizes: '100vw' };
// the phone crop of the hero poster (4:5, 864 x 1080 is all the 1080p film holds); phones get it below 48rem
export const HERO_PORTRAIT = { widths: [480, 720, 864], sizes: '100vw' };
export const HERO_NARROW = '(max-width: 47.99rem)';
export const HERO_WIDE = '(min-width: 48rem)';
export const POST = { widths: [480, 768, 1024, 1440], sizes: '(min-width: 74rem) 72rem, calc(100vw - 2rem)' };
// two columns from 48rem: (viewport - 2rem margins - 3rem gap) / 2, and the container stops at 72rem (34.5rem per column)
export const SERVICE = { widths: [480, 768, 1024], sizes: '(min-width: 74rem) 34.5rem, (min-width: 48rem) calc((100vw - 5rem) / 2), calc(100vw - 2rem)' };

export async function preloadAvif(src: ImageMetadata, { widths, sizes }: { widths: number[]; sizes: string }, media?: string) {
  const image = await getImage({ src, format: 'avif', widths, sizes });
  return { srcset: image.srcSet.attribute, sizes, media };
}
