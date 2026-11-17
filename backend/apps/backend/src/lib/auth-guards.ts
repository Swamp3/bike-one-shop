import { Modules } from "@medusajs/framework/utils"
import type {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
} from "@medusajs/framework/http"
import { emailpassIdentity } from "./auth-identity"
import { verificationOwner } from "./verification-owner"

// The confirm route is unauthenticated in Medusa, so whoever holds the mailed
// code could confirm someone else's registration (pre-account takeover: the
// attacker registers a victim's address, the victim clicks the mail). Require
// the identity's own login: the code must belong to the caller's identity.
export async function requireOwnVerification(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const code = (req.body as { code?: unknown } | undefined)?.code
  if (typeof code === "string") {
    const owner = await verificationOwner(req.scope, code)
    if (owner && owner !== req.auth_context?.auth_identity_id) {
      return res.status(403).json({
        type: "not_allowed",
        message: "This link belongs to another login. Log in with the account you registered.",
      })
    }
  }
  return next()
}

// A customer record may only be created for the address the auth identity
// registered with: its e-mail is what guest orders and verification are
// matched against.
export async function requireOwnEmail(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const own = await emailpassIdentity(req.scope, req.auth_context?.auth_identity_id)
  const email = (req.body as { email?: unknown } | undefined)?.email
  if (!own || typeof email !== "string" || own.email.toLowerCase() !== email.toLowerCase()) {
    return res.status(400).json({
      type: "invalid_data",
      message: "The e-mail must match the address you registered with",
    })
  }
  // Only after the address is confirmed: Medusa lets an unverified token create
  // the customer, which would bind the identity (so the 7-day cleanup skips it)
  // and let a squatter hold someone else's address for good.
  const verifications = await req.scope.resolve(Modules.AUTH).listAuthVerifications({
    auth_identity_id: own.id,
    entity_id: own.email,
    entity_type: "email",
  })
  if (!verifications.some((v) => v.verified_at)) {
    return res.status(403).json({
      type: "not_allowed",
      message: "Confirm your e-mail address first",
    })
  }
  return next()
}
