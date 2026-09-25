import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// SumUp sandbox credentials aren't available yet (see PLAN.md). The provider
// is only registered once both are set — its own validateOptions() throws on
// boot otherwise — so `make dev` keeps working today, and it activates
// automatically the moment real credentials land in .env, with no further
// code changes needed.
const sumupApiKey = process.env.SUMUP_API_KEY
const sumupMerchantCode = process.env.SUMUP_MERCHANT_CODE
const sumupConfigured = Boolean(sumupApiKey && sumupMerchantCode)

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
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
  modules: sumupConfigured
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
                  returnUrl: `${process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'}/hooks/payment/sumup_sumup`,
                  redirectUrl: `${process.env.STOREFRONT_URL || 'http://localhost:8000'}/checkout/sumup/return`,
                },
              },
            ],
          },
        },
      ]
    : [],
})
