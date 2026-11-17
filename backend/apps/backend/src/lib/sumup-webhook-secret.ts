import { timingSafeEqual } from 'node:crypto'
import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from '@medusajs/framework/http'

// SumUp documents no signed webhooks. The plugin ignores the body's content and
// re-fetches the checkout from SumUp with our key, so a forged call can at most
// trigger a status re-check. This shared secret keeps strangers from even doing
// that: medusa-config.ts registers the callback URL with
// ?wh_secret=<SUMUP_WEBHOOK_SECRET>, and anything without it gets 401 before it
// reaches Medusa's webhook handler. Fails closed when the env var is unset.
export function verifySumupWebhookSecret(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const expected = process.env.SUMUP_WEBHOOK_SECRET ?? ''
  const provided = typeof req.query.wh_secret === 'string' ? req.query.wh_secret : ''

  const expectedBuf = Buffer.from(expected)
  const providedBuf = Buffer.from(provided)

  const matches =
    expected.length > 0 &&
    expectedBuf.length === providedBuf.length &&
    timingSafeEqual(expectedBuf, providedBuf)

  if (!matches) {
    return res.sendStatus(401)
  }

  return next()
}
