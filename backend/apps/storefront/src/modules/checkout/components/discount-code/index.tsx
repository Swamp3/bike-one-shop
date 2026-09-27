"use client"

import React from "react"

import { applyPromotions } from "@lib/data/cart"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { useFormStatus } from "react-dom"

type DiscountCodeProps = {
  cart: HttpTypes.StoreCart
}

/**
 * Promo-code form styled after wireframes/warenkorb-checkout.html's
 * `.promo-row` / `.promo-msg`. Uses the same real `applyPromotions` server
 * action as before — a valid, seeded promotion code is genuinely applied to
 * the cart; an unknown code genuinely comes back as an error from Medusa.
 */
const DiscountCode: React.FC<DiscountCodeProps> = ({ cart }) => {
  const [errorMessage, setErrorMessage] = React.useState("")
  const [successMessage, setSuccessMessage] = React.useState("")

  const { promotions = [] } = cart

  const removePromotionCode = async (code: string) => {
    setErrorMessage("")
    setSuccessMessage("")
    const validPromotions = promotions.filter(
      (promotion) => promotion.code !== code
    )

    await applyPromotions(
      validPromotions.filter((p) => p.code !== undefined).map((p) => p.code!)
    )
  }

  const addPromotionCode = async (formData: FormData) => {
    setErrorMessage("")
    setSuccessMessage("")

    const code = formData.get("code")
    if (!code) {
      return
    }
    const input = document.getElementById("promotion-input") as HTMLInputElement
    const codes = promotions
      .filter((p) => p.code !== undefined)
      .map((p) => p.code!)
    codes.push(code.toString())

    try {
      await applyPromotions(codes)
      setSuccessMessage(`Gutschein „${code}“ eingelöst.`)
    } catch (e) {
      setErrorMessage(
        e instanceof Error ? e.message : "Code ungültig oder abgelaufen."
      )
    }

    if (input) {
      input.value = ""
    }
  }

  return (
    <div>
      <form action={(a) => addPromotionCode(a)} className="flex gap-2">
        <input
          id="promotion-input"
          name="code"
          type="text"
          placeholder="z. B. BIKEONE10"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-[7px] border border-bo-line bg-bo-surface px-3 py-2.5 font-mono text-[13.5px] uppercase text-bo-ink placeholder:normal-case placeholder:text-bo-ink-faint focus:border-bo-accent focus:outline-none"
          data-testid="discount-input"
        />
        <ApplyButton />
      </form>

      {errorMessage && (
        <p
          className="mt-2 text-[12.5px] font-semibold text-bo-accent"
          data-testid="discount-error-message"
        >
          {errorMessage}
        </p>
      )}
      {successMessage && (
        <p className="mt-2 text-[12.5px] font-semibold text-bo-ok">
          {successMessage}
        </p>
      )}

      {promotions.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {promotions.map((promotion) => (
            <div
              key={promotion.id}
              className="flex items-center justify-between gap-2 rounded-[7px] bg-bo-ok-bg px-3 py-2 text-[12.5px]"
              data-testid="discount-row"
            >
              <span className="text-bo-ok">
                <span
                  className="font-mono font-bold uppercase"
                  data-testid="discount-code"
                >
                  {promotion.code}
                </span>
                {promotion.application_method?.value !== undefined &&
                  promotion.application_method.currency_code !== undefined && (
                    <>
                      {" "}
                      (
                      {promotion.application_method.type === "percentage"
                        ? `${promotion.application_method.value}%`
                        : convertToLocale({
                            amount: +promotion.application_method.value,
                            currency_code:
                              promotion.application_method.currency_code,
                          })}
                      )
                    </>
                  )}
              </span>
              {!promotion.is_automatic && (
                <button
                  type="button"
                  className="text-bo-ink-faint underline decoration-dashed underline-offset-[3px] hover:text-bo-accent"
                  onClick={() => {
                    if (!promotion.code) return
                    removePromotionCode(promotion.code)
                  }}
                  data-testid="remove-discount-button"
                >
                  Entfernen
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const ApplyButton = () => {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      data-testid="discount-apply-button"
      className="shrink-0 rounded-[7px] border-[1.5px] border-bo-line-strong px-3.5 py-2 text-[13px] font-semibold hover:border-bo-ink disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "…" : "Anwenden"}
    </button>
  )
}

export default DiscountCode
