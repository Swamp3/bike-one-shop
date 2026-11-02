import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { getTridataConfig } from "../../../lib/tridata/config"
import {
  ensureTridataConfigured,
  getTridataClient,
  getTridataSyncService,
  trackedCall,
  updateCursor,
  writeRunSummary,
} from "../helpers/tracked-call"
import { payloadHash } from "../helpers/hash"
import { matchProducts, ShopVariant } from "../helpers/match-products"
import { STOCK_STREAMS } from "./sync-stock"

export type LinkProductsSummary = {
  status: "success" | "failed" | "skipped"
  tridataArtikel: number
  tridataKombis: number
  shopVariants: number
  matched: number
  created: number
  updated: number
  unchanged: number
  removed: number
  /** Inventory levels set to 0 available because their variant lost its link. */
  levelsZeroed: number
  unmatchedTridataCount: number
  unmatchedShopCount: number
  unmatchedTridata: string[]
  unmatchedShop: string[]
  conflicts: string[]
  error?: string
}

type LevelWrite = {
  inventory_item_id: string
  location_id: string
  stocked_quantity: number
}

export type LinkProductsStepOutput = {
  startedAt: number
  summary: LinkProductsSummary
  linksChanged: boolean
  /** Unlinked variants' levels at mapped locations: stocked = reserved (0 available). */
  zeroLevels: LevelWrite[]
  zeroedSkus: string[]
}

const SAMPLE = 50

const emptySummary = (): LinkProductsSummary => ({
  status: "skipped",
  tridataArtikel: 0,
  tridataKombis: 0,
  shopVariants: 0,
  matched: 0,
  created: 0,
  updated: 0,
  unchanged: 0,
  removed: 0,
  levelsZeroed: 0,
  unmatchedTridataCount: 0,
  unmatchedShopCount: 0,
  unmatchedTridata: [],
  unmatchedShop: [],
  conflicts: [],
})

export const linkTridataProductsStep = createStep(
  "link-tridata-products",
  async (_input: Record<string, never>, { container }) => {
    const output: LinkProductsStepOutput = {
      startedAt: Date.now(),
      summary: emptySummary(),
      linksChanged: false,
      zeroLevels: [],
      zeroedSkus: [],
    }
    if (!ensureTridataConfigured(container)) {
      return new StepResponse(output)
    }
    const client = getTridataClient(container)
    const service = getTridataSyncService(container)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    await updateCursor(container, "catalog", { last_run_at: new Date() })

    const artikelRes = await trackedCall(
      container,
      { functionName: "DownloadArtikelAll", direction: "inbound", entityType: "catalog" },
      () => client.downloadArtikelAll(),
      (data) => ({ records: data.length })
    )
    const kombiRes = artikelRes.ok
      ? await trackedCall(
          container,
          { functionName: "DownloadGrFaKombi", direction: "inbound", entityType: "catalog" },
          () => client.downloadGrFaKombi(),
          (data) => ({ records: data.length })
        )
      : null

    if (!artikelRes.ok || !kombiRes?.ok) {
      const error = !artikelRes.ok
        ? artikelRes.error.message
        : kombiRes && !kombiRes.ok
          ? kombiRes.error.message
          : "unknown error"
      output.summary = { ...output.summary, status: "failed", error }
      return new StepResponse(output)
    }

    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "sku", "product_id", "inventory_items.inventory_item_id"],
    })
    const shopVariants = variants as unknown as (ShopVariant & {
      inventory_items?: { inventory_item_id: string }[]
    })[]
    const result = matchProducts(artikelRes.data, kombiRes.data, shopVariants)

    const existing = await service.listTridataProductMaps({}, { take: null })
    const existingByVariant = new Map(existing.map((row) => [row.variant_id, row]))
    const now = new Date()
    const toCreate: Record<string, unknown>[] = []
    const toUpdate: Record<string, unknown>[] = []
    let unchanged = 0

    for (const match of result.matches) {
      const hash = payloadHash(match)
      const row = existingByVariant.get(match.variant_id)
      if (!row) {
        toCreate.push({ ...match, payload_hash: hash, last_synced_at: now })
      } else if (row.payload_hash !== hash) {
        toUpdate.push({ id: row.id, ...match, payload_hash: hash, last_synced_at: now })
      } else {
        unchanged++
      }
    }
    const matchedVariantIds = new Set(result.matches.map((m) => m.variant_id))
    let stale = existing.filter((row) => !matchedVariantIds.has(row.variant_id))

    // Safety net: an empty catalog while links exist is far more likely a
    // TriCon-side problem than "everything went offline"; do not unlink
    // (and zero) the whole shop because of it.
    const suspiciousEmpty =
      artikelRes.data.length === 0 && kombiRes.data.length === 0 && existing.length > 0
    if (suspiciousEmpty) {
      stale = []
    }

    // Delete stale rows first so a Kombi moving to another variant cannot
    // collide with the unique index on artikel_gr_fa_kombi_id.
    if (stale.length) {
      await service.deleteTridataProductMaps(stale.map((row) => row.id))
    }
    if (toUpdate.length) {
      await service.updateTridataProductMaps(toUpdate as never)
    }
    if (toCreate.length) {
      await service.createTridataProductMaps(toCreate as never)
    }

    // A variant whose TriBike item disappeared (offline or deleted) must not
    // stay sellable on old stock: 0 available at every TriBike-mapped location.
    if (stale.length) {
      const inventoryByVariant = new Map(
        shopVariants.map((v) => [v.id, v.inventory_items?.[0]?.inventory_item_id])
      )
      const { data: locations } = await query.graph({
        entity: "stock_location",
        fields: ["id", "name"],
      })
      const mappedLocationNames = new Set(Object.values(getTridataConfig().branchMap))
      const mappedLocationIds = new Set(
        locations.filter((l) => mappedLocationNames.has(l.name)).map((l) => l.id)
      )
      const itemIds = stale
        .map((row) => inventoryByVariant.get(row.variant_id))
        .filter((id): id is string => !!id)
      if (itemIds.length && mappedLocationIds.size) {
        const inventory = container.resolve(Modules.INVENTORY)
        const levels = await inventory.listInventoryLevels(
          { inventory_item_id: itemIds },
          { take: null }
        )
        for (const level of levels) {
          const reserved = Number(level.reserved_quantity ?? 0)
          if (mappedLocationIds.has(level.location_id) && Number(level.stocked_quantity) !== reserved) {
            output.zeroLevels.push({
              inventory_item_id: level.inventory_item_id,
              location_id: level.location_id,
              stocked_quantity: reserved,
            })
          }
        }
      }
      output.zeroedSkus = stale.map((row) => row.match_key)
    }

    output.linksChanged = toCreate.length + toUpdate.length + stale.length > 0
    output.summary = {
      status: "success",
      tridataArtikel: artikelRes.data.length,
      tridataKombis: kombiRes.data.length,
      shopVariants: shopVariants.length,
      matched: result.matches.length,
      created: toCreate.length,
      updated: toUpdate.length,
      unchanged,
      removed: stale.length,
      levelsZeroed: output.zeroLevels.length,
      unmatchedTridataCount: result.unmatchedTridata.length,
      unmatchedShopCount: result.unmatchedShop.length,
      unmatchedTridata: result.unmatchedTridata.slice(0, SAMPLE),
      unmatchedShop: result.unmatchedShop.slice(0, SAMPLE),
      conflicts: result.conflicts.slice(0, SAMPLE),
      error: suspiciousEmpty
        ? "TriCon returned an empty catalog; existing links were kept"
        : undefined,
    }
    return new StepResponse(output)
  }
)

/**
 * Runs after the zeroing level writes: logs the unlinked SKUs, clears both
 * stock cursors when links changed (the next stock sync is a full one, so
 * rows previously skipped as unlinked are picked up), and writes the run
 * summary.
 */
export const finalizeTridataLinkStep = createStep(
  "finalize-tridata-link",
  async (input: LinkProductsStepOutput, { container }) => {
    const { summary } = input
    if (summary.status === "skipped") {
      return new StepResponse(summary)
    }
    if (summary.status === "failed") {
      await updateCursor(container, "catalog", { last_error: summary.error ?? null })
      return new StepResponse(summary)
    }
    if (input.zeroedSkus.length) {
      await writeRunSummary(container, {
        functionName: "unlink-zero-stock",
        direction: "inbound",
        status: "success",
        durationMs: 0,
        summary: {
          unlinkedSkus: input.zeroedSkus.slice(0, SAMPLE),
          unlinkedCount: input.zeroedSkus.length,
          levelsZeroed: input.zeroLevels.length,
        },
      })
    }
    if (input.linksChanged) {
      for (const stream of Object.values(STOCK_STREAMS)) {
        await updateCursor(container, stream, { last_change: null })
      }
    }
    await writeRunSummary(container, {
      functionName: "link-products",
      direction: "inbound",
      status: "success",
      durationMs: Date.now() - input.startedAt,
      summary: { ...summary, stockCursorsReset: input.linksChanged },
      error: summary.error,
    })
    await updateCursor(container, "catalog", {
      last_success_at: new Date(),
      last_error: summary.error ?? null,
    })
    return new StepResponse(summary)
  }
)
