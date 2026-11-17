type Identity = {
  id: string
  created_at: Date | string
  app_metadata?: Record<string, unknown> | null
  provider_identities?: { provider: string }[] | null
}

/**
 * Auth identities that can be deleted: an emailpass registration that is older
 * than the cutoff, was never bound to an actor (no customer_id / user_id, so
 * never an admin user or a real customer) and never confirmed its e-mail.
 * Such an identity only blocks the real owner of the address from registering.
 */
export function selectStaleIdentities(
  identities: Identity[],
  verifiedIdentityIds: Set<string>,
  cutoff: Date
): string[] {
  return identities
    .filter(
      (i) =>
        new Date(i.created_at) < cutoff &&
        i.provider_identities?.some((p) => p.provider === "emailpass") &&
        Object.keys(i.app_metadata ?? {}).length === 0 &&
        !verifiedIdentityIds.has(i.id)
    )
    .map((i) => i.id)
}
