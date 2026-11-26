import test from 'node:test';
import assert from 'node:assert/strict';
import { destination, SHOP } from '../tools/redirect-map.mjs';
import { buildRows, readCaptured, toCsv } from '../tools/redirects-build.mjs';

test('destination follows the IA table', () => {
  assert.equal(destination('/product/trek-checkpoint-carbon/'), SHOP);
  assert.equal(destination('/portfolio/portfolio-name-4/'), '/');
  assert.equal(destination('/main-bike/'), '/service/');
  assert.equal(destination('/author/marvin/'), '/blog/');
  assert.equal(destination('/ueber-uns/'), null);
});

test('rows for the old URLs that moved, none for a native page', () => {
  const froms = new Set(buildRows(readCaptured()).map((r) => r.from));
  assert.ok(froms.has('/main-bike/') && froms.has('/Marke/trek/') && froms.has('/Marke/trek/feed/') && froms.has('/comments/feed/'));
  assert.ok(froms.has('/product/*') && froms.has('/shop/') && froms.has('/portfolio/*') && froms.has('/author/*'));
  for (const native of ['/', '/blog/', '/service/', '/termin-buchen/', '/stellenangebote/', '/feed/']) assert.ok(!froms.has(native), native);
});

test('brand pages and shop shells go to the shop, demo pages to the home page, feeds to the blog feed', () => {
  assert.equal(destination('/Marke/wilier/'), SHOP);
  assert.equal(destination('/ebikes/'), SHOP);
  assert.equal(destination('/team-member/john-bennett/'), '/');
  assert.equal(destination('/Marke/trek/feed/'), '/feed/');
  assert.equal(destination('/category/allgemein/feed/'), '/blog/');
  assert.equal(destination('/wp-sitemap.xml'), '/sitemap-index.xml');
});

test('the generator is stable: captured rows in, same rows out', () => {
  assert.equal(toCsv(buildRows(readCaptured())), toCsv(buildRows(readCaptured())));
});
