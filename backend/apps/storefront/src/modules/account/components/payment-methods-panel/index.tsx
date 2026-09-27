/**
 * `wireframes/mein-konto.html`'s "Zahlungsmethoden" tab shows a saved test
 * VISA card plus an "add card" form that collects a card number/expiry/CVC
 * and pretends to save it. There is no `saved-payment-instrument` custom
 * module (see PLAN.md's later-milestones list) and no active payment
 * provider besides Medusa's manual test provider (SumUp is prepared but not
 * activated — PLAN.md Task 5/10) — nothing here would actually store or
 * charge a card. Collecting real-looking card details for a form that does
 * nothing is exactly the kind of fake functionality this project's
 * discipline rules out, so this tab is an honest "coming soon" state
 * instead, matching the same treatment cart/checkout already gives Click &
 * Collect.
 */
const PaymentMethodsPanel = () => {
  return (
    <div className="rounded-xl border border-dashed border-bo-line-strong bg-bo-surface-2 p-6 text-center">
      <span className="mb-2 inline-block rounded bg-bo-wait-bg px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-bo-wait">
        Bald verfügbar
      </span>
      <p className="m-0 text-[13.5px] leading-relaxed text-bo-ink-muted">
        Gespeicherte Zahlungsmethoden sind noch nicht verfügbar — dafür fehlt
        aktuell sowohl ein aktiver produktiver Zahlungsanbieter als auch die
        sichere Speicherung von Kartendaten. Bezahlt wird bislang je Bestellung
        beim Checkout.
      </p>
    </div>
  )
}

export default PaymentMethodsPanel
