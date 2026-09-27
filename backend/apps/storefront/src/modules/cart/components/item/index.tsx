"use client"

import { clx } from "@modules/common/components/ui"
import { deleteLineItem, updateLineItem } from "@lib/data/cart"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import ErrorMessage from "@modules/checkout/components/error-message"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Spinner from "@modules/common/icons/spinner"
import Thumbnail from "@modules/products/components/thumbnail"
import { useState } from "react"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem
  type?: "full" | "preview"
  currencyCode: string
}

/**
 * A single cart line item, styled after wireframes/warenkorb-checkout.html's
 * `.cart-item` card (thumbnail, brand/name/size, +/- qty stepper, price,
 * remove link). The underlying mutations (updateLineItem/deleteLineItem)
 * are the same real Medusa cart operations the previous unstyled table used.
 */
const Item = ({ item, type = "full", currencyCode }: ItemProps) => {
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const brand = (item as unknown as { product_collection?: string })
    .product_collection

  const changeQuantity = async (quantity: number) => {
    if (quantity < 1) return
    setError(null)
    setUpdating(true)

    await updateLineItem({ lineId: item.id, quantity })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setUpdating(false)
      })
  }

  const handleDelete = async () => {
    setDeleting(true)
    await deleteLineItem(item.id).catch((err) => {
      setError(err.message)
      setDeleting(false)
    })
  }

  // TODO: grab the real max inventory once per-variant stock is meaningful
  // (the seed stocks everything at a flat 1,000,000 units today).
  const maxQuantity = 10

  const unitPrice = item.total != null ? item.total / item.quantity : 0

  if (type === "preview") {
    return (
      <div className="flex items-center gap-2.5 py-1.5 text-[12.5px]">
        <LocalizedClientLink
          href={`/products/${item.product_handle}`}
          className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-bo-line"
        >
          <Thumbnail
            thumbnail={item.thumbnail}
            images={item.variant?.product?.images}
            size="square"
            className="h-full w-full rounded-none border-none p-0"
          />
        </LocalizedClientLink>
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate font-medium leading-tight">
            {item.product_title}
          </p>
          {item.variant_title && (
            <p className="m-0 truncate text-bo-ink-faint">
              Größe {item.variant_title}
            </p>
          )}
        </div>
        <span className="whitespace-nowrap font-mono text-bo-ink-muted">
          {item.quantity} ×{" "}
          {convertToLocale({ amount: unitPrice, currency_code: currencyCode })}
        </span>
      </div>
    )
  }

  return (
    <div
      className="flex gap-3 border-b border-bo-line py-3.5 last:border-b-0"
      data-testid="product-row"
    >
      <LocalizedClientLink
        href={`/products/${item.product_handle}`}
        className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg border border-bo-line"
      >
        <Thumbnail
          thumbnail={item.thumbnail}
          images={item.variant?.product?.images}
          size="square"
          className="h-full w-full rounded-none border-none p-0"
        />
      </LocalizedClientLink>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {brand && (
          <div className="font-mono text-[10px] uppercase tracking-wide text-bo-ink-faint">
            {brand}
          </div>
        )}
        <LocalizedClientLink
          href={`/products/${item.product_handle}`}
          className="m-0 font-heading text-[15px] font-medium leading-tight hover:text-bo-accent"
          data-testid="product-title"
        >
          {item.product_title}
        </LocalizedClientLink>
        {item.variant_title && (
          <div className="text-[12.5px] text-bo-ink-muted">
            Größe {item.variant_title}
          </div>
        )}

        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div
              className={clx(
                "flex items-center overflow-hidden rounded-[7px] border border-bo-line",
                { "opacity-60": updating }
              )}
              data-testid="product-select-button"
            >
              <button
                type="button"
                aria-label="Menge verringern"
                onClick={() => changeQuantity(item.quantity - 1)}
                disabled={updating || deleting || item.quantity <= 1}
                className="flex h-[30px] w-[30px] items-center justify-center bg-bo-surface-2 text-[16px] font-semibold hover:bg-bo-line disabled:cursor-not-allowed disabled:text-bo-ink-faint"
              >
                −
              </button>
              <span className="w-8 text-center font-mono text-[13px] font-semibold">
                {item.quantity}
              </span>
              <button
                type="button"
                aria-label="Menge erhöhen"
                onClick={() => changeQuantity(item.quantity + 1)}
                disabled={updating || deleting || item.quantity >= maxQuantity}
                className="flex h-[30px] w-[30px] items-center justify-center bg-bo-surface-2 text-[16px] font-semibold hover:bg-bo-line disabled:cursor-not-allowed disabled:text-bo-ink-faint"
              >
                +
              </button>
            </div>
            {updating && <Spinner size="16" />}
          </div>

          <div
            className="flex items-baseline gap-2"
            data-testid="product-price"
          >
            {item.quantity > 1 && (
              <span className="font-mono text-[11.5px] text-bo-ink-faint">
                {convertToLocale({
                  amount: unitPrice,
                  currency_code: currencyCode,
                })}{" "}
                / Stk.
              </span>
            )}
            <span className="font-mono text-[15px] font-extrabold tabular-nums">
              {convertToLocale({
                amount: item.total ?? 0,
                currency_code: currencyCode,
              })}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          data-testid="product-delete-button"
          className="mt-1.5 self-start text-[12.5px] text-bo-ink-faint underline decoration-dashed underline-offset-[3px] hover:text-bo-accent disabled:cursor-not-allowed"
        >
          {deleting ? "Wird entfernt …" : "Entfernen"}
        </button>

        <ErrorMessage error={error} data-testid="product-error-message" />
      </div>
    </div>
  )
}

export default Item
