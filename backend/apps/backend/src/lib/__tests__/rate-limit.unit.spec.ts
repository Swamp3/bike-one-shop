import { clientIp, createRateLimiter } from "../rate-limit"

describe("createRateLimiter", () => {
  it("allows up to the limit per key and window, then reports when to retry", () => {
    const limiter = createRateLimiter(3, 60_000)
    expect([0, 1000, 2000].map((t) => limiter.check("a", t).allowed)).toEqual([true, true, true])
    const blocked = limiter.check("a", 3000)
    expect(blocked).toEqual({ allowed: false, retryAfterSec: 57 })
    expect(limiter.check("b", 3000).allowed).toBe(true) // other visitor
    expect(limiter.check("a", 60_001).allowed).toBe(true) // window passed
  })
})

describe("clientIp", () => {
  const req = (headers: Record<string, string>, ip?: string) => ({ headers, ip }) as never
  it("prefers Cloudflare's header, then X-Forwarded-For, then the socket address", () => {
    expect(clientIp(req({ "cf-connecting-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" }, "127.0.0.1"))).toBe("1.2.3.4")
    expect(clientIp(req({ "x-forwarded-for": "5.6.7.8, 10.0.0.1" }, "127.0.0.1"))).toBe("5.6.7.8")
    expect(clientIp(req({}, "127.0.0.1"))).toBe("127.0.0.1")
  })
})
