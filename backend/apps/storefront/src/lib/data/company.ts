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
  // OWNER TO CONFIRM: this is the Oldenburg store number (seed data); the
  // owner has to say which number is the company's. Needed in the
  // Widerrufsbelehrung (Gestaltungshinweis, "soweit verfügbar") and Impressum.
  phone: "0441 984 894 83",
} as const
