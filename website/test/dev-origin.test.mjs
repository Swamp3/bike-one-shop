import test from 'node:test';
import assert from 'node:assert/strict';
import { rewrite } from '../tools/dev-origin.mjs';

test('rewrites every origin form, leaves other hosts alone', () => {
  const o = 'https://bike-one.dev';
  assert.equal(rewrite('<a href="https://bike-one.org/x/">', o), '<a href="https://bike-one.dev/x/">');
  assert.equal(rewrite('http://www.bike-one.org/x', o), 'https://bike-one.dev/x');
  assert.equal(rewrite('//bike-one.org/x', o), 'https://bike-one.dev/x');
  assert.equal(rewrite('"https:\\/\\/bike-one.org\\/x"', o), '"https:\\/\\/bike-one.dev\\/x"');
  assert.equal(rewrite('url=https%3A%2F%2Fbike-one.org%2F', o), 'url=https%3A%2F%2Fbike-one.dev%2F');
  assert.equal(rewrite('https://shop.bike-one.org/ info@bike-one.org', o), 'https://shop.bike-one.org/ info@bike-one.org');
  assert.equal(rewrite('https://bike-one.dev/ https://bikeone.cvires.at/', o), 'https://bike-one.dev/ https://bikeone.cvires.at/');
});
