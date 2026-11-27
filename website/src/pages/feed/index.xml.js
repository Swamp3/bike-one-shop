// Native RSS 2.0 feed of the blog collection. Served at /feed/ by a rewrite in _redirects (neither Cloudflare Pages
// nor the review server serve index.xml for a directory URL). Excerpts only; the full text is on the post page.
import { getPosts, postPath } from '../../lib/posts';
import { SITE_NAME, TAGLINE } from '../../lib/site.mjs';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function GET({ site }) {
  const url = (path) => new URL(path, site).href;
  const posts = await getPosts();
  const items = posts.map((p) => `    <item>
      <title>${esc(p.data.title)}</title>
      <link>${url(postPath(p))}</link>
      <guid isPermaLink="true">${url(postPath(p))}</guid>
      <pubDate>${p.data.date.toUTCString()}</pubDate>
      <description>${esc(p.data.excerpt)}</description>
    </item>`).join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE_NAME)} Blog</title>
    <link>${url('/blog/')}</link>
    <atom:link href="${url('/feed/')}" rel="self" type="application/rss+xml" />
    <description>${esc(TAGLINE)}</description>
    <language>de-DE</language>
    <lastBuildDate>${posts[0]?.data.modified.toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
