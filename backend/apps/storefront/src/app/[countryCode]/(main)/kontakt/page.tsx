import { Metadata } from "next"

import { COMPANY } from "@lib/data/company"
import { STORES } from "@lib/data/stores"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import LegalPage from "@modules/legal/templates/legal-page"

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "So erreichst du BikeOne: per E-Mail, telefonisch oder in unseren Filialen in Oldenburg und Osnabrück.",
}

export default function KontaktPage() {
  return (
    <LegalPage
      title="Kontakt"
      intro="Fragen zu einer Bestellung, einer Rücksendung oder einem Produkt? Schreib uns eine E-Mail oder ruf in einer unserer Filialen an."
    >
      <h2>Per E-Mail</h2>
      <p>
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
      </p>
      <p>
        Bitte gib bei Fragen zu einer Bestellung deine Bestellnummer an. Du
        findest sie auf der Bestätigungsseite nach der Bestellung und unter{" "}
        <LocalizedClientLink href="/account/orders">
          Mein Konto › Bestellungen
        </LocalizedClientLink>
        .
      </p>

      <h2>Rückgabe und Widerruf</h2>
      <p>
        Wie du einen Kauf widerrufst und was dabei zu beachten ist, steht unter{" "}
        <LocalizedClientLink href="/widerrufsrecht">
          Widerrufsrecht
        </LocalizedClientLink>
        . Den Widerruf kannst du ebenfalls per E-Mail an {COMPANY.email}{" "}
        schicken.
      </p>

      <h2>In unseren Filialen</h2>
      <ul>
        {STORES.map((store) => (
          <li key={store.id}>
            <strong>{store.name}</strong>, {store.address}
            <br />
            {store.hours}
            <br />
            {store.phone} ·{" "}
            <a href={`mailto:${store.email}`}>{store.email}</a>
          </li>
        ))}
      </ul>
      <p>
        Mehr dazu, auch mit Karte, findest du unter{" "}
        <LocalizedClientLink href="/standorte">Standorte</LocalizedClientLink>.
      </p>
    </LegalPage>
  )
}
