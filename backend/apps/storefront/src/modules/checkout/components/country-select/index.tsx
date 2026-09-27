import { forwardRef, useMemo } from "react"

import { HttpTypes } from "@medusajs/types"
import { SelectField } from "../form-field"

type CountrySelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  region?: HttpTypes.StoreRegion
  label?: string
  name: string
}

const CountrySelect = forwardRef<HTMLSelectElement, CountrySelectProps>(
  ({ region, label = "Land", ...props }, ref) => {
    const countryOptions = useMemo(() => {
      if (!region) {
        return []
      }

      return region.countries?.map((country) => ({
        value: country.iso_2,
        label: country.display_name,
      }))
    }, [region])

    return (
      <SelectField ref={ref} label={label} {...props}>
        <option value="" disabled>
          Land wählen
        </option>
        {countryOptions?.map(({ value, label: countryLabel }, index) => (
          <option key={index} value={value}>
            {countryLabel}
          </option>
        ))}
      </SelectField>
    )
  }
)

CountrySelect.displayName = "CountrySelect"

export default CountrySelect
