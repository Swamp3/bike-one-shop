import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { resolveTridataOrderConflictWorkflow } from "../../../../../../workflows/tridata"
import { requireConfigured } from "../../../helpers"
import type { AdminTridataResolveBodyType } from "../../../validators"

/** Resolve a `conflict` upload (by Medusa order id); logged with the admin user id. */
export async function POST(
  req: AuthenticatedMedusaRequest<AdminTridataResolveBodyType>,
  res: MedusaResponse
) {
  if (!requireConfigured(res)) {
    return
  }
  const { result } = await resolveTridataOrderConflictWorkflow(req.scope).run({
    input: {
      order_id: req.params.id,
      action: req.validatedBody.action,
      admin_user_id: req.auth_context?.actor_id ?? null,
    },
  })
  const status =
    result.status === "not_found" ? 404 : result.status === "not_conflict" ? 409 : 200
  res.status(status).json({ result })
}
