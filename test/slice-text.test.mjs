// The migrated pages keep the captured words: legal text word for word, home and Ueber uns facts as in capture/text,
// blog posts word for word, service and job texts as in capture/text. Needs a build (dist/); skipped without one.
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
  const copy = find(doc, (n) => n.tagName === 'article' && /\bservice\b/.test(attr(n, 'class') ?? ''));
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

// the text dumps in capture/text fold typographic quotes to straight ones; the pages keep the HTML's quotes
const nospace = (s) => s.replace(/[„“”]/g, '"').replace(/\s+/g, '');

t('blog posts: the rendered body is the captured post body, word for word', () => {
  const dir = path.join(ROOT, 'src/content/blog');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  assert.equal(files.length, 5);
  for (const f of files) {
    const slug = f.replace(/\.md$/, '');
    const prose = find(parseHtml(dist(slug)), (n) => n.tagName === 'div' && attr(n, 'class') === 'prose')[0];
    // the capture text starts with the category and the date line, then the body (no title); spaces differ ("Monate ."), so compare without them
    const cap = nospace(capture(slug)).replace(/^Allgemeinpostedon17\.Oktober202517\.Oktober2025/i, '');
    assert.ok(nospace(text(prose)) === cap, `${slug}: differs near ${[...cap].findIndex((c, i) => c !== nospace(text(prose))[i])}`);
  }
});

t('service: the captured service copy is on the page, except the typos fixed in notes', () => {
  const page = nospace(text(find(parseHtml(dist('service')), (n) => n.tagName === 'main')[0]));
  const cap = nospace(capture('main-bike')
    .replace('Informiere dich sich', 'Informiere dich').replace('auf der den Canyonwebseite', 'auf der Canyonwebseite')
    .replace('Buche am besten', 'buche am besten').replace('weitern Ablauf', 'weiteren Ablauf')
    .replace(/(Spare mit Dienstradleasing|Werkstattservice aus Meisterhand|Keine Lust auf lange Wartezeiten\?|Canyon Service)/g, '|$1'));
  for (const sentence of cap.split(/(?<=[.!?])|\|/).map((x) => x.replace(/^\|/, '').trim()).filter((x) => x.length > 25)) {
    if (/vc_column|Herzlich|eBikesGravel|Wilkommen/i.test(sentence)) continue; // shortcode leak, old home greeting, category tiles: not copied
    assert.ok(page.includes(sentence), `missing on /service/: ${sentence.slice(0, 60)}`);
  }
});

t('stellenangebote: the captured job list, nothing added', () => {
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
