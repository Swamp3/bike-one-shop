import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { linkGuestOrders } from "../link-guest-orders"

type Row = Record<string, unknown>

const account = { id: "cus_acc", email: "Erika@Example.com", has_account: true }
const ownIdentity = {
  id: "authid_1",
  app_metadata: { customer_id: "cus_acc" },
  provider_identities: [{ provider: "emailpass", entity_id: "Erika@Example.com" }],
}

const setup = (opts: {
  customer?: Row
  identity?: Row | null
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
    retrieveAuthIdentity: jest.fn(async () => {
      if (opts.identity === null) throw new Error("not found")
      return opts.identity ?? ownIdentity
    }),
    listAuthVerifications: jest.fn(async () => [{ verified_at: opts.verified ? new Date() : null }]),
  }
  const orderModule = {
    updateOrders: jest.fn(async (id: string, data: Row) => {
      updates.push([id, data])
    }),
  }
  const registry: Record<string, unknown> = {
    [ContainerRegistrationKeys.QUERY]: query,
    [ContainerRegistrationKeys.LOGGER]: { info: jest.fn() },
    [Modules.AUTH]: auth,
    [Modules.ORDER]: orderModule,
  }
  const container = { resolve: (key: string) => registry[key] } as never
  return { container, updates, auth }
}

const guestOrders = [
  { id: "o1", email: "erika@example.com", customer_id: "cus_guest" },
  { id: "o2", email: "ERIKA@example.com", customer_id: null },
  { id: "o3", email: "erika@example.com", customer_id: "cus_acc" },
]

describe("linkGuestOrders", () => {
  it("moves guest and customer-less orders with the same e-mail (any case) onto the account", async () => {
    const { container, updates, auth } = setup({
      customer: account,
      verified: true,
      orders: guestOrders,
      owners: [{ id: "cus_guest", has_account: false }],
    })
    await expect(linkGuestOrders(container, "cus_acc", "authid_1")).resolves.toBe(2)
    expect(updates).toEqual([
      ["o1", { customer_id: "cus_acc" }],
      ["o2", { customer_id: "cus_acc" }],
    ])
    // The verification must be the identity's own, for the address as stored.
    expect(auth.listAuthVerifications).toHaveBeenCalledWith({
      auth_identity_id: "authid_1",
      entity_id: "Erika@Example.com",
      entity_type: "email",
    })
  })

  it("does nothing until the identity's own e-mail verification is done", async () => {
    const { container, updates } = setup({ customer: account, verified: false, orders: guestOrders })
    await expect(linkGuestOrders(container, "cus_acc", "authid_1")).resolves.toBe(0)
    expect(updates).toEqual([])
  })

  it("refuses when the customer's e-mail is not the one the identity registered with", async () => {
    // Attacker: own identity (attacker@x), customer record created with the victim's address.
    const { container, updates, auth } = setup({
      customer: { id: "cus_acc", email: "victim@example.com", has_account: true },
      identity: {
        id: "authid_1",
        app_metadata: { customer_id: "cus_acc" },
        provider_identities: [{ provider: "emailpass", entity_id: "attacker@example.com" }],
      },
      verified: true,
      orders: [{ id: "o1", email: "victim@example.com", customer_id: "cus_guest" }],
    })
    await expect(linkGuestOrders(container, "cus_acc", "authid_1")).resolves.toBe(0)
    expect(updates).toEqual([])
    expect(auth.listAuthVerifications).not.toHaveBeenCalled()
  })

  it("refuses an identity that is not bound to this customer, or a missing identity", async () => {
    const other = setup({
      customer: account,
      identity: { ...ownIdentity, app_metadata: { customer_id: "cus_someone_else" } },
      verified: true,
      orders: guestOrders,
    })
    await expect(linkGuestOrders(other.container, "cus_acc", "authid_1")).resolves.toBe(0)
    const missing = setup({ customer: account, identity: null, verified: true, orders: guestOrders })
    await expect(linkGuestOrders(missing.container, "cus_acc", "authid_1")).resolves.toBe(0)
    await expect(linkGuestOrders(missing.container, "cus_acc", undefined)).resolves.toBe(0)
    expect(other.updates).toEqual([])
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
    await expect(linkGuestOrders(container, "cus_acc", "authid_1")).resolves.toBe(0)
    expect(updates).toEqual([])
  })

  it("ignores a guest customer record", async () => {
    const { container, auth } = setup({
      customer: { id: "cus_guest", email: "a@b.de", has_account: false },
      verified: true,
    })
    await expect(linkGuestOrders(container, "cus_guest", "authid_1")).resolves.toBe(0)
    expect(auth.retrieveAuthIdentity).not.toHaveBeenCalled()
  })
})
