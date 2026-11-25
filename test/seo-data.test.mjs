// The structured data holds only facts a visitor can read: the BikeStore nodes (address, phone, e-mail, hours, days) equal
// the Ueber uns page text, Organization names the brands of the brands collection and the Impressum e-mail, and article
// dates are written in the shops' time zone so the date part is the day a visitor reads. Needs a build (dist/); skipped
// without one.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { attr, find, parseHtml, ROOT, squash, text } from '../tools/lib/dist.mjs';
import { berlinIso } from '../src/lib/site.mjs';

const file = (p) => path.join(ROOT, 'dist', p, 'index.html');
// the visible text of a built page's main element (Ueber uns, home)
const pageText = (p) => squash(text(find(parseHtml(file(p)), (n) => n.tagName === 'main')[0]));
const built = fs.existsSync(file('ueber-uns'));
const graphOf = (p) => find(parseHtml(file(p)), (n) => n.tagName === 'script' && attr(n, 'type') === 'application/ld+json').flatMap((s) => JSON.parse(s.childNodes.map((c) => c.value).join(''))['@graph']);

test('berlinIso writes the Berlin day and offset, winter and summer', () => {
  assert.equal(berlinIso(new Date('2025-10-16T23:25:05Z')), '2025-10-17T01:25:05+02:00');
  assert.equal(berlinIso(new Date('2025-12-31T23:30:00Z')), '2026-01-01T00:30:00+01:00');
});

test('BikeStore nodes equal the Ueber uns facts', { skip: !built && 'dist/ is not built' }, () => {
  const about = pageText('ueber-uns');
  const stores = graphOf('ueber-uns').filter((n) => n['@type'] === 'BikeStore');
  assert.equal(stores.length, 2);
  const days = { Monday: 'Montag', Tuesday: 'Dienstag', Friday: 'Freitag', Saturday: 'Samstag' };
  for (const s of stores) {
    const city = s.address.addressLocality;
    // the store's block starts at its heading, which the street follows (definition lists lose their spaces in plain text)
    const block = about.slice(about.indexOf(`${city}${s.address.streetAddress}`));
    assert.ok(block.startsWith(`${city}${s.address.streetAddress}`), `${city}: ${s.address.streetAddress} is not on the page`);
    assert.ok(about.includes(`${s.address.postalCode} ${city}`));
    const phone = s.telephone.replace(/^\+49/, '0');
    assert.ok(about.replace(/\s/g, '').includes(phone), `${phone} is not on the page`);
    assert.ok(about.includes(s.email));
    for (const h of s.openingHoursSpecification) {
      const list = [].concat(h.dayOfWeek);
      const label = list.length === 1 ? days[list[0]] : `${days[list[0]]} bis ${days[list.at(-1)]}`;
      assert.ok(block.includes(`${label}${h.opens}–${h.closes} Uhr`), `${label} ${h.opens}–${h.closes} is not on the page for ${city}`);
    }
    // Osnabrueck opens Tuesday to Friday, Oldenburg Monday to Friday: Monday only where the page says so
    assert.equal(s.openingHoursSpecification.some((h) => [].concat(h.dayOfWeek).includes('Monday')), city === 'Oldenburg');
  }
});

test('Organization: brands and e-mail come from the content files, no invented profile data', { skip: !built && 'dist/ is not built' }, () => {
  const org = graphOf('')?.find((n) => n['@type'] === 'Organization');
  // the brands are the ones of the collection; Cervélo has the accent, its slug does not (decision d73)
  const names = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content/brands.json'), 'utf8')).map((b) => b.name);
  assert.deepEqual(org.brand.map((b) => b.name).sort(), [...names].sort());
  assert.equal(org.brand.length, 7);
  assert.ok(org.brand.some((b) => b.name === 'Cervélo'), 'the brand is spelled Cervélo');
  assert.ok(fs.readFileSync(file(''), 'utf8').includes('>Cervélo</li>'), 'the home brand list spells Cervélo');
  assert.ok(fs.readFileSync(path.join(ROOT, 'src/content/legal/impressum.md'), 'utf8').includes(org.email));
  for (const k of ['sameAs', 'aggregateRating', 'geo', 'telephone', 'address']) assert.ok(!(k in org), `Organization has ${k}`);
});
