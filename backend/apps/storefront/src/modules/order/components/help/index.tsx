import { COMPANY } from "@lib/data/company"
import { Heading } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import React from "react"

const Help = () => {
  return (
    <div className="mt-6">
      <Heading className="text-base-semi">Hilfe benötigt?</Heading>
      <div className="text-base-regular my-2">
        <p className="mb-2">
          Schreib uns eine E-Mail an{" "}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> und nenne
          deine Bestellnummer.
        </p>
        <ul className="gap-y-2 flex flex-col">
          <li>
            <LocalizedClientLink href="/kontakt">Kontakt</LocalizedClientLink>
          </li>
          <li>
            <LocalizedClientLink href="/widerrufsrecht">
              Rückgabe &amp; Widerruf
            </LocalizedClientLink>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default Help
