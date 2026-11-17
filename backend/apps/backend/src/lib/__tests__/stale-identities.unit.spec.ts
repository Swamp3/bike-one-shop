import { selectStaleIdentities } from "../stale-identities"

const cutoff = new Date("2026-11-10T00:00:00Z")
const old = "2026-11-01T00:00:00Z"
const emailpass = [{ provider: "emailpass" }]

describe("selectStaleIdentities", () => {
  it("selects only old, never-bound, never-verified emailpass registrations", () => {
    const identities = [
      { id: "stale", created_at: old, app_metadata: {}, provider_identities: emailpass },
      { id: "stale-null-meta", created_at: old, app_metadata: null, provider_identities: emailpass },
      { id: "customer", created_at: old, app_metadata: { customer_id: "cus_1" }, provider_identities: emailpass },
      { id: "admin", created_at: old, app_metadata: { user_id: "user_1" }, provider_identities: emailpass },
      { id: "verified", created_at: old, app_metadata: {}, provider_identities: emailpass },
      { id: "recent", created_at: "2026-11-16T00:00:00Z", app_metadata: {}, provider_identities: emailpass },
      { id: "other-provider", created_at: old, app_metadata: {}, provider_identities: [{ provider: "google" }] },
    ]
    expect(selectStaleIdentities(identities, new Set(["verified"]), cutoff)).toEqual(["stale", "stale-null-meta"])
  })
})
