import { sdk } from "@lib/config"
import { placeOrder } from "@lib/data/cart"
import { getAuthHeaders, setCartId } from "@lib/data/cookies"
import { HttpTypes } from "@medusajs/types"
import { unstable_rethrow } from "next/navigation"
import { NextRequest, NextResponse } from "next/server"

// Mirrors /api/payment-return (Stripe) but only trusts our own query params
// (cart_id/country_code, set when the session was created) — nothing SumUp
// itself appends to the redirect is relied on. `placeOrder` completes the
// cart via Medusa's workflow, which re-checks the real payment status with
// SumUp's API before capturing, so the security-relevant check happens
// there regardless of what's in the URL.
export async function GET(req: NextRequest) {
  const { origin, searchParams } = req.nextUrl

  const cartId = searchParams.get("cart_id")
  const countryCode = searchParams.get("country_code")

  const prefix = countryCode ? `/${countryCode}` : ""
  const rejected = () =>
    NextResponse.redirect(`${origin}${prefix}/cart?error=payment_failed`)

  if (!cartId) {
    return rejected()
  }

  const cart = await sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${cartId}`, {
      method: "GET",
      query: { fields: "payment_collection.payment_sessions.*" },
      headers: { ...(await getAuthHeaders()) },
      cache: "no-store",
    })
    .then(({ cart }) => cart)
    .catch(() => null)

  const paymentSession = cart?.payment_collection?.payment_sessions?.find(
    (session) => session.provider_id?.startsWith("pp_sumup_")
  )

  if (!paymentSession) {
    return rejected()
  }

  await setCartId(cartId)

  try {
    await placeOrder(cartId)
  } catch (error) {
    unstable_rethrow(error)

    return NextResponse.redirect(`${origin}${prefix}/cart?error=order_failed`)
  }

  // Only reached when the cart did not convert into an order.
  return NextResponse.redirect(`${origin}${prefix}/cart?error=order_failed`)
}
