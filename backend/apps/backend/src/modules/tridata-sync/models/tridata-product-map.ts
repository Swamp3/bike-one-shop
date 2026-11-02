import { model } from "@medusajs/framework/utils"

/**
 * One row per Medusa product variant matched to a TriBike item.
 * GrFa items: variant <-> ArtikelGrFaKombi (match key Kombi.Artikelnummer = SKU).
 * Non-GrFa items: variant <-> Artikel (match key Artikel.Matchcode = SKU).
 */
const TridataProductMap = model
  .define("tridata_product_map", {
    id: model.id({ prefix: "tdpm" }).primaryKey(),
    variant_id: model.text(),
    product_id: model.text(),
    artikel_id: model.text(),
    artikel_gr_fa_kombi_id: model.text().nullable(),
    artikelnummer: model.text().nullable(),
    match_key: model.text(),
    grfa: model.boolean().default(false),
    ean: model.text().nullable(),
    payload_hash: model.text().nullable(),
    last_synced_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["variant_id"], unique: true, where: "deleted_at IS NULL" },
    {
      on: ["artikel_gr_fa_kombi_id"],
      unique: true,
      where: "deleted_at IS NULL AND artikel_gr_fa_kombi_id IS NOT NULL",
    },
    { on: ["artikel_id"] },
  ])

export default TridataProductMap
