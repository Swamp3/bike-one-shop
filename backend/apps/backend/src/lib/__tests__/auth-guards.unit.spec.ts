import { Modules } from "@medusajs/framework/utils"
import { createHash } from "node:crypto"
import { requireOwnEmail, requireOwnVerification } from "../auth-guards"

const hash = (code: string) => createHash("sha256").update(code).digest("hex")

const run = async (
  guard: typeof requireOwnEmail,
  opts: {
    body: unknown
    authIdentityId?: string
    identityEmail?: string | null
    verification?: Record<string, unknown> | null
    emailVerified?: boolean
  }
) => {
  const auth = {
    retrieveAuthIdentity: jest.fn(async () => {
      if (opts.identityEmail == null) throw new Error("nope")
      return { id: "authid_1", provider_identities: [{ provider: "emailpass", entity_id: opts.identityEmail }] }
    }),
    listAuthVerifications: jest.fn(
      async (filters: { provider_metadata?: { token_hash?: string }; auth_identity_id?: string }) => {
        if (filters.provider_metadata) {
          return opts.verification && filters.provider_metadata.token_hash === hash("good-code") ? [opts.verification] : []
        }
        // requireOwnEmail asks for the identity's own verification row
        return [{ verified_at: opts.emailVerified === false ? null : new Date() }]
      }
    ),
  }
  const req = {
    body: opts.body,
    auth_context: { auth_identity_id: opts.authIdentityId },
    scope: { resolve: (k: string) => (k === Modules.AUTH ? auth : undefined) },
  }
  const json = jest.fn()
  const res = { status: jest.fn(() => ({ json })) }
  const next = jest.fn()
  await guard(req as never, res as never, next)
  return { next, status: res.status, json }
}

describe("requireOwnEmail", () => {
  it("refuses an identity whose e-mail is not confirmed yet (no squatting by creating a customer early)", async () => {
    const r = await run(requireOwnEmail, {
      body: { email: "erika@example.com" },
      authIdentityId: "authid_1",
      identityEmail: "erika@example.com",
      emailVerified: false,
    })
    expect(r.next).not.toHaveBeenCalled()
    expect(r.status).toHaveBeenCalledWith(403)
  })
  it("lets the identity's own address through, in any case", async () => {
    const r = await run(requireOwnEmail, { body: { email: "ERIKA@example.com" }, authIdentityId: "authid_1", identityEmail: "erika@example.com" })
    expect(r.next).toHaveBeenCalled()
  })
  it("rejects another address, a missing body e-mail and a missing identity", async () => {
    for (const opts of [
      { body: { email: "victim@example.com" }, authIdentityId: "authid_1", identityEmail: "attacker@example.com" },
      { body: {}, authIdentityId: "authid_1", identityEmail: "a@b.de" },
      { body: { email: "a@b.de" }, authIdentityId: undefined, identityEmail: null },
    ]) {
      const r = await run(requireOwnEmail, opts)
      expect(r.next).not.toHaveBeenCalled()
      expect(r.status).toHaveBeenCalledWith(400)
    }
  })
})

describe("requireOwnVerification", () => {
  const verification = { auth_identity_id: "authid_victim_registered_by_attacker", verified_at: null }
  it("lets the owner of the code confirm it", async () => {
    const r = await run(requireOwnVerification, {
      body: { code: "good-code" },
      authIdentityId: "authid_victim_registered_by_attacker",
      verification,
    })
    expect(r.next).toHaveBeenCalled()
  })
  it("blocks someone who only holds the code (victim without the attacker's password)", async () => {
    const r = await run(requireOwnVerification, { body: { code: "good-code" }, authIdentityId: "authid_other", verification })
    expect(r.next).not.toHaveBeenCalled()
    expect(r.status).toHaveBeenCalledWith(403)
  })
  it("passes unknown or used codes on, so Medusa answers with its own error", async () => {
    const unknown = await run(requireOwnVerification, { body: { code: "bad-code" }, authIdentityId: "authid_other", verification })
    expect(unknown.next).toHaveBeenCalled()
    const used = await run(requireOwnVerification, {
      body: { code: "good-code" },
      authIdentityId: "authid_other",
      verification: { ...verification, verified_at: new Date() },
    })
    expect(used.next).toHaveBeenCalled()
  })
})
