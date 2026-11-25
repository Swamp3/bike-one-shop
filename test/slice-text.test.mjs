// The migrated pages keep the captured words: legal text word for word, home and Ueber uns facts as in capture/text,
// blog excerpts as prefixes of the captured posts. Needs a build (dist/); skipped without one.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { attr, find, parseHtml, ROOT, squash, text } from '../tools/lib/dist.mjs';

const dist = (p) => path.join(ROOT, 'dist', p, 'index.html');
const capture = (name) => squash(fs.readFileSync(path.join(ROOT, 'capture/text', `${name}.txt`), 'utf8').replace(//g, '').replace(/ /g, ' ').replace(/ :/g, ':'));
const built = fs.existsSync(dist('impressum'));
const t = (name, fn) => test(name, { skip: !built && 'dist/ is not built' }, fn);

for (const page of ['impressum', 'datenschutz']) {
  t(`${page}: rendered words equal the captured words`, () => {
    const article = find(parseHtml(dist(page)), (n) => n.tagName === 'article' && attr(n, 'class') === 'prose')[0];
    assert.equal(squash(text(article).replace(/ /g, ' ')), capture(page));
  });
}

t('home: service texts and titles are in the captured home text', () => {
  const doc = parseHtml(dist(''));
  const home = capture('home').replace(/\.\s/g, '. ');
  const copy = find(doc, (n) => n.attrs?.some((a) => a.name === 'class' && a.value === 'service-copy'));
  assert.equal(copy.length, 5);
  for (const c of copy) for (const n of find(c, (x) => ['h3', 'p'].includes(x.tagName))) assert.ok(home.includes(squash(text(n)).replace(/\.$/, '')), squash(text(n)).slice(0, 50));
});

t('Ueber uns: phone numbers, e-mail addresses and hours are the captured ones', () => {
  const page = squash(text(find(parseHtml(dist('ueber-uns')), (n) => n.tagName === 'main')[0]));
  const cap = capture('ueber-uns');
  for (const v of ['0441 984 894 83', 'OL@bike-one.de', '0541 440 952 84', 'OS@bike-one.de', '10:00–18:00 Uhr', '10:00–14:00 Uhr', 'Montag bis Freitag', 'Dienstag bis Freitag', '26135 Oldenburg', '49078 Osnabrück']) {
    assert.ok(cap.includes(v), `${v} is not in the capture`);
    assert.ok(page.includes(v), `${v} is not on the page`);
  }
});

test('blog excerpts are the beginning of the captured posts', () => {
  const dir = path.join(ROOT, 'src/content/blog');
  for (const f of fs.readdirSync(dir)) {
    const excerpt = /^excerpt: (".*")$/m.exec(fs.readFileSync(path.join(dir, f), 'utf8'));
    assert.ok(excerpt, f);
    assert.ok(capture(f.replace(/\.md$/, '')).includes(squash(JSON.parse(excerpt[1]))), f);
  }
});
