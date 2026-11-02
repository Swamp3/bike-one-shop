/**
 * Removes personal data and secrets from free text before it is logged or
 * stored (TridataSyncLog.error, TridataOrderMap.last_error, stdout).
 * Masks: email addresses, phone-number-like digit sequences (starting with
 * "+" or "0", at least 7 digits), and the configured TRIDATA_IDENTIFY_GUID.
 */
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g
// "+49 441 1234567", "0441/123456", "015775004744", "(0441) 12-34-56"
const PHONE = /(?<![\w-])(?:\+|\(?0)\d[\d \-/()]{4,}\d(?![\w-])/g

function maskPhones(text: string): string {
  return text.replace(PHONE, (match) =>
    match.replace(/\D/g, "").length >= 7 ? "<phone>" : match
  )
}

export function scrubError(message: string, maxLength = 1000): string {
  const guid = process.env.TRIDATA_IDENTIFY_GUID?.trim()
  let scrubbed = message
  if (guid) {
    scrubbed = scrubbed.split(guid).join("<guid>")
  }
  scrubbed = maskPhones(scrubbed.replace(EMAIL, "<email>"))
  return scrubbed.slice(0, maxLength)
}
