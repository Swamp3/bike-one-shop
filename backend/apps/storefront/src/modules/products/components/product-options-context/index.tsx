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
  const [options, setOptions] = useState<SelectedOptions>({})

  // If there is only 1 variant, preselect the options
  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
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
    () => ({ options, setOptionValue, getOptionValueByTitle }),
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
