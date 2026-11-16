/**
 * Company details shown on the legal pages (AGB, Widerrufsbelehrung, Kontakt).
 *
 * Source: the Impressum on https://bike-one.org/impressum/ (checked 2026-11-16).
 * The backend keeps a copy for the order confirmation e-mail
 * (apps/backend/src/workflows/order-confirmation/build-email.ts); change both.
 */
export const COMPANY = {
  name: "BikeOne GmbH",
  street: "Rheinstrasse 16",
  city: "26135 Oldenburg (Oldb)",
  email: "info@bike-one.de",
} as const
