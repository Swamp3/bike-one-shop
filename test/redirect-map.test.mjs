import test from 'node:test';
import assert from 'node:assert/strict';
import { destination, SHOP } from '../tools/redirect-map.mjs';
import { buildRows, readCaptured, stillBuilt, toCsv } from '../tools/redirects-build.mjs';

test('destination follows the IA table', () => {
  assert.equal(destination('/product/trek-checkpoint-carbon/'), SHOP);
  assert.equal(destination('/portfolio/portfolio-name-4/'), '/');
  assert.equal(destination('/main-bike/'), '/service/');
  assert.equal(destination('/author/marvin/'), '/blog/');
  assert.equal(destination('/ueber-uns/'), null);
});

test('no redirect row for a page that is still built; none for a native page', () => {
  const rows = buildRows(readCaptured());
  const froms = new Set(rows.map((r) => r.from));
  assert.ok(stillBuilt('/main-bike/') && !froms.has('/main-bike/'));
  assert.ok(froms.has('/product/*') && froms.has('/shop/'));
  assert.ok(!froms.has('/portfolio/*'), 'the demo pages are still built, so the prefix rule waits');
});

test('the generator is stable: captured rows in, same rows out', () => {
  assert.equal(toCsv(buildRows(readCaptured())), toCsv(buildRows(readCaptured())));
});
