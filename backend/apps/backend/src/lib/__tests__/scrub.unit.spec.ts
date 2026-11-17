import { scrubError } from "../scrub"

describe("scrubError env secrets", () => {
  const saved = { k: process.env.SUMUP_API_KEY, w: process.env.SUMUP_WEBHOOK_SECRET }
  afterEach(() => {
    for (const [name, v] of [["SUMUP_API_KEY", saved.k], ["SUMUP_WEBHOOK_SECRET", saved.w]] as const) {
      if (v === undefined) delete process.env[name]
      else process.env[name] = v
    }
  })

  it("masks the SumUp API key and webhook secret", () => {
    process.env.SUMUP_API_KEY = "fake-api-key-abcdefgh12345678"
    process.env.SUMUP_WEBHOOK_SECRET = "whsec-0123456789abcdef"
    expect(scrubError("401 for fake-api-key-abcdefgh12345678 at ?x=whsec-0123456789abcdef&y")).toBe(
      "401 for <secret> at ?x=<secret>&y"
    )
  })

  it("ignores unset, empty and too short values", () => {
    delete process.env.SUMUP_API_KEY
    process.env.SUMUP_WEBHOOK_SECRET = "abc"
    expect(scrubError("abc error")).toBe("abc error")
    process.env.SUMUP_WEBHOOK_SECRET = "  "
    expect(scrubError("x  y")).toBe("x  y")
  })
})
