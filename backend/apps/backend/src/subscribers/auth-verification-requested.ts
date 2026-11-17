import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { activationLink, buildActivationEmail } from "../lib/account-activation-email"
import { emailpassIdentity } from "../lib/auth-identity"
import { scrubError } from "../lib/scrub"

// Same links as the order confirmation: a localhost fallback only outside production.
const storefrontUrl = () => {
  const url = process.env.STOREFRONT_URL
  if (url) {
    return url
  }
  if (process.env.NODE_ENV === "production") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "STOREFRONT_URL is not set: the account activation e-mail needs it for its link"
    )
  }
  return "http://localhost:8000"
}

// shortcut: in-memory throttle (one backend process, see REVIEW_TASKS.md); use
// Redis if the backend ever runs more than one process. Per-IP limits belong
// to the reverse proxy.
const THROTTLE_MS = 60_000
const lastSent = new Map<string, number>()
const ADDRESS = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

/**
 * auth.verification_requested -> activation e-mail with the single-use code.
 * Medusa only emits the code; delivering it is our job. One attempt: the
 * customer can request a new mail by logging in again. A failure is logged
 * (error text scrubbed, never the code or the address).
 */
export default async function authVerificationRequestedHandler({
  event: { data },
  container,
}: SubscriberArgs<{
  entity_id: string
  entity_type: string
  auth_identity_id?: string
  code: string
  expires_at?: string
}>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  if (data.entity_type !== "email") {
    return
  }
  // Same condition as medusa-config.ts: no notification module is registered.
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NOTIFICATION_ALLOW_NONE === "true" &&
    !(
      process.env.NOTIFICATION_PROVIDER_RESOLVE &&
      process.env.NOTIFICATION_API_KEY &&
      process.env.NOTIFICATION_FROM
    )
  ) {
    logger.warn("[notification] NOTIFICATION_ALLOW_NONE=true: account activation e-mail was SKIPPED")
    return
  }

  try {
    // The endpoint takes any address from the request body: mail only the
    // address this identity registered with, and not more than once a minute,
    // or the shop could be used to send mail to strangers.
    const own = await emailpassIdentity(container, data.auth_identity_id)
    if (!own || own.email.toLowerCase() !== data.entity_id.toLowerCase() || !ADDRESS.test(data.entity_id)) {
      logger.warn("[notification] account activation e-mail refused: address is not the identity's own")
      return
    }
    const key = own.email.toLowerCase()
    if (Date.now() - (lastSent.get(key) ?? 0) < THROTTLE_MS) {
      logger.warn("[notification] account activation e-mail throttled")
      return
    }
    lastSent.set(key, Date.now())
    if (lastSent.size > 5000) {
      for (const [k, at] of lastSent) if (Date.now() - at > THROTTLE_MS) lastSent.delete(k)
    }

    const link = activationLink(storefrontUrl(), data.code)
    // Only where nothing is really sent (notification-local): show the link to click.
    const sendsRealMail = Boolean(
      process.env.NOTIFICATION_PROVIDER_RESOLVE &&
        process.env.NOTIFICATION_API_KEY &&
        process.env.NOTIFICATION_FROM
    )
    if (process.env.NODE_ENV !== "production" && !sendsRealMail) {
      logger.info(`[notification] account activation link (dev, no mail provider): ${link}`)
    }
    const { subject, text, html } = buildActivationEmail(link, data.expires_at)
    await container.resolve(Modules.NOTIFICATION).createNotifications({
      to: data.entity_id,
      channel: "email",
      template: "account-activation",
      content: { subject, text, html },
      data: {},
      trigger_type: "auth.verification_requested",
    })
    logger.info("[notification] account activation e-mail handed to provider")
  } catch (e) {
    logger.error(`[notification] account activation e-mail failed: ${scrubError((e as Error).message, 300)}`)
  }
}

export const config: SubscriberConfig = {
  event: "auth.verification_requested",
}
