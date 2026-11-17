import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// SumUp sandbox credentials aren't available yet (see PLAN.md). The provider
// is only registered once both are set — its own validateOptions() throws on
// boot otherwise — so `make dev` keeps working today, and it activates
// automatically the moment real credentials land in .env, with no further
// code changes needed.
const sumupApiKey = process.env.SUMUP_API_KEY
const sumupMerchantCode = process.env.SUMUP_MERCHANT_CODE
const sumupWebhookSecret = process.env.SUMUP_WEBHOOK_SECRET
// Required alongside apiKey/merchantCode: it's what lets the middleware in
// src/api/middlewares.ts reject forged calls to the SumUp webhook route
// (SumUp doesn't document a signed-webhook scheme, so this is a shared-secret
// compensating control instead). Fail closed, same as the other two.
const sumupConfigured = Boolean(
  sumupApiKey && sumupMerchantCode && sumupWebhookSecret
)

// Order confirmation e-mails (PLAN: legal-compliance A7). A real provider is
// chosen purely by env: NOTIFICATION_PROVIDER_RESOLVE is the provider package
// or module (./src/modules/brevo is the one we use; it must take { api_key,
// from } options, as the official SendGrid provider does). Without it, development uses
// notification-local (logs to the console, sends nothing). Production without
// a provider refuses to start (the confirmation e-mail is a legal duty,
// § 312i BGB), unless NOTIFICATION_ALLOW_NONE=true is set explicitly for a
// test server that takes no real orders; then no notification module is
// registered and no confirmation is sent.
const notificationProvider = process.env.NOTIFICATION_PROVIDER_RESOLVE
const notificationApiKey = process.env.NOTIFICATION_API_KEY
const notificationFrom = process.env.NOTIFICATION_FROM
const notificationConfigured = Boolean(
  notificationProvider && notificationApiKey && notificationFrom
)
// The config is also loaded by `medusa build`, `db:migrate` and `medusa exec`
// (build/CI hosts without mail variables), so the fail-fast checks below that
// need runtime settings only run for `medusa start`. shortcut: argv sniffing,
// replace with a start-only loader if the CLI changes how it is invoked.
const isServerStart = process.argv.slice(2).includes('start')
const isProduction = process.env.NODE_ENV === 'production'
if (isServerStart && !notificationConfigured && isProduction) {
  if (process.env.NOTIFICATION_ALLOW_NONE !== 'true') {
    throw new Error(
      'No e-mail provider configured: set NOTIFICATION_PROVIDER_RESOLVE, NOTIFICATION_API_KEY and NOTIFICATION_FROM, or NOTIFICATION_ALLOW_NONE=true on a test server that takes no real orders'
    )
  }
  console.warn(
    '[notification] NOTIFICATION_ALLOW_NONE=true: order confirmation e-mails will NOT be sent'
  )
}

// The SumUp return URL must point at the real shop, not localhost.
if (isServerStart && isProduction && sumupConfigured && !process.env.STOREFRONT_URL) {
  throw new Error(
    'STOREFRONT_URL is not set: SumUp needs it for the payment return URL'
  )
}

const redisUrl = process.env.REDIS_URL
const backendUrl = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'

// Medusa only rejects empty secrets, and the .env.template value is public:
// a known JWT_SECRET lets anyone forge admin tokens.
if (process.env.NODE_ENV === 'production') {
  for (const key of ['JWT_SECRET', 'COOKIE_SECRET']) {
    if (process.env[key] === 'supersecret') {
      throw new Error(`${key} is the public default; set a real value (openssl rand -hex 32)`)
    }
  }
}

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    }
  },
  plugins: sumupConfigured
    ? [
        {
          resolve: '@sumup/medusa-plugin',
          options: {},
        },
      ]
    : [],
  modules: [
    // TriCon/Tridata ERP sync state (always registered; the sync itself only
    // runs once TRIDATA_ENDPOINT_URL + TRIDATA_IDENTIFY_GUID are set — see
    // src/lib/tridata/config.ts).
    { resolve: './src/modules/tridata-sync' },
    { resolve: './src/modules/tridata-stock-snapshot' },
    // The provider's default URL is localhost, which would be stored on every
    // uploaded image. Point it at this server instead.
    {
      resolve: '@medusajs/medusa/file',
      options: {
        providers: [
          {
            resolve: '@medusajs/medusa/file-local',
            id: 'local',
            options: { backend_url: `${backendUrl}/static` },
          },
        ],
      },
    },
    ...(notificationConfigured || process.env.NODE_ENV !== 'production'
      ? [
          {
            resolve: '@medusajs/medusa/notification',
            options: {
              providers: [
                notificationConfigured
                  ? {
                      resolve: notificationProvider,
                      id: 'email',
                      options: {
                        channels: ['email'],
                        api_key: notificationApiKey,
                        from: notificationFrom,
                        // Brevo module only; other providers ignore it.
                        reply_to: process.env.NOTIFICATION_REPLY_TO,
                      },
                    }
                  : {
                      resolve: '@medusajs/medusa/notification-local',
                      id: 'local',
                      options: {
                        name: 'Local Notification Provider',
                        channels: ['email'],
                      },
                    },
              ],
            },
          },
        ]
      : []),
    // Without these, events and scheduled workflows live in memory, so a
    // restart loses them (e.g. an order.placed that has not run yet).
    ...(redisUrl
      ? [
          {
            resolve: '@medusajs/medusa/event-bus-redis',
            options: { redisUrl },
          },
          {
            resolve: '@medusajs/medusa/workflow-engine-redis',
            options: { redis: { url: redisUrl } },
          },
        ]
      : []),
    ...(sumupConfigured
    ? [
        {
          resolve: '@medusajs/medusa/payment',
          options: {
            providers: [
              {
                resolve: '@sumup/medusa-plugin/providers/sumup',
                id: 'sumup',
                options: {
                  apiKey: sumupApiKey,
                  merchantCode: sumupMerchantCode,
                  checkoutMode: process.env.SUMUP_CHECKOUT_MODE || 'hosted',
                  returnUrl: `${backendUrl}/hooks/payment/sumup_sumup?wh_secret=${sumupWebhookSecret}`,
                  redirectUrl: `${process.env.STOREFRONT_URL || 'http://localhost:8000'}/api/payment-return/sumup`,
                },
              },
            ],
          },
        },
      ]
    : []),
  ],
})
