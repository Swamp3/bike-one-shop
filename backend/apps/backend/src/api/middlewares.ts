import { configureStoreSearch, defineMiddlewares } from '@medusajs/framework/http'
import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from '@medusajs/framework/http'
import { timingSafeEqual } from 'node:crypto'

// SumUp doesn't document a signed-webhook scheme, so this is a shared-secret
// compensating control: medusa-config.ts registers the webhook callback URL
// with ?wh_secret=<SUMUP_WEBHOOK_SECRET> appended, and this middleware
// rejects any call to that route without the matching secret before it
// reaches Medusa's core webhook handler.
function verifySumupWebhookSecret(
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

// The product index declares filterable `status` and `sales_channel_ids`, so
// the route narrows it to published products in the key's sales channels.
export default defineMiddlewares({
  routes: [
    {
      method: ['POST'],
      matcher: '/store/search',
      middlewares: [
        configureStoreSearch({
          allowed_indexes: {
            product: true,
          },
        }),
      ],
    },
    {
      method: ['POST'],
      matcher: '/hooks/payment/sumup_sumup',
      middlewares: [verifySumupWebhookSecret],
    },
  ],
})
