import { HttpTypes } from "@medusajs/types"
import CountrySelect from "@modules/checkout/components/country-select"
import { TextField } from "@modules/checkout/components/form-field"

/**
 * Shared field set for both the add-address and edit-address inline forms —
 * matches `wireframes/mein-konto.html`'s `.add-address-form` layout
 * (name row, street, postcode+city row, province, country, phone).
 */
const AddressFields = ({
  region,
  address,
}: {
  region: HttpTypes.StoreRegion
  address?: HttpTypes.StoreCustomerAddress
}) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Vorname"
          name="first_name"
          required
          autoComplete="given-name"
          defaultValue={address?.first_name ?? ""}
        />
        <TextField
          label="Nachname"
          name="last_name"
          required
          autoComplete="family-name"
          defaultValue={address?.last_name ?? ""}
        />
      </div>
      <TextField
        label="Straße & Hausnummer"
        name="address_1"
        required
        autoComplete="address-line1"
        defaultValue={address?.address_1 ?? ""}
      />
      <TextField
        label="Adresszusatz"
        name="address_2"
        autoComplete="address-line2"
        defaultValue={address?.address_2 ?? ""}
      />
      <div className="grid grid-cols-[120px_1fr] gap-3">
        <TextField
          label="PLZ"
          name="postal_code"
          required
          autoComplete="postal-code"
          defaultValue={address?.postal_code ?? ""}
        />
        <TextField
          label="Ort"
          name="city"
          required
          autoComplete="locality"
          defaultValue={address?.city ?? ""}
        />
      </div>
      <CountrySelect
        name="country_code"
        region={region}
        required
        autoComplete="country"
        defaultValue={address?.country_code ?? ""}
      />
      <TextField
        label="Telefon"
        name="phone"
        autoComplete="tel"
        defaultValue={address?.phone ?? ""}
      />
    </div>
  )
}

export default AddressFields
