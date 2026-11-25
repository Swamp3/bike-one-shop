// npm run verify: the checks that replace the parity gates (decision d41). Run after npm run build; the release build
// is checked with PUBLIC_INDEXABLE=true npm run verify:release. `net` needs the review server (:4321, serves dist/).
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const only = process.argv.slice(2);
const names = ['redirects', 'links', 'seo', 'wp', 'headers', 'size', 'a11y', 'ui', 'net', 'embeds'].filter((n) => !only.length || only.includes(n));
const failed = [];
console.log(`verify: ${process.env.PUBLIC_INDEXABLE === 'true' ? 'release' : 'dev'} build`);
for (const name of names) {
  const r = spawnSync(process.execPath, [path.join(here, 'checks', `${name}.mjs`)], { stdio: 'inherit' });
  if (r.status !== 0) failed.push(name);
}
console.log(failed.length ? `verify: FAILED ${failed.join(', ')}` : `verify: all ${names.length} checks passed`);
process.exit(failed.length ? 1 : 0);
