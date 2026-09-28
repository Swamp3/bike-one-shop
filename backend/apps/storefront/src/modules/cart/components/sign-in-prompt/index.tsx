import LocalizedClientLink from "@modules/common/components/localized-client-link"

const SignInPrompt = () => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-bo-line bg-bo-surface p-4">
      <div>
        <p className="m-0 font-heading text-[15px] font-semibold">
          Bereits Kunde bei BikeOne?
        </p>
        <p className="m-0 text-[13px] text-bo-ink-muted">
          Melde dich an für gespeicherte Adressen und deine Bestellhistorie.
        </p>
      </div>
      <LocalizedClientLink
        href="/account"
        data-testid="sign-in-button"
        className="whitespace-nowrap rounded border-[1.5px] border-bo-line-strong px-4 py-2 text-[13.5px] font-semibold hover:border-bo-ink"
      >
        Anmelden
      </LocalizedClientLink>
    </div>
  )
}

export default SignInPrompt
