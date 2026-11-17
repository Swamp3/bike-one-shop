/**
 * Removes personal data and secrets from free text before it is logged or
 * stored (TridataSyncLog.error, TridataOrderMap.last_error, stdout).
 * Masks: email addresses, phone-number-like digit sequences (starting with
 * "+" or "0", at least 7 digits), and the configured TRIDATA_IDENTIFY_GUID,
 * SUMUP_API_KEY and SUMUP_WEBHOOK_SECRET.
 */
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g
// "+49 441 1234567", "0441/123456", "015775004744", "(0441) 12-34-56"
const PHONE = /(?<![\w-])(?:\+|\(?0)\d[\d \-/()]{4,}\d(?![\w-])/g

function maskPhones(text: string): string {
  return text.replace(PHONE, (match) =>
    match.replace(/\D/g, "").length >= 7 ? "<phone>" : match
  )
}

// Shorter values would mask random substrings of ordinary messages.
const MIN_SECRET_LENGTH = 8
const ENV_SECRETS = ["SUMUP_API_KEY", "SUMUP_WEBHOOK_SECRET"]

export function scrubError(message: string, maxLength = 1000): string {
  const guid = process.env.TRIDATA_IDENTIFY_GUID?.trim()
  let scrubbed = message
  if (guid) {
    scrubbed = scrubbed.split(guid).join("<guid>")
  }
  for (const name of ENV_SECRETS) {
    const value = process.env[name]?.trim()
    if (value && value.length >= MIN_SECRET_LENGTH) {
      scrubbed = scrubbed.split(value).join("<secret>")
    }
  }
  scrubbed = maskPhones(scrubbed.replace(EMAIL, "<email>"))
  return scrubbed.slice(0, maxLength)
}
