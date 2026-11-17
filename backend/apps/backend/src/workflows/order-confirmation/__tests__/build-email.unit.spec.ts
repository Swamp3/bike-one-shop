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
  billing_address: {
    first_name: "Erika",
    last_name: "Mustermann",
    address_1: "Rechnungsweg 2",
    postal_code: "26122",
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

  it("states the contract is formed by this e-mail, without a separate acceptance", () => {
    expect(mail.text).toContain("Der Vertrag kommt mit dieser E-Mail zustande")
    expect(mail.text).not.toContain("Versandbestätigung")
    expect(mail.text).not.toContain("Eingangsbestätigung")
  })

  it("shows the billing address and the seller details", () => {
    expect(mail.text).toContain("Rechnungsadresse")
    expect(mail.text).toContain("26122 Oldenburg")
    expect(mail.html).toContain("Rechnungsweg 2")
    for (const part of ["Rheinstrasse 16", "0441 984 894 83", "HRB 220546", "DE366536184", "Marvin Wilczura"]) {
      expect(mail.text).toContain(part)
      expect(mail.html).toContain(part)
    }
  })

  it("keeps remarks out of the Belehrung and adds the phone number to it", () => {
    const belehrung = mail.text.split("\nMuster-Widerrufsformular\n")[0]
    expect(belehrung).toContain("Telefon: 0441 984 894 83")
    expect(belehrung).not.toContain("Wann es kein Widerrufsrecht gibt")
    expect(mail.text).not.toContain("nach deinen Vorgaben angefertigt")
    expect(mail.text.split("\nMuster-Widerrufsformular\n")[1]).toContain("Hinweise")
  })

  it("escapes customer-controlled strings in the html", () => {
    expect(mail.html).not.toContain("<b>Aspero")
    expect(mail.html).toContain("&lt;b&gt;Aspero")
  })
})

describe("buildOrderConfirmationEmail totals with discounts", () => {
  const rows = (o: ConfirmationOrder) =>
    buildOrderConfirmationEmail(o, "https://shop.example").text

  it("shows no Rabatt row without a discount", () => {
    expect(rows(order)).not.toContain("Rabatt")
  })

  it("treats a zero BigNumber-like discount as no discount", () => {
    const zero = { valueOf: () => 0 } as unknown as number
    expect(rows({ ...order, item_discount_total: zero })).not.toContain("Rabatt")
  })

  it("shows the item sum before the discount so the rows add up", () => {
    // 1000 gross, 10 % off: item_total is already 900, shipping 10.
    const text = rows({ ...order, item_total: 900, item_discount_total: 100, shipping_total: 10, total: 910 })
    expect(text).toContain("Zwischensumme: 1.000,00")
    expect(text).toContain("Rabatt: -100,00")
    expect(text).toContain("Versand: 10,00")
    expect(text).toContain("Gesamt (inkl. MwSt.): 910,00")
  })

  it("keeps a free-shipping discount out of the Rabatt row", () => {
    // Free-shipping code: discount_total would be 10 but item_discount_total is 0.
    const text = rows({ ...order, item_total: 1000, item_discount_total: 0, shipping_total: 0, total: 1000 })
    expect(text).toContain("Zwischensumme: 1.000,00")
    expect(text).not.toContain("Rabatt")
    expect(text).toContain("Versand: 0,00")
  })
})

