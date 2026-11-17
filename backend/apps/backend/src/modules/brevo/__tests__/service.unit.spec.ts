import BrevoNotificationService, { parseAddress } from "../service"

const options = {
  api_key: "test-key-123",
  from: "BikeOne <order@mail.bike-one.dev>",
  reply_to: "info@bike-one.dev",
}
const notification = {
  to: "erika@example.com",
  channel: "email",
  template: "order-confirmation",
  content: { subject: "Bestellung 1042", html: "<p>Danke</p>", text: "Danke" },
}

const mockFetch = (status: number, body: unknown) => {
  const fn = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
  global.fetch = fn as unknown as typeof fetch
  return fn
}

const messageOf = async (promise: Promise<unknown>) => {
  try {
    await promise
  } catch (e) {
    return (e as Error).message
  }
  return ""
}

describe("parseAddress", () => {
  it("splits name and address, and accepts a bare address", () => {
    expect(parseAddress("BikeOne <order@mail.bike-one.dev>")).toEqual({
      name: "BikeOne",
      email: "order@mail.bike-one.dev",
    })
    expect(parseAddress('"BikeOne Shop" <a@b.de>')).toEqual({ name: "BikeOne Shop", email: "a@b.de" })
    expect(parseAddress(" info@bike-one.dev ")).toEqual({ email: "info@bike-one.dev" })
  })

  it("cuts a display name to Brevo's 70 characters", () => {
    expect(parseAddress(`${"x".repeat(80)} <a@b.de>`).name).toHaveLength(70)
  })
})

describe("BrevoNotificationService", () => {
  const service = new BrevoNotificationService({}, options)

  it("posts subject, html, text, sender and reply-to and returns the message id", async () => {
    const fetchMock = mockFetch(201, { messageId: "<abc@relay>" })
    await expect(service.send(notification)).resolves.toEqual({ id: "<abc@relay>" })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://api.brevo.com/v3/smtp/email")
    expect(init.headers["api-key"]).toBe("test-key-123")
    expect(JSON.parse(init.body)).toEqual({
      sender: { name: "BikeOne", email: "order@mail.bike-one.dev" },
      to: [{ email: "erika@example.com" }],
      subject: "Bestellung 1042",
      htmlContent: "<p>Danke</p>",
      textContent: "Danke",
      replyTo: { email: "info@bike-one.dev" },
    })
  })

  it("uses the notification's own from address and omits reply-to when unset", async () => {
    const fetchMock = mockFetch(201, { messageId: "x" })
    await new BrevoNotificationService({}, { api_key: "k", from: "a@b.de" }).send({
      ...notification,
      from: "Shop <shop@b.de>",
    })
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.sender).toEqual({ name: "Shop", email: "shop@b.de" })
    expect(body.replyTo).toBeUndefined()
  })

  it("turns a Brevo error into one with status and code but no recipient or key", async () => {
    mockFetch(400, { code: "unauthorized", message: "Key not valid for erika@example.com" })
    const message = await messageOf(service.send(notification))
    expect(message).toContain("HTTP 400 unauthorized")
    expect(message).not.toContain("erika@example.com")
    expect(message).not.toContain("test-key-123")
  })

  it("redacts the API key if Brevo echoes it", async () => {
    mockFetch(400, { code: "unauthorized", message: "bad key test-key-123 from 10.0.0.1" })
    const message = await messageOf(service.send(notification))
    expect(message).toContain("<key>")
    expect(message).not.toContain("test-key-123")
  })

  it("turns a network error into an error without the key", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("connect ECONNREFUSED")) as unknown as typeof fetch
    const message = await messageOf(service.send(notification))
    expect(message).toContain("Brevo request failed")
    expect(message).not.toContain("test-key-123")
  })

  it("rejects missing content and attachments instead of dropping them", async () => {
    const fetchMock = mockFetch(201, {})
    await expect(service.send({ ...notification, content: undefined })).rejects.toThrow("content.subject")
    await expect(
      service.send({ ...notification, attachments: [{ content: "eA==", filename: "a.txt", content_type: "text/plain" }] })
    ).rejects.toThrow("attachments")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("validateOptions needs api_key and from", () => {
    expect(() => BrevoNotificationService.validateOptions(options)).not.toThrow()
    expect(() => BrevoNotificationService.validateOptions({ ...options, api_key: "" })).toThrow("api_key")
    expect(() => BrevoNotificationService.validateOptions({ api_key: "k" })).toThrow("from")
  })

  it("validateOptions rejects a malformed from or reply_to", () => {
    expect(() => BrevoNotificationService.validateOptions({ ...options, from: "BikeOne order" })).toThrow("from")
    expect(() => BrevoNotificationService.validateOptions({ ...options, reply_to: "info@" })).toThrow("reply_to")
    expect(() => BrevoNotificationService.validateOptions({ api_key: "k", from: "a@b.de" })).not.toThrow()
  })
})
