import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { linkGuestOrders } from "../link-guest-orders"

type Row = Record<string, unknown>

const setup = (opts: {
  customer?: Row
  verified?: boolean
  orders?: Row[]
  owners?: Row[]
}) => {
  const updates: Array<[string, Row]> = []
  const query = {
    graph: jest.fn(async ({ entity, filters }: { entity: string; filters: Row }) => {
      if (entity === "customer" && typeof filters.id === "string") {
        return { data: opts.customer ? [opts.customer] : [] }
      }
      if (entity === "customer") return { data: opts.owners ?? [] }
      return { data: opts.orders ?? [] }
    }),
  }
  const auth = {
    listAuthVerifications: jest.fn(async () => [{ verified_at: opts.verified ? new Date() : null }]),
  }
  const orderModule = {
    updateOrders: jest.fn(async (id: string, data: Row) => {
      updates.push([id, data])
    }),
  }
  const logger = { info: jest.fn() }
  const registry: Record<string, unknown> = {
    [ContainerRegistrationKeys.QUERY]: query,
    [ContainerRegistrationKeys.LOGGER]: logger,
    [Modules.AUTH]: auth,
    [Modules.ORDER]: orderModule,
  }
  const container = { resolve: (key: string) => registry[key] } as never
  return { container, updates, auth }
}

const account = { id: "cus_acc", email: "Erika@Example.com", has_account: true }

describe("linkGuestOrders", () => {
  it("moves guest and customer-less orders with the same e-mail (any case) onto the account", async () => {
    const { container, updates } = setup({
      customer: account,
      verified: true,
      orders: [
        { id: "o1", email: "erika@example.com", customer_id: "cus_guest" },
        { id: "o2", email: "ERIKA@example.com", customer_id: null },
        { id: "o3", email: "erika@example.com", customer_id: "cus_acc" },
      ],
      owners: [{ id: "cus_guest", has_account: false }],
    })
    await expect(linkGuestOrders(container, "cus_acc")).resolves.toBe(2)
    expect(updates).toEqual([
      ["o1", { customer_id: "cus_acc" }],
      ["o2", { customer_id: "cus_acc" }],
    ])
  })

  it("does nothing until the e-mail address is verified", async () => {
    const { container, updates } = setup({
      customer: account,
      verified: false,
      orders: [{ id: "o1", email: "erika@example.com", customer_id: "cus_guest" }],
    })
    await expect(linkGuestOrders(container, "cus_acc")).resolves.toBe(0)
    expect(updates).toEqual([])
  })

  it("never takes orders of another account or of a look-alike address", async () => {
    const { container, updates } = setup({
      customer: account,
      verified: true,
      orders: [
        { id: "o1", email: "erika@example.com", customer_id: "cus_other" },
        { id: "o2", email: "erikaXexample.com", customer_id: null },
        { id: "o3", email: "erik_@example.com", customer_id: null },
      ],
      owners: [{ id: "cus_other", has_account: true }],
    })
    await expect(linkGuestOrders(container, "cus_acc")).resolves.toBe(0)
    expect(updates).toEqual([])
  })

  it("ignores a guest customer record", async () => {
    const { container, auth } = setup({
      customer: { id: "cus_guest", email: "a@b.de", has_account: false },
      verified: true,
    })
    await expect(linkGuestOrders(container, "cus_guest")).resolves.toBe(0)
    expect(auth.listAuthVerifications).not.toHaveBeenCalled()
  })
})
