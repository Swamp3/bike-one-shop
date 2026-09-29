import { convertToLocale } from "@lib/util/money"
import {
  ResolvedConfigurableSlot,
  ResolvedConfigurableSlotOption,
} from "@lib/types/configurable-slot"
import { clx } from "@modules/common/components/ui"
import React from "react"

type ConfigurableSlotSelectProps = {
  slot: ResolvedConfigurableSlot
  selectedProductId: string | undefined
  onSelect: (productId: string) => void
  disabled?: boolean
  "data-testid"?: string
}

/**
 * The computed price difference against the slot's default option — always
 * `(this option's real live price) - (default option's real live price)`,
 * never a stored delta, so a future cheaper option correctly renders as a
 * negative number with no special-cased "downgrade" logic (PLAN.md Task 13
 * §2).
 */
const formatDelta = (
  option: ResolvedConfigurableSlotOption,
  defaultOption: ResolvedConfigurableSlotOption | undefined
) => {
  if (option.isDefault) {
    return "Im Preis enthalten"
  }
  if (option.price == null || defaultOption?.price == null || !option.currencyCode) {
    return null
  }

  const diff = option.price - defaultOption.price
  if (diff === 0) {
    return "+ 0 €"
  }

  const formatted = convertToLocale({
    amount: Math.abs(diff),
    currency_code: option.currencyCode,
    maximumFractionDigits: 0,
  })

  return diff > 0 ? `+ ${formatted}` : `− ${formatted}`
}

/**
 * The Laufradsatz slot selector (PLAN.md Task 13 §2-3) — a *real, separate
 * product* being swapped in, not a manufacturer SKU variant like Frame
 * Size/Schaltung/Farbe, so it gets a deliberately different, card-based
 * treatment (option-select.tsx/color-swatch-select.tsx stay untouched)
 * while reusing the same `bo-*` tokens.
 */
const ConfigurableSlotSelect: React.FC<ConfigurableSlotSelectProps> = ({
  slot,
  selectedProductId,
  onSelect,
  disabled,
  "data-testid": dataTestId,
}) => {
  const defaultOption = slot.options.find((o) => o.isDefault)
  const selectedOption = slot.options.find(
    (o) => o.productId === selectedProductId
  )

  return (
    <div
      className="flex flex-col gap-y-2 rounded-[10px] border-[1.5px] border-dashed border-bo-line-strong bg-bo-surface-2 p-3"
      data-testid={dataTestId}
    >
      <span className="font-heading text-[13.5px] font-semibold uppercase tracking-wide">
        {slot.slot}
        <span className="ml-1.5 font-mono text-[10px] font-normal normal-case text-bo-ink-faint">
          — Komponente wechseln
        </span>
      </span>

      <div className="flex flex-col gap-2" role="radiogroup" aria-label={slot.slot}>
        {slot.options.map((option) => {
          const isSelected = option.productId === selectedProductId
          const delta = formatDelta(option, defaultOption)

          return (
            <button
              type="button"
              key={option.productId}
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(option.productId)}
              disabled={disabled}
              data-testid="configurable-slot-option"
              className={clx(
                "flex items-center gap-3 rounded-[8px] border-[1.5px] bg-bo-surface p-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                isSelected
                  ? "border-bo-accent ring-1 ring-bo-accent"
                  : "border-bo-line hover:border-bo-line-strong"
              )}
            >
              <span
                className={clx(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px]",
                  isSelected ? "border-bo-accent" : "border-bo-line-strong"
                )}
              >
                {isSelected && (
                  <span className="h-2 w-2 rounded-full bg-bo-accent" />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">
                  {option.title}
                </span>
                {option.isDefault && (
                  <span className="block font-mono text-[10px] text-bo-ink-faint">
                    Standard, im Grundpreis enthalten
                  </span>
                )}
              </span>

              {delta && (
                <span
                  className={clx(
                    "shrink-0 whitespace-nowrap font-mono text-[12px] font-bold",
                    option.isDefault ? "text-bo-ink-faint" : "text-bo-accent"
                  )}
                >
                  {delta}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {selectedOption && !selectedOption.isDefault && (
        <p className="m-0 text-[11.5px] leading-snug text-bo-ink-faint">
          Hinweis: Das Produktfoto zeigt weiterhin die Standard-Ausstattung
          ({defaultOption?.title}) — eine Vorschau mit {selectedOption.title}{" "}
          folgt.
        </p>
      )}
    </div>
  )
}

export default ConfigurableSlotSelect
