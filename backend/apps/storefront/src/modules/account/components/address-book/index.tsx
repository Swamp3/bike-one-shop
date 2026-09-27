"use client"

import React, { useActionState, useEffect, useState } from "react"

import { addCustomerAddress } from "@lib/data/customer"
import { HttpTypes } from "@medusajs/types"
import {
  AccountSecondaryButton,
  AccountSubmitButton,
} from "@modules/account/components/account-button"
import AddressFields from "./address-fields"
import AddressItem from "./address-item"

type AddressBookProps = {
  customer: HttpTypes.StoreCustomer
  region: HttpTypes.StoreRegion
}

type State = { success: boolean; error: string | null }

const AddressBook: React.FC<AddressBookProps> = ({ customer, region }) => {
  const { addresses } = customer
  const [adding, setAdding] = useState(false)

  const [state, formAction] = useActionState(addCustomerAddress, {
    success: false,
    error: null,
  } as State)

  useEffect(() => {
    if (state.success) setAdding(false)
  }, [state.success])

  return (
    <div className="mt-3 rounded-xl border border-bo-line bg-bo-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="m-0 font-heading text-[15px] font-semibold">
          Adressbuch
        </h3>
        <AccountSecondaryButton small onClick={() => setAdding((v) => !v)}>
          {adding ? "− Schließen" : "+ Hinzufügen"}
        </AccountSecondaryButton>
      </div>

      {addresses.length === 0 && !adding && (
        <p className="m-0 text-[13px] text-bo-ink-faint">
          Noch keine Adresse gespeichert.
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        {addresses.map((address) => (
          <AddressItem key={address.id} address={address} region={region} />
        ))}
      </div>

      {adding && (
        <div
          className="mt-3 border-t border-dashed border-bo-line pt-3.5"
          data-testid="add-address-form"
        >
          <form action={formAction}>
            <AddressFields region={region} />
            {state.error && (
              <p className="m-0 mt-2 text-[12.5px] text-bo-accent">{state.error}</p>
            )}
            <AccountSubmitButton small className="mt-3">
              Adresse speichern
            </AccountSubmitButton>
          </form>
        </div>
      )}
    </div>
  )
}

export default AddressBook
