// Built to dist/robots.txt. Blocks everything until a release build sets PUBLIC_INDEXABLE=true;
// then it is the live site's robots.txt (capture/robots.txt).
import { INDEXABLE } from '../lib/site.mjs';
import liveRobots from '../../capture/robots.txt?raw';

export function GET() {
  const body = INDEXABLE ? liveRobots : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
