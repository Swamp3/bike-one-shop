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
  // captured text is rendered as written: no automatic links in plain text (a URL cut by a manual line break), no typographic quotes
  markdown: { gfm: false, smartypants: false },
});
