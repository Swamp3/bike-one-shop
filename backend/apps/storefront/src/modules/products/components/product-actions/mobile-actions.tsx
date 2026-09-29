import { Dialog, Transition } from "@headlessui/react"
import { clx } from "@modules/common/components/ui"
import React, { Fragment, useMemo } from "react"

import useToggleState from "@lib/hooks/use-toggle-state"
import ChevronDown from "@modules/common/icons/chevron-down"
import X from "@modules/common/icons/x"

import { getProductPrice } from "@lib/util/get-product-price"
import ColorSwatchSelect from "./color-swatch-select"
import OptionSelect from "./option-select"
import { isColorOption } from "./option-title"
import { HttpTypes } from "@medusajs/types"
import { isSimpleProduct } from "@lib/util/product"

type MobileActionsProps = {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
  options: Record<string, string | undefined>
  updateOptions: (title: string, value: string) => void
  inStock?: boolean
  handleAddToCart: () => void
  isAdding?: boolean
  show: boolean
  optionsDisabled: boolean
  /**
   * The variant price plus any live-computed configurable-slot delta
   * (PLAN.md Task 13 §2), formatted. Falls back to the plain variant price
   * when not provided, e.g. for a product with no slots.
   */
  priceOverride?: string
}

const MobileActions: React.FC<MobileActionsProps> = ({
  product,
  variant,
  options,
  updateOptions,
  inStock,
  handleAddToCart,
  isAdding,
  show,
  optionsDisabled,
  priceOverride,
}) => {
  const { state, open, close } = useToggleState()

  const price = getProductPrice({
    product: product,
    variantId: variant?.id,
  })

  const selectedPrice = useMemo(() => {
    if (!price) {
      return null
    }
    const { variantPrice, cheapestPrice } = price

    return variantPrice || cheapestPrice || null
  }, [price])

  const isSimple = isSimpleProduct(product)

  return (
    <>
      <div
        className={clx("lg:hidden inset-x-0 bottom-0 fixed z-50", {
          "pointer-events-none": !show,
        })}
      >
        <Transition
          as={Fragment}
          show={show}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-y-3 border-t border-bo-line bg-bo-surface p-4 text-bo-ink"
            data-testid="mobile-actions"
          >
            <div className="flex items-center gap-x-2 text-[14px]">
              <span data-testid="mobile-title" className="font-semibold">
                {product.title}
              </span>
              <span>—</span>
              {(priceOverride || selectedPrice) && (
                <span className="font-bold tabular-nums">
                  {priceOverride || selectedPrice?.calculated_price}
                </span>
              )}
            </div>
            <div
              className={clx("grid w-full grid-cols-2 gap-2.5", {
                "!grid-cols-1": isSimple,
              })}
            >
              {!isSimple && (
                <button
                  type="button"
                  onClick={open}
                  data-testid="mobile-actions-button"
                  className="w-full rounded border-[1.5px] border-bo-line-strong bg-transparent px-3 py-2.5 text-[13.5px] font-semibold text-bo-ink"
                >
                  <div className="flex w-full items-center justify-between">
                    <span>
                      {variant
                        ? Object.values(options).join(" / ")
                        : "Größe wählen"}
                    </span>
                    <ChevronDown />
                  </div>
                </button>
              )}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!inStock || !variant || isAdding}
                data-testid="mobile-cart-button"
                className="w-full rounded border-[1.5px] border-bo-ink bg-bo-ink px-3 py-2.5 text-[13.5px] font-semibold text-bo-bg disabled:cursor-not-allowed disabled:border-bo-line disabled:bg-bo-surface-2 disabled:text-bo-ink-faint"
              >
                {!variant
                  ? "Größe wählen"
                  : !inStock
                  ? "Ausverkauft"
                  : isAdding
                  ? "Wird hinzugefügt …"
                  : "In den Warenkorb"}
              </button>
            </div>
          </div>
        </Transition>
      </div>
      <Transition appear show={state} as={Fragment}>
        <Dialog as="div" className="relative z-[75]" onClose={close}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed bottom-0 inset-x-0">
            <div className="flex min-h-full h-full items-center justify-center text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Dialog.Panel
                  className="w-full h-full transform overflow-hidden text-left flex flex-col gap-y-3"
                  data-testid="mobile-actions-modal"
                >
                  <div className="w-full flex justify-end pr-6">
                    <button
                      onClick={close}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-bo-surface text-bo-ink"
                      data-testid="close-modal-button"
                    >
                      <X />
                    </button>
                  </div>
                  <div className="bg-bo-surface px-6 py-12">
                    {(product.variants?.length ?? 0) > 1 && (
                      <div className="flex flex-col gap-y-6">
                        {(product.options || []).map((option) => {
                          const isColor = isColorOption(option.title)
                          const Selector = isColor
                            ? ColorSwatchSelect
                            : OptionSelect
                          return (
                            <div key={option.id}>
                              <Selector
                                option={option}
                                current={options[option.id]}
                                updateOption={updateOptions}
                                title={option.title ?? ""}
                                disabled={optionsDisabled}
                              />
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

export default MobileActions
