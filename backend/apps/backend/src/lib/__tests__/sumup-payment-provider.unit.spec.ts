import SumupPaymentProvider from "../../modules/sumup-payment/service"

const SECRET = "s3cret-value-for-tests-0123456789abcdef"

const make = (createCheckout: jest.Mock, retrieveCheckout = jest.fn()) =>
  new (SumupPaymentProvider as any)(
    {},
    {
      apiKey: "k",
      merchantCode: "m",
      returnUrl: "https://api.example.test/hooks/payment/sumup_sumup",
      redirectUrl: "https://shop.example.test/api/payment-return/sumup",
      client: { createCheckout, retrieveCheckout, deactivateCheckout: jest.fn() },
    }
  )

const checkout = (over = {}) => ({
  id: "co_1",
  checkout_reference: "ps_1",
  amount: 50,
  currency: "EUR",
  merchant_code: "m",
  ...over,
})

describe("SumUp provider wrapper", () => {
  const original = process.env.SUMUP_WEBHOOK_SECRET
  beforeEach(() => {
    process.env.SUMUP_WEBHOOK_SECRET = SECRET
  })
  afterAll(() => {
    if (original === undefined) delete process.env.SUMUP_WEBHOOK_SECRET
    else process.env.SUMUP_WEBHOOK_SECRET = original
  })

  it("keeps the identifier, so the provider id stays pp_sumup_sumup", () => {
    expect((SumupPaymentProvider as any).identifier).toBe("sumup")
  })

  it("registers a per-session return_url without the secret and ignores shopper-supplied URLs", async () => {
    const createCheckout = jest.fn().mockResolvedValue(checkout())
    const out = await make(createCheckout).initiatePayment({
      amount: 50,
      currency_code: "eur",
      data: { session_id: "ps_1", return_url: "https://evil.test", redirect_url: "https://evil.test", checkout_reference: "x" },
    })
    const payload = createCheckout.mock.calls[0][0]
    expect(payload.checkout_reference).toBe("ps_1")
    expect(payload.return_url).toContain("ref=ps_1&wh_token=")
    expect(payload.return_url).not.toContain(SECRET)
    expect(payload.return_url).not.toContain("evil")
    expect(payload.redirect_url).toBe("https://shop.example.test/api/payment-return/sumup")
    expect(out.data.checkout_id).toBe("co_1")
  })

  it("refuses to create a checkout without a session id", async () => {
    const createCheckout = jest.fn()
    await expect(make(createCheckout).initiatePayment({ amount: 50, currency_code: "eur", data: {} })).rejects.toThrow()
    expect(createCheckout).not.toHaveBeenCalled()
  })

  it("a replacement checkout after an amount change keeps the session reference and gets the session URL", async () => {
    const createCheckout = jest.fn().mockResolvedValue(checkout({ id: "co_2", amount: 60 }))
    const retrieve = jest.fn().mockResolvedValue(checkout())
    await make(createCheckout, retrieve).updatePayment({
      amount: 60,
      currency_code: "eur",
      data: { checkout_id: "co_1", checkout_reference: "ps_1" },
    })
    const payload = createCheckout.mock.calls[0][0]
    expect(payload.checkout_reference).toBe("ps_1")
    expect(payload.return_url).toContain("ref=ps_1&wh_token=")
    expect(payload.return_url).not.toContain(SECRET)
  })

  const redirect = "https://shop.example.test/api/payment-return/sumup"

  it("keeps the storefront's redirect_url (with cart_id) only for the configured page", async () => {
    const good = `${redirect}?cart_id=cart_1&country_code=de`
    for (const [wanted, expected] of [
      [good, good],
      ["https://evil.test/api/payment-return/sumup?cart_id=1", redirect],
      ["https://shop.example.test/other", redirect],
      ["javascript:alert(1)", redirect],
      [undefined, redirect],
    ] as const) {
      const createCheckout = jest.fn().mockResolvedValue(checkout())
      await make(createCheckout).initiatePayment({
        amount: 50,
        currency_code: "eur",
        data: { session_id: "ps_1", redirect_url: wanted },
      })
      expect(createCheckout.mock.calls[0][0].redirect_url).toBe(expected)
    }
  })

  it("passes only allow-listed shopper data to the plugin", async () => {
    const createCheckout = jest.fn().mockResolvedValue(checkout())
    await make(createCheckout).initiatePayment({
      amount: 50,
      currency_code: "eur",
      data: { session_id: "ps_1", checkout_mode: "widget", description: "free text", merchant_code: "other" },
    })
    const payload = createCheckout.mock.calls[0][0]
    expect(payload.description).toBe("Medusa order payment")
    expect(payload.merchant_code).toBe("m")
    expect(payload.hosted_checkout).toBeUndefined() // checkout_mode widget was honoured
  })

  it("does not store a top-level return_url or shopper keys, but keeps redirect_url and the checkout", async () => {
    const createCheckout = jest.fn().mockResolvedValue(checkout())
    const good = `${redirect}?cart_id=cart_1&country_code=de`
    const out = await make(createCheckout).initiatePayment({
      amount: 50,
      currency_code: "eur",
      data: { session_id: "ps_1", redirect_url: good, junk: "x", return_url: "https://evil.test" },
    })
    expect(out.data).not.toHaveProperty("return_url")
    expect(out.data).not.toHaveProperty("junk")
    expect(out.data.redirect_url).toBeUndefined() // initiate returns plugin data only
    expect(out.data.checkout_id).toBe("co_1")

    const retrieve = jest.fn().mockResolvedValue(checkout())
    const upd = await make(createCheckout, retrieve).updatePayment({
      amount: 50,
      currency_code: "eur",
      data: { checkout_id: "co_1", checkout_reference: "ps_1", redirect_url: good, junk: "x", return_url: "https://evil.test" },
    })
    expect(upd.data).not.toHaveProperty("return_url")
    expect(upd.data).not.toHaveProperty("junk")
    expect(upd.data.redirect_url).toBe(good)
  })
})
