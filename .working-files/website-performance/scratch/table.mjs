// Markdown before/after table from perf3 results. usage: node table.mjs before.json[,before2.json] after.json
import fs from 'node:fs';
const load = (list) => list.split(',').flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const before = load(process.argv[2]), after = load(process.argv[3]);
const name = (u) => (u === '/' ? 'home' : u.startsWith('/fahrrad') ? 'post (leasing)' : u);
const key = (r) => `${r.width}|${r.url}|${r.th}`;
const map = new Map(before.map((r) => [key(r), r]));
console.log('| page | width | line | LCP ms before | after | CLS b/a | requests before load b/a | KB before load b/a | video after load |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const a of after) {
  const b = map.get(key(a));
  const v = a.video.map((x) => x.map((y) => `${y.file} ${(y.bytes / 1048576).toFixed(2)} MiB at +${y.startAfterLoadMs} ms`).join(', ') || 'none');
  console.log(`| ${name(a.url)} | ${a.width} | ${a.th} | ${b?.lcp ?? '-'} | ${a.lcp} | ${b?.cls ?? '-'}/${a.cls} | ${b?.preReq ?? '-'}/${a.preReq} | ${b?.preKB ?? '-'}/${a.preKB} | ${[...new Set(v)].join(' ; ')} |`);
}
