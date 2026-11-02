import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { getTridataConfig } from "../../../lib/tridata/config"
import { formatTridataDateTime, parseTridataDateTime } from "../../../lib/tridata/soap"
import type {
  TridataStockBranch,
  TridataStockColorSizeBranch,
} from "../../../lib/tridata/types"
import { TRIDATA_STOCK_SNAPSHOT_MODULE } from "../../../modules/tridata-stock-snapshot"
import type TridataStockSnapshotModuleService from "../../../modules/tridata-stock-snapshot/service"
import { payloadHash } from "../helpers/hash"
import {
  ensureTridataConfigured,
  getCursor,
  getTridataClient,
  getTridataSyncService,
  trackedCall,
  updateCursor,
  writeRunSummary,
} from "../helpers/tracked-call"

export const STOCK_STREAMS = {
  branch: "stock_branch",
  colorSize: "stock_color_size_branch",
} as const

type StreamKey = keyof typeof STOCK_STREAMS

type SnapshotWrite = {
  id?: string
  inventory_item_id: string
  stock_location_id: string
  variant_id: string
  sku: string | null
  filialname: string
  source: "branch" | "color_size_branch"
  lagerbestand: number
  reserviert: number
  bestellt: number
  menge_verfuegbar: number
  tribike_last_change: string | null
  payload_hash: string
}

type LevelWrite = {
  inventory_item_id: string
  location_id: string
  stocked_quantity: number
}

type CursorWrite = { stream: string; last_change: string | null }

export type SyncStockResult = FetchStockOutput["counts"] & {
  status: "success" | "failed" | "skipped"
  full: boolean
  errors: { stream: string; error: string }[]
}

export type FetchStockOutput = {
  configured: boolean
  startedAt: number
  full: boolean
  levelCreates: LevelWrite[]
  levelUpdates: LevelWrite[]
  snapshots: SnapshotWrite[]
  cursors: CursorWrite[]
  errors: { stream: string; error: string }[]
  /** Samples of rows that could not be applied (no link / branch / inventory item). */
  skipped: { unmappedItem: string[]; unmappedBranch: string[]; noInventoryItem: string[] }
  counts: {
    rows: number
    unmappedItem: number
    unmappedBranch: number
    noInventoryItem: number
    unchanged: number
    levelsCreated: number
    levelsUpdated: number
    snapshotsWritten: number
  }
}

/** Contract: stocked_quantity = floor(MengeVerfuegbar) + reserved_quantity. */
export function desiredStockedQuantity(mengeVerfuegbar: number, reserved: number) {
  return Math.max(0, Math.floor(mengeVerfuegbar)) + Math.max(0, reserved)
}

/**
 * Newest LastChange among the rows, compared as timestamps (contract: no
 * offset = UTC), returned in TriCon's own format for the next Delta call.
 * Rows with an unparseable LastChange are ignored for the watermark.
 */
export function maxLastChange(
  rows: { LastChange: string }[],
  fallback: string | null
): string | null {
  let max = parseTridataDateTime(fallback)
  for (const row of rows) {
    const t = parseTridataDateTime(row.LastChange)
    if (t && (!max || t.getTime() > max.getTime())) {
      max = t
    }
  }
  // Truncating to whole seconds is safe: Delta is inclusive (>=).
  return max ? formatTridataDateTime(max) : fallback
}

/** Nightly full sync: due once per day after 03:00 server-local time. */
export function isNightlyFullSyncDue(
  lastFullSuccessAt: Date | string | null | undefined,
  now = new Date(),
  hour = 3
): boolean {
  const boundary = new Date(now)
  boundary.setHours(hour, 0, 0, 0)
  if (now < boundary) {
    boundary.setDate(boundary.getDate() - 1)
  }
  return !lastFullSuccessAt || new Date(lastFullSuccessAt) < boundary
}

export const STOCK_FULL_STREAM = "stock_full"

export const fetchTridataStockStep = createStep(
  "fetch-tridata-stock",
  async (input: { force?: boolean }, { container }) => {
    const output: FetchStockOutput = {
      configured: false,
      startedAt: Date.now(),
      full: false,
      levelCreates: [],
      levelUpdates: [],
      snapshots: [],
      cursors: [],
      errors: [],
      skipped: { unmappedItem: [], unmappedBranch: [], noInventoryItem: [] },
      counts: {
        rows: 0,
        unmappedItem: 0,
        unmappedBranch: 0,
        noInventoryItem: 0,
        unchanged: 0,
        levelsCreated: 0,
        levelsUpdated: 0,
        snapshotsWritten: 0,
      },
    }
    if (!ensureTridataConfigured(container)) {
      return new StepResponse(output)
    }
    output.configured = true
    const client = getTridataClient(container)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const inventory = container.resolve(Modules.INVENTORY)
    const snapshotService = container.resolve<TridataStockSnapshotModuleService>(
      TRIDATA_STOCK_SNAPSHOT_MODULE
    )
    const syncService = getTridataSyncService(container)
    const { branchMap } = getTridataConfig()

    // --- Download both streams (delta when a cursor exists and not forced) ---
    const cursors: Record<StreamKey, string | null> = { branch: null, colorSize: null }
    for (const key of Object.keys(STOCK_STREAMS) as StreamKey[]) {
      const cursor = input.force ? null : await getCursor(container, STOCK_STREAMS[key])
      cursors[key] = cursor?.last_change ?? null
      await updateCursor(container, STOCK_STREAMS[key], { last_run_at: new Date() })
    }
    output.full = !cursors.branch && !cursors.colorSize

    const branchRes = await trackedCall(
      container,
      {
        functionName: cursors.branch ? "DownloadStockBranchDelta" : "DownloadStockBranch",
        direction: "inbound",
        entityType: "stock",
        summary: { lastChange: cursors.branch },
      },
      () => client.downloadStockBranch(cursors.branch),
      (data) => ({ records: data.length })
    )
    const colorRes = await trackedCall(
      container,
      {
        functionName: cursors.colorSize
          ? "DownloadStockColorSizeBranchDelta"
          : "DownloadStockColorSizeBranch",
        direction: "inbound",
        entityType: "stock",
        summary: { lastChange: cursors.colorSize },
      },
      () => client.downloadStockColorSizeBranch(cursors.colorSize),
      (data) => ({ records: data.length })
    )

    const branchRows: TridataStockBranch[] = branchRes.ok ? branchRes.data : []
    const colorRows: TridataStockColorSizeBranch[] = colorRes.ok ? colorRes.data : []
    if (branchRes.ok) {
      output.cursors.push({
        stream: STOCK_STREAMS.branch,
        last_change: maxLastChange(branchRows, cursors.branch),
      })
    } else {
      output.errors.push({ stream: STOCK_STREAMS.branch, error: branchRes.error.message })
    }
    if (colorRes.ok) {
      output.cursors.push({
        stream: STOCK_STREAMS.colorSize,
        last_change: maxLastChange(colorRows, cursors.colorSize),
      })
    } else {
      output.errors.push({ stream: STOCK_STREAMS.colorSize, error: colorRes.error.message })
    }
    output.counts.rows = branchRows.length + colorRows.length
    if (!output.counts.rows) {
      return new StepResponse(output)
    }

    // --- Resolve TriBike ids -> variant -> inventory item, Filialname -> location ---
    const maps = await syncService.listTridataProductMaps({}, { take: null })
    const byKombi = new Map(
      maps.filter((m) => m.artikel_gr_fa_kombi_id).map((m) => [m.artikel_gr_fa_kombi_id!, m])
    )
    const byArtikel = new Map(maps.filter((m) => !m.grfa).map((m) => [m.artikel_id, m]))

    const { data: locations } = await query.graph({
      entity: "stock_location",
      fields: ["id", "name"],
    })
    const locationByName = new Map(locations.map((l) => [l.name, l.id]))

    const variantIds = maps.map((m) => m.variant_id)
    const { data: variants } = variantIds.length
      ? await query.graph({
          entity: "product_variant",
          fields: ["id", "sku", "inventory_items.inventory_item_id"],
          filters: { id: variantIds },
        })
      : { data: [] as never[] }
    const inventoryItemByVariant = new Map<string, { inventoryItemId: string; sku: string | null }>()
    for (const v of variants as unknown as {
      id: string
      sku: string | null
      inventory_items?: { inventory_item_id: string }[]
    }[]) {
      // Bikes are single-inventory-item variants; kits/bundles are not synced.
      const item = v.inventory_items?.[0]?.inventory_item_id
      if (item) {
        inventoryItemByVariant.set(v.id, { inventoryItemId: item, sku: v.sku })
      }
    }

    type Candidate = Omit<SnapshotWrite, "id" | "payload_hash"> & { row: TridataStockBranch }
    const candidates = new Map<string, Candidate>()
    const collect = (
      row: TridataStockBranch,
      map: (typeof maps)[number] | undefined,
      source: SnapshotWrite["source"]
    ) => {
      // Skipped rows are not lost: they are counted and sampled here, a
      // link-products run that changes links resets the cursors (next run is
      // full), and the nightly full sync re-reads everything.
      const sample = (list: string[], key: string) => {
        if (list.length < 20) {
          list.push(key)
        }
      }
      const rowKey =
        "ArtikelGrFaKombinationenID" in row
          ? `${(row as TridataStockColorSizeBranch).ArtikelGrFaKombinationenID}@${row.Filialname}`
          : `${row.ArtikelID}@${row.Filialname}`
      if (!map) {
        output.counts.unmappedItem++
        sample(output.skipped.unmappedItem, rowKey)
        return
      }
      const locationName = branchMap[row.Filialname]
      const locationId = locationName ? locationByName.get(locationName) : undefined
      if (!locationId) {
        output.counts.unmappedBranch++
        sample(output.skipped.unmappedBranch, row.Filialname || "(empty)")
        return
      }
      const inv = inventoryItemByVariant.get(map.variant_id)
      if (!inv) {
        output.counts.noInventoryItem++
        sample(output.skipped.noInventoryItem, map.match_key)
        return
      }
      candidates.set(`${inv.inventoryItemId}:${locationId}`, {
        inventory_item_id: inv.inventoryItemId,
        stock_location_id: locationId,
        variant_id: map.variant_id,
        sku: inv.sku,
        filialname: row.Filialname,
        source,
        lagerbestand: row.Lagerbestand,
        reserviert: row.Reserviert,
        bestellt: row.Bestellt,
        menge_verfuegbar: row.MengeVerfuegbar,
        tribike_last_change: row.LastChange || null,
        row,
      })
    }
    for (const row of branchRows) {
      collect(row, byArtikel.get(row.ArtikelID), "branch")
    }
    for (const row of colorRows) {
      collect(row, byKombi.get(row.ArtikelGrFaKombinationenID), "color_size_branch")
    }
    if (!candidates.size) {
      return new StepResponse(output)
    }

    const itemIds = [...new Set([...candidates.values()].map((c) => c.inventory_item_id))]
    const levels = await inventory.listInventoryLevels(
      { inventory_item_id: itemIds },
      { take: null }
    )
    const levelByKey = new Map(levels.map((l) => [`${l.inventory_item_id}:${l.location_id}`, l]))
    const snapshots = await snapshotService.listTridataStockSnapshots(
      { inventory_item_id: itemIds },
      { take: null }
    )
    const snapshotByKey = new Map(
      snapshots.map((s) => [`${s.inventory_item_id}:${s.stock_location_id}`, s])
    )

    for (const [key, candidate] of candidates) {
      const { row, ...fields } = candidate
      const hash = payloadHash({
        l: row.Lagerbestand,
        r: row.Reserviert,
        b: row.Bestellt,
        m: row.MengeVerfuegbar,
        f: row.Filialname,
        v: candidate.variant_id,
      })
      const existingSnapshot = snapshotByKey.get(key)
      const level = levelByKey.get(key)
      let changed = false
      if (!level) {
        output.levelCreates.push({
          inventory_item_id: candidate.inventory_item_id,
          location_id: candidate.stock_location_id,
          stocked_quantity: desiredStockedQuantity(row.MengeVerfuegbar, 0),
        })
        changed = true
      } else {
        const desired = desiredStockedQuantity(
          row.MengeVerfuegbar,
          Number(level.reserved_quantity ?? 0)
        )
        if (Number(level.stocked_quantity) !== desired) {
          output.levelUpdates.push({
            inventory_item_id: candidate.inventory_item_id,
            location_id: candidate.stock_location_id,
            stocked_quantity: desired,
          })
          changed = true
        }
      }
      if (!existingSnapshot || existingSnapshot.payload_hash !== hash) {
        output.snapshots.push({ id: existingSnapshot?.id, ...fields, payload_hash: hash })
        changed = true
      }
      if (!changed) {
        output.counts.unchanged++
      }
    }
    output.counts.levelsCreated = output.levelCreates.length
    output.counts.levelsUpdated = output.levelUpdates.length
    output.counts.snapshotsWritten = output.snapshots.length
    return new StepResponse(output)
  }
)

/**
 * Runs after the inventory levels were written: stores snapshots, advances
 * cursors (only for streams whose download succeeded) and writes the run
 * summary row.
 */
export const persistTridataStockStep = createStep(
  "persist-tridata-stock",
  async (input: FetchStockOutput, { container }) => {
    if (!input.configured) {
      const skipped: SyncStockResult = {
        status: "skipped",
        full: false,
        ...input.counts,
        errors: [],
      }
      return new StepResponse(skipped)
    }
    const snapshotService = container.resolve<TridataStockSnapshotModuleService>(
      TRIDATA_STOCK_SNAPSHOT_MODULE
    )
    const now = new Date()
    const creates = input.snapshots
      .filter((s) => !s.id)
      .map(({ id: _id, ...rest }) => ({ ...rest, last_synced_at: now }))
    const updates = input.snapshots
      .filter((s) => s.id)
      .map((s) => ({ ...s, id: s.id!, last_synced_at: now }))
    if (creates.length) {
      await snapshotService.createTridataStockSnapshots(creates)
    }
    if (updates.length) {
      await snapshotService.updateTridataStockSnapshots(updates)
    }
    for (const cursor of input.cursors) {
      await updateCursor(container, cursor.stream, {
        last_change: cursor.last_change,
        last_success_at: now,
        last_error: null,
      })
    }
    for (const failure of input.errors) {
      await updateCursor(container, failure.stream, { last_error: failure.error })
    }
    const status = input.errors.length ? ("failed" as const) : ("success" as const)
    if (input.full && status === "success") {
      await updateCursor(container, STOCK_FULL_STREAM, { last_run_at: now, last_success_at: now })
    }
    const skippedTotal =
      input.counts.unmappedItem + input.counts.unmappedBranch + input.counts.noInventoryItem
    await writeRunSummary(container, {
      functionName: "sync-stock",
      direction: "inbound",
      status,
      durationMs: Date.now() - input.startedAt,
      summary: {
        full: input.full,
        ...input.counts,
        ...(skippedTotal ? { skippedSamples: input.skipped } : {}),
      },
      error: input.errors.map((e) => `${e.stream}: ${e.error}`).join("; ") || undefined,
    })
    const result: SyncStockResult = {
      status,
      full: input.full,
      ...input.counts,
      errors: input.errors,
    }
    return new StepResponse(result)
  }
)
