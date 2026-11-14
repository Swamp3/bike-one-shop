"use client"

import { HttpTypes } from "@medusajs/types"
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

export type SelectedOptions = Record<string, string | undefined>

type ProductOptionsContextValue = {
  options: SelectedOptions
  setOptionValue: (optionId: string, value: string) => void
  /**
   * Look up the currently selected value for an option by its *title*
   * (e.g. "Farbe"), never by array position — `product.options` array
   * order is not consistent between products (see PLAN.md Task 12 §4).
   */
  getOptionValueByTitle: (title: string) => string | undefined
  /** `product.metadata.color_swatches`: colour name -> hex, edited in the admin's product metadata. */
  colorSwatches: unknown
}

const ProductOptionsContext = createContext<ProductOptionsContextValue | null>(
  null
)

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt) => {
    if (varopt.option_id) acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

/**
 * The variant a product page opens with: `metadata.default_variant_id` if set
 * (editable in the admin's product metadata), otherwise the cheapest variant,
 * so the page starts at the same price the listing shows as "ab".
 */
const defaultVariant = (product: HttpTypes.StoreProduct) => {
  const variants = product.variants ?? []
  const configured = variants.find(
    (v) => v.id === product.metadata?.default_variant_id
  )
  const price = (v: HttpTypes.StoreProductVariant) =>
    v.calculated_price?.calculated_amount ?? Number.POSITIVE_INFINITY
  return configured ?? [...variants].sort((a, b) => price(a) - price(b))[0]
}

/**
 * Owns the single source of truth for the shopper's option selection
 * (Frame Size, Farbe, ...) on a PDP, so it can be shared between
 * `ProductActions` (which reads it to resolve the selected variant) and
 * `BikeOneGallery` (which reads it to caption the placeholder with the
 * selected color) without either building its own parallel state.
 */
export function ProductOptionsProvider({
  product,
  children,
}: {
  product: HttpTypes.StoreProduct
  children: React.ReactNode
}) {
  // Preselect a variant so the page never opens with nothing chosen.
  const [options, setOptions] = useState<SelectedOptions>(
    () => optionsAsKeymap(defaultVariant(product)?.options) ?? {}
  )

  // A shared link (?v_id=...) wins over the default. Read on the client only,
  // so the page needs no Suspense boundary for useSearchParams.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("v_id")
    const fromUrl = product.variants?.find((v) => v.id === id)
    if (fromUrl) setOptions(optionsAsKeymap(fromUrl.options) ?? {})
  }, [product.variants])

  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  const getOptionValueByTitle = (title: string) => {
    const option = product.options?.find((o) => o.title === title)
    if (!option) {
      return undefined
    }
    return options[option.id]
  }

  const value = useMemo(
    () => ({
      options,
      setOptionValue,
      getOptionValueByTitle,
      colorSwatches: product.metadata?.color_swatches,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options, product.options]
  )

  return (
    <ProductOptionsContext.Provider value={value}>
      {children}
    </ProductOptionsContext.Provider>
  )
}

export function useProductOptionsContext() {
  const ctx = useContext(ProductOptionsContext)
  if (!ctx) {
    throw new Error(
      "useProductOptionsContext must be used within a ProductOptionsProvider"
    )
  }
  return ctx
}
