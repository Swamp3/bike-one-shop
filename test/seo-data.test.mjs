// The structured data holds only captured facts: the BikeStore nodes (address, phone, e-mail, hours, days) equal the
// captured Ueber uns text, Organization names the captured brands and Impressum e-mail, and article dates are written in
// the shops' time zone so the date part is the day a visitor reads. Needs a build (dist/); skipped without one.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { attr, find, parseHtml, ROOT, squash } from '../tools/lib/dist.mjs';
import { berlinIso } from '../src/lib/site.mjs';

const file = (p) => path.join(ROOT, 'dist', p, 'index.html');
const cap = (name) => squash(fs.readFileSync(path.join(ROOT, 'capture/text', `${name}.txt`), 'utf8').replace(/‑/g, '-'));
const built = fs.existsSync(file('ueber-uns'));
const graphOf = (p) => find(parseHtml(file(p)), (n) => n.tagName === 'script' && attr(n, 'type') === 'application/ld+json').flatMap((s) => JSON.parse(s.childNodes.map((c) => c.value).join(''))['@graph']);

test('berlinIso writes the Berlin day and offset, winter and summer', () => {
  assert.equal(berlinIso(new Date('2025-10-16T23:25:05Z')), '2025-10-17T01:25:05+02:00');
  assert.equal(berlinIso(new Date('2025-12-31T23:30:00Z')), '2026-01-01T00:30:00+01:00');
});

test('BikeStore nodes equal the captured Ueber uns facts', { skip: !built && 'dist/ is not built' }, () => {
  const about = cap('ueber-uns');
  const stores = graphOf('ueber-uns').filter((n) => n['@type'] === 'BikeStore');
  assert.equal(stores.length, 2);
  const days = { Monday: 'Montag', Tuesday: 'Dienstag', Friday: 'Freitag', Saturday: 'Samstag' };
  for (const s of stores) {
    const city = s.address.addressLocality;
    const block = about.slice(about.indexOf(`${city}:`));
    const street = s.address.streetAddress.replace('straße', 'str.');
    assert.ok(block.includes(street) || about.includes(s.address.streetAddress), `${street} is not in the capture`);
    assert.ok(about.includes(`${s.address.postalCode} ${city}`));
    const phone = s.telephone.replace(/^\+49/, '0');
    assert.ok(about.replace(/\s/g, '').includes(phone), `${phone} is not in the capture`);
    assert.ok(about.includes(s.email));
    for (const h of s.openingHoursSpecification) {
      const list = [].concat(h.dayOfWeek);
      const label = list.length === 1 ? days[list[0]] : `${days[list[0]]} bis ${days[list.at(-1)]}`;
      assert.ok(block.includes(`${label}: ${h.opens}–${h.closes} Uhr`), `${label} ${h.opens}–${h.closes} is not in the capture for ${city}`);
    }
    // Osnabrueck opens Tuesday to Friday, Oldenburg Monday to Friday: Monday only where the capture says so
    assert.equal(s.openingHoursSpecification.some((h) => [].concat(h.dayOfWeek).includes('Monday')), city === 'Oldenburg');
  }
});

test('Organization: brands and e-mail are the captured ones, no invented profile data', { skip: !built && 'dist/ is not built' }, () => {
  const org = graphOf('')?.find((n) => n['@type'] === 'Organization');
  // every brand has a captured brand page of its own (capture/text/marke__<brand>.txt)
  for (const b of org.brand) assert.ok(fs.existsSync(path.join(ROOT, 'capture/text', `marke__${b.name.toLowerCase()}.txt`)), `${b.name} is not a captured brand`);
  assert.equal(org.brand.length, 7);
  assert.ok(cap('impressum').includes(org.email));
  for (const k of ['sameAs', 'aggregateRating', 'geo', 'telephone', 'address']) assert.ok(!(k in org), `Organization has ${k}`);
});
