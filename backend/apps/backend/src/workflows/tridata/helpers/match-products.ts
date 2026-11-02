import type { TridataArtikel, TridataGrFaKombi } from "../../../lib/tridata/types"

export type ShopVariant = {
  id: string
  sku: string | null
  product_id: string
}

export type ProductMatch = {
  variant_id: string
  product_id: string
  artikel_id: string
  artikel_gr_fa_kombi_id: string | null
  artikelnummer: string
  match_key: string
  grfa: boolean
  ean: string | null
}

export type MatchResult = {
  matches: ProductMatch[]
  /** TriBike keys (Kombi.Artikelnummer / Artikel.Matchcode or ArtikelNummer) with no shop variant. */
  unmatchedTridata: string[]
  /** Shop SKUs with no TriBike item. */
  unmatchedShop: string[]
  /**
   * Keys that are ambiguous and therefore not linked at all: a SKU shared by
   * several shop variants, or a match key used by several TriBike records.
   * The affected variants/records also appear in unmatchedShop/unmatchedTridata.
   */
  conflicts: string[]
}

const norm = (value: string | null | undefined) => (value ?? "").trim()

/**
 * Contract matching rules (tricon-mock-contract.md, "Catalog model"):
 * GrFa items match per variant on ArtikelGrFaKombi.Artikelnummer = SKU;
 * non-GrFa items match on Artikel.Matchcode = SKU.
 */
export function matchProducts(
  artikel: TridataArtikel[],
  kombis: TridataGrFaKombi[],
  variants: ShopVariant[]
): MatchResult {
  const countKeys = (keys: string[]) => {
    const counts = new Map<string, number>()
    for (const key of keys.filter(Boolean)) {
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return new Set([...counts].filter(([, n]) => n > 1).map(([key]) => key))
  }
  const artikelById = new Map(artikel.map((a) => [a.ArtikelID, a]))
  // Kombis count unless their parent is known to be a non-GrFa item (same rule as below).
  const usableKombis = kombis.filter((k) => artikelById.get(k.Artikel)?.GrFa !== false)
  const duplicateShopSkus = countKeys(variants.map((v) => norm(v.sku)))
  const duplicateTridataKeys = countKeys([
    ...usableKombis.map((k) => norm(k.Artikelnummer)),
    ...artikel.filter((a) => !a.GrFa).map((a) => norm(a.Matchcode)),
  ])
  const conflictKeys = new Set([...duplicateShopSkus, ...duplicateTridataKeys])

  const variantsBySku = new Map<string, ShopVariant>()
  for (const variant of variants) {
    const sku = norm(variant.sku)
    if (sku && !conflictKeys.has(sku)) {
      variantsBySku.set(sku, variant)
    }
  }
  const matched = new Set<string>()
  const matches: ProductMatch[] = []
  const unmatchedTridata: string[] = []

  for (const kombi of usableKombis) {
    const parent = artikelById.get(kombi.Artikel)
    const key = norm(kombi.Artikelnummer)
    const variant = key ? variantsBySku.get(key) : undefined
    if (!variant || matched.has(variant.id)) {
      unmatchedTridata.push(key || kombi.ArtikelGrFaKombiID)
      continue
    }
    matched.add(variant.id)
    matches.push({
      variant_id: variant.id,
      product_id: variant.product_id,
      artikel_id: kombi.Artikel,
      artikel_gr_fa_kombi_id: kombi.ArtikelGrFaKombiID,
      artikelnummer: parent?.ArtikelNummer ?? "",
      match_key: key,
      grfa: true,
      ean: norm(kombi.EAN) || norm(kombi.Barcode) || null,
    })
  }

  for (const item of artikel) {
    if (item.GrFa) {
      continue
    }
    const key = norm(item.Matchcode)
    const variant = key ? variantsBySku.get(key) : undefined
    if (!variant || matched.has(variant.id)) {
      unmatchedTridata.push(key || item.ArtikelNummer)
      continue
    }
    matched.add(variant.id)
    matches.push({
      variant_id: variant.id,
      product_id: variant.product_id,
      artikel_id: item.ArtikelID,
      artikel_gr_fa_kombi_id: null,
      artikelnummer: item.ArtikelNummer,
      match_key: key,
      grfa: false,
      ean: norm(item.EAN) || null,
    })
  }

  const unmatchedShop = variants
    .filter((v) => !matched.has(v.id))
    .map((v) => norm(v.sku) || v.id)

  return {
    matches,
    unmatchedTridata,
    unmatchedShop,
    conflicts: [...conflictKeys].sort(),
  }
}
