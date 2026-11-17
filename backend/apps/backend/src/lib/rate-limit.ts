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
  return {
    check(key: string, now = Date.now()): { allowed: boolean; retryAfterSec: number } {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
      if (recent.length >= limit) {
        hits.set(key, recent)
        return { allowed: false, retryAfterSec: Math.ceil((recent[0] + windowMs - now) / 1000) }
      }
      recent.push(now)
      hits.set(key, recent)
      if (hits.size > 10_000) {
        for (const [k, times] of hits) {
          if (now - times[times.length - 1] >= windowMs) hits.delete(k)
        }
      }
      return { allowed: true, retryAfterSec: 0 }
    },
  }
}

/**
 * The visitor's address. Behind Cloudflare (tunnel or proxy) that is
 * `CF-Connecting-IP`; behind another proxy the first `X-Forwarded-For` entry.
 * Only trustworthy while the backend port is reachable through the proxy
 * alone (firewall: REVIEW_TASKS.md), otherwise a caller can set these headers.
 */
export function clientIp(req: Pick<MedusaRequest, "headers" | "ip">): string {
  const header = (name: string) => {
    const value = req.headers[name]
    return (Array.isArray(value) ? value[0] : value)?.split(",")[0].trim()
  }
  return header("cf-connecting-ip") || header("x-forwarded-for") || req.ip || "unknown"
}

/** Express-style middleware: more than `limit` calls per `windowMs` from one address get 429. */
export function rateLimit(name: string, limit: number, windowMs = 60_000) {
  const limiter = createRateLimiter(limit, windowMs)
  return (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    const result = limiter.check(`${name}:${clientIp(req)}`)
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
