import { headers } from "next/headers"

/**
 * Per-visitor limits for the auth server actions. The backend sees only this
 * server's address for these calls, so the visitor is identified here.
 * Sliding window in memory (shortcut: one storefront process; use Redis if it
 * ever scales out). The same limits belong at the edge (REVIEW_TASKS.md).
 */
const buckets = new Map<string, number[]>()

/** The visitor's address: Cloudflare's header, else the first proxy entry. */
export const visitorIp = async () => {
  const h = await headers()
  return (
    h.get("cf-connecting-ip")?.trim() ||
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    h.get("x-real-ip")?.trim() ||
    "unknown"
  )
}

/** True when this visitor may do `name` now (and counts the attempt). */
export const allowAttempt = async (name: string, limit: number, windowMs = 60_000) => {
  const key = `${name}:${await visitorIp()}`
  const now = Date.now()
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= limit) {
    buckets.set(key, recent)
    return false
  }
  recent.push(now)
  buckets.set(key, recent)
  if (buckets.size > 10_000) {
    buckets.forEach((times, k) => {
      if (now - times[times.length - 1] >= windowMs) buckets.delete(k)
    })
  }
  return true
}

export const TOO_MANY_ATTEMPTS = "Zu viele Versuche. Bitte warte eine Minute und versuche es noch einmal."
