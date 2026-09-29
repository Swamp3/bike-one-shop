import { HttpTypes } from "@medusajs/types"

type LineItemWithMetadata = {
  id: string
  metadata?: Record<string, unknown> | null
}

export type LineItemGroup<T> = {
  /** `null` for an ordinary, ungrouped line item. */
  buildId: string | null
  items: T[]
}

/**
 * Groups cart/order line items that share `metadata.build_id` (set by a
 * configured Wilier-Adlar-style add-to-cart, see PLAN.md Task 13 §2-3) so
 * the UI can render them under one "Custom-Build" card. Every other line
 * item comes back as its own single-item group, so callers can treat both
 * cases uniformly. Groups are ordered by the first appearance of their
 * `build_id`; items within a group keep the order they were passed in.
 */
export function groupLineItemsByBuild<
  T extends LineItemWithMetadata = HttpTypes.StoreCartLineItem
>(items: T[]): LineItemGroup<T>[] {
  const groups: LineItemGroup<T>[] = []
  const groupByBuildId = new Map<string, LineItemGroup<T>>()

  for (const item of items) {
    const buildId = item.metadata?.build_id
    if (typeof buildId !== "string" || !buildId) {
      groups.push({ buildId: null, items: [item] })
      continue
    }

    let group = groupByBuildId.get(buildId)
    if (!group) {
      group = { buildId, items: [] }
      groupByBuildId.set(buildId, group)
      groups.push(group)
    }
    group.items.push(item)
  }

  return groups
}

/**
 * The item within a build group that represents the base product (it has
 * no `metadata.build_slot` — see PLAN.md Task 13 §3). Falls back to the
 * first item if, unexpectedly, every item in the group carries a slot.
 */
export function getBuildBaseItem<T extends LineItemWithMetadata>(
  items: T[]
): T {
  return items.find((item) => !item.metadata?.build_slot) ?? items[0]
}
