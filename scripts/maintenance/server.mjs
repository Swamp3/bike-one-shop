// Answers every request on one port with the maintenance page (HTTP 503).
// Usage: node server.mjs <port>. Started by scripts/deploy.sh while it builds.
import http from "node:http"
import { readFileSync } from "node:fs"

const html = readFileSync(new URL("./maintenance.html", import.meta.url))
const port = Number(process.argv[2])
if (!port) throw new Error("usage: node server.mjs <port>")

http
  .createServer((req, res) => {
    res.writeHead(503, {
      "content-type": "text/html; charset=utf-8",
      "retry-after": "120",
      "cache-control": "no-store",
    })
    res.end(req.method === "HEAD" ? undefined : html)
  })
  .listen(port)
