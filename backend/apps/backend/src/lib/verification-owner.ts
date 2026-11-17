import { createHash } from "node:crypto"
import type { MedusaContainer } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

/**
 * The auth identity a verification code was issued for, or null if the code is
 * unknown or already used. Medusa's token provider stores only the SHA-256 hex
 * hash of the code (`provider_metadata.token_hash`).
 */
export async function verificationOwner(
  container: MedusaContainer,
  code: string
): Promise<string | null> {
  const [verification] = await container.resolve(Modules.AUTH).listAuthVerifications({
    provider_metadata: { token_hash: createHash("sha256").update(code).digest("hex") },
  } as never)
  return verification && !verification.verified_at ? verification.auth_identity_id : null
}
