import type { HttpTypes } from "@medusajs/types"

/** Lower case, accents dropped, ß as ss: "Cervélo Straße" -> "cervelo strasse". */
export const normalizeSearchText = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // combining marks left by NFD (tsconfig targets ES5: no /u)
    .replace(/ß/g, "ss")

/**
 * Every word of `q` must occur in title, brand, category names, groupset
 * (option "Schaltung") or tags. An empty query matches everything.
 * shortcut: substring match over the first 100 products, no typo tolerance;
 * switch to the backend search index (src/search/product.ts, /store/search)
 * when the catalog grows past 100 or typo tolerance is needed.
 */
export const matchesQuery = (product: HttpTypes.StoreProduct, q: string) => {
  const words = normalizeSearchText(q).split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const text = normalizeSearchText(
    [
      product.title,
      product.collection?.title,
      ...(product.categories ?? []).map((c) => c.name),
      ...(product.options ?? [])
        .filter((o) => o.title === "Schaltung")
        .flatMap((o) => (o.values ?? []).map((v) => v.value)),
      ...(product.tags ?? []).map((t) => t.value),
    ]
      .filter(Boolean)
      .join(" ")
  )
  return words.every((w) => text.includes(w))
}
