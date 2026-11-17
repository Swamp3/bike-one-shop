import { activationLink, buildActivationEmail } from "../account-activation-email"

describe("activationLink", () => {
  it("points at the verify page and encodes the code", () => {
    expect(activationLink("https://shop.example/", "a.b+c/d")).toBe(
      "https://shop.example/de/verify-account?token=a.b%2Bc%2Fd"
    )
  })
})

describe("buildActivationEmail", () => {
  const link = "https://shop.example/de/verify-account?token=abc&x=\"1\""
  const mail = buildActivationEmail(link, "2026-11-18T12:00:00Z")

  it("is German, carries the link in text and escaped html, and the expiry", () => {
    expect(mail.subject).toContain("E-Mail-Adresse")
    expect(mail.text).toContain(link)
    expect(mail.html).toContain("token=abc&amp;x=&quot;1&quot;")
    expect(mail.text).toContain("gültig")
    expect(mail.text).toContain("Gast")
  })

  it("falls back without an expiry date and has no tracking or images", () => {
    const plain = buildActivationEmail(link)
    expect(plain.text).toContain("nur begrenzt gültig")
    expect(plain.html).not.toContain("<img")
  })
})
