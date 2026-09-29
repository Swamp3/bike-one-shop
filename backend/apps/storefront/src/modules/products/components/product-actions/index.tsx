"use client"

import { addToCart } from "@lib/data/cart"
import { useIntersection } from "@lib/hooks/use-in-view"
import {
  ResolvedConfigurableSlot,
  ResolvedConfigurableSlotOption,
} from "@lib/types/configurable-slot"
import { getProductPrice } from "@lib/util/get-product-price"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { useProductOptionsContext } from "@modules/products/components/product-options-context"
import ColorSwatchSelect from "@modules/products/components/product-actions/color-swatch-select"
import ConfigurableSlotSelect from "@modules/products/components/product-actions/configurable-slot-select"
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
  /** The Laufradsatz slot(s), if this product has any (PLAN.md Task 13 §2-3). */
  configurableSlots?: ResolvedConfigurableSlot[]
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
  configurableSlots = [],
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

  // Laufradsatz-style slot selections: slot title -> selected product id.
  // Lives here (not in `ProductOptionsProvider`) because it drives price
  // and cart line items, not the gallery — the gallery keeps showing the
  // base-color photo regardless of the wheelset choice (PLAN.md Task 13,
  // "gap surfaced by the real assets").
  const [slotSelections, setSlotSelections] = useState<Record<string, string>>(
    {}
  )

  // Preselect each slot's default option so price/CTA are correct before
  // the shopper touches the slot selector.
  useEffect(() => {
    if (!configurableSlots.length) return
    setSlotSelections((prev) => {
      let changed = false
      const next = { ...prev }
      for (const slot of configurableSlots) {
        if (!next[slot.slot]) {
          const defaultOption = slot.options.find((o) => o.isDefault)
          if (defaultOption) {
            next[slot.slot] = defaultOption.productId
            changed = true
          }
        }
      }
      return changed ? next : prev
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configurableSlots])

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

  // The non-default slot selections, resolved against each slot's real
  // options — what actually needs its own cart line item (PLAN.md Task 13
  // §3: the default/Miche choice is already included in the base price
  // and gets no separate line item).
  const nonDefaultSlotSelections = useMemo(() => {
    return configurableSlots
      .map((slot) => {
        const defaultOption = slot.options.find((o) => o.isDefault)
        const selectedId = slotSelections[slot.slot] ?? defaultOption?.productId
        const selectedOption = slot.options.find(
          (o) => o.productId === selectedId
        )
        if (!selectedOption || selectedOption.isDefault) return null
        return { slot: slot.slot, option: selectedOption }
      })
      .filter(
        (s): s is { slot: string; option: ResolvedConfigurableSlotOption } =>
          s !== null
      )
  }, [configurableSlots, slotSelections])

  // Computed live from each slot's real component prices — never a stored
  // delta, so a future cheaper option correctly reduces the total with no
  // special-cased logic (PLAN.md Task 13 §2).
  const slotPriceDelta = useMemo(() => {
    return configurableSlots.reduce((sum, slot) => {
      const defaultOption = slot.options.find((o) => o.isDefault)
      const selectedId = slotSelections[slot.slot] ?? defaultOption?.productId
      const selectedOption = slot.options.find(
        (o) => o.productId === selectedId
      )
      if (!selectedOption || !defaultOption) return sum
      return sum + ((selectedOption.price ?? 0) - (defaultOption.price ?? 0))
    }, 0)
  }, [configurableSlots, slotSelections])

  // add the selected variant to the cart
  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return null

    setIsAdding(true)

    try {
      // A shared build id only makes sense once there's a second line item
      // to group with the base one (PLAN.md Task 13 §3) — the default
      // (Miche) case stays a single, unmarked line item.
      const buildId = nonDefaultSlotSelections.length
        ? crypto.randomUUID()
        : undefined

      // The slot's real, separately-stocked component (e.g. the Zipp
      // wheelset) goes in *first* and is awaited before the base item: if
      // it's out of stock, this throws and nothing is added at all,
      // rather than leaving an orphaned, build-id-tagged base line item
      // with no matching upgrade line item in the cart.
      for (const { slot, option } of nonDefaultSlotSelections) {
        await addToCart({
          variantId: option.variantId,
          quantity: 1,
          countryCode,
          metadata: { build_id: buildId, build_slot: slot },
        })
      }

      await addToCart({
        variantId: selectedVariant.id,
        quantity: 1,
        countryCode,
        metadata: buildId ? { build_id: buildId } : undefined,
      })

      toast.success("Zum Warenkorb hinzugefügt")
    } catch {
      // Most likely cause today: the selected Laufradsatz option is a real,
      // separately-stocked product that's out of stock (PLAN.md Task 13
      // §2) — the backend rejects the line item and nothing partial is
      // left in the cart (see the ordering above).
      toast.error(
        "Konnte nicht zum Warenkorb hinzugefügt werden — vermutlich ist eine der gewählten Komponenten nicht auf Lager."
      )
    } finally {
      setIsAdding(false)
    }
  }

  const { variantPrice, cheapestPrice } = getProductPrice({
    product,
    variantId: selectedVariant?.id,
  })
  const activePrice = selectedVariant ? variantPrice : cheapestPrice

  // The running total shown on the CTA/mobile bar: the selected variant's
  // price plus the live-computed slot delta, so switching Laufradsatz
  // options updates it immediately.
  const totalPrice =
    activePrice?.calculated_price_number != null && activePrice.currency_code
      ? convertToLocale({
          amount: activePrice.calculated_price_number + slotPriceDelta,
          currency_code: activePrice.currency_code,
        })
      : activePrice?.calculated_price

  const ctaDisabled =
    !inStock || !selectedVariant || !!disabled || isAdding || !isValidVariant

  const ctaLabel = !selectedVariant
    ? "Größe wählen"
    : !inStock || !isValidVariant
    ? "Ausverkauft"
    : isAdding
    ? "Wird hinzugefügt …"
    : totalPrice
    ? `In den Warenkorb — ${totalPrice}`
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

        {configurableSlots.length > 0 && (
          <div className="flex flex-col gap-y-4">
            {configurableSlots.map((slot) => (
              <ConfigurableSlotSelect
                key={slot.slot}
                slot={slot}
                selectedProductId={
                  slotSelections[slot.slot] ??
                  slot.options.find((o) => o.isDefault)?.productId
                }
                onSelect={(productId) =>
                  setSlotSelections((prev) => ({
                    ...prev,
                    [slot.slot]: productId,
                  }))
                }
                disabled={!!disabled || isAdding}
                data-testid="configurable-slot-select"
              />
            ))}
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
          priceOverride={totalPrice}
        />
      </div>
    </>
  )
}
