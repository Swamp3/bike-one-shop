// Removes `//# sourceMappingURL=` comments from the served JS and CSS: the .map files were never captured, so
// DevTools logs "failed to load source map" on every page (decision d22). Run after `npm run assets:copy`.
import fs from 'node:fs';
import path from 'node:path';
const COMMENT = /^[ \t]*(?:\/\/[#@]|\/\*[#@])[ \t]*sourceMappingURL=[^\n]*?(?:\*\/)?[ \t]*$/gm;
let n = 0;
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (p !== 'public/wp-content/uploads') walk(p); continue; }
    if (!/\.(js|css|mjs)$/.test(e.name)) continue;
    const text = fs.readFileSync(p, 'utf8');
    const out = text.replace(COMMENT, '');
    if (out !== text) { fs.writeFileSync(p, out); n++; console.log('stripped', p); }
  }
})('public');
console.log(`${n} file(s)`);
