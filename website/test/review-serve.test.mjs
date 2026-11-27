import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { handler } from '../scripts/review-serve.mjs';

// the review server must behave like Cloudflare Pages for the hero video: byte ranges (206) and Content-Type rules of _headers
test('review server answers ranges and applies a Content-Type rule of _headers', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'review-serve-'));
  fs.mkdirSync(path.join(dir, 'dist'));
  fs.writeFileSync(path.join(dir, 'dist', 'clip.bin'), Buffer.from('0123456789'));
  fs.writeFileSync(path.join(dir, 'dist', 'rules.json'), '{}');
  fs.writeFileSync(path.join(dir, 'dist', '_headers'), '/*\n  X-Test: 1\n\n/rules.json\n  Content-Type: application/speculationrules+json\n');
  const server = http.createServer(handler({ dir }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const part = await fetch(`${base}/clip.bin`, { headers: { Range: 'bytes=2-5' } });
    assert.equal(part.status, 206);
    assert.equal(part.headers.get('content-range'), 'bytes 2-5/10');
    assert.equal(await part.text(), '2345');
    const open = await fetch(`${base}/clip.bin`, { headers: { Range: 'bytes=7-' } });
    assert.equal(await open.text(), '789');
    const tail = await fetch(`${base}/clip.bin`, { headers: { Range: 'bytes=-3' } });
    assert.equal(await tail.text(), '789');
    assert.equal((await fetch(`${base}/clip.bin`, { headers: { Range: 'bytes=20-' } })).status, 416);
    const whole = await fetch(`${base}/clip.bin`);
    assert.equal(whole.status, 200);
    assert.equal(whole.headers.get('accept-ranges'), 'bytes');
    assert.equal((await fetch(`${base}/rules.json`)).headers.get('content-type'), 'application/speculationrules+json');
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true });
  }
});
