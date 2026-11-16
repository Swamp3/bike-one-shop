// One-time import, do not re-run: its category handles predate the restructure in src/migration-scripts/restructure-categories.ts.
/**
 * Imports the real bike catalogue from the old WooCommerce shop.
 *
 *   WOO_EXPORT_DIR=~/bikeone-wp-export npx medusa exec ./src/scripts/import-woo-catalog.ts
 *
 * Input: the files `scripts/wp-export.sh products` writes (products.ndjson,
 * variations.ndjson, media/), plus the colour table in
 * ./data/woo-colour-swatches.json (scripts/woo-colour-swatches.py).
 *
 * What it does:
 * - prices are gross (German B2C), so the EUR and region price preferences are
 *   switched to tax-inclusive
 * - every product that did not come from WooCommerce (the dev seed) is set to
 *   draft, and its handle gets a "-seed" suffix if a Woo product needs it.
 *   Nothing is deleted: orders, carts and TriCon links keep working.
 * - creates one product per published Woo product: brand = collection, Woo
 *   category = category, Schaltung/Farbe/... = product options, one variant per
 *   Woo variation, images uploaded through the file module and linked to their
 *   variants
 *
 * Re-running skips products that already exist (matched by metadata.woo_id).
 */
import fs from "fs"
import os from "os"
import path from "path"
import {
  batchVariantImagesWorkflow,
  createCollectionsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  updatePricePreferencesWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

type WooAttribute = { name: string; option?: string; options?: string[] }
type WooImage = { id: number; src: string }
type WooProduct = {
  id: number
  name: string
  slug: string
  status: string
  categories: { name: string }[]
  brands: { name: string; slug: string }[]
  attributes: WooAttribute[]
  images: WooImage[]
}
type WooVariation = {
  variation_id: number
  parent_id: number
  status: string
  price: string
  attributes: WooAttribute[]
  image?: WooImage | null
}

const EXPORT_DIR = (process.env.WOO_EXPORT_DIR || "~/bikeone-wp-export").replace(
  /^~(?=$|\/)/,
  os.homedir()
)

/** Option order on the PDP. Unknown attribute names go last. */
const OPTION_ORDER = ["Schaltung", "Farbe", "Upgrade Laufräder", "Größe"]

/**
 * Woo variations whose attributes duplicate a sibling's. Image and price show
 * which build they really are, but guessing that would be inventing data, so
 * they are skipped until the source is fixed.
 */
const SKIP_VARIATIONS: Record<number, string> = {
  2830: "Wilier Rave SLR ID2: duplicate of 2836 (SRAM Rival / Neon Purple), price and image suggest GRX Di2 / Byte Cream",
  2923: "Factor Aluto: duplicate of 2924 (SRAM Red / Raptor Blue), price and image suggest Force / Quattro Grey",
}

const BRAND_COLLECTIONS: Record<string, { title: string; handle: string }> = {
  cervelo: { title: "Cervélo", handle: "cervelo" },
  factor: { title: "Factor", handle: "factor" },
  pinarello: { title: "Pinarello", handle: "pinarello" },
  ridley: { title: "Ridley", handle: "ridley" },
  specialized: { title: "Specialized", handle: "specialized" },
  trek: { title: "Trek", handle: "trek" },
  wilier: { title: "Wilier", handle: "wilier" },
}

const CATEGORIES: Record<string, { name: string; handle: string }> = {
  RoadBikes: { name: "Road Bikes", handle: "road-bikes" },
  GravelBikes: { name: "Gravel Bikes", handle: "gravel-bikes" },
  "TT / Triathlon": { name: "Triathlon / TT", handle: "triathlon-tt" },
}

const MATERIALS: Record<string, string> = { Carbon: "Carbon", Aluminum: "Aluminium" }

const cleanTitle = (name: string) => name.replace(/^Cervelo\b/, "Cervélo").trim()

const slugify = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

const cleanValue = (attribute: string, value: string) =>
  attribute === "Schaltung"
    ? value.trim().replace(/^sram\b/i, "SRAM").replace(/^shimano\b/i, "Shimano")
    : value.trim()

const readNdjson = <T>(file: string): T[] =>
  fs
    .readFileSync(path.join(EXPORT_DIR, file), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T)

/** Woo plugins rename AVIF/WebP files to .png/.jpg, so trust the bytes, not the name. */
const sniffImage = (buffer: Buffer): { mime: string; ext: string } | null => {
  if (buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") return { mime: "image/png", ext: "png" }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return { mime: "image/jpeg", ext: "jpg" }
  if (buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP") return { mime: "image/webp", ext: "webp" }
  if (buffer.subarray(4, 12).toString().startsWith("ftypavi")) return { mime: "image/avif", ext: "avif" }
  return null
}

export default async function importWooCatalog({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fileService = container.resolve(Modules.FILE)

  const wooProducts = readNdjson<WooProduct>("products.ndjson").filter((p) => p.status === "publish")
  const wooVariations = readNdjson<WooVariation>("variations.ndjson").filter((v) => v.status === "publish")
  const swatchTable = JSON.parse(
    fs.readFileSync(path.join(__dirname, "data/woo-colour-swatches.json"), "utf8")
  ) as Record<string, Record<string, string>>
  logger.info(`Woo export: ${wooProducts.length} published products, ${wooVariations.length} variations (${EXPORT_DIR})`)

  const report = { created: [] as string[], skipped: [] as string[], hidden: [] as string[], failed: [] as string[], notes: [] as string[] }

  // ---- Store context ------------------------------------------------------

  const { data: salesChannels } = await query.graph({ entity: "sales_channel", fields: ["id", "name"] })
  const { data: shippingProfiles } = await query.graph({ entity: "shipping_profile", fields: ["id", "type"] })
  const { data: regions } = await query.graph({ entity: "region", fields: ["id", "currency_code"] })
  const salesChannel = salesChannels[0]
  const shippingProfile = shippingProfiles.find((p) => p.type === "default") ?? shippingProfiles[0]
  const region = regions.find((r) => r.currency_code === "eur")
  if (!salesChannel || !shippingProfile || !region) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Sales channel, shipping profile or EUR region missing. Run the initial seed first.")
  }

  // ---- Gross prices -------------------------------------------------------

  const { data: pricePreferences } = await query.graph({
    entity: "price_preference",
    fields: ["id", "attribute", "value", "is_tax_inclusive"],
  })
  for (const pref of pricePreferences) {
    const relevant = (pref.attribute === "currency_code" && pref.value === "eur") || (pref.attribute === "region_id" && pref.value === region.id)
    if (relevant && !pref.is_tax_inclusive) {
      await updatePricePreferencesWorkflow(container).run({
        input: { selector: { id: [pref.id] }, update: { is_tax_inclusive: true } },
      })
      report.notes.push(`price preference ${pref.attribute}=${pref.value} is now tax-inclusive`)
    }
  }

  // ---- Existing products: keep Woo imports, hide everything else -----------

  const { data: existing } = await query.graph({ entity: "product", fields: ["id", "handle", "status", "metadata"] })
  const importedWooIds = new Set(existing.map((p) => (p.metadata as Record<string, unknown> | null)?.woo_id).filter(Boolean))
  const plannedHandles = new Set(wooProducts.map((p) => slugify(cleanTitle(p.name))))

  for (const product of existing) {
    if ((product.metadata as Record<string, unknown> | null)?.woo_id) continue
    const handle = plannedHandles.has(product.handle) ? `${product.handle}-seed` : product.handle
    if (product.status === ProductStatus.DRAFT && handle === product.handle) continue
    await updateProductsWorkflow(container).run({
      input: { products: [{ id: product.id, status: ProductStatus.DRAFT, handle }] },
    })
    report.hidden.push(handle === product.handle ? product.handle : `${product.handle} -> ${handle}`)
  }

  // ---- Collections and categories -----------------------------------------

  const { data: collections } = await query.graph({ entity: "product_collection", fields: ["id", "handle"] })
  const missingCollections = Object.values(BRAND_COLLECTIONS).filter((c) => !collections.some((e) => e.handle === c.handle))
  if (missingCollections.length) {
    const { result } = await createCollectionsWorkflow(container).run({ input: { collections: missingCollections } })
    collections.push(...result.map((c) => ({ id: c.id, handle: c.handle })) as never[])
  }
  const collectionId = (handle: string) => collections.find((c) => c.handle === handle)?.id

  const { data: categories } = await query.graph({ entity: "product_category", fields: ["id", "handle"] })
  const missingCategories = Object.values(CATEGORIES).filter((c) => !categories.some((e) => e.handle === c.handle))
  if (missingCategories.length) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: { product_categories: missingCategories.map((c) => ({ ...c, is_active: true })) },
    })
    categories.push(...result.map((c) => ({ id: c.id, handle: c.handle })) as never[])
  }
  const categoryId = (handle: string) => categories.find((c) => c.handle === handle)?.id

  // ---- Images -------------------------------------------------------------

  const uploaded = new Map<number, string>()
  const upload = async (image: WooImage): Promise<string | null> => {
    if (uploaded.has(image.id)) return uploaded.get(image.id)!
    const file = path.join(EXPORT_DIR, "media", image.src.replace(/^https?:\/\/[^/]+\//, ""))
    if (!fs.existsSync(file)) return null
    const content = fs.readFileSync(file)
    const type = sniffImage(content)
    if (!type) return null
    const [created] = await fileService.createFiles([
      {
        filename: `${path.basename(file).replace(/\.[^.]+$/, "")}.${type.ext}`,
        mimeType: type.mime,
        content: content.toString("base64"),
        access: "public",
      },
    ])
    uploaded.set(image.id, created.url)
    return created.url
  }

  // ---- Products -----------------------------------------------------------

  for (const woo of wooProducts) {
    const title = cleanTitle(woo.name)
    if (importedWooIds.has(woo.id)) {
      report.skipped.push(`${title} (already imported)`)
      continue
    }

    try {
      const brand = BRAND_COLLECTIONS[woo.brands[0]?.slug ?? ""]
      const category = CATEGORIES[woo.categories[0]?.name ?? ""]
      const material = MATERIALS[woo.attributes.find((a) => a.name === "Rahmen Material")?.options?.[0] ?? ""]

      // variations -> option combinations
      const seen = new Set<string>()
      const variations = wooVariations
        .filter((v) => v.parent_id === woo.id)
        .sort((a, b) => a.variation_id - b.variation_id)
        .filter((v) => {
          if (SKIP_VARIATIONS[v.variation_id]) {
            report.notes.push(`skipped variation ${v.variation_id}: ${SKIP_VARIATIONS[v.variation_id]}`)
            return false
          }
          const key = v.attributes.map((a) => `${a.name}=${cleanValue(a.name, a.option ?? "")}`).sort().join("|")
          if (seen.has(key)) {
            report.notes.push(`skipped variation ${v.variation_id} of ${title}: duplicate options ${key}`)
            return false
          }
          seen.add(key)
          return true
        })
      if (!variations.length) throw new MedusaError(MedusaError.Types.INVALID_DATA, "no usable variations")

      const optionTitles = [...new Set(variations.flatMap((v) => v.attributes.map((a) => a.name)))].sort(
        (a, b) => (OPTION_ORDER.indexOf(a) + 1 || 99) - (OPTION_ORDER.indexOf(b) + 1 || 99)
      )
      const optionsOf = (v: WooVariation) =>
        Object.fromEntries(optionTitles.map((t) => [t, cleanValue(t, v.attributes.find((a) => a.name === t)?.option ?? "")]))
      const variantTitle = (v: WooVariation) => Object.values(optionsOf(v)).join(" / ")

      // images: main image first, then one per distinct variation image
      const mainUrl = woo.images[0] ? await upload(woo.images[0]) : null
      const images: { url: string; metadata: Record<string, unknown> }[] = []
      if (mainUrl) images.push({ url: mainUrl, metadata: { woo_image_id: woo.images[0].id } })
      for (const v of variations) {
        if (!v.image?.id || images.some((i) => i.metadata.woo_image_id === v.image!.id)) continue
        const url = await upload(v.image)
        const colour = optionsOf(v).Farbe
        if (url) images.push({ url, metadata: { woo_image_id: v.image.id, ...(colour ? { option_title: "Farbe", option_value: colour } : {}) } })
        else report.notes.push(`${title}: image ${v.image.src} missing locally`)
      }

      const handle = slugify(title)
      const { result } = await createProductsWorkflow(container).run({
        input: {
          products: [
            {
              title,
              handle,
              status: ProductStatus.PUBLISHED,
              material,
              thumbnail: mainUrl ?? images[0]?.url,
              images,
              collection_id: brand ? collectionId(brand.handle) : undefined,
              category_ids: category ? [categoryId(category.handle)!] : [],
              shipping_profile_id: shippingProfile.id,
              sales_channels: [{ id: salesChannel.id }],
              options: optionTitles.map((t) => ({ title: t, values: [...new Set(variations.map((v) => optionsOf(v)[t]))] })),
              variants: variations.map((v) => ({
                title: variantTitle(v),
                options: optionsOf(v),
                manage_inventory: false, // no real stock yet; TriCon sync takes over later
                prices: [{ amount: Number(v.price), currency_code: "eur" }],
              })),
            },
          ] as never,
        },
      })
      const product = result[0]

      // metadata on create is dropped (see initial-data-seed.ts), so set it afterwards
      await updateProductsWorkflow(container).run({
        input: {
          products: [
            {
              id: product.id,
              metadata: {
                woo_id: woo.id,
                woo_slug: woo.slug, // old shop URL, for redirects
                color_swatches: swatchTable[String(woo.id)] ?? {},
                color_swatches_source: "auto-suggested from product photos (scripts/woo-colour-swatches.py), not manufacturer data",
              },
            },
          ],
        },
      })

      // link each variant to its photo
      const { data: created } = await query.graph({
        entity: "product",
        fields: ["id", "variants.id", "variants.title", "images.id", "images.metadata"],
        filters: { id: product.id },
      })
      const imageIdByWooId = new Map(
        (created[0].images ?? []).map((img) => [(img?.metadata as Record<string, unknown> | null)?.woo_image_id, img!.id])
      )
      for (const v of variations) {
        const variant = created[0].variants?.find((x) => x?.title === variantTitle(v))
        const imageId = v.image?.id ? imageIdByWooId.get(v.image.id) : undefined
        if (variant && imageId) {
          await batchVariantImagesWorkflow(container).run({ input: { variant_id: variant.id, add: [imageId] } })
        }
      }

      report.created.push(`${title} (${handle}, ${variations.length} variants, ${images.length} images)`)
      logger.info(`Imported ${title}`)
    } catch (error) {
      report.failed.push(`${title}: ${(error as Error).message}`)
      logger.error(`Failed ${title}: ${(error as Error).message}`)
    }
  }

  // ---- Search index (same reason as seed-demo-products.ts) ----------------

  const search = container.resolve(Modules.SEARCH)
  const { data: allProducts } = await query.graph({ entity: "product", fields: ["id"] })
  for (let i = 0; i < allProducts.length; i += 25) {
    await search.ingest({ name: "product.created", data: allProducts.slice(i, i + 25).map((p) => ({ id: p.id })) } as never)
  }

  // ---- Report -------------------------------------------------------------

  const section = (name: string, rows: string[]) => logger.info(`${name} (${rows.length}):${rows.map((r) => `\n  - ${r}`).join("")}`)
  section("Created", report.created)
  section("Skipped", report.skipped)
  section("Hidden (set to draft)", report.hidden)
  section("Notes", report.notes)
  section("Failed", report.failed)
}
