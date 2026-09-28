/**
 * The single source of truth for "is this the color option" — checked by
 * `option.title`, never by array position, since `product.options` array
 * order is not consistent between products (see PLAN.md Task 12 §4).
 */
export const isColorOption = (title: string | null | undefined) =>
  title === "Farbe"
