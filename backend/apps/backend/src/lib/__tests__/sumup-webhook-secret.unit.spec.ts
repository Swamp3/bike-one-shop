import { verifySumupWebhookSecret } from "../sumup-webhook-secret"

const SECRET = "s3cret-value-for-tests-0123456789abcdef"

const run = (query: Record<string, unknown>) => {
  const res = { sendStatus: jest.fn() }
  const next = jest.fn()
  verifySumupWebhookSecret({ query } as never, res as never, next)
  return { res, next }
}

describe("verifySumupWebhookSecret", () => {
  const original = process.env.SUMUP_WEBHOOK_SECRET
  beforeEach(() => {
    process.env.SUMUP_WEBHOOK_SECRET = SECRET
  })
  afterAll(() => {
    if (original === undefined) delete process.env.SUMUP_WEBHOOK_SECRET
    else process.env.SUMUP_WEBHOOK_SECRET = original
  })

  it("rejects a missing secret", () => {
    const { res, next } = run({})
    expect(res.sendStatus).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it("rejects a wrong secret of a different length", () => {
    const { res, next } = run({ wh_secret: "nope" })
    expect(res.sendStatus).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it("rejects a wrong secret of equal length", () => {
    const { res, next } = run({ wh_secret: "X".repeat(SECRET.length) })
    expect(res.sendStatus).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it("rejects an array-valued secret (repeated query parameter)", () => {
    const { res, next } = run({ wh_secret: [SECRET, SECRET] })
    expect(res.sendStatus).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it("accepts the right secret", () => {
    const { res, next } = run({ wh_secret: SECRET })
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.sendStatus).not.toHaveBeenCalled()
  })

  it("fails closed when SUMUP_WEBHOOK_SECRET is unset, even for an empty secret", () => {
    delete process.env.SUMUP_WEBHOOK_SECRET
    for (const query of [{}, { wh_secret: "" }]) {
      const { res, next } = run(query)
      expect(res.sendStatus).toHaveBeenCalledWith(401)
      expect(next).not.toHaveBeenCalled()
    }
  })
})
