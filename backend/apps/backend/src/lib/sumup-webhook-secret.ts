import { createHmac, timingSafeEqual } from 'node:crypto'
import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from '@medusajs/framework/http'

// SumUp documents no signed webhooks. The plugin ignores the body's content and
// re-fetches the checkout from SumUp with our key, so a forged call can at most
// trigger a status re-check. A per-session token keeps strangers from even doing
// that: the callback URL registered for a checkout is
// `.../hooks/payment/sumup_sumup?ref=<payment session id>&wh_token=<HMAC>` with
// HMAC = HMAC-SHA256(SUMUP_WEBHOOK_SECRET, session id). That URL ends up in
// payment_session.data and so in the browser, which is why it carries a token
// valid for that one session and never the secret itself. Anything without a
// valid token gets 401 before it reaches Medusa's webhook handler. Fails closed
// when the env var is unset.
const tokenFor = (secret: string, ref: string) =>
  createHmac('sha256', secret).update(`sumup-webhook:${ref}`).digest('hex')

export function sumupWebhookUrl(baseUrl: string, ref: string): string {
  const secret = process.env.SUMUP_WEBHOOK_SECRET ?? ''
  if (!secret) {
    throw new Error('SUMUP_WEBHOOK_SECRET is not set')
  }
  const url = new URL(baseUrl)
  url.searchParams.set('ref', ref)
  url.searchParams.set('wh_token', tokenFor(secret, ref))
  return url.toString()
}

export function verifySumupWebhookSecret(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const secret = process.env.SUMUP_WEBHOOK_SECRET ?? ''
  const { ref, wh_token: token } = req.query
  if (!secret || typeof ref !== 'string' || !ref || typeof token !== 'string') {
    return res.sendStatus(401)
  }

  const expectedBuf = Buffer.from(tokenFor(secret, ref))
  const providedBuf = Buffer.from(token)
  if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
    return res.sendStatus(401)
  }

  return next()
}
