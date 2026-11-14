/**
 * Fallback name-to-hex map for "Farbe" values without a hex in
 * `product.metadata.color_swatches` (the dev-seed colour names).
 */
export const COLOR_SWATCH_MAP: Record<string, string> = {
  Schwarz: "#111111",
  Blau: "#2554c7",
  Weiß: "#ffffff",
  Grau: "#8a8a8a",
  Grün: "#2f7a3f",
}

const NEUTRAL_SWATCH = "#cccccc"

/** Hex for a colour name: product metadata first, then the map, then neutral grey. */
export const swatchColor = (
  name: string,
  productSwatches?: unknown
): string => {
  const fromMetadata =
    productSwatches && typeof productSwatches === "object"
      ? (productSwatches as Record<string, unknown>)[name]
      : undefined
  return typeof fromMetadata === "string" && /^#[0-9a-f]{6}$/i.test(fromMetadata)
    ? fromMetadata
    : COLOR_SWATCH_MAP[name] ?? NEUTRAL_SWATCH
}

/** Representative swatch per colour family, used in the Farbe filter. */
export const COLOR_FAMILIES: Record<string, string> = {
  Schwarz: "#111111",
  "Grau/Silber": "#9a9a9a",
  Weiß: "#ffffff",
  Blau: "#2554c7",
  Grün: "#2f7a3f",
  Rot: "#c62828",
  Orange: "#ef6c00",
  "Gelb/Gold": "#e0b300",
  "Lila/Pink": "#8e44ad",
  "Braun/Beige": "#8d6e63",
}

/**
 * Buckets a hex colour into one of COLOR_FAMILIES by HSL.
 * shortcut: derived from the auto-suggested swatch hex, so multi-colour paint
 * jobs land in one family; store a reviewed family per value in the import
 * (plan 3.3) when the facet needs to be exact.
 */
export const colorFamily = (hex: string): string => {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))

  if (l < 0.16 && s < 0.5) return "Schwarz"
  if (s < 0.12 || d < 0.08) {
    if (l > 0.85) return "Weiß"
    return l < 0.22 ? "Schwarz" : "Grau/Silber"
  }

  let h =
    max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  h = (h * 60 + 360) % 360

  if (h < 15 || h >= 340) return "Rot"
  if (h < 45) return l < 0.4 || s < 0.45 ? "Braun/Beige" : "Orange"
  if (h < 70) return s < 0.35 ? "Braun/Beige" : "Gelb/Gold"
  if (h < 170) return "Grün"
  if (h < 260) return "Blau"
  return "Lila/Pink"
}
