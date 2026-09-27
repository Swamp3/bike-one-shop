"use client"

import { HttpTypes } from "@medusajs/types"
import clsx from "clsx"

type OptionsPickerProps = {
  options: HttpTypes.StoreProductOption[]
  selectedValueIds: string[]
  setOptionValueIds: (valueIds: string[]) => void
}

const OptionsPicker = ({
  options,
  selectedValueIds,
  setOptionValueIds,
}: OptionsPickerProps) => {
  if (!options.length) {
    return null
  }

  return (
    <>
      {options.map((option) => {
        const values =
          option.values
            ?.map((value) => ({ id: value.id, label: value.value }))
            .filter(
              (value): value is { id: string; label: string } =>
                !!value.id && !!value.label
            ) || []

        if (!values.length) {
          return null
        }

        const toggleValue = (valueId: string) => {
          const isSelected = selectedValueIds.includes(valueId)
          const next = isSelected
            ? selectedValueIds.filter((id) => id !== valueId)
            : [...selectedValueIds, valueId]
          setOptionValueIds(Array.from(new Set(next)))
        }

        return (
          <details
            key={option.id}
            open
            className="border-b border-bo-line py-3.5 last:border-b-0"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between font-heading text-[13.5px] font-semibold uppercase tracking-wide [&::-webkit-details-marker]:hidden">
              {option.title || "Option"}
            </summary>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {values.map((value) => {
                const isSelected = selectedValueIds.includes(value.id)
                return (
                  <button
                    key={value.id}
                    type="button"
                    onClick={() => toggleValue(value.id)}
                    aria-pressed={isSelected}
                    className={clsx(
                      "rounded-md border px-1 py-2.5 text-center font-mono text-[12.5px] font-semibold",
                      isSelected
                        ? "border-bo-accent bg-[color-mix(in_srgb,var(--bo-accent)_10%,var(--bo-surface))] text-bo-accent"
                        : "border-bo-line bg-bo-surface text-bo-ink"
                    )}
                  >
                    {value.label}
                  </button>
                )
              })}
            </div>
          </details>
        )
      })}
    </>
  )
}

export default OptionsPicker
