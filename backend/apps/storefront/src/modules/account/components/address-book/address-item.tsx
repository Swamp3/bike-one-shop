"use client"

import { useActionState, useEffect, useState } from "react"

import {
  deleteCustomerAddress,
  updateCustomerAddress,
} from "@lib/data/customer"
import { HttpTypes } from "@medusajs/types"
import {
  AccountSecondaryButton,
  AccountSubmitButton,
} from "@modules/account/components/account-button"
import AddressFields from "./address-fields"

type State = { success: boolean; error: string | null }

const AddressItem = ({
  address,
  region,
}: {
  address: HttpTypes.StoreCustomerAddress
  region: HttpTypes.StoreRegion
}) => {
  const [editing, setEditing] = useState(false)
  const [removing, setRemoving] = useState(false)

  const [state, formAction] = useActionState(updateCustomerAddress, {
    success: false,
    error: null,
  } as State)

  useEffect(() => {
    if (state.success) setEditing(false)
  }, [state.success])

  const remove = async () => {
    if (!window.confirm("Diese Adresse wirklich entfernen?")) return
    setRemoving(true)
    await deleteCustomerAddress(address.id)
    setRemoving(false)
  }

  if (editing) {
    return (
      <div className="rounded-[10px] border border-bo-line p-3.5" data-testid="address-container">
        <form action={formAction}>
          <input type="hidden" name="addressId" value={address.id} />
          <AddressFields region={region} address={address} />
          {state.error && (
            <p className="m-0 mt-2 text-[12.5px] text-bo-accent">{state.error}</p>
          )}
          <div className="mt-3 flex gap-2">
            <AccountSecondaryButton small onClick={() => setEditing(false)}>
              Abbrechen
            </AccountSecondaryButton>
            <AccountSubmitButton small>Speichern</AccountSubmitButton>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div
      className="flex items-start justify-between gap-2.5 rounded-[10px] border border-bo-line p-3.5"
      data-testid="address-container"
    >
      <address className="text-[13.5px] not-italic leading-relaxed text-bo-ink-muted">
        {address.is_default_shipping && (
          <span className="mb-1 inline-block rounded bg-[color-mix(in_srgb,var(--bo-accent)_10%,var(--bo-surface))] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wide text-bo-accent">
            Standardadresse
          </span>
        )}
        <br />
        <b className="text-bo-ink" data-testid="address-name">
          {address.first_name} {address.last_name}
        </b>
        <br />
        <span data-testid="address-address">{address.address_1}</span>
        <br />
        <span data-testid="address-postal-city">
          {address.postal_code} {address.city}
        </span>
      </address>
      <div className="flex shrink-0 flex-col gap-1.5 text-right">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-[12px] font-semibold text-bo-ink-muted underline decoration-dashed underline-offset-[3px] hover:text-bo-accent"
          data-testid="address-edit-button"
        >
          Bearbeiten
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={removing}
          className="text-[12px] font-semibold text-bo-ink-muted underline decoration-dashed underline-offset-[3px] hover:text-bo-accent disabled:opacity-50"
          data-testid="address-delete-button"
        >
          {removing ? "Wird entfernt…" : "Entfernen"}
        </button>
      </div>
    </div>
  )
}

export default AddressItem
