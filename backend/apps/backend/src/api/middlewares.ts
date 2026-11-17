import {
  authenticate,
  configureStoreSearch,
  defineMiddlewares,
  validateAndTransformBody,
  validateAndTransformQuery,
} from '@medusajs/framework/http'
import type {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
  MedusaNextFunction,
} from '@medusajs/framework/http'
import { timingSafeEqual } from 'node:crypto'
import {
  AdminTridataEmptyBody,
  AdminTridataOrdersQuery,
  AdminTridataResolveBody,
  AdminTridataStockSnapshotsQuery,
  AdminTridataSyncLogsQuery,
  AdminTridataSyncStockBody,
} from './admin/tridata/validators'
import { AdminResendConfirmationBody } from './admin/orders/validators'
import { linkGuestOrders } from '../lib/link-guest-orders'
import { scrubError } from '../lib/scrub'

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

// Before a customer's order list is read, move their guest orders (same,
// verified e-mail address) onto the account. A failure never blocks the list.
async function linkGuestOrdersBeforeList(
  req: AuthenticatedMedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  const customerId = req.auth_context?.actor_id
  if (customerId) {
    try {
      await linkGuestOrders(req.scope, customerId)
    } catch (e) {
      req.scope
        .resolve('logger')
        .error(`[orders] linking guest orders failed: ${scrubError((e as Error).message, 300)}`)
    }
  }
  return next()
}

// The product index declares filterable `status` and `sales_channel_ids`, so
// the route narrows it to published products in the key's sales channels.
export default defineMiddlewares({
  routes: [
    {
      method: ['GET'],
      matcher: '/store/orders',
      middlewares: [authenticate('customer', ['session', 'bearer']), linkGuestOrdersBeforeList],
    },
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
    // TriCon sync admin API (src/api/admin/tridata). Admin routes are
    // authenticated by Medusa; these only validate inputs.
    {
      method: ['GET'],
      matcher: '/admin/tridata/sync-logs',
      middlewares: [validateAndTransformQuery(AdminTridataSyncLogsQuery, {})],
    },
    {
      method: ['GET'],
      matcher: '/admin/tridata/orders',
      middlewares: [validateAndTransformQuery(AdminTridataOrdersQuery, {})],
    },
    {
      method: ['GET'],
      matcher: '/admin/tridata/stock-snapshots',
      middlewares: [validateAndTransformQuery(AdminTridataStockSnapshotsQuery, {})],
    },
    {
      method: ['POST'],
      matcher: '/admin/tridata/sync-stock',
      middlewares: [validateAndTransformBody(AdminTridataSyncStockBody)],
    },
    {
      method: ['POST'],
      matcher: '/admin/tridata/link-products',
      middlewares: [validateAndTransformBody(AdminTridataEmptyBody)],
    },
    {
      method: ['POST'],
      matcher: '/admin/tridata/sync-order-states',
      middlewares: [validateAndTransformBody(AdminTridataEmptyBody)],
    },
    {
      method: ['POST'],
      matcher: '/admin/tridata/orders/:id/resolve',
      middlewares: [validateAndTransformBody(AdminTridataResolveBody)],
    },
    {
      method: ['POST'],
      matcher: '/admin/tridata/retry-order/:id',
      middlewares: [validateAndTransformBody(AdminTridataEmptyBody)],
    },
    {
      method: ['POST'],
      matcher: '/admin/orders/:id/resend-confirmation',
      middlewares: [validateAndTransformBody(AdminResendConfirmationBody)],
    },
  ],
})
