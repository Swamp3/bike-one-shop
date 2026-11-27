import fs from 'node:fs';
const { rows } = JSON.parse(fs.readFileSync('images.json','utf8'));
const short = (u) => u.replace(/^.*\/_astro\//,'').replace(/^.*\//,'');
for (const url of [...new Set(rows.map(r=>r.url))]) {
  const rs = rows.filter(r=>r.url===url);
  const ids = [...new Set(rs.map(r=>r.alt?.slice(0,25)+'|'+r.cls))];
  console.log('\n##', url.slice(0,60));
  for (const r of rs) console.log(r.width+'@'+r.dpr, short(r.cur).padEnd(34), r.ext, 'nat', r.nat+'x'+r.natH, 'rend', r.w+'x'+r.h, 'top', r.top, r.top<r.vh?'ATF':'btf', r.loading, r.fp, r.dec, 'wh='+r.wa+'x'+r.ha, r.bytes);
}
