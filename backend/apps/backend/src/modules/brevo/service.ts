import { AbstractNotificationProviderService, MedusaError } from "@medusajs/framework/utils"
import type {
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"
import { scrubError } from "../../lib/scrub"

type Options = { api_key: string; from: string; reply_to?: string }

const ENDPOINT = "https://api.brevo.com/v3/smtp/email"
const TIMEOUT_MS = 15_000
const NAME_MAX = 70 // Brevo's limit for display names

/** "BikeOne <order@mail.bike-one.dev>" -> { name, email }; a bare address -> { email }. */
export function parseAddress(value: string): { email: string; name?: string } {
  const match = value.trim().match(/^(.*?)\s*<([^<>]+)>$/)
  if (!match) {
    return { email: value.trim() }
  }
  const name = match[1].replace(/^"|"$/g, "").trim().slice(0, NAME_MAX)
  return name ? { email: match[2].trim(), name } : { email: match[2].trim() }
}

/**
 * Notification provider for Brevo's transactional API (POST /v3/smtp/email).
 * Sends the subject/html/text the caller built; no Brevo templates, no
 * attachments. Errors carry Brevo's status and code, never the recipient,
 * the content or the API key.
 */
class BrevoNotificationService extends AbstractNotificationProviderService {
  static identifier = "brevo"

  protected options_: Options

  constructor(_deps: unknown, options: Options) {
    super()
    this.options_ = options
  }

  static validateOptions(options: Record<string, unknown>) {
    for (const key of ["api_key", "from"]) {
      if (typeof options?.[key] !== "string" || !(options[key] as string).trim()) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Brevo notification provider: option "${key}" is required`
        )
      }
    }
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    const { content, attachments } = notification
    if (!content?.subject || !content.html) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Brevo notification provider needs content.subject and content.html (templates are not supported)"
      )
    }
    if (attachments?.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Brevo notification provider does not support attachments"
      )
    }

    const body = {
      sender: parseAddress(notification.from?.trim() || this.options_.from),
      to: [{ email: notification.to }],
      subject: content.subject,
      htmlContent: content.html,
      ...(content.text ? { textContent: content.text } : {}),
      ...(this.options_.reply_to ? { replyTo: parseAddress(this.options_.reply_to) } : {}),
    }

    let response: Response
    try {
      response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "api-key": this.options_.api_key,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch (e) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Brevo request failed: ${scrubError((e as Error).name + ": " + (e as Error).message, 200)}`
      )
    }

    const result = (await response.json().catch(() => ({}))) as {
      messageId?: string
      code?: string
      message?: string
    }
    if (!response.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Brevo rejected the e-mail: HTTP ${response.status} ${result.code ?? "unknown"}: ${scrubError(result.message ?? "", 200)}`
      )
    }
    return { id: result.messageId }
  }
}

export default BrevoNotificationService
