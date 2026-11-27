// Tiny static server with Range support for the scratch media folder (port 4400). Logs each request (range, bytes sent).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const DIR = path.resolve(process.argv[2] || 'media');
const PORT = +(process.argv[3] || 4400);
const log = [];
const types = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.avif': 'image/avif', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.css': 'text/css', '.woff2': 'font/woff2', '.js': 'text/javascript' };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/__log') { res.end(JSON.stringify(log.splice(0))); return; }
  let rel = decodeURIComponent(u.pathname); if (rel.endsWith('/')) rel += 'index.html';
  const f = path.join(DIR, rel);
  if (!f.startsWith(DIR) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.statusCode = 404; res.end('nf'); return; }
  const size = fs.statSync(f).size; const range = req.headers.range;
  const h = { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
  let s = 0, e = size - 1, code = 200;
  if (range && /^bytes=\d*-\d*$/.test(range)) { const [a, b] = range.slice(6).split('-'); s = a ? +a : size - +b; e = b && a ? Math.min(+b, size - 1) : size - 1; code = 206; h['Content-Range'] = `bytes ${s}-${e}/${size}`; }
  h['Content-Length'] = e - s + 1;
  log.push({ t: Date.now(), path: u.pathname, range: range || null, status: code, bytes: e - s + 1 });
  res.writeHead(code, h);
  fs.createReadStream(f, { start: s, end: e }).pipe(res);
}).listen(PORT, '127.0.0.1');
