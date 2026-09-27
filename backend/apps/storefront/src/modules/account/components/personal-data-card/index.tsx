"use client"

import { useActionState, useEffect, useState } from "react"

import { updateCustomer } from "@lib/data/customer"
import { HttpTypes } from "@medusajs/types"
import { AccountSubmitButton } from "@modules/account/components/account-button"
import { TextField } from "@modules/checkout/components/form-field"

type State = { success: boolean; error: string | null }

/**
 * Combines the starter's separate `ProfileName`/`ProfilePhone` editors into
 * one real form matching `wireframes/mein-konto.html`'s single "Persönliche
 * Daten" card with one Save button.
 *
 * Email is shown but not editable: the starter's own `ProfileEmail`
 * component was already a stub (`// TODO: It seems we don't support
 * updating emails now?`, see git history) that returned success without
 * calling any API — wiring it into a real-looking "Speichern" button here
 * would be exactly the fake functionality this project's discipline
 * (PLAN.md Task 5/10) warns against, so it's disabled with an honest note
 * instead. Password change is dropped for the same reason (the starter's
 * `ProfilePassword` never called a real API either) and isn't in the
 * wireframe's "Meine Daten" panel anyway.
 */
const PersonalDataCard = ({ customer }: { customer: HttpTypes.StoreCustomer }) => {
  const [saved, setSaved] = useState(false)

  const action = async (_prev: State, formData: FormData): Promise<State> => {
    try {
      await updateCustomer({
        first_name: formData.get("first_name") as string,
        last_name: formData.get("last_name") as string,
        phone: formData.get("phone") as string,
      })
      return { success: true, error: null }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  const [state, formAction] = useActionState<State, FormData>(action, {
    success: false,
    error: null,
  })

  useEffect(() => {
    if (state.success) setSaved(true)
  }, [state])

  return (
    <div className="rounded-xl border border-bo-line bg-bo-surface p-4">
      <h3 className="m-0 mb-3 font-heading text-[15px] font-semibold">
        Persönliche Daten
      </h3>
      <form
        action={formAction}
        onChange={() => setSaved(false)}
        className="flex flex-col gap-3"
      >
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Vorname"
            name="first_name"
            required
            defaultValue={customer.first_name ?? ""}
          />
          <TextField
            label="Nachname"
            name="last_name"
            required
            defaultValue={customer.last_name ?? ""}
          />
        </div>
        <TextField
          label="E-Mail"
          name="email"
          type="email"
          value={customer.email}
          disabled
          readOnly
          className="cursor-not-allowed text-bo-ink-faint"
        />
        <p className="m-0 -mt-1.5 text-[11.5px] text-bo-ink-faint">
          E-Mail-Änderungen sind derzeit nicht möglich.
        </p>
        <TextField
          label="Telefon"
          name="phone"
          type="tel"
          defaultValue={customer.phone ?? ""}
        />
        {state.error && (
          <p className="m-0 text-[12.5px] text-bo-accent">{state.error}</p>
        )}
        <AccountSubmitButton small className="mt-1 self-start">
          Speichern
        </AccountSubmitButton>
        {saved && (
          <p className="m-0 text-[12.5px] font-semibold text-bo-ok">
            ✓ Änderungen gespeichert.
          </p>
        )}
      </form>
    </div>
  )
}

export default PersonalDataCard
