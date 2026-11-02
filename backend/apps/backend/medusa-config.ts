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

const redisUrl = process.env.REDIS_URL

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
                  returnUrl: `${process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'}/hooks/payment/sumup_sumup?wh_secret=${sumupWebhookSecret}`,
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
