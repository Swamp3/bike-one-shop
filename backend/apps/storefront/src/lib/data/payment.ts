"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { HttpTypes } from "@medusajs/types"

export const listCartPaymentMethods = async (regionId: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("payment_providers")),
  }

  return sdk.client
    .fetch<HttpTypes.StorePaymentProviderListResponse>(
      `/store/payment-providers`,
      {
        method: "GET",
        query: { region_id: regionId },
        headers,
        next,
        cache: "force-cache",
      }
    )
    .then(({ payment_providers }) =>
      payment_providers.sort((a, b) => {
        return a.id > b.id ? 1 : -1
      })
    )
    .catch(() => {
      return null
    })
}

/**
 * Admin-editable overrides for a payment method's storefront display title
 * (Store metadata, key `payment_label_<provider_id>` — see the backend route
 * at src/api/store/custom/payment-method-labels). Falls back to an empty map
 * on any error so a misconfigured/missing value never breaks checkout.
 *
 * Deliberately uncached: it's a single cheap row-read on the checkout page
 * only, and nothing triggers a `revalidateTag` for it (unlike cart data, an
 * Admin metadata edit never touches the storefront), so a cached version
 * would otherwise be stuck until the next deploy/restart.
 */
export const getPaymentMethodLabels = async (): Promise<
  Record<string, string>
> => {
  return sdk.client
    .fetch<{ labels: Record<string, string> }>(
      `/store/custom/payment-method-labels`,
      {
        method: "GET",
        cache: "no-store",
      }
    )
    .then(({ labels }) => labels)
    .catch(() => ({}))
}
