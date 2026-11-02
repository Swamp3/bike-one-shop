import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import {
  BRANCHES,
  formatDateTime,
  type Artikel,
  type GrFaKombi,
  type MockState,
  type StockBranchRow,
  type StockColorSizeBranchRow,
  type StockQuantities,
} from "./state.ts"

export type CatalogVariant = {
  id: string
  sku: string | null
  title: string
  options: { option: string; value: string }[]
  price_eur: number | null
}

export type CatalogProduct = {
  id: string
  handle: string
  title: string
  description: string | null
  variants: CatalogVariant[]
}

export type Catalog = { products: CatalogProduct[] }

export function loadCatalog(filePath: string): Catalog {
  return JSON.parse(readFileSync(filePath, "utf8")) as Catalog
}

function sha256(input: string): Buffer {
  return createHash("sha256").update(input).digest()
}

/**
 * Deterministic, lowercase GUID derived from a name (UUID v5-style layout on
 * a SHA-256 digest). Reseeding yields the same IDs, which matters because the
 * shop stores them.
 */
export function deterministicGuid(name: string): string {
  const bytes = sha256(`tricon-mock:${name}`).subarray(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString("hex")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function ean13CheckDigit(first12: string): number {
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3)
  }
  return (10 - (sum % 10)) % 10
}

/** Valid EAN-13 in the 20-29 "in-store" prefix range, derived from a key. */
export function deterministicEan(key: string): string {
  const digest = sha256(`ean:${key}`)
  let digits = ""
  for (let i = 0; digits.length < 10; i++) {
    digits += String(digest[i] % 10)
  }
  const first12 = `20${digits}`
  return `${first12}${ean13CheckDigit(first12)}`
}

/** mulberry32 seeded from a string, for deterministic stock numbers. */
function randomFor(key: string) {
  let state = sha256(`stock:${key}`).readUInt32LE(0)
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedQuantities(key: string, now: string): StockQuantities {
  const random = randomFor(key)
  const roll = random()
  let lagerbestand = 0
  let bestellt = 0
  if (roll < 0.15) {
    lagerbestand = 0
  } else if (roll < 0.25) {
    lagerbestand = 0
    bestellt = 1 + Math.floor(random() * 3)
  } else {
    lagerbestand = 1 + Math.floor(random() * 5)
    if (random() < 0.1) {
      bestellt = 1 + Math.floor(random() * 2)
    }
  }
  const reserviert = lagerbestand > 0 && random() < 0.15 ? 1 : 0
  return {
    Lagerbestand: lagerbestand,
    Reserviert: reserviert,
    Bestellt: bestellt,
    MengeVerfuegbarOverride: null,
    LastChange: now,
  }
}

const COLOR_OPTION = /farbe|colou?r/i
const SIZE_OPTION = /gr(ö|oe)(ss|ß)e|size|rahmen/i

function isDefaultOnly(variant: CatalogVariant) {
  return (
    variant.options.length === 0 ||
    variant.options.every((o) => /^default/i.test(o.value) || /^title$/i.test(o.option))
  )
}

export function round2(value: number) {
  return Math.round(value * 100) / 100
}

export function artikelNummerFor(handle: string) {
  return handle.toUpperCase().slice(0, 20)
}

export function buildSeedState(catalog: Catalog, now: Date = new Date()): MockState {
  const nowStr = formatDateTime(now)
  const artikel: Artikel[] = []
  const grfaKombi: GrFaKombi[] = []
  const stockBranch: StockBranchRow[] = []
  const stockColorSizeBranch: StockColorSizeBranchRow[] = []
  const seenNummern = new Set<string>()

  for (const product of catalog.products) {
    const variants = product.variants
    if (variants.length === 0) {
      continue
    }
    const grfa = variants.length > 1 || variants.some((v) => !isDefaultOnly(v))
    const artikelId = deterministicGuid(`artikel:${product.handle}`)
    const nummer = artikelNummerFor(product.handle)
    if (seenNummern.has(nummer)) {
      throw new Error(`ArtikelNummer collision for ${product.handle} (${nummer})`)
    }
    seenNummern.add(nummer)

    const prices = variants
      .map((v) => v.price_eur)
      .filter((p): p is number => typeof p === "number")
    const brutto = prices.length ? Math.min(...prices) : 0
    const singleSku = variants[0].sku ?? nummer
    const manufacturer = product.title.split(/\s+/)[0] ?? ""

    artikel.push({
      ArtikelID: artikelId,
      ArtikelNummer: nummer,
      ArtikelName: product.title,
      Matchcode: grfa ? nummer : singleSku,
      GrFa: grfa,
      I_VKbrutto: brutto,
      MehrwertSteuerSatz: "19",
      I_IstOnlineAktiv: true,
      LastChange: nowStr,
      CreateDate: nowStr,
      extra: {
        EAN: grfa ? "" : deterministicEan(singleSku),
        ArtikelBeschreibung: product.description ?? "",
        Kurzbeschreibung: product.title,
        QuantityUnitCode: "Stk",
        Hersteller: manufacturer,
        Warengruppe: grfa ? "Fahrräder" : "Teile",
        UVP: brutto,
        Veroeffentlichungsdatum: nowStr,
        MindestBestellmenge: 1,
        MaximalBestellmenge: 0,
        IStatus: true,
        I_Beschreibung: product.description ?? "",
        I_TextBezeichnung1: product.title,
        Rahmennummerpflichtig: grfa,
        Modelljahr: String(now.getUTCFullYear()),
      },
      source: {
        productId: product.id,
        handle: product.handle,
        variantIds: variants.map((v) => v.id),
      },
    })

    if (!grfa) {
      for (const branch of BRANCHES) {
        stockBranch.push({
          StockBranchID: deterministicGuid(`stock-branch:${artikelId}:${branch}`),
          ArtikelID: artikelId,
          Filialname: branch,
          ...seedQuantities(`${singleSku}:${branch}`, nowStr),
        })
      }
      continue
    }

    for (const variant of variants) {
      const sku = variant.sku ?? variant.id
      const kombiId = deterministicGuid(`kombi:${sku}`)
      const color = variant.options.find((o) => COLOR_OPTION.test(o.option))?.value ?? ""
      const size = variant.options.find((o) => SIZE_OPTION.test(o.option))?.value ?? ""
      const ean = deterministicEan(sku)
      grfaKombi.push({
        ArtikelGrFaKombiID: kombiId,
        Artikel: artikelId,
        Groesse: size ? deterministicGuid(`groesse:${size}`) : "",
        Farbe: color ? deterministicGuid(`farbe:${color}`) : "",
        Artikelnummer: sku,
        EAN: ean,
        Barcode: ean,
        FarbeBezeichnung: color,
        GroesseBezeichnung: size,
        CreateDate: nowStr,
        LastChange: nowStr,
        source: { variantId: variant.id },
      })
      for (const branch of BRANCHES) {
        stockColorSizeBranch.push({
          StockColorSizeBranchID: deterministicGuid(`stock-csb:${kombiId}:${branch}`),
          ArtikelID: artikelId,
          ArtikelGrFaKombinationenID: kombiId,
          Filialname: branch,
          ...seedQuantities(`${sku}:${branch}`, nowStr),
        })
      }
    }
  }

  return {
    seededAt: nowStr,
    artikel,
    grfaKombi,
    stockBranch,
    stockColorSizeBranch,
    orders: [],
    requestLog: [],
    settings: { failNextN: 0, delayMs: 0 },
    nextRequestId: 1,
  }
}
