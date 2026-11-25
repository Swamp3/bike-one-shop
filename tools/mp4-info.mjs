// Reads the top-level atoms of an MP4 and the sample entry of its first video track: the codec (avc1 = H.264,
// hvc1/hev1 = HEVC), whether moov comes before mdat (faststart), the size, the dimensions and whether it has audio.
// Usage: node tools/mp4-info.mjs file.mp4. No dependency, only the head of each box is read.
import fs from 'node:fs';

function boxes(buf, start, end) {
  const out = [];
  for (let p = start; p + 8 <= end;) {
    let size = buf.readUInt32BE(p);
    const type = buf.toString('latin1', p + 4, p + 8);
    let head = 8;
    if (size === 1) { size = Number(buf.readBigUInt64BE(p + 8)); head = 16; } else if (size === 0) size = end - p;
    if (size < head) break;
    out.push({ type, start: p, size, body: p + head, end: Math.min(p + size, end) });
    p += size;
  }
  return out;
}

export function info(file) {
  const fd = fs.openSync(file, 'r');
  const size = fs.fstatSync(fd).size;
  const top = [];
  const head = Buffer.alloc(16);
  for (let p = 0; p + 8 <= size;) {
    fs.readSync(fd, head, 0, 16, p);
    let s = head.readUInt32BE(0);
    if (s === 1) s = Number(head.readBigUInt64BE(8)); else if (s === 0) s = size - p;
    top.push({ type: head.toString('latin1', 4, 8), start: p, size: s });
    if (s < 8) break;
    p += s;
  }
  const moov = top.find((b) => b.type === 'moov');
  const mdat = top.find((b) => b.type === 'mdat');
  const buf = Buffer.alloc(moov.size);
  fs.readSync(fd, buf, 0, moov.size, moov.start);
  fs.closeSync(fd);
  const tracks = boxes(buf, 8, buf.length).filter((b) => b.type === 'trak').map((trak) => {
    const dive = (b, path) => path.length ? boxes(buf, b.body, b.end).filter((c) => c.type === path[0]).flatMap((c) => dive(c, path.slice(1))) : [b];
    const hdlr = dive(trak, ['mdia', 'hdlr'])[0];
    const handler = hdlr ? buf.toString('latin1', hdlr.body + 8, hdlr.body + 12) : '?';
    const stsd = dive(trak, ['mdia', 'minf', 'stbl', 'stsd'])[0];
    const entry = stsd ? buf.toString('latin1', stsd.body + 12, stsd.body + 16) : '?';
    const tkhd = dive(trak, ['tkhd'])[0];
    const version = tkhd ? buf[tkhd.body] : 0;
    const w = tkhd ? buf.readUInt32BE(tkhd.end - 8) >>> 16 : 0;
    const h = tkhd ? buf.readUInt32BE(tkhd.end - 4) >>> 16 : 0;
    return { handler, codec: entry, width: w, height: h, version };
  });
  return { size, atoms: top.map((b) => b.type), faststart: moov.start < mdat.start, tracks };
}

if (process.argv[1]?.endsWith('mp4-info.mjs')) {
  const r = info(process.argv[2]);
  console.log(`${process.argv[2]}: ${(r.size / 1048576).toFixed(2)} MiB, atoms ${r.atoms.join(' ')}, faststart ${r.faststart}`);
  for (const t of r.tracks) console.log(`  ${t.handler} ${t.codec} ${t.width}x${t.height}`);
}
