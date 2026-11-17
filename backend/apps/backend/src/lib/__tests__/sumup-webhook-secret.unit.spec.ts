import { sumupWebhookUrl, verifySumupWebhookSecret } from "../sumup-webhook-secret"

const SECRET = "s3cret-value-for-tests-0123456789abcdef"
const BASE = "https://api.example.test/hooks/payment/sumup_sumup"

const tokenOf = (ref: string) => new URL(sumupWebhookUrl(BASE, ref)).searchParams.get("wh_token")!

const run = (query: Record<string, unknown>) => {
  const res = { sendStatus: jest.fn() }
  const next = jest.fn()
  verifySumupWebhookSecret({ query } as never, res as never, next)
  return { res, next }
}

describe("per-session SumUp webhook token", () => {
  const original = process.env.SUMUP_WEBHOOK_SECRET
  beforeEach(() => {
    process.env.SUMUP_WEBHOOK_SECRET = SECRET
  })
  afterAll(() => {
    if (original === undefined) delete process.env.SUMUP_WEBHOOK_SECRET
    else process.env.SUMUP_WEBHOOK_SECRET = original
  })

  it("never puts the secret into the URL, and the token differs per session", () => {
    const url = sumupWebhookUrl(BASE, "ps_1")
    expect(url.startsWith(`${BASE}?ref=ps_1&wh_token=`)).toBe(true)
    expect(url).not.toContain(SECRET)
    expect(tokenOf("ps_1")).not.toBe(tokenOf("ps_2"))
  })

  it("refuses to build a URL without a secret", () => {
    delete process.env.SUMUP_WEBHOOK_SECRET
    expect(() => sumupWebhookUrl(BASE, "ps_1")).toThrow()
  })

  it("accepts the token for its own session", () => {
    const { res, next } = run({ ref: "ps_1", wh_token: tokenOf("ps_1") })
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.sendStatus).not.toHaveBeenCalled()
  })

  it("rejects the token of another session", () => {
    const { res, next } = run({ ref: "ps_2", wh_token: tokenOf("ps_1") })
    expect(res.sendStatus).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it("rejects the raw shared secret, missing, wrong-length, equal-length and array values", () => {
    const equalLength = "X".repeat(tokenOf("ps_1").length)
    for (const query of [
      {},
      { ref: "ps_1" },
      { wh_token: tokenOf("ps_1") },
      { ref: "ps_1", wh_secret: SECRET },
      { ref: "ps_1", wh_token: SECRET },
      { ref: "ps_1", wh_token: "nope" },
      { ref: "ps_1", wh_token: equalLength },
      { ref: "ps_1", wh_token: [tokenOf("ps_1"), tokenOf("ps_1")] },
      { ref: ["ps_1", "ps_1"], wh_token: tokenOf("ps_1") },
    ]) {
      const { res, next } = run(query)
      expect(res.sendStatus).toHaveBeenCalledWith(401)
      expect(next).not.toHaveBeenCalled()
    }
  })

  it("fails closed when SUMUP_WEBHOOK_SECRET is unset", () => {
    const token = tokenOf("ps_1")
    delete process.env.SUMUP_WEBHOOK_SECRET
    for (const query of [{}, { ref: "ps_1", wh_token: "" }, { ref: "ps_1", wh_token: token }]) {
      const { res, next } = run(query)
      expect(res.sendStatus).toHaveBeenCalledWith(401)
      expect(next).not.toHaveBeenCalled()
    }
  })
})
