import type {
  InitiatePaymentInput,
  InitiatePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
} from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import SumupModule from "@sumup/medusa-plugin/providers/sumup"
import { sumupWebhookUrl } from "../../lib/sumup-webhook-secret"

// The installed plugin's service class: its exports map only exposes the module wrapper.
type Options = { returnUrl?: string; redirectUrl?: string }
type PluginProvider = {
  options_: Options
  initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput>
  updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput>
}
const Plugin = (SumupModule.services as unknown[])[0] as new (
  container: Record<string, unknown>,
  options: Options
) => PluginProvider

// Only these keys of the `data` a caller passes reach the plugin. Shopper-supplied
// data (POST /store/payment-collections/:id/payment-sessions) must not steer the
// checkout (description, URLs, reference, ...). The storefront sends only redirect_url.
const SHOPPER_KEYS = ["checkout_mode"]
// what a stored session carries that the plugin needs to find and replace its checkout
const STORED_KEYS = ["checkout_mode", "checkout_id", "id", "checkout_reference"]

/**
 * SumUp provider with a per-session webhook URL. The plugin stores the whole
 * SumUp checkout, including the `return_url` we registered, in
 * payment_session.data, which the Store API returns to the shopper. So that URL
 * must not hold the shared secret: the wrapper registers
 * `.../sumup_sumup?ref=<session id>&wh_token=<HMAC(secret, session id)>`
 * instead (src/lib/sumup-webhook-secret.ts). A leaked token only allows
 * re-checking that one session (it does not expire). The wrapper also builds the
 * plugin's input from an allow-list and strips top-level `return_url` from what
 * is stored. redirect_url is accepted from the storefront only when it points to
 * the configured redirect page on the configured origin (the storefront appends
 * cart_id and country_code); anything else falls back to the configured URL.
 */
export default class SumupPaymentProviderService extends Plugin {
  static identifier = "sumup"

  private redirectUrl(requested: unknown): string | undefined {
    const configured = this.options_.redirectUrl
    try {
      const want = new URL(String(requested))
      const base = new URL(configured ?? "")
      if (want.origin === base.origin && want.pathname === base.pathname) {
        return want.toString()
      }
    } catch {
      // not a URL: fall through to the configured one
    }
    return configured
  }

  private pinned(
    data: Record<string, unknown> | undefined,
    reference: unknown,
    keys: string[]
  ) {
    if (typeof reference !== "string" || !reference) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "SumUp checkout needs the payment session id as its reference"
      )
    }
    return {
      ...Object.fromEntries(keys.filter((k) => data?.[k] !== undefined).map((k) => [k, data![k]])),
      checkout_reference: reference,
      return_url: sumupWebhookUrl(this.options_.returnUrl ?? "", reference),
      redirect_url: this.redirectUrl(data?.redirect_url),
    }
  }

  // the plugin merges its input into the stored data; the per-session URL must not stay there
  private withoutReturnUrl<T extends { data?: Record<string, unknown> }>(out: T): T {
    if (!out.data) return out
    const { return_url: _dropped, ...data } = out.data
    return { ...out, data }
  }

  async initiatePayment(input: InitiatePaymentInput) {
    // core passes data.session_id = the payment session id, which the plugin would use anyway
    return this.withoutReturnUrl(
      await super.initiatePayment({
        ...input,
        data: this.pinned(input.data, input.data?.session_id, SHOPPER_KEYS),
      })
    )
  }

  async updatePayment(input: UpdatePaymentInput) {
    // a replacement checkout reuses the reference stored on the session
    return this.withoutReturnUrl(
      await super.updatePayment({
        ...input,
        data: this.pinned(
          input.data,
          input.data?.checkout_reference ?? input.data?.session_id ?? input.context?.idempotency_key,
          STORED_KEYS
        ),
      })
    )
  }
}
