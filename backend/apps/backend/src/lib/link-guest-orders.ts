import type { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { emailpassIdentity } from "./auth-identity"

/**
 * Moves orders placed as a guest with this customer's e-mail address onto the
 * customer's account. Safe to call repeatedly (idempotent) and cheap.
 *
 * Only for a customer with an account whose e-mail address is VERIFIED, and
 * only through the customer's OWN auth identity: the customer's e-mail must be
 * the address that identity registered with, the identity must be bound to
 * this customer, and the verification row must belong to that identity. (The
 * customer's e-mail comes from a request body and the verification endpoint
 * accepts any address, so checking "some verified row for this address" would
 * let an attacker claim a victim's orders after the victim clicks a mail.)
 * Orders that already belong to another account are never touched. Returns
 * the number of orders moved; logs only ids and the count.
 */
export async function linkGuestOrders(
  container: MedusaContainer,
  customerId: string,
  authIdentityId: string | undefined
): Promise<number> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const {
    data: [customer],
  } = await query.graph({
    entity: "customer",
    fields: ["id", "email", "has_account"],
    filters: { id: customerId },
  })
  const email = customer?.email?.toLowerCase()
  if (!customer?.has_account || !email) {
    return 0
  }

  const identity = await emailpassIdentity(container, authIdentityId)
  if (!identity || identity.customerId !== customerId || identity.email.toLowerCase() !== email) {
    return 0
  }
  const verifications = await container.resolve(Modules.AUTH).listAuthVerifications({
    auth_identity_id: identity.id,
    entity_id: identity.email,
    entity_type: "email",
  })
  if (!verifications.some((v) => v.verified_at)) {
    return 0
  }

  // $ilike so a differently cased address still matches; exact lowercase
  // equality is checked below, because "_" and "%" are wildcards in LIKE.
  const { data: candidates } = await query.graph({
    entity: "order",
    fields: ["id", "email", "customer_id"],
    filters: { email: { $ilike: email } },
  })
  const sameEmail = candidates.filter(
    (o) => o.email?.toLowerCase() === email && o.customer_id !== customerId
  )
  if (!sameEmail.length) {
    return 0
  }

  // Keep orders of other real accounts: only guests (has_account=false) or no customer.
  const ownerIds = [...new Set(sameEmail.map((o) => o.customer_id).filter(Boolean))] as string[]
  const { data: owners } = ownerIds.length
    ? await query.graph({
        entity: "customer",
        fields: ["id", "has_account"],
        filters: { id: ownerIds },
      })
    : { data: [] as { id: string; has_account: boolean }[] }
  const accountOwners = new Set(owners.filter((c) => c.has_account).map((c) => c.id))
  const movable = sameEmail.filter((o) => !o.customer_id || !accountOwners.has(o.customer_id))

  const orderModule = container.resolve(Modules.ORDER)
  for (const order of movable) {
    await orderModule.updateOrders(order.id, { customer_id: customerId })
  }
  if (movable.length) {
    logger.info(`[orders] linked ${movable.length} guest order(s) to customer ${customerId}`)
  }
  return movable.length
}
