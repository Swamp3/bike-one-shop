// Runs the gates (scripts/verify/run-all.mjs). A dev build names SITE_ORIGIN (default https://bike-one.dev, see
// tools/dev-origin.mjs), so the gates get --origin for it; the release build (PUBLIC_INDEXABLE=true) is checked against
// the baseline's canonical origin. Extra arguments are passed through. Decision d27.
import { spawnSync } from 'node:child_process';
import { DEV_ORIGIN } from './dev-origin.mjs';

const release = process.env.PUBLIC_INDEXABLE === 'true';
const origin = (process.env.SITE_ORIGIN || DEV_ORIGIN).replace(/\/+$/, '');
const args = ['scripts/verify/run-all.mjs', '--allow-extra', '/VidOne.mp4', ...(release ? [] : ['--origin', origin]), ...process.argv.slice(2)];
process.exit(spawnSync(process.execPath, args, { stdio: 'inherit' }).status ?? 2);
