// Static output only, no adapter. trailingSlash follows the majority of live URLs in capture/.
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://bike-one.org',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
