const esc = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

/** Link to the storefront page that confirms the e-mail address with the single-use code. */
export const activationLink = (storefrontUrl: string, code: string) =>
  `${storefrontUrl.replace(/\/$/, "")}/de/verify-account?token=${encodeURIComponent(code)}`

/**
 * German account activation mail. Transactional only: no tracking, no
 * marketing, and no personal data besides the recipient address itself.
 */
export function buildActivationEmail(link: string, expiresAt?: Date | string) {
  const expires = expiresAt ? new Date(expiresAt) : null
  const expiryLine =
    expires && !Number.isNaN(expires.getTime())
      ? `Der Link ist bis ${expires.toLocaleString("de-DE", { timeZone: "Europe/Berlin" })} Uhr gültig.`
      : "Der Link ist nur begrenzt gültig."
  const subject = "Bitte bestätige deine E-Mail-Adresse – BikeOne"
  const text = [
    "Hallo,",
    "",
    "du hast ein Kundenkonto bei BikeOne angelegt. Bitte bestätige deine E-Mail-Adresse, um es zu aktivieren:",
    "",
    link,
    "",
    expiryLine,
    "Nach der Bestätigung siehst du in deinem Konto auch Bestellungen, die du bisher mit dieser E-Mail-Adresse als Gast aufgegeben hast.",
    "",
    "Wenn du kein Konto angelegt hast, kannst du diese E-Mail ignorieren.",
    "",
    "BikeOne",
  ].join("\n")
  const html = [
    "<p>Hallo,</p>",
    "<p>du hast ein Kundenkonto bei BikeOne angelegt. Bitte bestätige deine E-Mail-Adresse, um es zu aktivieren:</p>",
    `<p><a href="${esc(link)}">E-Mail-Adresse bestätigen</a></p>`,
    `<p>${esc(expiryLine)}<br>Nach der Bestätigung siehst du in deinem Konto auch Bestellungen, die du bisher mit dieser E-Mail-Adresse als Gast aufgegeben hast.</p>`,
    "<p>Wenn du kein Konto angelegt hast, kannst du diese E-Mail ignorieren.</p>",
    "<p>BikeOne</p>",
  ].join("\n")
  return { subject, text, html }
}
