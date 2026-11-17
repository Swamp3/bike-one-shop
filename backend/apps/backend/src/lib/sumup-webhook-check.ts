import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from '@medusajs/framework/http'
import {
  ContainerRegistrationKeys,
  Modules,
  PaymentActions,
} from '@medusajs/framework/utils'
import { createIntegrationLogger } from './integration-logger'
import { scrubError } from './scrub'

const CHECKOUT_ID = /^[A-Za-z0-9_-]{1,64}$/

type WebhookEvent = { action: string; data?: { session_id?: string; amount?: unknown } }

/**
 * SumUp reports a payment for this very session and the amount Medusa expects.
 * Both values come from SumUp's own checkout (the plugin never reads the body).
 */
export const sumupEventMatchesSession = (
  event: WebhookEvent,
  session: { id: string; amount: unknown } | undefined
): boolean =>
  !!session &&
  event.data?.session_id === session.id &&
  Number(event.data?.amount) === Number(session.amount)

/**
 * Runs before Medusa's generic /hooks/payment handler (which only queues the
 * event; the subscriber then captures whatever amount the plugin reports and
 * never compares it to the session). Asks SumUp the same question the subscriber
 * will, and swallows a "paid" report whose session id, URL token reference or
 * amount does not match: nothing is queued, nothing is captured. A failed lookup
 * answers 503 so SumUp retries. Costs one extra SumUp GET per webhook.
 */
export async function verifySumupWebhookEvent(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const body = req.body as { event_type?: unknown; id?: unknown } | undefined
  if (body?.event_type !== 'CHECKOUT_STATUS_CHANGED' || typeof body.id !== 'string') {
    return next() // the plugin answers not_supported for anything else
  }
  const log = createIntegrationLogger(
    req.scope.resolve(ContainerRegistrationKeys.LOGGER),
    'sumup'
  )
  // The SumUp SDK puts the id unencoded into /v0.1/checkouts/${id}: refuse anything
  // that is not id-shaped before it can reach a SumUp call. 200, not 400: the
  // request can never become valid, so SumUp should not retry it.
  if (!CHECKOUT_ID.test(body.id)) {
    log.warn('webhookRejected', { reason: 'malformed checkout id' })
    return res.sendStatus(200)
  }
  try {
    const event = (await req.scope.resolve(Modules.PAYMENT).getWebhookActionAndData({
      provider: 'sumup_sumup',
      payload: { data: body as Record<string, unknown>, rawData: '', headers: {} },
    })) as WebhookEvent
    if (event.action !== PaymentActions.SUCCESSFUL) {
      return next()
    }
    const { data: sessions } = await req.scope
      .resolve(ContainerRegistrationKeys.QUERY)
      .graph({
        entity: 'payment_session',
        fields: ['id', 'amount'],
        filters: { id: event.data?.session_id || '__none__' },
      })
    if (
      !sumupEventMatchesSession(event, sessions[0]) ||
      event.data?.session_id !== req.query.ref
    ) {
      log.error('webhookRejected', {
        reason: 'session or amount mismatch',
        session_id: event.data?.session_id,
      })
      return res.sendStatus(200) // acknowledged, so SumUp stops retrying; nothing is processed
    }
  } catch (e) {
    log.warn('webhookCheckFailed', { error: scrubError((e as Error).message, 300) })
    return res.sendStatus(503)
  }
  return next()
}
