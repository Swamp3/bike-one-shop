import { bodyField, clientIp, createRateLimiter } from "../rate-limit"

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
  afterEach(() => {
    delete process.env.TRUST_CF_CONNECTING_IP
  })
  it("uses the socket/proxy address and ignores forgeable headers by default", () => {
    expect(clientIp(req({ "cf-connecting-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" }, "10.0.0.5"))).toBe("10.0.0.5")
  })
  it("uses CF-Connecting-IP only when explicitly trusted", () => {
    process.env.TRUST_CF_CONNECTING_IP = "true"
    expect(clientIp(req({ "cf-connecting-ip": "1.2.3.4" }, "127.0.0.1"))).toBe("1.2.3.4")
    expect(clientIp(req({}, "127.0.0.1"))).toBe("127.0.0.1")
  })
})

describe("bodyField", () => {
  it("returns the trimmed, lower-cased field or undefined", () => {
    expect(bodyField("email")({ body: { email: " Erika@Example.com " } } as never)).toBe("erika@example.com")
    expect(bodyField("email")({ body: {} } as never)).toBeUndefined()
  })
})
