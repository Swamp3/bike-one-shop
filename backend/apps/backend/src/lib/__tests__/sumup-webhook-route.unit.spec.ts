import middlewares from "../../api/middlewares"
import { verifySumupWebhookEvent } from "../sumup-webhook-check"
import { verifySumupWebhookSecret } from "../sumup-webhook-secret"

const route = (middlewares as any).routes.find(
  (r: { matcher: string }) => r.matcher === "/hooks/payment/sumup_sumup"
)

describe("SumUp webhook route wiring", () => {
  it("checks the token, then rate limits, then the paid-event check", () => {
    const chain = route.middlewares
    expect(chain).toHaveLength(3)
    expect(chain[0]).toBe(verifySumupWebhookSecret)
    expect(chain[2]).toBe(verifySumupWebhookEvent)
  })

  it("limits 20 calls per minute per ref, independent of the address", () => {
    const limiter = route.middlewares[1]
    const call = (ref: string, ip: string) => {
      const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() }
      const next = jest.fn()
      limiter({ query: { ref }, ip, headers: {} }, res, next)
      return { res, next }
    }
    for (let i = 0; i < 20; i++) expect(call("ps_1", `10.0.0.${i}`).next).toHaveBeenCalled()
    const blocked = call("ps_1", "10.9.9.9")
    expect(blocked.next).not.toHaveBeenCalled()
    expect(blocked.res.status).toHaveBeenCalledWith(429)
    expect(call("ps_2", "10.9.9.9").next).toHaveBeenCalled()
  })
})
