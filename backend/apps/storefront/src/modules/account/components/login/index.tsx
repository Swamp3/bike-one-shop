import { login } from "@lib/data/customer"
import { AccountSubmitButton } from "@modules/account/components/account-button"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { TextField } from "@modules/checkout/components/form-field"
import { useActionState } from "react"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Login = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(login, null)

  return (
    <div className="w-full max-w-sm" data-testid="login-page">
      <h1 className="m-0 mb-1.5 font-heading text-[22px] font-semibold">
        Willkommen zurück
      </h1>
      <p className="mb-6 text-[13.5px] text-bo-ink-muted">
        Melde dich an, um deine Bestellungen und Adressen zu sehen.
      </p>
      {message?.state === "verification_required" && (
        <div
          className="mb-5 rounded-[9px] border border-bo-line bg-bo-surface-2 p-3.5 text-[13px] text-bo-ink-muted"
          data-testid="login-verification-message"
        >
          Wir haben einen Bestätigungslink an{" "}
          <strong className="text-bo-ink">{message.email}</strong> gesendet.
          Bitte bestätige deine E-Mail-Adresse und melde dich dann an.
        </div>
      )}
      <form className="flex flex-col gap-3" action={formAction}>
        <TextField
          label="E-Mail"
          name="email"
          type="email"
          title="Bitte gib eine gültige E-Mail-Adresse ein."
          autoComplete="email"
          required
          data-testid="email-input"
        />
        <TextField
          label="Passwort"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          data-testid="password-input"
        />
        <ErrorMessage
          error={message?.state === "error" ? message.error : null}
          data-testid="login-error-message"
        />
        <AccountSubmitButton className="mt-2 w-full" data-testid="sign-in-button">
          Anmelden
        </AccountSubmitButton>
      </form>
      <p className="mt-6 text-center text-[13px] text-bo-ink-muted">
        Noch kein Konto?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
          className="font-semibold text-bo-accent underline decoration-dashed underline-offset-[3px]"
          data-testid="register-button"
        >
          Jetzt registrieren
        </button>
        .
      </p>
    </div>
  )
}

export default Login
