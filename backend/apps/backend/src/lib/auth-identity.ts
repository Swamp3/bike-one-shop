import type { MedusaContainer } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

/**
 * The e-mail address this auth identity registered with (emailpass
 * `entity_id`, exactly as stored) plus the customer it is bound to, or null.
 * Verification codes and order linking must be tied to this address, never to
 * an address that arrives in a request body.
 */
export async function emailpassIdentity(
  container: MedusaContainer,
  authIdentityId: string | undefined
): Promise<{ id: string; email: string; customerId?: string } | null> {
  if (!authIdentityId) {
    return null
  }
  const identity = await container
    .resolve(Modules.AUTH)
    .retrieveAuthIdentity(authIdentityId, { relations: ["provider_identities"] })
    .catch(() => null)
  const provider = identity?.provider_identities?.find((p) => p.provider === "emailpass")
  if (!identity || !provider?.entity_id) {
    return null
  }
  return {
    id: identity.id,
    email: provider.entity_id,
    customerId: (identity.app_metadata as { customer_id?: string } | null)?.customer_id,
  }
}
