import { sumupEventMatchesSession, verifySumupWebhookEvent } from "../sumup-webhook-check"

const body = { event_type: "CHECKOUT_STATUS_CHANGED", id: "co_1" }

const run = async ({
  event,
  session = { id: "ps_1", amount: 50 },
  reqBody = body,
  ref = "ps_1",
  fail = false,
}: {
  event?: unknown
  session?: unknown
  reqBody?: unknown
  ref?: string
  fail?: boolean
}) => {
  const getWebhookActionAndData = jest.fn(async () => {
    if (fail) throw new Error("SumUp down")
    return event
  })
  const graph = jest.fn(async () => ({ data: session ? [session] : [] }))
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const scope = {
    resolve: (k: string) => ({ logger, query: { graph }, payment: { getWebhookActionAndData } })[k],
  }
  const res = { sendStatus: jest.fn() }
  const next = jest.fn()
  await verifySumupWebhookEvent({ body: reqBody, query: { ref }, scope } as never, res as never, next)
  return { res, next, logger, getWebhookActionAndData }
}
const paid = (session_id: string, amount: number) => ({ action: "captured", data: { session_id, amount } })

describe("sumupEventMatchesSession", () => {
  it("needs the same session id and amount, and a session", () => {
    expect(sumupEventMatchesSession(paid("ps_1", 50), { id: "ps_1", amount: "50" })).toBe(true)
    expect(sumupEventMatchesSession(paid("ps_2", 50), { id: "ps_1", amount: 50 })).toBe(false)
    expect(sumupEventMatchesSession(paid("ps_1", 5), { id: "ps_1", amount: 50 })).toBe(false)
    expect(sumupEventMatchesSession(paid("ps_1", 50), undefined)).toBe(false)
  })
})

describe("verifySumupWebhookEvent", () => {
  it("lets a paid event for the right session and amount through", async () => {
    const { next, res } = await run({ event: paid("ps_1", 50) })
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.sendStatus).not.toHaveBeenCalled()
  })

  it("drops a paid event with the wrong amount: nothing queued, error logged without amounts", async () => {
    const { next, res, logger } = await run({ event: paid("ps_1", 1) })
    expect(next).not.toHaveBeenCalled()
    expect(res.sendStatus).toHaveBeenCalledWith(200)
    expect(logger.error).toHaveBeenCalledTimes(1)
  })

  it("drops a paid event for an unknown session or one that differs from the URL's ref", async () => {
    for (const args of [
      { event: paid("ps_1", 50), session: null },
      { event: paid("ps_1", 50), ref: "ps_other" },
    ]) {
      const { next, res } = await run(args)
      expect(next).not.toHaveBeenCalled()
      expect(res.sendStatus).toHaveBeenCalledWith(200)
    }
  })

  it("passes non-paid events on without a session lookup", async () => {
    const { next } = await run({ event: { action: "pending", data: { session_id: "ps_1", amount: 1 } } })
    expect(next).toHaveBeenCalledTimes(1)
  })

  it("answers 503 (so SumUp retries) when the SumUp lookup fails", async () => {
    const { next, res } = await run({ fail: true })
    expect(res.sendStatus).toHaveBeenCalledWith(503)
    expect(next).not.toHaveBeenCalled()
  })

  it("does not call SumUp for bodies that are not CHECKOUT_STATUS_CHANGED", async () => {
    const { next, getWebhookActionAndData } = await run({ reqBody: { event_type: "X", id: "co_1" } })
    expect(next).toHaveBeenCalledTimes(1)
    expect(getWebhookActionAndData).not.toHaveBeenCalled()
  })

  it("drops malformed checkout ids with 200 before any SumUp call", async () => {
    for (const id of ["../../merchant/x", "co_1/../x", "a".repeat(65), "", "co 1", "co_1?x=1", "co%2F1"]) {
      const { next, res, getWebhookActionAndData } = await run({
        reqBody: { event_type: "CHECKOUT_STATUS_CHANGED", id },
      })
      expect(getWebhookActionAndData).not.toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
      expect(res.sendStatus).toHaveBeenCalledWith(200)
    }
  })

  it("accepts a 64 character id", async () => {
    const { next } = await run({
      reqBody: { event_type: "CHECKOUT_STATUS_CHANGED", id: "a".repeat(64) },
      event: { action: "pending" },
    })
    expect(next).toHaveBeenCalledTimes(1)
  })
})
