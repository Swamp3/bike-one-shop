// Built to dist/robots.txt. Blocks everything until a release build sets PUBLIC_INDEXABLE=true; then it allows
// everything and names the sitemap that tools/sitemap-build.mjs writes after the build.
import { INDEXABLE } from '../lib/site.mjs';

export function GET({ site }) {
  const body = INDEXABLE
    ? `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap-index.xml', site).href}\n`
    : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
