// Static output only, no adapter. trailingSlash 'always': the old site's URLs ended in a slash.
// `site` is the build origin (decision d30): bike-one.org in the release build (PUBLIC_INDEXABLE=true),
// else SITE_ORIGIN or https://bike-one.dev. tools/dev-origin.mjs stays as a post-build safety net.
import { defineConfig } from 'astro/config';

const release = process.env.PUBLIC_INDEXABLE === 'true';
const site = release ? 'https://bike-one.org' : (process.env.SITE_ORIGIN || 'https://bike-one.dev').replace(/\/+$/, '');

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  // No inline <style> or <script> and no data: URIs for assets, so the CSP can stay `'self'` (decision d31).
  build: { format: 'directory', inlineStylesheets: 'never' },
  vite: { build: { assetsInlineLimit: 0 } },
  // AVIF quality 45 instead of sharp's default 50: 19 % fewer image bytes, no visible loss at 1x or 2x (decision d80). WebP and JPEG stay at 80.
  image: { service: { entrypoint: 'astro/assets/services/sharp', config: { avif: { quality: 45 } } } },
  // captured text is rendered as written: no automatic links in plain text (a URL cut by a manual line break), no typographic quotes
  markdown: { gfm: false, smartypants: false },
});
