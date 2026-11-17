import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import handler from "../auth-verification-requested"

const build = (identityEmail: string | null) => {
  const createNotifications = jest.fn().mockResolvedValue({})
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const registry: Record<string, unknown> = {
    [ContainerRegistrationKeys.LOGGER]: logger,
    [Modules.NOTIFICATION]: { createNotifications },
    [Modules.AUTH]: {
      retrieveAuthIdentity: jest.fn(async () => {
        if (identityEmail === null) throw new Error("not found")
        return { id: "authid_1", provider_identities: [{ provider: "emailpass", entity_id: identityEmail }] }
      }),
    },
  }
  return { container: { resolve: (k: string) => registry[k] } as never, createNotifications, logger }
}
const run = (container: never, data: Record<string, unknown>) =>
  handler({ event: { data }, container } as never)

describe("auth-verification-requested subscriber", () => {
  beforeEach(() => {
    process.env.STOREFRONT_URL = "https://shop.example"
  })

  it("mails the identity's own address with the activation link", async () => {
    const { container, createNotifications } = build("erika1@example.com")
    await run(container, { entity_id: "erika1@example.com", entity_type: "email", auth_identity_id: "authid_1", code: "abc" })
    expect(createNotifications).toHaveBeenCalledTimes(1)
    const sent = createNotifications.mock.calls[0][0]
    expect(sent.to).toBe("erika1@example.com")
    expect(sent.content.text).toContain("https://shop.example/de/verify-account?token=abc")
  })

  it("refuses an address that is not the identity's own (no mail to strangers)", async () => {
    const { container, createNotifications } = build("attacker@example.com")
    await run(container, { entity_id: "victim@example.com", entity_type: "email", auth_identity_id: "authid_1", code: "abc" })
    expect(createNotifications).not.toHaveBeenCalled()
    await run(build(null).container, { entity_id: "victim@example.com", entity_type: "email", auth_identity_id: "gone", code: "abc" })
  })

  it("sends at most one mail a minute per address", async () => {
    const { container, createNotifications } = build("erika2@example.com")
    const data = { entity_id: "erika2@example.com", entity_type: "email", auth_identity_id: "authid_1", code: "abc" }
    await run(container, data)
    await run(container, data)
    expect(createNotifications).toHaveBeenCalledTimes(1)
  })

  it("ignores other entity types", async () => {
    const { container, createNotifications } = build("erika3@example.com")
    await run(container, { entity_id: "erika3@example.com", entity_type: "phone_number", auth_identity_id: "authid_1", code: "abc" })
    expect(createNotifications).not.toHaveBeenCalled()
  })
})
