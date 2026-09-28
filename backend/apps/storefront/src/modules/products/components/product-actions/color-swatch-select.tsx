import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"
import React from "react"

type ColorSwatchSelectProps = {
  option: HttpTypes.StoreProductOption
  current: string | undefined
  updateOption: (title: string, value: string) => void
  title: string
  disabled: boolean
  "data-testid"?: string
}

/**
 * Maps the "Farbe" option's actual seeded values (see PLAN.md Task 12 §4 —
 * generic, honest fallback names, not manufacturer-verified) to a real CSS
 * color for the swatch itself. This is a UI affordance only, not a
 * product-spec claim, so it's kept to exactly the color names that exist
 * in the seed data — nothing invented beyond that.
 */
const COLOR_SWATCH_MAP: Record<string, string> = {
  Schwarz: "#111111",
  Blau: "#2554c7",
  Weiß: "#ffffff",
  Grau: "#8a8a8a",
  Grün: "#2f7a3f",
}

const swatchColor = (name: string) => COLOR_SWATCH_MAP[name] ?? "#cccccc"

/**
 * A distinct, widely-recognized swatch pattern for color options — small
 * circles instead of the text buttons used for Frame Size — while reusing
 * the exact same `updateOption` mechanism as `OptionSelect`, so selecting a
 * color updates the shared option-selection state (and, through it, the
 * gallery caption) the same way selecting a size does.
 */
const ColorSwatchSelect: React.FC<ColorSwatchSelectProps> = ({
  option,
  current,
  updateOption,
  title,
  "data-testid": dataTestId,
  disabled,
}) => {
  const values = (option.values ?? []).map((v) => v.value)

  return (
    <div className="flex flex-col gap-y-2.5">
      <span className="font-heading text-[13.5px] font-semibold uppercase tracking-wide">
        {title}
        {current && (
          <span className="ml-1.5 font-mono text-[11px] font-normal normal-case text-bo-ink-muted">
            — {current}
          </span>
        )}
      </span>
      <div className="flex flex-wrap gap-2.5" data-testid={dataTestId}>
        {values.map((v) => {
          const isSelected = v === current
          return (
            <button
              type="button"
              key={v}
              onClick={() => updateOption(option.id, v)}
              disabled={disabled}
              title={v}
              aria-label={v}
              aria-pressed={isSelected}
              data-testid="option-color-swatch"
              className={clx(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-shadow",
                isSelected
                  ? "border-bo-accent ring-2 ring-bo-accent ring-offset-2 ring-offset-bo-bg"
                  : "border-bo-line hover:border-bo-line-strong"
              )}
            >
              <span
                className="h-6 w-6 rounded-full border border-black/10"
                style={{ backgroundColor: swatchColor(v) }}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ColorSwatchSelect
