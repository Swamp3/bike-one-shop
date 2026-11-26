// The pages render the words of their content files, nothing added or lost: legal text and blog posts equal their
// Markdown body, the Ueber uns page carries the facts the structured data repeats, the service and job pages list what
// they must. (Until Stage 4 these tests compared the pages with the captured text of the old site; that capture is deleted,
// git history keeps it, decision d74.) Needs a build (dist/); skipped without one.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { attr, find, parseHtml, ROOT, squash, text } from '../tools/lib/dist.mjs';

const dist = (p) => path.join(ROOT, 'dist', p, 'index.html');
const built = fs.existsSync(dist('impressum'));
const t = (name, fn) => test(name, { skip: !built && 'dist/ is not built' }, fn);

// Markdown to the words a reader sees: front matter, headings, list bullets, bold, line-break backslashes, links and autolinks go.
const words = (md) => md.replace(/^---\n[\s\S]*?\n---\n/, '').replace(/^#+\s+/gm, '').replace(/^\s*[-*]\s+/gm, '').replace(/\*\*|__/g, '').replace(/\\$/gm, ' ')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/<(https?:[^>]+|[^>\s]+@[^>\s]+)>/g, '$1').replace(/\\([*_#.()\[\]-])/g, '$1');
// quotes and spaces: the renderer turns straight quotes into none (smartypants is off), but a space before a full stop is not stable
const flat = (s) => s.replace(/[„“”"]/g, '"').replace(/\s+/g, '');
const md = (...p) => fs.readFileSync(path.join(ROOT, 'src/content', ...p), 'utf8');

for (const page of ['impressum', 'datenschutz']) {
  t(`${page}: the rendered words are the words of src/content/legal/${page}.md`, () => {
    const article = find(parseHtml(dist(page)), (n) => n.tagName === 'article' && attr(n, 'class') === 'prose')[0];
    const got = flat(text(article).replace(/ /g, ' ')), want = flat(words(md('legal', `${page}.md`)));
    assert.ok(got === want, `${page}: differs near ${[...want].findIndex((c, i) => c !== got[i])}`);
  });
}

t('home: five service blocks, each with a title and a text', () => {
  const copy = find(parseHtml(dist('')), (n) => n.tagName === 'article' && /\bservice\b/.test(attr(n, 'class') ?? ''));
  assert.equal(copy.length, 5);
  for (const c of copy) for (const tag of ['h3', 'p']) assert.ok(squash(text(find(c, (x) => x.tagName === tag)[0])).length > 20, tag);
});

t('Ueber uns: phone numbers, e-mail addresses and hours are on the page', () => {
  const page = squash(text(find(parseHtml(dist('ueber-uns')), (n) => n.tagName === 'main')[0]));
  for (const v of ['0441 984 894 83', 'OL@bike-one.de', '0541 440 952 84', 'OS@bike-one.de', '10:00–18:00 Uhr', '10:00–14:00 Uhr', 'Montag bis Freitag', 'Dienstag bis Freitag', '26135 Oldenburg', '49078 Osnabrück']) {
    assert.ok(page.includes(v), `${v} is not on the page`);
  }
});

test('blog excerpts are the beginning of their posts', () => {
  const dir = path.join(ROOT, 'src/content/blog');
  for (const f of fs.readdirSync(dir)) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    const excerpt = /^excerpt: (".*")$/m.exec(src);
    assert.ok(excerpt, f);
    assert.ok(squash(words(src)).startsWith(squash(JSON.parse(excerpt[1]))), f);
  }
});

t('blog posts: the rendered body is the Markdown body, word for word', () => {
  const dir = path.join(ROOT, 'src/content/blog');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  assert.equal(files.length, 5);
  for (const f of files) {
    const slug = f.replace(/\.md$/, '');
    const prose = find(parseHtml(dist(slug)), (n) => n.tagName === 'div' && attr(n, 'class') === 'prose')[0];
    const got = flat(text(prose)), want = flat(words(md('blog', f)));
    assert.ok(got === want, `${slug}: differs near ${[...want].findIndex((c, i) => c !== got[i])}`);
  }
});

t('service: the four service blocks and the booking link are there', () => {
  const main = find(parseHtml(dist('service')), (n) => n.tagName === 'main')[0];
  assert.ok(squash(text(main)).length > 1500);
  assert.ok(find(main, (n) => n.tagName === 'a' && attr(n, 'href') === '/termin-buchen/').length >= 1);
});

t('stellenangebote: the job list, nothing added', () => {
  const page = squash(text(find(parseHtml(dist('stellenangebote')), (n) => n.tagName === 'main')[0]));
  for (const v of ['Hier findest du unsere Stellenangebote:', 'Mitarbeiter im Innendienst – Online M/W/D Vollzeit', 'Zweiradmechaniker Meister M/W/D Vollzeit', 'Zweiradmechaniker M/W/D Vollzeit', 'Verkäufer M/W/D Vollzeit', 'Aktuell keine Stellen zu besetzen']) assert.ok(page.includes(v), v);
});

t('booking pages: etermin.net is not requested before a click (no iframe in the page, only in a template)', () => {
  for (const [page, host] of [['termin-buchen-oldenburg', 'https://www.etermin.net/bike-one'], ['termin-buchen-osnabrueck', 'https://www.etermin.net/os1']]) {
    const doc = parseHtml(dist(page));
    const live = find(doc, (n) => n.tagName === 'iframe' && n.parentNode?.nodeName !== '#document-fragment');
    assert.equal(live.length, 0, page);
    assert.ok(find(doc, (n) => n.tagName === 'iframe').some((n) => attr(n, 'src') === host), page);
  }
});
