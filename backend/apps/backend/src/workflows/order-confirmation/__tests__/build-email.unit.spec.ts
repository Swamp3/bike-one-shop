import { buildOrderConfirmationEmail, ConfirmationOrder } from "../build-email"

const order: ConfirmationOrder = {
  id: "order_1",
  display_id: 1042,
  email: "erika@example.com",
  currency_code: "eur",
  item_total: 3199,
  shipping_total: 10,
  tax_total: 512.78,
  total: 3209,
  items: [
    { product_title: "Cervélo <b>Aspero</b>", variant_title: "M / Rosa", quantity: 1, total: 3199 },
  ],
  shipping_address: {
    first_name: "Erika",
    last_name: "Mustermann",
    address_1: "Heiligengeiststr. 1",
    postal_code: "26121",
    city: "Oldenburg",
    country_code: "de",
  },
}

describe("buildOrderConfirmationEmail", () => {
  const mail = buildOrderConfirmationEmail(order, "https://shop.example/")

  it("names the order and shows totals incl. VAT and shipping in euros", () => {
    expect(mail.subject).toContain("1042")
    expect(mail.text).toContain("Gesamt (inkl. MwSt.): 3.209,00")
    expect(mail.text).toContain("Versand: 10,00")
    expect(mail.text).toContain("Darin enthaltene MwSt.: 512,78")
  })

  it("contains delivery address, AGB link, Widerrufsbelehrung and form", () => {
    expect(mail.text).toContain("26121 Oldenburg")
    expect(mail.text).toContain("https://shop.example/de/agb")
    expect(mail.text).toContain("Widerrufsbelehrung")
    expect(mail.text).toContain("Muster-Widerrufsformular")
  })

  it("escapes customer-controlled strings in the html", () => {
    expect(mail.html).not.toContain("<b>Aspero")
    expect(mail.html).toContain("&lt;b&gt;Aspero")
  })
})
