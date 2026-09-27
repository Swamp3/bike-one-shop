import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"
import React from "react"

type OptionSelectProps = {
  option: HttpTypes.StoreProductOption
  current: string | undefined
  updateOption: (title: string, value: string) => void
  title: string
  disabled: boolean
  "data-testid"?: string
}

const OptionSelect: React.FC<OptionSelectProps> = ({
  option,
  current,
  updateOption,
  title,
  "data-testid": dataTestId,
  disabled,
}) => {
  const filteredOptions = (option.values ?? []).map((v) => v.value)

  return (
    <div className="flex flex-col gap-y-2.5">
      <span className="font-heading text-[13.5px] font-semibold uppercase tracking-wide">
        {title}
      </span>
      <div
        className="grid grid-cols-4 gap-2 sm:grid-cols-6"
        data-testid={dataTestId}
      >
        {filteredOptions.map((v) => {
          const isSelected = v === current
          return (
            <button
              type="button"
              onClick={() => updateOption(option.id, v)}
              key={v}
              className={clx(
                "rounded-[7px] border-[1.5px] px-1 py-2.5 text-center font-mono text-[12px] font-semibold",
                isSelected
                  ? "border-bo-accent bg-[color-mix(in_srgb,var(--bo-accent)_10%,var(--bo-surface))] text-bo-accent"
                  : "border-bo-line bg-bo-surface text-bo-ink"
              )}
              disabled={disabled}
              data-testid="option-button"
            >
              {v}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default OptionSelect
