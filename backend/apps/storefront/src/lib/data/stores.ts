/**
 * Static data for BikeOne's two physical stores (Oldenburg, Osnabrück).
 *
 * There's no public Store API for stock locations yet — the real
 * `store-profile` custom module from
 * planning/5-Database_Schema/schema-design.md hasn't been built, so this
 * can't be sourced from the backend today. It's the single source of truth
 * for the header's store-picker (`layout/components/store-picker`) and the
 * Click & Collect store-selection page (`click-collect`), and matches the
 * footer's (separately hardcoded, untouched) contact details exactly.
 *
 * Swap for a real fetch once that module + a public read route exist.
 */
export type BikeOneStore = {
  id: string
  name: string
  address: string
  hours: string
  phone: string
  email: string
}

export const STORES: BikeOneStore[] = [
  {
    id: "oldenburg",
    name: "Oldenburg",
    address: "Rheinstr. 16, 26135 Oldenburg",
    hours: "Mo–Fr 10:00–18:00, Sa 10:00–14:00",
    phone: "0441 984 894 83",
    email: "OL@bike-one.de",
  },
  {
    id: "osnabrueck",
    name: "Osnabrück",
    address: "Lengericher Landstraße 30, 49078 Osnabrück",
    hours: "Di–Fr 10:00–18:00, Sa 10:00–14:00",
    phone: "0541 440 952 84",
    email: "OS@bike-one.de",
  },
]

/** localStorage key for the customer's preferred store — shared between the
 * header's store-picker and the Click & Collect page so both read/write the
 * exact same real, persisted preference. */
export const PREFERRED_STORE_STORAGE_KEY = "bikeone_preferred_store"
