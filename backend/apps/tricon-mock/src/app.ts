import { createHash, randomBytes, timingSafeEqual } from "node:crypto"
import formbody from "@fastify/formbody"
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify"
import {
  ActionError,
  resetToSeed,
  setOrderState,
  updateItem,
  updateSettings,
  updateStock,
} from "./actions.ts"
import { buildSeedState, loadCatalog } from "./seed-data.ts"
import { DEFAULT_GUID, handleSoap } from "./soap.ts"
import { Store, mengeVerfuegbar } from "./state.ts"
import {
  renderError,
  renderItems,
  renderOrder,
  renderOrders,
  renderOverview,
  renderRequests,
  renderStock,
} from "./ui.ts"
import { buildWsdl } from "./wsdl.ts"

export type AppConfig = {
  statePath: string
  catalogPath: string
  guid?: string
  uiUser?: string
  uiPassword?: string
  logger?: boolean
  /** Listen port, used for the default host allowlist. */
  port?: number
  /** Allowed `host[:port]` values for Host / Origin / Referer (TRICON_MOCK_ALLOWED_HOSTS). */
  allowedHosts?: string[]
  /** Test hook to skip real waiting for the delay setting. */
  sleep?: (ms: number) => Promise<void>
}

const SOAP_CONTENT_TYPES = ["text/xml", "application/soap+xml", "application/xml"]

function digest(value: string) {
  return createHash("sha256").update(value).digest()
}

/** Constant-time comparison (hash both sides so lengths match). */
function safeEqual(a: string, b: string) {
  return timingSafeEqual(digest(a), digest(b))
}

function isFormPost(request: FastifyRequest) {
  return (request.headers["content-type"] ?? "").startsWith("application/x-www-form-urlencoded")
}

const CSP = [
  "default-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "img-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
].join("; ")

/** Replaces the inline handlers (blocked by the CSP): confirm prompts and auto-submitting selects. */
const UI_SCRIPT = `document.addEventListener("submit", function (event) {
  var message = event.target.getAttribute("data-confirm")
  if (message && !window.confirm(message)) { event.preventDefault() }
})
document.addEventListener("change", function (event) {
  if (event.target.hasAttribute("data-autosubmit")) { event.target.form.submit() }
})
`

/** Lowercased `host[:port]` with default ports dropped, so "localhost:80" == "localhost". */
export function normalizeHost(value: string): string {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) {
    return ""
  }
  try {
    return new URL(`http://${trimmed}`).host
  } catch {
    return ""
  }
}

function urlHost(value: string): string {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:" ? url.host.toLowerCase() : ""
  } catch {
    return ""
  }
}

/** Only same-site relative paths, to avoid open redirects. */
function safeRedirect(value: unknown, fallback: string) {
  const target = typeof value === "string" ? value : ""
  return target.startsWith("/") && !target.startsWith("//") && !target.includes("\\")
    ? target
    : fallback
}

export function buildApp(config: AppConfig) {
  const guid = config.guid || DEFAULT_GUID
  const authEnabled = Boolean(config.uiUser && config.uiPassword)
  const csrfToken = randomBytes(32).toString("hex")
  const allowedHosts = new Set(
    (config.allowedHosts?.length
      ? config.allowedHosts
      : [`127.0.0.1:${config.port ?? 3001}`, `localhost:${config.port ?? 3001}`]
    )
      .map(normalizeHost)
      .filter(Boolean)
  )
  const store = Store.open(config.statePath, () => buildSeedState(loadCatalog(config.catalogPath)))

  const app = Fastify({ logger: config.logger ?? false, bodyLimit: 2 * 1024 * 1024 })
  app.register(formbody)

  app.addContentTypeParser(
    SOAP_CONTENT_TYPES,
    { parseAs: "string" },
    (_request, body, done) => done(null, body)
  )

  // Host allowlist (DNS rebinding), basic auth, then origin + CSRF checks for mutations.
  // /soap is protected by IdentifyGuid only (keep it on loopback), /health is open.
  app.addHook("onRequest", async (request, reply) => {
    const pathname = request.url.split("?")[0]
    if (pathname === "/soap") {
      return
    }
    if (pathname === "/health") {
      return
    }
    if (!allowedHosts.has(normalizeHost(request.headers.host ?? ""))) {
      reply.code(421).send("Host not allowed (see TRICON_MOCK_ALLOWED_HOSTS)")
      return reply
    }
    if (authEnabled) {
      const header = request.headers.authorization ?? ""
      const match = /^Basic\s+(.+)$/i.exec(header)
      const decoded = match ? Buffer.from(match[1], "base64").toString("utf8") : ""
      const sep = decoded.indexOf(":")
      const user = sep >= 0 ? decoded.slice(0, sep) : ""
      const password = sep >= 0 ? decoded.slice(sep + 1) : ""
      const userOk = safeEqual(user, config.uiUser ?? "")
      const passwordOk = safeEqual(password, config.uiPassword ?? "")
      if (!(userOk && passwordOk)) {
        reply
          .code(401)
          .header("WWW-Authenticate", "Basic realm=\"TriCon Mock\", charset=\"UTF-8\"")
          .send("Authentication required")
        return reply
      }
    }
    // Cross-site requests would carry basic-auth credentials: every mutation must
    // name an allowed Origin (or, without one, Referer). `Origin: null` and
    // requests with neither header are rejected.
    if (request.method !== "GET" && request.method !== "HEAD") {
      const source = request.headers.origin ?? request.headers.referer
      if (!source || source === "null" || !allowedHosts.has(urlHost(source))) {
        reply.code(403).send("Cross-origin or origin-less request rejected")
        return reply
      }
    }
  })

  // Mutations accept JSON (needs a CORS preflight cross-site) or form posts carrying the CSRF token.
  app.addHook("preHandler", async (request, reply) => {
    if (request.method === "GET" || request.method === "HEAD" || request.url.split("?")[0] === "/soap") {
      return
    }
    const contentType = request.headers["content-type"] ?? ""
    if (contentType.startsWith("application/json")) {
      return
    }
    const body = (request.body ?? {}) as Record<string, unknown>
    const token = isFormPost(request) && typeof body.csrf === "string" ? body.csrf : ""
    if (!safeEqual(token, csrfToken)) {
      reply.code(403).send("Missing or invalid CSRF token")
      return reply
    }
  })

  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("X-Content-Type-Options", "nosniff")
    reply.header("X-Frame-Options", "DENY")
    reply.header("Referrer-Policy", "same-origin")
    reply.header("Content-Security-Policy", CSP)
    return payload
  })

  app.get("/ui.js", async (_request, reply) =>
    reply.type("text/javascript; charset=utf-8").send(UI_SCRIPT)
  )

  const html = (reply: FastifyReply, body: string, status = 200) =>
    reply.code(status).type("text/html; charset=utf-8").send(body)

  /** Runs a mutating action; form posts redirect back, JSON clients get JSON. */
  const mutate = async (
    request: FastifyRequest,
    reply: FastifyReply,
    fallback: string,
    run: (input: Record<string, unknown>) => unknown
  ) => {
    const input = (request.body ?? {}) as Record<string, unknown>
    try {
      const result = run(typeof input === "object" ? input : {})
      if (isFormPost(request)) {
        return reply.redirect(safeRedirect(input.redirect, fallback), 303)
      }
      return reply.send(result)
    } catch (error) {
      const status = error instanceof ActionError ? error.status : 500
      const message = (error as Error).message
      if (isFormPost(request)) {
        return html(reply, renderError(status, message), status)
      }
      return reply.code(status).send({ error: message })
    }
  }

  // --- SOAP -----------------------------------------------------------------

  app.post("/soap", async (request, reply) => {
    const raw = typeof request.body === "string" ? request.body : ""
    const outcome = await handleSoap(store, raw, { guid, sleep: config.sleep })
    return reply.code(outcome.httpStatus).type(outcome.contentType).send(outcome.body)
  })

  app.get("/soap", async (request, reply) => {
    const query = request.url.split("?")[1] ?? ""
    if (query.toLowerCase().split("&").includes("wsdl")) {
      const url = `${request.protocol}://${request.headers.host ?? "localhost"}/soap`
      return reply.type("text/xml; charset=utf-8").send(buildWsdl(url))
    }
    return reply.code(405).type("text/plain").send("POST a SOAP envelope, or GET /soap?wsdl")
  })

  app.get("/health", async () => ({ ok: true, seededAt: store.state.seededAt }))

  // --- JSON API -----------------------------------------------------------------

  app.get("/api/items", async () =>
    store.state.artikel.map((a) => ({
      ...a,
      kombis: store.state.grfaKombi.filter((k) => k.Artikel === a.ArtikelID),
    }))
  )
  app.post<{ Params: { id: string } }>("/api/items/:id", async (request, reply) =>
    mutate(request, reply, "/items", (input) => updateItem(store, request.params.id, input))
  )

  app.get("/api/stock", async () => ({
    stockBranch: store.state.stockBranch.map((r) => ({ ...r, MengeVerfuegbar: mengeVerfuegbar(r) })),
    stockColorSizeBranch: store.state.stockColorSizeBranch.map((r) => ({
      ...r,
      MengeVerfuegbar: mengeVerfuegbar(r),
    })),
  }))
  app.post<{ Params: { id: string } }>("/api/stock/:id", async (request, reply) =>
    mutate(request, reply, "/stock", (input) => updateStock(store, request.params.id, input))
  )

  app.get("/api/orders", async () => store.state.orders)
  app.get<{ Params: { id: string } }>("/api/orders/:id", async (request, reply) => {
    const order = store.findOrder(Number(request.params.id))
    return order ? order : reply.code(404).send({ error: "Order not found" })
  })
  app.post<{ Params: { id: string } }>("/api/orders/:id/state", async (request, reply) =>
    mutate(request, reply, `/orders/${Number(request.params.id)}`, (input) =>
      setOrderState(store, Number(request.params.id), input)
    )
  )

  app.get<{ Querystring: { fn?: string; limit?: string } }>("/api/requests", async (request) => {
    const fn = request.query.fn ?? ""
    const limit = Math.min(Number(request.query.limit) || 200, 2000)
    return store.state.requestLog
      .filter((r) => !fn || r.function === fn)
      .slice(-limit)
      .reverse()
  })

  app.get("/api/settings", async () => store.state.settings)
  app.post("/api/settings", async (request, reply) =>
    mutate(request, reply, "/", (input) => updateSettings(store, input))
  )
  app.post("/api/reset", async (request, reply) =>
    mutate(request, reply, "/", () => resetToSeed(store, config.catalogPath))
  )

  // --- HTML UI ------------------------------------------------------------------

  app.get("/", async (request, reply) =>
    html(
      reply,
      renderOverview(store, {
        guid,
        soapUrl: `${request.protocol}://${request.headers.host ?? "localhost"}/soap`,
        authEnabled,
        catalogPath: config.catalogPath,
        csrf: csrfToken,
      })
    )
  )
  app.get("/items", async (_request, reply) => html(reply, renderItems(store, csrfToken)))
  app.get<{ Querystring: { q?: string } }>("/stock", async (request, reply) =>
    html(reply, renderStock(store, request.query.q ?? "", csrfToken))
  )
  app.get("/orders", async (_request, reply) => html(reply, renderOrders(store)))
  app.get<{ Params: { id: string } }>("/orders/:id", async (request, reply) => {
    const order = store.findOrder(Number(request.params.id))
    return order
      ? html(reply, renderOrder(order, csrfToken))
      : html(reply, renderError(404, "Order not found"), 404)
  })
  app.get<{ Querystring: { fn?: string } }>("/requests", async (request, reply) =>
    html(reply, renderRequests(store, request.query.fn ?? ""))
  )

  return { app, store }
}
