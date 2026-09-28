"use client"

import { addToCart } from "@lib/data/cart"
import { useIntersection } from "@lib/hooks/use-in-view"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import { useProductOptionsContext } from "@modules/products/components/product-options-context"
import ColorSwatchSelect from "@modules/products/components/product-actions/color-swatch-select"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import { isColorOption } from "@modules/products/components/product-actions/option-title"
import { isEqual } from "lodash"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import MobileActions from "./mobile-actions"
import { useRouter } from "next/navigation"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt) => {
    if (varopt.option_id) acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

export default function ProductActions({
  product,
  disabled,
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Shared with `BikeOneGallery` via `ProductOptionsProvider` (see
  // `templates/index.tsx`) so selecting a color also updates the gallery
  // caption, instead of each component holding its own selection state.
  const { options, setOptionValue } = useProductOptionsContext()
  const [isAdding, setIsAdding] = useState(false)
  const countryCode = useParams().countryCode as string

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  //check if the selected options produce a valid variant
  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const value = isValidVariant ? selectedVariant?.id : null

    if (params.get("v_id") === value) {
      return
    }

    if (value) {
      params.set("v_id", value)
    } else {
      params.delete("v_id")
    }

    router.replace(pathname + "?" + params.toString())
  }, [selectedVariant, isValidVariant])

  // check if the selected variant is in stock
  const inStock = useMemo(() => {
    // If we don't manage inventory, we can always add to cart
    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true
    }

    // If we allow back orders on the variant, we can add to cart
    if (selectedVariant?.allow_backorder) {
      return true
    }

    // If there is inventory available, we can add to cart
    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true
    }

    // Otherwise, we can't add to cart
    return false
  }, [selectedVariant])

  const actionsRef = useRef<HTMLDivElement>(null)

  const inView = useIntersection(actionsRef, "0px")

  // add the selected variant to the cart
  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return null

    setIsAdding(true)

    await addToCart({
      variantId: selectedVariant.id,
      quantity: 1,
      countryCode,
    })

    toast.success("Zum Warenkorb hinzugefügt")

    setIsAdding(false)
  }

  const { variantPrice, cheapestPrice } = getProductPrice({
    product,
    variantId: selectedVariant?.id,
  })
  const price = (selectedVariant ? variantPrice : cheapestPrice)
    ?.calculated_price

  const ctaDisabled =
    !inStock || !selectedVariant || !!disabled || isAdding || !isValidVariant

  const ctaLabel = !selectedVariant
    ? "Größe wählen"
    : !inStock || !isValidVariant
    ? "Ausverkauft"
    : isAdding
    ? "Wird hinzugefügt …"
    : price
    ? `In den Warenkorb — ${price}`
    : "In den Warenkorb"

  return (
    <>
      <div className="flex flex-col gap-y-4" ref={actionsRef}>
        {(product.variants?.length ?? 0) > 1 && (
          <div className="flex flex-col gap-y-4">
            {(product.options || []).map((option) => {
              const isColor = isColorOption(option.title)
              const Selector = isColor ? ColorSwatchSelect : OptionSelect
              return (
                <div key={option.id}>
                  <Selector
                    option={option}
                    current={options[option.id]}
                    updateOption={setOptionValue}
                    title={option.title ?? ""}
                    data-testid={
                      isColor ? "product-options-color" : "product-options"
                    }
                    disabled={!!disabled || isAdding}
                  />
                </div>
              )
            })}
          </div>
        )}

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={ctaDisabled}
          data-testid="add-product-button"
          className="w-full rounded border-[1.5px] border-bo-ink bg-bo-ink py-[13px] text-[14.5px] font-semibold text-bo-bg hover:border-bo-accent hover:bg-bo-accent hover:text-bo-accent-ink disabled:cursor-not-allowed disabled:border-bo-line disabled:bg-bo-surface-2 disabled:text-bo-ink-faint disabled:hover:border-bo-line disabled:hover:bg-bo-surface-2 disabled:hover:text-bo-ink-faint"
        >
          {ctaLabel}
        </button>
        <MobileActions
          product={product}
          variant={selectedVariant}
          options={options}
          updateOptions={setOptionValue}
          inStock={inStock}
          handleAddToCart={handleAddToCart}
          isAdding={isAdding}
          show={!inView}
          optionsDisabled={!!disabled || isAdding}
        />
      </div>
    </>
  )
}
