import { reconcileSumupSessions } from "../sumup-reconcile"

const run = jest.fn()
jest.mock("@medusajs/medusa/core-flows", () => ({
  processPaymentWorkflow: () => ({ run }),
}))

type Session = { id: string; amount: number; data?: Record<string, unknown> }

const setup = (sessions: Session[], events: Record<string, unknown>) => {
  const graph = jest.fn(async () => ({ data: sessions }))
  const getWebhookActionAndData = jest.fn(async (input: { payload: { data: { id: string } } }) => {
    const ev = events[input.payload.data.id]
    if (ev instanceof Error) throw ev
    return ev
  })
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const container = {
    resolve: (key: string) =>
      ({ logger, query: { graph }, payment: { getWebhookActionAndData } })[key],
  }
  return { container: container as never, graph, getWebhookActionAndData }
}

const paid = (session_id: string, amount: number) => ({
  action: "captured",
  data: { session_id, amount },
})
const sess = (id: string, amount = 50): Session => ({ id, amount, data: { checkout_id: `co_${id}` } })

describe("reconcileSumupSessions", () => {
  beforeEach(() => run.mockReset())

  it("only asks for pending SumUp sessions inside the age window", async () => {
    const { container, graph } = setup([], {})
    const now = Date.parse("2026-11-17T12:00:00Z")
    await reconcileSumupSessions(container, now)
    const arg = (graph.mock.calls as unknown as [{ filters: Record<string, any> }][])[0][0]
    expect(arg.filters.provider_id).toBe("pp_sumup_sumup")
    expect(arg.filters.status).toBe("pending")
    expect(arg.filters.created_at.$lt).toEqual(new Date(now - 10 * 60 * 1000))
    expect(arg.filters.created_at.$gt).toEqual(new Date(now - 24 * 60 * 60 * 1000))
  })

  it("completes a session SumUp reports as paid for this session and amount", async () => {
    const { container } = setup([sess("ps_1")], { co_ps_1: paid("ps_1", 50) })
    expect(await reconcileSumupSessions(container)).toBe(1)
    expect(run).toHaveBeenCalledWith({ input: paid("ps_1", 50) })
  })

  it("never completes on a non-paid status", async () => {
    const { container } = setup([sess("ps_1"), sess("ps_2"), sess("ps_3")], {
      co_ps_1: { action: "pending", data: { session_id: "ps_1", amount: 50 } },
      co_ps_2: { action: "failed", data: { session_id: "ps_2", amount: 50 } },
      co_ps_3: { action: "not_supported" },
    })
    expect(await reconcileSumupSessions(container)).toBe(0)
    expect(run).not.toHaveBeenCalled()
  })

  it("rejects a paid checkout whose reference or amount does not match the session", async () => {
    const { container } = setup([sess("ps_1"), sess("ps_2")], {
      co_ps_1: paid("ps_other", 50),
      co_ps_2: paid("ps_2", 5),
    })
    expect(await reconcileSumupSessions(container)).toBe(0)
    expect(run).not.toHaveBeenCalled()
  })

  it("skips sessions without a checkout id and survives a failing session", async () => {
    const { container, getWebhookActionAndData } = setup(
      [{ id: "ps_0", amount: 50, data: {} }, sess("ps_1"), sess("ps_2")],
      { co_ps_1: new Error("SumUp 500"), co_ps_2: paid("ps_2", 50) }
    )
    expect(await reconcileSumupSessions(container)).toBe(1)
    expect(getWebhookActionAndData).toHaveBeenCalledTimes(2)
    expect(run).toHaveBeenCalledTimes(1)
  })
})
