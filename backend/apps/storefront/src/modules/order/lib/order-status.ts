import { HttpTypes } from "@medusajs/types"

export type StatusLabel = { label: string; ok?: boolean }

/** Maps Medusa's real fulfillment status onto the wireframe's status pill —
 * there's no in-store-pickup fulfillment option today (see PLAN.md Task 10),
 * so "Abgeholt in Filiale" from the wireframe never actually occurs here. */
export const STATUS_LABEL: Record<
  HttpTypes.StoreOrder["fulfillment_status"],
  StatusLabel
> = {
  not_fulfilled: { label: "In Bearbeitung" },
  partially_fulfilled: { label: "Teilweise bearbeitet" },
  fulfilled: { label: "Bereit zum Versand" },
  partially_shipped: { label: "Teilweise versendet" },
  shipped: { label: "In Zustellung" },
  partially_delivered: { label: "Teilweise zugestellt" },
  delivered: { label: "Zugestellt", ok: true },
  canceled: { label: "Storniert" },
}

export const PAYMENT_STATUS_LABEL: Record<
  HttpTypes.StoreOrder["payment_status"],
  StatusLabel
> = {
  not_paid: { label: "Zahlung offen" },
  awaiting: { label: "Zahlung offen" },
  authorized: { label: "Zahlung autorisiert" },
  partially_authorized: { label: "Teilweise autorisiert" },
  captured: { label: "Bezahlt", ok: true },
  partially_captured: { label: "Teilweise bezahlt" },
  partially_refunded: { label: "Teilweise erstattet" },
  refunded: { label: "Erstattet" },
  canceled: { label: "Storniert" },
  requires_action: { label: "Aktion erforderlich" },
}
