// Type-only import, so `node scripts/check-category-tree.mjs` can load this file directly.
import type { HttpTypes } from "@medusajs/types"

type Category = HttpTypes.StoreProductCategory

const byRank = (a: Category, b: Category) => (a.rank ?? 0) - (b.rank ?? 0)

const childrenOf = (category: Category, all: Category[]) =>
  all
    .filter((c) => c.parent_category_id === category.id)
    .sort(byRank)

/** The category's id plus the ids of every category below it. */
export const descendantIds = (category: Category, all: Category[]): string[] => [
  category.id,
  ...childrenOf(category, all).flatMap((c) => descendantIds(c, all)),
]

/** Whether the category or any category below it has a (published) product. */
export const hasProducts = (category: Category, all: Category[]): boolean =>
  !!category.products?.length ||
  childrenOf(category, all).some((c) => hasProducts(c, all))

/** Subcategories that have products, sorted by rank. */
export const visibleChildren = (category: Category, all: Category[]) =>
  childrenOf(category, all).filter((c) => hasProducts(c, all))

/** Top-level categories with products, each with only its non-empty children, sorted by rank. */
export const visibleTopLevel = (all: Category[]) =>
  all
    .filter((c) => !c.parent_category_id && hasProducts(c, all))
    .sort(byRank)
    .map((c) => ({ ...c, category_children: visibleChildren(c, all) }))

/** The category and its parents, top-level first. */
export const ancestorChain = (category: Category, all: Category[]): Category[] => {
  const parent = all.find((c) => c.id === category.parent_category_id)
  return parent ? [...ancestorChain(parent, all), category] : [category]
}
