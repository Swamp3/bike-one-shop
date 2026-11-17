import "server-only"
import { cookies as nextCookies } from "next/headers"

export const getAuthHeaders = async (): Promise<
  { authorization: string } | Record<string, never>
> => {
  try {
    const cookies = await nextCookies()
    const token = cookies.get("_medusa_jwt")?.value

    if (!token) {
      return {}
    }

    return { authorization: `Bearer ${token}` }
  } catch {
    return {}
  }
}

export const getCacheTag = async (tag: string): Promise<string> => {
  try {
    const cookies = await nextCookies()
    const cacheId = cookies.get("_medusa_cache_id")?.value

    if (!cacheId) {
      return ""
    }

    return `${tag}-${cacheId}`
  } catch {
    return ""
  }
}

// Every Store API read is force-cached. The revalidate is an upper bound so
// edits in the admin (products, prices, images) show up within a minute even
// when no tag is invalidated, and requests without a cache id are not cached
// forever.
export const getCacheOptions = async (
  tag: string
): Promise<{ revalidate?: number; tags?: string[] }> => {
  if (typeof window !== "undefined") {
    return {}
  }

  const cacheTag = await getCacheTag(tag)

  return { revalidate: 60, ...(cacheTag ? { tags: [cacheTag] } : {}) }
}

// `sameSite: "lax"` rather than `"strict"`: the customer returns from a
// redirect-based payment method (iDEAL, Bancontact, ...) via a cross-site
// top-level navigation. A "strict" cookie is withheld on that navigation, so
// the storefront would see a logged-out, cartless visitor and render a 404 for
// the checkout page instead of resuming the order. "lax" is sent on top-level
// GET navigations while still blocking cross-site subrequests.
export const setAuthToken = async (token: string) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", token, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeAuthToken = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", "", {
    maxAge: -1,
  })
}

export type PendingCustomer = {
  email: string
  first_name?: string
  last_name?: string
  phone?: string
}

// During the email verification flow the customer record isn't created until
// the customer verifies their email and logs in. We temporarily persist the
// extra signup fields in a cookie so they survive the customer leaving to open
// their inbox, and read them back when creating the customer at login.
export const setPendingCustomer = async (customer: PendingCustomer) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_pending_customer", JSON.stringify(customer), {
    maxAge: 60 * 60 * 24,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const getPendingCustomer = async (): Promise<PendingCustomer | null> => {
  const cookies = await nextCookies()
  const value = cookies.get("_medusa_pending_customer")?.value

  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as PendingCustomer
  } catch {
    return null
  }
}

export const removePendingCustomer = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_pending_customer", "", {
    maxAge: -1,
  })
}

// The token of a login that needs e-mail confirmation (it has no customer
// attached) and the address it belongs to, kept for the length of a
// verification code so "resend activation mail" can work without asking for the
// password again. Never readable by the browser.
export type PendingVerification = { email: string; token: string }

export const setPendingVerification = async (pending: PendingVerification) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_pending_verification", JSON.stringify(pending), {
    maxAge: 60 * 15,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const getPendingVerification = async (): Promise<PendingVerification | null> => {
  const cookies = await nextCookies()
  const value = cookies.get("_medusa_pending_verification")?.value
  if (!value) {
    return null
  }
  try {
    return JSON.parse(value) as PendingVerification
  } catch {
    return null
  }
}

export const removePendingVerification = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_pending_verification", "", { maxAge: -1 })
}

export const getCartId = async () => {
  const cookies = await nextCookies()
  return cookies.get("_medusa_cart_id")?.value
}

// See the note on `setAuthToken`: `sameSite: "lax"` so the cart cookie survives
// the cross-site return navigation from a redirect-based payment method.
export const setCartId = async (cartId: string) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_cart_id", cartId, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeCartId = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_cart_id", "", {
    maxAge: -1,
  })
}
