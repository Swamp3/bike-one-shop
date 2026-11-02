/**
 * Pure mapping from a Medusa order (as loaded by the upload-order step) to
 * TriCon's UploadOrder transport object. Field list:
 * tricon-mock-contract.md, "UploadOrder field names".
 */
import type {
  TridataAdress,
  TridataCustomerExt,
  TridataOrderItem,
  TridataUploadOrderTO,
} from "../../../lib/tridata/types"

type MoneyLike = number | string | { numeric?: unknown; value?: unknown } | null | undefined

export type SourceAddress = {
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  postal_code?: string | null
  country_code?: string | null
  phone?: string | null
} | null

export type SourceLineItem = {
  id: string
  title?: string | null
  product_title?: string | null
  variant_title?: string | null
  variant_id?: string | null
  variant_sku?: string | null
  quantity: MoneyLike
  unit_price: MoneyLike
  total?: MoneyLike
  created_at?: string | Date | null
}

export type SourcePayment = {
  provider_id?: string | null
  captured_at?: string | Date | null
}

export type SourceOrder = {
  id: string
  display_id: number
  email?: string | null
  created_at: string | Date
  customer?: { has_account?: boolean | null } | null
  billing_address?: SourceAddress
  shipping_address?: SourceAddress
  items: SourceLineItem[]
  shipping_methods?: {
    name?: string | null
    amount?: MoneyLike
    total?: MoneyLike
    shipping_option_id?: string | null
  }[]
  shipping_total?: MoneyLike
  payment_collections?: {
    status?: string | null
    payments?: SourcePayment[] | null
    payment_sessions?: { provider_id?: string | null }[] | null
  }[]
}

export type ProductMapEntry = {
  artikel_id: string
  artikel_gr_fa_kombi_id: string | null
  grfa: boolean
  ean: string | null
}

export type BuildUploadOrderInput = {
  order: SourceOrder
  productMaps: Record<string, ProductMapEntry>
  /** TriBike Filialname for Click & Collect orders, null for shipped orders. */
  pickupFilialname: string | null
  /** Defaults to order.display_id (callers pass display_id + TRIDATA_ORDER_ID_OFFSET). */
  webShopOrderId?: number
  /** Phone numbers are only sent when explicitly enabled (TRIDATA_SEND_PHONE). */
  sendPhone?: boolean
}

export type BuildUploadOrderResult = {
  to: TridataUploadOrderTO
  bezahlt: boolean
  /** SKUs / item ids of lines without a TridataProductMap entry. */
  unmappedItems: string[]
}

// Fixed lookup tables, kept small on purpose: TriBike auto-creates unknown
// Zahlungs-/Lieferbedingungen, so values must come from an agreed set.
export const PAYMENT_TERMS: { match: RegExp; term: string }[] = [
  { match: /sumup/i, term: "SumUp" },
  { match: /paypal/i, term: "PayPal" },
]
export const DEFAULT_PAYMENT_TERM = "Vorkasse"
export const DELIVERY_TERM_SHIPPING = "Versand"
export const DELIVERY_TERM_PICKUP = "Abholung"

const COUNTRY_NAMES: Record<string, string> = {
  de: "Deutschland",
  at: "Österreich",
  ch: "Schweiz",
  nl: "Niederlande",
}

const EU_COUNTRIES = new Set([
  "at", "be", "bg", "cy", "cz", "dk", "ee", "es", "fi", "fr", "gr", "hr", "hu",
  "ie", "it", "lt", "lu", "lv", "mt", "nl", "pl", "pt", "ro", "se", "si", "sk",
])

export function toAmount(value: MoneyLike): number {
  if (value === null || value === undefined) {
    return 0
  }
  if (typeof value === "number") {
    return value
  }
  if (typeof value === "string") {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }
  const inner = value.numeric ?? value.value
  const n = Number(inner)
  return Number.isFinite(n) ? n : 0
}

const round2 = (n: number) => Math.round(n * 100) / 100
const clean = (value: string | null | undefined) => (value ?? "").trim()

function fullName(address: SourceAddress): string {
  return [clean(address?.first_name), clean(address?.last_name)]
    .filter(Boolean)
    .join(" ")
}

function street(address: SourceAddress): string {
  return [clean(address?.address_1), clean(address?.address_2)]
    .filter(Boolean)
    .join(", ")
}

function countryName(code: string | null | undefined): string {
  const c = clean(code).toLowerCase()
  return COUNTRY_NAMES[c] ?? c.toUpperCase()
}

function vatCode(code: string | null | undefined): TridataCustomerExt["Mehrwertsteuercode"] {
  const c = clean(code).toLowerCase()
  if (!c || c === "de") {
    return "Inland"
  }
  return EU_COUNTRIES.has(c) ? "Ausland EU" : "Ausland"
}

const ADDRESS_KEYS = [
  "first_name",
  "last_name",
  "company",
  "address_1",
  "address_2",
  "city",
  "postal_code",
  "country_code",
] as const

export function addressesDiffer(a: SourceAddress, b: SourceAddress): boolean {
  if (!a || !b) {
    return false
  }
  return ADDRESS_KEYS.some(
    (key) => clean(a[key]).toLowerCase() !== clean(b[key]).toLowerCase()
  )
}

export function resolvePaymentTerm(order: SourceOrder): string {
  const providers = (order.payment_collections ?? []).flatMap((pc) => [
    ...(pc.payments ?? []).map((p) => clean(p.provider_id)),
    ...(pc.payment_sessions ?? []).map((s) => clean(s.provider_id)),
  ])
  for (const provider of providers) {
    const hit = PAYMENT_TERMS.find((t) => t.match.test(provider))
    if (hit) {
      return hit.term
    }
  }
  return DEFAULT_PAYMENT_TERM
}

/** Paid = a payment collection is completed or a payment was captured. Returns the capture time. */
export function resolvePaid(order: SourceOrder): { paid: boolean; paidAt: Date | null } {
  const captures = (order.payment_collections ?? [])
    .flatMap((pc) => pc.payments ?? [])
    .map((p) => (p.captured_at ? new Date(p.captured_at) : null))
    .filter((d): d is Date => !!d && !Number.isNaN(d.getTime()))
  const completed = (order.payment_collections ?? []).some(
    (pc) => pc.status === "completed"
  )
  if (!captures.length && !completed) {
    return { paid: false, paidAt: null }
  }
  const paidAt = captures.length
    ? new Date(Math.max(...captures.map((d) => d.getTime())))
    : new Date(order.created_at)
  return { paid: true, paidAt }
}

function sortedItems(items: SourceLineItem[]): SourceLineItem[] {
  return [...items].sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0
    return ta !== tb ? ta - tb : a.id.localeCompare(b.id)
  })
}

export function buildUploadOrderPayload(
  input: BuildUploadOrderInput
): BuildUploadOrderResult {
  const { order, productMaps, pickupFilialname } = input
  const sendPhone = input.sendPhone === true
  const billing = order.billing_address ?? order.shipping_address ?? null
  const shipping = order.shipping_address ?? null
  const email = clean(order.email)
  const { paid, paidAt } = resolvePaid(order)

  const customer: TridataCustomerExt = {
    Kundenname: fullName(billing) || clean(billing?.company) || email,
    Name2: clean(billing?.company) || undefined,
    Mehrwertsteuercode: vatCode(billing?.country_code),
    Telefon: sendPhone ? clean(billing?.phone) || undefined : undefined,
    Email: email,
    Mailingsperre: true,
    UserID: email,
    Strasse: street(billing) || undefined,
    Ort: clean(billing?.city) || undefined,
    Land: billing?.country_code ? countryName(billing.country_code) : undefined,
    Postleitzahl: clean(billing?.postal_code) || undefined,
    IsOneTimeCustomer: !order.customer?.has_account,
  }

  // Only when goods are shipped somewhere other than the customer's address.
  let deliverAdress: TridataAdress | undefined
  if (!pickupFilialname && shipping && addressesDiffer(shipping, billing)) {
    deliverAdress = {
      Name: fullName(shipping) || clean(shipping.company) || customer.Kundenname,
      Name2: fullName(shipping) ? clean(shipping.company) || undefined : undefined,
      Strasse: street(shipping) || undefined,
      Ort: clean(shipping.city) || undefined,
      Land: shipping.country_code ? countryName(shipping.country_code) : undefined,
      Postleitzahl: clean(shipping.postal_code) || undefined,
      Telefonnummer: sendPhone ? clean(shipping.phone) || undefined : undefined,
    }
  }

  const unmappedItems: string[] = []
  const lines: TridataOrderItem[] = sortedItems(order.items).map((item, index) => {
    const quantity = toAmount(item.quantity)
    const total = item.total !== undefined && item.total !== null
      ? toAmount(item.total)
      : toAmount(item.unit_price) * quantity
    const unitGross = quantity ? total / quantity : toAmount(item.unit_price)
    const map = item.variant_id ? productMaps[item.variant_id] : undefined
    if (!map) {
      unmappedItems.push(clean(item.variant_sku) || item.id)
    }
    const name = [clean(item.product_title) || clean(item.title), clean(item.variant_title)]
      .filter(Boolean)
      .join(" - ")
    return {
      WebshopArtikelnummer: clean(item.variant_sku),
      Bezeichnung: name,
      VKBrutto: round2(unitGross),
      SummeVKBrutto: round2(total),
      Quantity: quantity,
      ArtikelGrFaKombiID: map?.grfa ? map.artikel_gr_fa_kombi_id ?? undefined : undefined,
      ArtikelID: map?.artikel_id ?? "",
      Positionsnummer: index + 1,
      EAN: map?.ean ?? undefined,
    }
  })

  const shippingCost =
    order.shipping_total !== undefined && order.shipping_total !== null
      ? toAmount(order.shipping_total)
      : (order.shipping_methods ?? []).reduce(
          (sum, m) => sum + toAmount(m.total ?? m.amount),
          0
        )

  const to: TridataUploadOrderTO = {
    DeliverAdress: deliverAdress,
    Customer: customer,
    Order: {
      ausgeglichenAm: paid && paidAt ? paidAt : undefined,
      WebShopOrderID: input.webShopOrderId ?? order.display_id,
      Payment: resolvePaymentTerm(order),
      Bezahlt: paid,
      Comment: `Webshop-Bestellung ${order.display_id}`,
      OrderCompletedDate: new Date(order.created_at),
      ShippingCost: round2(shippingCost),
      DeliveryTerm: pickupFilialname ? DELIVERY_TERM_PICKUP : DELIVERY_TERM_SHIPPING,
      Filialname: pickupFilialname ?? "",
    },
    OrderItemsList: { OrderItemsObj: lines },
  }

  return { to, bezahlt: paid, unmappedItems }
}
