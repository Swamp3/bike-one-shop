// Pins the installed plugin's behaviour that the webhook security argument relies on
// (docs: .working-files/sumup-webhook-verification/plan.md). A plugin upgrade that
// starts trusting the body would fail here.
import { dirname, join } from "node:path"

// the package's exports map only exposes the module-provider wrapper, not the service class
const pluginRoot = dirname(require.resolve("@sumup/medusa-plugin/package.json"))
const SumUpProvider = require(join(pluginRoot, ".medusa/server/src/providers/sumup/service.js")).default

const make = (retrieveCheckout: jest.Mock) =>
  new (SumUpProvider as any)({}, { apiKey: "k", merchantCode: "m", client: { retrieveCheckout } })

const hook = (provider: any, body: Record<string, unknown>) =>
  provider.getWebhookActionAndData({ data: body, rawData: "", headers: {} })

describe("SumUp plugin webhook handling", () => {
  it("ignores bodies that are not CHECKOUT_STATUS_CHANGED and does not call SumUp", async () => {
    const retrieve = jest.fn()
    const res = await hook(make(retrieve), { event_type: "OTHER", id: "co_1" })
    expect(res.action).toBe("not_supported")
    expect(retrieve).not.toHaveBeenCalled()
  })

  it("a forged id unknown to SumUp errors out instead of yielding an action", async () => {
    const retrieve = jest.fn().mockRejectedValue(new Error("404"))
    await expect(
      hook(make(retrieve), { event_type: "CHECKOUT_STATUS_CHANGED", id: "random" })
    ).rejects.toThrow()
  })

  it("takes session id and amount from SumUp's checkout, never from the body", async () => {
    const retrieve = jest
      .fn()
      .mockResolvedValue({ id: "co_1", status: "PAID", checkout_reference: "ps_real", amount: 50 })
    const res = await hook(make(retrieve), {
      event_type: "CHECKOUT_STATUS_CHANGED",
      id: "co_1",
      session_id: "ps_forged",
      amount: 1,
      status: "PAID",
    })
    expect(res).toEqual({ action: "captured", data: { session_id: "ps_real", amount: 50 } })
  })

  it("a body claiming PAID for a PENDING checkout does not yield a capture", async () => {
    const retrieve = jest
      .fn()
      .mockResolvedValue({ id: "co_1", status: "PENDING", checkout_reference: "ps_1", amount: 50 })
    const res = await hook(make(retrieve), {
      event_type: "CHECKOUT_STATUS_CHANGED",
      id: "co_1",
      status: "PAID",
    })
    expect(res.action).toBe("pending")
  })
})
