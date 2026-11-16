/**
 * Order confirmation e-mail (§ 312i Abs. 1 Nr. 3 BGB receipt notice; § 312f
 * BGB contract confirmation on a durable medium with the Widerrufsbelehrung).
 * Pure: no I/O, so it is unit-tested. DRAFT, not legal advice.
 *
 * keep in sync with the other copy: the Widerrufsbelehrung and the
 * Muster-Widerrufsformular below mirror
 * apps/storefront/src/app/[countryCode]/(main)/widerrufsrecht/page.tsx, and
 * COMPANY mirrors apps/storefront/src/lib/data/company.ts.
 */

export const COMPANY = {
  name: "BikeOne GmbH",
  street: "Rheinstrasse 16",
  city: "26135 Oldenburg (Oldb)",
  email: "info@bike-one.de",
} as const

export type ConfirmationOrder = {
  id: string
  display_id?: number | null
  email?: string | null
  currency_code: string
  total?: number | null
  item_total?: number | null
  shipping_total?: number | null
  discount_total?: number | null
  tax_total?: number | null
  items?: {
    product_title?: string | null
    title?: string | null
    variant_title?: string | null
    quantity: number
    total?: number | null
    unit_price?: number | null
  }[]
  shipping_address?: {
    first_name?: string | null
    last_name?: string | null
    company?: string | null
    address_1?: string | null
    address_2?: string | null
    postal_code?: string | null
    city?: string | null
    country_code?: string | null
  } | null
}

export type ConfirmationEmail = { subject: string; text: string; html: string }

// Medusa v2 amounts are major units (10 = 10.00 EUR).
const money = (amount: number | null | undefined, currency: string) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount ?? 0)

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

const WITHDRAWAL_PARAGRAPHS = (c: typeof COMPANY) => [
  "Widerrufsrecht",
  "Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.",
  "Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem du oder ein von dir benannter Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen hast bzw. hat.",
  `Um dein Widerrufsrecht auszuüben, musst du uns (${c.name}, ${c.street}, ${c.city}, E-Mail: ${c.email}) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail) über deinen Entschluss, diesen Vertrag zu widerrufen, informieren. Du kannst dafür das unten stehende Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.`,
  "Zur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.",
  "Folgen des Widerrufs",
  "Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir von dir erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass du eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt hast), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über deinen Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du bei der ursprünglichen Transaktion eingesetzt hast, es sei denn, mit dir wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden dir wegen dieser Rückzahlung Entgelte berechnet.",
  "Wir können die Rückzahlung verweigern, bis wir die Waren wieder zurückerhalten haben oder bis du den Nachweis erbracht hast, dass du die Waren zurückgesandt hast, je nachdem, welches der frühere Zeitpunkt ist.",
  "Du hast die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem Tag, an dem du uns über den Widerruf dieses Vertrags unterrichtest, an uns zurückzusenden oder zu übergeben. Die Frist ist gewahrt, wenn du die Waren vor Ablauf der Frist von vierzehn Tagen absendest.",
  "Du trägst die unmittelbaren Kosten der Rücksendung der Waren.",
  "Du musst für einen etwaigen Wertverlust der Waren nur aufkommen, wenn dieser Wertverlust auf einen zum Prüfen der Beschaffenheit, Eigenschaften und Funktionsweise der Waren nicht notwendigen Umgang mit ihnen zurückzuführen ist.",
  "Wann es kein Widerrufsrecht gibt",
  "Das Widerrufsrecht gilt für Verträge, die im Fernabsatz, also zum Beispiel über diesen Online-Shop, geschlossen werden. Kaufst du in einer unserer Filialen vor Ort, besteht es nicht.",
  "Es besteht außerdem nicht bei Verträgen zur Lieferung von Waren, die nach deinen Vorgaben angefertigt werden oder eindeutig auf deine persönlichen Bedürfnisse zugeschnitten sind (§ 312g Abs. 2 Nr. 1 BGB).",
]

const FORM_LINES = (c: typeof COMPANY) => [
  `An: ${c.name}, ${c.street}, ${c.city}, E-Mail: ${c.email}`,
  "Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*):",
  "Bestellt am (*) / erhalten am (*):",
  "Name des/der Verbraucher(s):",
  "Anschrift des/der Verbraucher(s):",
  "Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier):",
  "Datum:",
  "(*) Unzutreffendes streichen.",
]

const SUBHEADINGS = new Set([
  "Widerrufsrecht",
  "Folgen des Widerrufs",
  "Wann es kein Widerrufsrecht gibt",
])

export function buildOrderConfirmationEmail(
  order: ConfirmationOrder,
  storefrontUrl: string
): ConfirmationEmail {
  const cur = order.currency_code
  const number = order.display_id ?? order.id
  const agbUrl = `${storefrontUrl.replace(/\/$/, "")}/de/agb`
  const widerrufUrl = `${storefrontUrl.replace(/\/$/, "")}/de/widerrufsrecht`

  const items = (order.items ?? []).map((i) => ({
    name: [i.product_title || i.title, i.variant_title].filter(Boolean).join(", "),
    quantity: i.quantity,
    total: money(i.total ?? (i.unit_price ?? 0) * i.quantity, cur),
  }))

  const totals: [string, string][] = [
    ["Zwischensumme", money(order.item_total, cur)],
    ["Versand", money(order.shipping_total, cur)],
    ...(order.discount_total
      ? ([["Rabatt", `-${money(order.discount_total, cur)}`]] as [string, string][])
      : []),
    ["Gesamt (inkl. MwSt.)", money(order.total, cur)],
    ["Darin enthaltene MwSt.", money(order.tax_total, cur)],
  ]

  const a = order.shipping_address
  const addressLines = a
    ? [
        a.company,
        [a.first_name, a.last_name].filter(Boolean).join(" "),
        a.address_1,
        a.address_2,
        [a.postal_code, a.city].filter(Boolean).join(" "),
        a.country_code?.toUpperCase(),
      ].filter((l): l is string => !!l)
    : []

  const intro = `vielen Dank für deine Bestellung bei BikeOne. Wir haben deine Bestellung Nr. ${number} erhalten. Dies ist die automatische Eingangsbestätigung; mit dieser E-Mail bestätigen wir dir außerdem den Vertragsinhalt.`
  const agbLine = `Es gelten unsere AGB: ${agbUrl}`
  const withdrawal = WITHDRAWAL_PARAGRAPHS(COMPANY)
  const form = FORM_LINES(COMPANY)

  const text = [
    "Hallo,",
    "",
    intro,
    "",
    "Deine Bestellung",
    ...items.map((i) => `${i.quantity} x ${i.name}: ${i.total}`),
    "",
    ...totals.map(([k, v]) => `${k}: ${v}`),
    "",
    "Lieferadresse",
    ...addressLines,
    "",
    agbLine,
    `Widerrufsrecht online: ${widerrufUrl}`,
    "",
    "Widerrufsbelehrung",
    "",
    ...withdrawal.flatMap((p) => (SUBHEADINGS.has(p) ? ["", p] : [p])),
    "",
    "Muster-Widerrufsformular",
    "(Wenn du den Vertrag widerrufen willst, kannst du dieses Formular ausfüllen und an uns zurücksenden.)",
    ...form,
    "",
    `${COMPANY.name}, ${COMPANY.street}, ${COMPANY.city}`,
  ].join("\n")

  const p = (s: string) => `<p>${esc(s)}</p>`
  const html = [
    "<p>Hallo,</p>",
    p(intro),
    "<h2>Deine Bestellung</h2>",
    '<table cellpadding="4" cellspacing="0" style="border-collapse:collapse">',
    ...items.map(
      (i) =>
        `<tr><td>${i.quantity} x ${esc(i.name)}</td><td align="right">${esc(i.total)}</td></tr>`
    ),
    '<tr><td colspan="2"><hr></td></tr>',
    ...totals.map(
      ([k, v]) => `<tr><td>${esc(k)}</td><td align="right">${esc(v)}</td></tr>`
    ),
    "</table>",
    "<h2>Lieferadresse</h2>",
    `<p>${addressLines.map(esc).join("<br>")}</p>`,
    `<p>Es gelten unsere <a href="${esc(agbUrl)}">AGB</a>. Die Widerrufsbelehrung findest du auch <a href="${esc(widerrufUrl)}">online</a>.</p>`,
    "<h2>Widerrufsbelehrung</h2>",
    ...withdrawal.map((w) => (SUBHEADINGS.has(w) ? `<p><strong>${esc(w)}</strong></p>` : p(w))),
    "<h2>Muster-Widerrufsformular</h2>",
    p("(Wenn du den Vertrag widerrufen willst, kannst du dieses Formular ausfüllen und an uns zurücksenden.)"),
    ...form.map(p),
    p(`${COMPANY.name}, ${COMPANY.street}, ${COMPANY.city}`),
  ].join("\n")

  return { subject: `Bestellbestätigung Nr. ${number} | BikeOne`, text, html }
}
