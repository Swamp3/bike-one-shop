import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { selectStaleIdentities } from "../lib/stale-identities"

const STALE_DAYS = 7
const PAGE = 500
const MAX_PAGES = 200 // 100k identities; stale ones are mixed with real customers

/**
 * Deletes registrations that never confirmed their e-mail address (see
 * lib/stale-identities.ts). AUTH_CLEANUP_DRY_RUN=true only logs the count.
 */
export default async function authUnverifiedCleanup(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const auth = container.resolve(Modules.AUTH)
  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000)
  const stale: string[] = []

  for (let page = 0; page < MAX_PAGES; page++) {
    const identities = await auth.listAuthIdentities(
      { created_at: { $lt: cutoff } } as never,
      { relations: ["provider_identities"], take: PAGE, skip: page * PAGE, order: { created_at: "ASC" } }
    )
    if (!identities.length) break
    const verifications = await auth.listAuthVerifications({
      auth_identity_id: identities.map((i) => i.id),
    } as never)
    const verified = new Set(
      verifications.filter((v) => v.verified_at).map((v) => v.auth_identity_id as string)
    )
    stale.push(...selectStaleIdentities(identities as never, verified, cutoff))
    if (identities.length < PAGE) break
  }

  if (process.env.AUTH_CLEANUP_DRY_RUN === "true") {
    logger.info(`[auth-cleanup] dry run: ${stale.length} unverified registration(s) older than ${STALE_DAYS} days`)
    return
  }
  if (stale.length) {
    await auth.deleteAuthIdentities(stale)
  }
  logger.info(`[auth-cleanup] deleted ${stale.length} unverified registration(s) older than ${STALE_DAYS} days`)
}

export const config = {
  name: "auth-unverified-cleanup",
  schedule: "45 3 * * *",
}
