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
import {
  AdminTridataEmptyBody,
  AdminTridataOrdersQuery,
  AdminTridataResolveBody,
  AdminTridataStockSnapshotsQuery,
  AdminTridataSyncLogsQuery,
  AdminTridataSyncStockBody,
} from './admin/tridata/validators'
import { AdminResendConfirmationBody } from './admin/orders/validators'
import { requireOwnEmail, requireOwnVerification } from '../lib/auth-guards'
import { authIdentity, bodyField, rateLimit } from '../lib/rate-limit'
import { linkGuestOrders } from '../lib/link-guest-orders'
import { scrubError } from '../lib/scrub'
import { verifySumupWebhookSecret } from '../lib/sumup-webhook-secret'

// Before a customer's order list is read, move their guest orders (same,
// verified e-mail address) onto the account. A failure never blocks the list.
// shortcut: at most once per customer every 5 minutes, in memory (one backend
// process); the check costs a few queries.
const LINK_INTERVAL_MS = 5 * 60_000
const lastLinkRun = new Map<string, number>()
async function linkGuestOrdersBeforeList(
  req: AuthenticatedMedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  const customerId = req.auth_context?.actor_id
  if (customerId && Date.now() - (lastLinkRun.get(customerId) ?? 0) > LINK_INTERVAL_MS) {
    lastLinkRun.set(customerId, Date.now())
    if (lastLinkRun.size > 5000) {
      for (const [id, at] of lastLinkRun) if (Date.now() - at > LINK_INTERVAL_MS) lastLinkRun.delete(id)
    }
    try {
      await linkGuestOrders(req.scope, customerId, req.auth_context.auth_identity_id)
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
    // Auth-call limits. The storefront server makes these calls, so the backend
    // sees one address: limit per account / login here, per visitor in the
    // storefront (src/lib/rate-limit.ts there), and per address at the edge.
    {
      method: ['POST'],
      matcher: '/store/customers',
      middlewares: [
        authenticate('customer', ['session', 'bearer'], { allowUnregistered: true }),
        rateLimit('create-customer', 5, 60_000, authIdentity),
        requireOwnEmail,
      ],
    },
    {
      method: ['POST'],
      matcher: '/auth/verification/confirm',
      middlewares: [
        authenticate('customer', ['session', 'bearer'], { allowUnregistered: true }),
        rateLimit('verification-confirm', 10, 60_000, authIdentity),
        requireOwnVerification,
      ],
    },
    {
      method: ['POST'],
      matcher: '/auth/customer/emailpass',
      middlewares: [rateLimit('login', 10, 15 * 60_000, bodyField('email'))],
    },
    {
      method: ['POST'],
      matcher: '/auth/customer/emailpass/register',
      middlewares: [rateLimit('register', 5, 15 * 60_000, bodyField('email'))],
    },
    // Called by the admin dashboard in the browser, so the visitor address is real.
    { method: ['POST'], matcher: '/auth/user/emailpass', middlewares: [rateLimit('admin-login', 10)] },
    {
      method: ['POST'],
      matcher: '/auth/verification/request',
      middlewares: [rateLimit('verification-request', 5, 60_000, authIdentity)],
    },
    // Password reset is not built yet; limit it already so it cannot mail-bomb an address.
    {
      method: ['POST'],
      matcher: '/auth/customer/emailpass/reset-password',
      middlewares: [rateLimit('reset-password', 3, 15 * 60_000, bodyField('identifier'))],
    },
    {
      method: ['POST'],
      matcher: '/auth/customer/emailpass/update',
      middlewares: [rateLimit('reset-update', 5, 15 * 60_000)],
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
