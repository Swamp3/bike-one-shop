"use client"
import { createTransferRequest } from "@lib/data/orders"
import { AccountSubmitButton } from "@modules/account/components/account-button"
import { TextField } from "@modules/checkout/components/form-field"
import { useActionState } from "react"
import { useEffect, useState } from "react"

/**
 * Real Medusa order-transfer-request feature (claim an order placed as a
 * guest, or with a different account, into this account) — kept and
 * restyled, not part of `wireframes/mein-konto.html` but genuinely working.
 */
export default function TransferRequestForm() {
  const [showSuccess, setShowSuccess] = useState(false)

  const [state, formAction] = useActionState(createTransferRequest, {
    success: false,
    error: null,
    order: null,
  })

  useEffect(() => {
    if (state.success && state.order) {
      setShowSuccess(true)
    }
  }, [state.success, state.order])

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="m-0 mb-1 font-heading text-[14px] font-semibold">
          Bestellung übertragen
        </h3>
        <p className="m-0 text-[12.5px] text-bo-ink-muted">
          Bestellung nicht in der Übersicht? Verknüpfe sie mit deinem Konto.
        </p>
      </div>
      <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <TextField
          label="Bestell-ID"
          name="order_id"
          placeholder="order_01…"
          wrapperClassName="flex-1"
        />
        <AccountSubmitButton small data-testid="request-transfer-button">
          Übertragung anfragen
        </AccountSubmitButton>
      </form>
      {!state.success && state.error && (
        <p className="m-0 text-[12.5px] text-bo-accent">{state.error}</p>
      )}
      {showSuccess && (
        <div className="flex items-start justify-between gap-3 rounded-[9px] bg-bo-ok-bg p-3">
          <p className="m-0 text-[12.5px] text-bo-ok">
            ✓ Übertragung für Bestellung {state.order?.id} angefragt — eine
            E-Mail wurde an {state.order?.email} gesendet.
          </p>
          <button
            type="button"
            onClick={() => setShowSuccess(false)}
            className="shrink-0 text-bo-ok"
            aria-label="Ausblenden"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
