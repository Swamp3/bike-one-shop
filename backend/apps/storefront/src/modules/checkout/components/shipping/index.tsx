"use client"
import { setShippingMethod } from "@lib/data/cart"
import { calculatePriceForShippingOption } from "@lib/data/fulfillment"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import ErrorMessage from "@modules/checkout/components/error-message"
import StepCard from "@modules/checkout/components/step-card"
import { clx } from "@modules/common/components/ui"
import Spinner from "@modules/common/icons/spinner"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

type ShippingProps = {
  cart: HttpTypes.StoreCart
  availableShippingMethods: HttpTypes.StoreCartShippingOption[] | null
}

function formatAddress(address?: HttpTypes.StoreCartAddress) {
  if (!address) {
    return ""
  }

  let ret = ""

  if (address.address_1) {
    ret += ` ${address.address_1}`
  }
  if (address.postal_code) {
    ret += `, ${address.postal_code} ${address.city}`
  }
  if (address.country_code) {
    ret += `, ${address.country_code.toUpperCase()}`
  }

  return ret
}

/**
 * Delivery-method step, styled after wireframes/warenkorb-checkout.html's
 * `.option-card` list. The shipping options themselves are real Medusa
 * fulfillment options (seeded "Standard Shipping" / "Express Shipping"),
 * fetched and priced exactly as before — only the markup changed from
 * headlessui RadioGroups to plain radio option-cards. There is no pickup
 * fulfillment set in this store yet, so Click & Collect shows as a disabled,
 * clearly-labelled "coming soon" card rather than a selectable option that
 * would silently do nothing.
 */
const Shipping: React.FC<ShippingProps> = ({
  cart,
  availableShippingMethods,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPrices, setIsLoadingPrices] = useState(true)

  const [calculatedPricesMap, setCalculatedPricesMap] = useState<
    Record<string, number>
  >({})
  const [error, setError] = useState<string | null>(null)
  const [shippingMethodId, setShippingMethodId] = useState<string | null>(
    cart.shipping_methods?.at(-1)?.shipping_option_id || null
  )

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "delivery"
  const isDone = (cart.shipping_methods?.length ?? 0) > 0

  const _shippingMethods = availableShippingMethods?.filter(
    (sm) =>
      (
        sm as unknown as {
          service_zone?: { fulfillment_set?: { type?: string } }
        }
      ).service_zone?.fulfillment_set?.type !== "pickup"
  )

  const _pickupMethods = availableShippingMethods?.filter(
    (sm) =>
      (
        sm as unknown as {
          service_zone?: { fulfillment_set?: { type?: string } }
        }
      ).service_zone?.fulfillment_set?.type === "pickup"
  )

  const hasPickupOptions = !!_pickupMethods?.length

  useEffect(() => {
    setIsLoadingPrices(true)

    if (_shippingMethods?.length) {
      const promises = _shippingMethods
        .filter((sm) => sm.price_type === "calculated")
        .map((sm) => calculatePriceForShippingOption(sm.id, cart.id))

      if (promises.length) {
        Promise.allSettled(promises).then((res) => {
          const pricesMap: Record<string, number> = {}
          res
            .filter((r) => r.status === "fulfilled")
            .forEach((p) => {
              if (p.value?.id) {
                pricesMap[p.value.id] = p.value.amount ?? 0
              }
            })

          setCalculatedPricesMap(pricesMap)
          setIsLoadingPrices(false)
        })
      } else {
        setIsLoadingPrices(false)
      }
    } else {
      setIsLoadingPrices(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableShippingMethods])

  const handleEdit = () => {
    router.push(pathname + "?step=delivery", { scroll: false })
  }

  const handleSubmit = () => {
    router.push(pathname + "?step=payment", { scroll: false })
  }

  const handleSetShippingMethod = async (id: string) => {
    setError(null)

    let currentId: string | null = null
    setIsLoading(true)
    setShippingMethodId((prev) => {
      currentId = prev
      return id
    })

    await setShippingMethod({ cartId: cart.id, shippingMethodId: id })
      .catch((err) => {
        setShippingMethodId(currentId)
        setError(err.message)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  const activeMethod = cart.shipping_methods?.at(-1)

  return (
    <StepCard
      title="Versandart"
      done={isDone}
      isOpen={isOpen}
      showEdit={
        !isOpen &&
        !!cart?.shipping_address &&
        !!cart?.billing_address &&
        !!cart?.email
      }
      onEdit={handleEdit}
      editTestId="edit-delivery-button"
    >
      {isOpen ? (
        <>
          <div data-testid="delivery-options-container" className="flex flex-col gap-2">
            {_shippingMethods?.map((option) => {
              const isDisabled =
                option.price_type === "calculated" &&
                !isLoadingPrices &&
                typeof calculatedPricesMap[option.id] !== "number"
              const active = option.id === shippingMethodId

              return (
                <label
                  key={option.id}
                  data-testid="delivery-option-radio"
                  className={clx(
                    "flex items-start gap-3 rounded-[10px] border-[1.5px] p-3.5",
                    isDisabled
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer",
                    active
                      ? "border-bo-accent bg-[color-mix(in_srgb,var(--bo-accent)_6%,var(--bo-surface))]"
                      : "border-bo-line bg-bo-surface"
                  )}
                >
                  <input
                    type="radio"
                    name="shippingMethod"
                    className="mt-0.5 h-4 w-4 accent-bo-accent"
                    checked={active}
                    disabled={isDisabled}
                    onChange={() => handleSetShippingMethod(option.id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 text-[14px] font-semibold">
                      <span>{option.name}</span>
                      <span className="font-mono text-[13px] font-bold">
                        {option.price_type === "flat" ? (
                          convertToLocale({
                            amount: option.amount!,
                            currency_code: cart?.currency_code,
                          })
                        ) : calculatedPricesMap[option.id] ? (
                          convertToLocale({
                            amount: calculatedPricesMap[option.id],
                            currency_code: cart?.currency_code,
                          })
                        ) : isLoadingPrices ? (
                          <Spinner size="14" />
                        ) : (
                          "—"
                        )}
                      </span>
                    </div>
                  </div>
                </label>
              )
            })}
          </div>

          {hasPickupOptions && (
            <div className="mt-4">
              <div className="mb-2 text-[13px] font-semibold text-bo-ink-muted">
                Filiale zur Abholung
              </div>
              <div className="flex flex-col gap-2">
                {_pickupMethods?.map((option) => {
                  const active = option.id === shippingMethodId
                  return (
                    <label
                      key={option.id}
                      data-testid="delivery-option-radio"
                      className={clx(
                        "flex items-start gap-3 rounded-[10px] border-[1.5px] p-3.5",
                        option.insufficient_inventory
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer",
                        active
                          ? "border-bo-accent bg-[color-mix(in_srgb,var(--bo-accent)_6%,var(--bo-surface))]"
                          : "border-bo-line bg-bo-surface"
                      )}
                    >
                      <input
                        type="radio"
                        name="shippingMethod"
                        className="mt-0.5 h-4 w-4 accent-bo-accent"
                        checked={active}
                        disabled={option.insufficient_inventory}
                        onChange={() => handleSetShippingMethod(option.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2 text-[14px] font-semibold">
                          <span>{option.name}</span>
                          <span className="font-mono text-[13px] font-bold">
                            {convertToLocale({
                              amount: option.amount!,
                              currency_code: cart?.currency_code,
                            })}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[12.5px] text-bo-ink-muted">
                          {formatAddress(
                            (
                              option as unknown as {
                                service_zone?: {
                                  fulfillment_set?: {
                                    location?: { address: HttpTypes.StoreCartAddress }
                                  }
                                }
                              }
                            ).service_zone?.fulfillment_set?.location?.address
                          )}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {!hasPickupOptions && (
            <div className="mt-2 flex items-start gap-2.5 rounded-[10px] border-[1.5px] border-bo-line p-3.5 opacity-60">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="mt-0.5 h-4 w-4 shrink-0 text-bo-ink-faint"
              >
                <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              <div>
                <div className="text-[14px] font-semibold">Click &amp; Collect</div>
                <div className="mt-0.5 text-[12.5px] text-bo-ink-muted">
                  Bald verfügbar — Abholung in Oldenburg oder Osnabrück ist
                  noch nicht buchbar.
                </div>
              </div>
            </div>
          )}

          <ErrorMessage error={error} data-testid="delivery-option-error-message" />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!cart.shipping_methods?.[0] || isLoading}
            data-testid="submit-delivery-option-button"
            className="mt-4 w-full rounded border-[1.5px] border-bo-ink bg-bo-ink py-3 text-[14.5px] font-semibold text-bo-bg hover:border-bo-accent hover:bg-bo-accent hover:text-bo-accent-ink disabled:cursor-not-allowed disabled:border-bo-line disabled:bg-bo-surface-2 disabled:text-bo-ink-faint"
          >
            {isLoading ? "…" : "Weiter zur Zahlung →"}
          </button>
        </>
      ) : (
        <div>
          {isDone && activeMethod && (
            <div className="text-[13.5px]">
              <p className="m-0 mb-1 font-semibold text-bo-ink">Versandart</p>
              <p className="m-0 text-bo-ink-muted">
                {activeMethod.name}{" "}
                {convertToLocale({
                  amount: activeMethod.amount!,
                  currency_code: cart?.currency_code,
                })}
              </p>
            </div>
          )}
        </div>
      )}
    </StepCard>
  )
}

export default Shipping
