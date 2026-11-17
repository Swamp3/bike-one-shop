"use client"

import { activateAccount } from "@lib/data/customer"
import { AccountSubmitButton } from "@modules/account/components/account-button"
import ErrorMessage from "@modules/checkout/components/error-message"
import { TextField } from "@modules/checkout/components/form-field"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useParams, useSearchParams } from "next/navigation"
import { useActionState } from "react"

/**
 * Landing page of the mailed activation link. The code is only accepted
 * together with a login of the account it was issued for (address and password
 * of the registration), so a link that reaches someone else is useless to them.
 */
const VerifyAccount = () => {
  const searchParams = useSearchParams()
  const { countryCode } = useParams<{ countryCode: string }>()
  const token = searchParams.get("token")
  const [message, formAction] = useActionState(activateAccount, null)

  return (
    <div
      className="mx-auto flex w-full max-w-sm flex-col gap-y-4 rounded-xl border border-bo-line bg-bo-surface p-8"
      data-testid="verify-account-page"
    >
      <h1 className="m-0 text-center font-heading text-[20px] font-semibold uppercase">
        Konto aktivieren
      </h1>

      {!token ? (
        <p className="m-0 text-center text-[13.5px] text-bo-ink-muted">
          Dieser Link ist unvollständig. Melde dich an, um einen neuen
          Bestätigungslink anzufordern.
        </p>
      ) : (
        <>
          <p className="m-0 text-[13.5px] text-bo-ink-muted">
            Melde dich mit der E-Mail-Adresse und dem Passwort deiner
            Registrierung an, um dein Konto zu aktivieren. Das geht auf jedem
            Gerät.
          </p>
          <form className="flex flex-col gap-3" action={formAction}>
            <input type="hidden" name="code" value={token} />
            <input type="hidden" name="countryCode" value={countryCode} />
            <TextField
              label="E-Mail"
              name="email"
              type="email"
              autoComplete="email"
              required
              data-testid="activate-email-input"
            />
            <TextField
              label="Passwort"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              data-testid="activate-password-input"
            />
            <ErrorMessage
              error={message?.state === "error" ? message.error : null}
              data-testid="activate-error-message"
            />
            <AccountSubmitButton className="mt-2 w-full" data-testid="activate-button">
              Konto aktivieren
            </AccountSubmitButton>
          </form>
        </>
      )}

      <LocalizedClientLink
        href="/account"
        className="text-center text-[13px] font-semibold text-bo-ink underline underline-offset-2"
      >
        Zur Anmeldung
      </LocalizedClientLink>
    </div>
  )
}

export default VerifyAccount
