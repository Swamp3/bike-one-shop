import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

/**
 * Sliding-window counter per key. Pure (the clock is a parameter), so it is
 * unit-tested. shortcut: in memory, which is right for the single backend
 * process (REVIEW_TASKS.md); use Redis if the backend ever runs more than one.
 * The reverse proxy / Cloudflare should still carry the same limits.
 */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>()
  let lastSweep = 0
  return {
    check(key: string, now = Date.now()): { allowed: boolean; retryAfterSec: number } {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
      if (recent.length >= limit) {
        hits.set(key, recent)
        return { allowed: false, retryAfterSec: Math.ceil((recent[0] + windowMs - now) / 1000) }
      }
      recent.push(now)
      hits.set(key, recent)
      // Drop idle keys at most once per window; with more than 50k keys in play
      // (spoofed addresses) refuse to track more and let the oldest go.
      if (hits.size > 10_000 && now - lastSweep >= windowMs) {
        lastSweep = now
        for (const [k, times] of hits) {
          if (now - times[times.length - 1] >= windowMs) hits.delete(k)
        }
      }
      if (hits.size > 50_000) {
        hits.delete(hits.keys().next().value as string)
      }
      return { allowed: true, retryAfterSec: 0 }
    },
  }
}

/**
 * The caller's address. `req.ip` is the proxy-added address (Express
 * `trust proxy 1`). Behind Cloudflare alone, TRUST_CF_CONNECTING_IP=true uses
 * `CF-Connecting-IP`; only set it when the backend port is reachable through
 * Cloudflare only (firewall), otherwise a caller can forge the header.
 * Auth calls made by the storefront server arrive from the storefront's own
 * address, so the storefront limits per visitor itself and the backend limits
 * per account (see api/middlewares.ts).
 */
export function clientIp(req: Pick<MedusaRequest, "headers" | "ip">): string {
  const cf = req.headers["cf-connecting-ip"]
  const cfValue = (Array.isArray(cf) ? cf[0] : cf)?.trim()
  if (process.env.TRUST_CF_CONNECTING_IP === "true" && cfValue) {
    return cfValue
  }
  return req.ip || "unknown"
}

/**
 * Express-style middleware: more than `limit` calls per `windowMs` for one key
 * get 429. The key defaults to the caller's address; pass `keyOf` to limit per
 * account (e-mail) or per auth identity instead.
 */
export function rateLimit(
  name: string,
  limit: number,
  windowMs = 60_000,
  keyOf: (req: MedusaRequest) => string | undefined = clientIp
) {
  const limiter = createRateLimiter(limit, windowMs)
  return (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    const result = limiter.check(`${name}:${keyOf(req) ?? clientIp(req)}`)
    if (!result.allowed) {
      res.setHeader("Retry-After", String(result.retryAfterSec))
      return res.status(429).json({
        type: "too_many_requests",
        message: "Too many attempts. Please wait a moment and try again.",
      })
    }
    return next()
  }
}

/** Lower-cased string field of the request body (an e-mail or identifier), for per-account limits. */
export const bodyField = (field: string) => (req: MedusaRequest) => {
  const value = (req.body as Record<string, unknown> | undefined)?.[field]
  return typeof value === "string" ? value.trim().toLowerCase() : undefined
}

/** The authenticated auth identity, for per-login limits after `authenticate`. */
export const authIdentity = (req: MedusaRequest) =>
  (req as { auth_context?: { auth_identity_id?: string } }).auth_context?.auth_identity_id
