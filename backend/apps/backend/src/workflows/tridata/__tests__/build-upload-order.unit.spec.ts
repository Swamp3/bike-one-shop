import {
  buildUploadOrderPayload,
  SourceOrder,
} from "../helpers/build-upload-order"
import { matchProducts } from "../helpers/match-products"
import {
  desiredStockedQuantity,
  isNightlyFullSyncDue,
  maxLastChange,
} from "../steps/sync-stock"
import { pickupFilialnameFromOptions } from "../steps/upload-order"
import { reissuedWebShopOrderId } from "../steps/resolve-conflict"
import { decideTribikeAction, remainingToFulfill } from "../steps/apply-tribike-states"
import { buildSoapEnvelope } from "../../../lib/tridata/soap"

const address = {
  first_name: "Erika",
  last_name: "Mustermann",
  company: null,
  address_1: "Heiligengeiststr. 1",
  address_2: null,
  city: "Oldenburg",
  postal_code: "26121",
  country_code: "de",
  phone: "0441 123",
}

const fixtureOrder = (overrides: Partial<SourceOrder> = {}): SourceOrder => ({
  id: "order_1",
  display_id: 1042,
  email: "erika@example.com",
  created_at: "2026-11-03T09:00:00.000Z",
  customer: { has_account: false },
  billing_address: address,
  shipping_address: address,
  items: [
    {
      id: "item_b",
      product_title: "Wilier Adlar",
      variant_title: "M / Schwarz",
      variant_id: "variant_grfa",
      variant_sku: "ADLAR-M-BLK",
      quantity: 1,
      unit_price: 3999,
      total: { numeric: 3999 },
      created_at: "2026-11-03T08:59:00.000Z",
    },
    {
      id: "item_a",
      product_title: "Flaschenhalter",
      variant_title: "Default",
      variant_id: "variant_plain",
      variant_sku: "BOTTLE-1",
      quantity: 2,
      unit_price: 12.5,
      total: "25",
      created_at: "2026-11-03T08:59:30.000Z",
    },
  ],
  shipping_total: 4.9,
  payment_collections: [
    { status: "authorized", payments: [{ provider_id: "pp_system_default", captured_at: null }] },
  ],
  ...overrides,
})

const productMaps = {
  variant_grfa: {
    artikel_id: "art-1",
    artikel_gr_fa_kombi_id: "kombi-1",
    grfa: true,
    ean: "2000000000015",
  },
  variant_plain: {
    artikel_id: "art-2",
    artikel_gr_fa_kombi_id: null,
    grfa: false,
    ean: null,
  },
}

describe("buildUploadOrderPayload", () => {
  it("maps header, customer and items per the contract", () => {
    const { to, bezahlt, unmappedItems } = buildUploadOrderPayload({
      order: fixtureOrder(),
      productMaps,
      pickupFilialname: null,
    })
    expect(unmappedItems).toEqual([])
    expect(bezahlt).toBe(false)
    expect(to.DeliverAdress).toBeUndefined()
    expect(to.Order).toMatchObject({
      WebShopOrderID: 1042,
      Payment: "Vorkasse",
      Bezahlt: false,
      ShippingCost: 4.9,
      DeliveryTerm: "Versand",
      Filialname: "",
    })
    expect(to.Order.ausgeglichenAm).toBeUndefined()
    expect(to.Customer).toMatchObject({
      Kundenname: "Erika Mustermann",
      UserID: "erika@example.com",
      Email: "erika@example.com",
      Mehrwertsteuercode: "Inland",
      Mailingsperre: true,
      Strasse: "Heiligengeiststr. 1",
      Ort: "Oldenburg",
      Land: "Deutschland",
      Postleitzahl: "26121",
      IsOneTimeCustomer: true,
    })
    // Data minimisation: no phone unless TRIDATA_SEND_PHONE=true.
    expect(to.Customer.Telefon).toBeUndefined()
    const [first, second] = to.OrderItemsList.OrderItemsObj
    expect(first).toMatchObject({
      Positionsnummer: 1,
      ArtikelID: "art-1",
      ArtikelGrFaKombiID: "kombi-1",
      WebshopArtikelnummer: "ADLAR-M-BLK",
      Bezeichnung: "Wilier Adlar - M / Schwarz",
      VKBrutto: 3999,
      SummeVKBrutto: 3999,
      Quantity: 1,
      EAN: "2000000000015",
    })
    expect(second).toMatchObject({
      Positionsnummer: 2,
      ArtikelID: "art-2",
      WebshopArtikelnummer: "BOTTLE-1",
      VKBrutto: 12.5,
      SummeVKBrutto: 25,
      Quantity: 2,
    })
    expect(second.ArtikelGrFaKombiID).toBeUndefined()
  })

  it("sends DeliverAdress only when shipping differs from billing", () => {
    const { to } = buildUploadOrderPayload({
      order: fixtureOrder({
        shipping_address: { ...address, address_1: "Große Str. 5", city: "Osnabrück", postal_code: "49074" },
      }),
      productMaps,
      pickupFilialname: null,
    })
    expect(to.DeliverAdress).toMatchObject({
      Name: "Erika Mustermann",
      Strasse: "Große Str. 5",
      Ort: "Osnabrück",
      Postleitzahl: "49074",
    })
  })

  it("routes Click & Collect to the branch and marks paid SumUp orders", () => {
    const { to, bezahlt } = buildUploadOrderPayload({
      order: fixtureOrder({
        shipping_address: { ...address, address_1: "Store" },
        payment_collections: [
          {
            status: "completed",
            payments: [{ provider_id: "pp_sumup_sumup", captured_at: "2026-11-03T09:01:00.000Z" }],
          },
        ],
      }),
      productMaps,
      pickupFilialname: "Osnabrück",
    })
    expect(bezahlt).toBe(true)
    expect(to.DeliverAdress).toBeUndefined()
    expect(to.Order).toMatchObject({
      Payment: "SumUp",
      Bezahlt: true,
      DeliveryTerm: "Abholung",
      Filialname: "Osnabrück",
    })
    expect(to.Order.ausgeglichenAm?.toISOString()).toBe("2026-11-03T09:01:00.000Z")
  })

  it("sends phone numbers only when enabled and uses the offset WebShopOrderID", () => {
    const { to } = buildUploadOrderPayload({
      order: fixtureOrder({ shipping_address: { ...address, address_1: "Other 1" } }),
      productMaps,
      pickupFilialname: null,
      webShopOrderId: 1001042,
      sendPhone: true,
    })
    expect(to.Customer.Telefon).toBe("0441 123")
    expect(to.DeliverAdress?.Telefonnummer).toBe("0441 123")
    expect(to.Order.WebShopOrderID).toBe(1001042)
  })

  it("reports unmapped items", () => {
    const { unmappedItems } = buildUploadOrderPayload({
      order: fixtureOrder(),
      productMaps: { variant_plain: productMaps.variant_plain },
      pickupFilialname: null,
    })
    expect(unmappedItems).toEqual(["ADLAR-M-BLK"])
  })

  it("serializes to the UploadOrder envelope", () => {
    const { to } = buildUploadOrderPayload({
      order: fixtureOrder(),
      productMaps,
      pickupFilialname: null,
    })
    const xml = buildSoapEnvelope("UploadOrder", { IdentifyGuid: "g", TO: to })
    expect(xml).toContain("<WebShopOrderID>1042</WebShopOrderID>")
    expect(xml).toContain("<OrderCompletedDate>2026-11-03T09:00:00</OrderCompletedDate>")
    expect(xml.match(/<OrderItemsObj>/g)).toHaveLength(2)
    expect(xml).not.toContain("<DeliverAdress")
  })
})

describe("matchProducts", () => {
  it("matches GrFa variants by Kombi.Artikelnummer and plain items by Matchcode", () => {
    const artikel = [
      { ArtikelID: "a1", ArtikelNummer: "ADLAR", Matchcode: "ADLAR", GrFa: true },
      { ArtikelID: "a2", ArtikelNummer: "BOTTLE", Matchcode: "BOTTLE-1", GrFa: false },
      { ArtikelID: "a3", ArtikelNummer: "GONE", Matchcode: "NOPE", GrFa: false },
    ].map((a) => ({ EAN: "", ArtikelName: "", I_VKbrutto: 0, MehrwertSteuerSatz: "", I_IstOnlineAktiv: true, LastChange: "", raw: {}, ...a }))
    const kombis = [
      { ArtikelGrFaKombiID: "k1", Artikel: "a1", Artikelnummer: "ADLAR-M-BLK" },
    ].map((k) => ({ EAN: "200", Barcode: "", FarbeBezeichnung: "", GroesseBezeichnung: "", LastChange: "", raw: {}, ...k }))
    const result = matchProducts(artikel, kombis, [
      { id: "v1", sku: "ADLAR-M-BLK", product_id: "p1" },
      { id: "v2", sku: "BOTTLE-1", product_id: "p2" },
      { id: "v3", sku: "SHOP-ONLY", product_id: "p3" },
    ])
    expect(result.matches.map((m) => [m.variant_id, m.artikel_id, m.artikel_gr_fa_kombi_id, m.grfa])).toEqual([
      ["v1", "a1", "k1", true],
      ["v2", "a2", null, false],
    ])
    expect(result.unmatchedTridata).toEqual(["NOPE"])
    expect(result.unmatchedShop).toEqual(["SHOP-ONLY"])
  })
})

describe("desiredStockedQuantity", () => {
  it("floors MengeVerfuegbar and adds Medusa reservations", () => {
    expect(desiredStockedQuantity(2.7, 1)).toBe(3)
    expect(desiredStockedQuantity(-1, 0)).toBe(0)
  })
})

describe("matchProducts duplicates", () => {
  const art = (a: Record<string, unknown>) =>
    ({ EAN: "", ArtikelName: "", I_VKbrutto: 0, MehrwertSteuerSatz: "", I_IstOnlineAktiv: true, LastChange: "", raw: {}, ...a }) as never
  const kombi = (k: Record<string, unknown>) =>
    ({ EAN: "", Barcode: "", FarbeBezeichnung: "", GroesseBezeichnung: "", LastChange: "", raw: {}, ...k }) as never

  it("does not link a SKU shared by two shop variants and reports it as a conflict", () => {
    const result = matchProducts(
      [art({ ArtikelID: "a2", ArtikelNummer: "B", Matchcode: "DUP", GrFa: false })],
      [],
      [
        { id: "v1", sku: "DUP", product_id: "p1" },
        { id: "v2", sku: "DUP", product_id: "p2" },
      ]
    )
    expect(result.matches).toEqual([])
    expect(result.conflicts).toEqual(["DUP"])
    expect(result.unmatchedShop).toEqual(["DUP", "DUP"])
    expect(result.unmatchedTridata).toEqual(["DUP"])
  })

  it("does not link a key used by two TriBike records", () => {
    const result = matchProducts(
      [art({ ArtikelID: "a1", ArtikelNummer: "A", Matchcode: "A", GrFa: true })],
      [
        kombi({ ArtikelGrFaKombiID: "k1", Artikel: "a1", Artikelnummer: "SKU-1" }),
        kombi({ ArtikelGrFaKombiID: "k2", Artikel: "a1", Artikelnummer: "SKU-1" }),
      ],
      [{ id: "v1", sku: "SKU-1", product_id: "p1" }]
    )
    expect(result.matches).toEqual([])
    expect(result.conflicts).toEqual(["SKU-1"])
  })
})

describe("pickupFilialnameFromOptions", () => {
  const branchMap = { Oldenburg: "BikeOne Oldenburg", "Osnabrück": "BikeOne Osnabrück" }
  const option = (type: string, name: string) => ({
    service_zone: { fulfillment_set: { type, location: { name } } },
  })

  it("maps a pickup fulfillment set's location to its branch", () => {
    expect(
      pickupFilialnameFromOptions([option("pickup", "BikeOne Osnabrück")], branchMap)
    ).toBe("Osnabrück")
  })

  it("returns null for shipping sets and unmapped locations", () => {
    expect(pickupFilialnameFromOptions([option("shipping", "BikeOne Oldenburg")], branchMap)).toBeNull()
    expect(pickupFilialnameFromOptions([option("pickup", "Somewhere else")], branchMap)).toBeNull()
    expect(pickupFilialnameFromOptions([], branchMap)).toBeNull()
  })
})

describe("maxLastChange", () => {
  it("compares as timestamps, accepting fractions and offsets (no offset = UTC)", () => {
    expect(
      maxLastChange(
        [
          { LastChange: "2026-11-03T10:00:00" },
          { LastChange: "2026-11-03T11:30:00+02:00" }, // 09:30Z, older
          { LastChange: "2026-11-03T10:00:05.250" },
          { LastChange: "garbage" },
        ],
        "2026-11-03T09:00:00"
      )
    ).toBe("2026-11-03T10:00:05")
    expect(maxLastChange([], "2026-11-03T09:00:00")).toBe("2026-11-03T09:00:00")
    expect(maxLastChange([{ LastChange: "2026-11-03T12:00:00Z" }], null)).toBe(
      "2026-11-03T12:00:00"
    )
  })
})

describe("isNightlyFullSyncDue", () => {
  it("is due once per day after 03:00 local time", () => {
    const at = (h: number, m = 0, day = 5) => new Date(2026, 10, day, h, m)
    expect(isNightlyFullSyncDue(null, at(10))).toBe(true)
    expect(isNightlyFullSyncDue(at(3, 1), at(10))).toBe(false)
    expect(isNightlyFullSyncDue(at(2, 59), at(10))).toBe(true)
    // Before 03:00 the previous day's boundary applies.
    expect(isNightlyFullSyncDue(at(3, 5, 4), at(2, 0))).toBe(false)
    expect(isNightlyFullSyncDue(at(2, 0, 4), at(2, 0))).toBe(true)
  })
})

describe("reissuedWebShopOrderId", () => {
  it("puts re-issued ids in a separate band above display_id + offset", () => {
    expect(reissuedWebShopOrderId(42, 0, 1)).toBe(100_000_042)
    expect(reissuedWebShopOrderId(42, 1_000_000, 2)).toBe(201_000_042)
    expect(reissuedWebShopOrderId(42, 0, 1)).not.toBe(42)
  })
})

describe("decideTribikeAction / remainingToFulfill", () => {
  it("maps TriBike states to Medusa actions", () => {
    expect(decideTribikeAction("Geliefert")).toEqual({ kind: "fulfill_and_deliver" })
    expect(decideTribikeAction("Teilgeliefert")).toEqual({ kind: "flag", attention: "partially_delivered" })
    expect(decideTribikeAction("Abgelehnt")).toEqual({ kind: "flag", attention: "rejected" })
    expect(decideTribikeAction("StorniertTriData")).toEqual({ kind: "flag", attention: "canceled_in_tribike" })
    for (const s of ["Neu", "InBearbeitung", "StorniertExtern", null]) {
      expect(decideTribikeAction(s)).toEqual({ kind: "none" })
    }
  })

  it("only fulfils what is not fulfilled yet", () => {
    expect(
      remainingToFulfill({
        items: [
          { id: "a", quantity: 2, detail: { fulfilled_quantity: 1 } },
          { id: "b", quantity: 1, detail: { fulfilled_quantity: 1 } },
          { id: "c", quantity: "3", detail: null },
          { id: "d", quantity: { numeric: 2 }, detail: { fulfilled_quantity: { numeric: 0 } } },
          { id: "e", quantity: undefined, detail: { quantity: 1, fulfilled_quantity: 0 } },
        ],
      })
    ).toEqual([
      { id: "a", quantity: 1 },
      { id: "c", quantity: 3 },
      { id: "d", quantity: 2 },
      { id: "e", quantity: 1 },
    ])
  })
})
