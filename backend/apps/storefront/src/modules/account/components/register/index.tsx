"use client"

import { useActionState } from "react"
import { AccountSubmitButton } from "@modules/account/components/account-button"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { TextField } from "@modules/checkout/components/form-field"
import { signup } from "@lib/data/customer"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Register = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(signup, null)

  return (
    <div className="w-full max-w-sm" data-testid="register-page">
      <h1 className="m-0 mb-1.5 font-heading text-[22px] font-semibold">
        Konto erstellen
      </h1>
      <p className="mb-6 text-[13.5px] text-bo-ink-muted">
        Erstelle ein BikeOne-Konto für schnellere Bestellungen, eine
        Bestellübersicht und ein gespeichertes Adressbuch.
      </p>
      {message?.state === "verification_required" && (
        <div
          className="mb-5 rounded-[9px] border border-bo-line bg-bo-surface-2 p-3.5 text-[13px] text-bo-ink-muted"
          data-testid="register-verification-message"
        >
          Wir haben einen Bestätigungslink an{" "}
          <strong className="text-bo-ink">{message.email}</strong> gesendet.
          Bitte bestätige deine E-Mail-Adresse und melde dich anschließend an.
        </div>
      )}
      <form className="flex flex-col gap-3" action={formAction}>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Vorname"
            name="first_name"
            required
            autoComplete="given-name"
            data-testid="first-name-input"
          />
          <TextField
            label="Nachname"
            name="last_name"
            required
            autoComplete="family-name"
            data-testid="last-name-input"
          />
        </div>
        <TextField
          label="E-Mail"
          name="email"
          required
          type="email"
          autoComplete="email"
          data-testid="email-input"
        />
        <TextField
          label="Telefon"
          name="phone"
          type="tel"
          autoComplete="tel"
          data-testid="phone-input"
        />
        <TextField
          label="Passwort"
          name="password"
          required
          type="password"
          autoComplete="new-password"
          data-testid="password-input"
        />
        <ErrorMessage
          error={message?.state === "error" ? message.error : null}
          data-testid="register-error"
        />
        <p className="text-[11.5px] leading-snug text-bo-ink-faint">
          Mit der Kontoerstellung akzeptierst du unsere{" "}
          <a
            href="https://bike-one.org/datenschutz/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-dashed underline-offset-[2px]"
          >
            Datenschutzerklärung
          </a>{" "}
          und{" "}
          <a href="#" className="underline decoration-dashed underline-offset-[2px]">
            AGB
          </a>
          .
        </p>
        <AccountSubmitButton className="mt-1 w-full" data-testid="register-button">
          Registrieren
        </AccountSubmitButton>
      </form>
      <p className="mt-6 text-center text-[13px] text-bo-ink-muted">
        Schon ein Konto?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="font-semibold text-bo-accent underline decoration-dashed underline-offset-[3px]"
        >
          Jetzt anmelden
        </button>
        .
      </p>
    </div>
  )
}

export default Register
