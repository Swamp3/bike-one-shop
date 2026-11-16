import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import {
  createProductCategoriesWorkflow,
  updateProductCategoriesWorkflow,
} from "@medusajs/medusa/core-flows"

type TargetCategory = {
  name: string
  handle: string
  parent: string | null
  rank: number
  // Handles this category had before the restructure (initial-data-seed.ts, import-woo-catalog.ts)
  legacy: string[]
}

// Parents come before their children, so their ids exist when a child is moved.
// Handles are ASCII only (ä→ae, ö→oe, ü→ue, ß→ss), see planning decisions.md.
const TREE: TargetCategory[] = [
  { name: "Fahrräder", handle: "fahrraeder", parent: null, rank: 0, legacy: [] },
  { name: "Komponenten", handle: "komponenten", parent: null, rank: 1, legacy: [] },
  { name: "Zubehör", handle: "zubehoer", parent: null, rank: 2, legacy: ["accessories"] },
  { name: "Rennräder", handle: "rennraeder", parent: "fahrraeder", rank: 0, legacy: ["road-bikes"] },
  { name: "Gravelbikes", handle: "gravelbikes", parent: "fahrraeder", rank: 1, legacy: ["gravel-bikes"] },
  { name: "Triathlon & Zeitfahren", handle: "triathlon-zeitfahren", parent: "fahrraeder", rank: 2, legacy: ["triathlon-tt"] },
  { name: "Mountainbikes", handle: "mountainbikes", parent: "fahrraeder", rank: 3, legacy: ["mountain-bikes"] },
  { name: "Laufräder", handle: "laufraeder", parent: "komponenten", rank: 0, legacy: ["laufräder"] },
]

/**
 * Moves the flat seed/import categories into the Fahrräder / Komponenten /
 * Zubehör tree. Idempotent: categories already in their target state are
 * skipped, missing ones are created. Runs after initial-data-seed.ts (scripts
 * run in file-name order).
 */
export default async function restructure_categories({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const loadCategories = async () =>
    (
      await query.graph({
        entity: "product_category",
        fields: ["id", "name", "handle", "rank", "parent_category_id"],
      })
    ).data

  for (const target of TREE) {
    // Re-read every time: moving a category re-ranks its old and new siblings.
    const categories = await loadCategories()
    const byHandle = (handle: string) =>
      categories.find((c) => c.handle === handle)

    const parentId = target.parent ? byHandle(target.parent)?.id : null
    if (parentId === undefined) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Parent category "${target.parent}" missing for "${target.handle}"`
      )
    }

    const desired = {
      name: target.name,
      handle: target.handle,
      parent_category_id: parentId,
      rank: target.rank,
    }

    const existing = [target.handle, ...target.legacy]
      .map(byHandle)
      .find(Boolean)

    if (!existing) {
      await createProductCategoriesWorkflow(container).run({
        input: { product_categories: [{ ...desired, is_active: true }] },
      })
      logger.info(`Created category ${target.handle}`)
      continue
    }

    const inTargetState =
      existing.name === desired.name &&
      existing.handle === desired.handle &&
      (existing.parent_category_id ?? null) === desired.parent_category_id &&
      existing.rank === desired.rank
    if (inTargetState) {
      continue
    }

    await updateProductCategoriesWorkflow(container).run({
      input: { selector: { id: existing.id }, update: desired },
    })
    logger.info(`Updated category ${existing.handle} -> ${target.handle}`)
  }
}
