import { Metadata } from "next"

import { COMPANY } from "@lib/data/company"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import LegalPage from "@modules/legal/templates/legal-page"

export const metadata: Metadata = {
  title: "AGB",
  description: "Allgemeine Geschäftsbedingungen für Bestellungen im BikeOne-Shop.",
}

/*
 * DRAFT, not legal advice: a standard consumer-shop structure, filled only with
 * facts the shop already has (Germany-only shipping, shipping costs shown in
 * checkout, withdrawal page). `legal-security-reviewer` and the owner before
 * go-live; the open points are in TODO.md ("German legal pages"). In particular:
 *  - § 4 reserves correct self-supply; that is only valid with a matching
 *    covering purchase at the supplier.
 *  - § 9 says BikeOne does not take part in consumer arbitration (§ 36 VSBG);
 *    the owner has to confirm that choice.
 *  - § 2 promises an automatic order confirmation by e-mail (required by
 *    § 312i BGB). No notification provider is configured in medusa-config.ts
 *    yet, so the shop has to send one before go-live.
 *  - A clause for pickup in a store is missing on purpose: Click & Collect is
 *    not bookable yet (see /standorte). Add it when it goes live.
 */
export default function AgbPage() {
  return (
    <LegalPage
      title="Allgemeine Geschäftsbedingungen"
      intro="Stand: November 2026. Diese Bedingungen gelten für Bestellungen im BikeOne-Online-Shop."
    >
      <h2>§ 1 Geltungsbereich</h2>
      <p>
        Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge, die
        Verbraucher (§ 13 BGB) mit der {COMPANY.name}, {COMPANY.street},{" "}
        {COMPANY.city} (&bdquo;BikeOne&ldquo;) über den Online-Shop schließen.
        Wir liefern nur innerhalb Deutschlands. Abweichende Bedingungen des
        Kunden gelten nicht.
      </p>

      <h2>§ 2 Vertragsschluss</h2>
      <p>
        Die Darstellung der Produkte im Shop ist kein verbindliches Angebot,
        sondern eine Aufforderung an dich, selbst ein Angebot abzugeben. Du
        legst Produkte in den Warenkorb und gibst die Bestelldaten im
        Bestellvorgang ein. Vor dem Absenden zeigen wir dir alle Angaben noch
        einmal zusammengefasst an. Du kannst sie dort prüfen und ändern, auch
        Eingabefehler korrigieren. Mit dem Abschluss der Bestellung gibst du
        ein verbindliches Angebot ab.
      </p>
      <p>
        Den Eingang deiner Bestellung bestätigen wir dir automatisch per
        E-Mail. Diese Bestätigung ist noch keine Annahme. Der Vertrag kommt
        zustande, wenn wir dein Angebot annehmen, zum Beispiel durch eine
        Auftrags- oder Versandbestätigung oder durch die Lieferung der Ware.
      </p>
      <p>
        Diese AGB kannst du jederzeit hier abrufen, speichern und ausdrucken.
        Bestellungen kannst du, wenn du ein Konto hast, unter &bdquo;Mein
        Konto&ldquo; einsehen. Vertragssprache ist Deutsch.
      </p>

      <h2>§ 3 Preise und Zahlung</h2>
      <p>
        Alle Preise sind Endpreise in Euro und enthalten die gesetzliche
        Mehrwertsteuer. Zusätzlich fallen Versandkosten an. Sie werden dir im
        Bestellvorgang vor Abgabe der Bestellung angezeigt.
      </p>
      <p>
        Es gelten die Zahlungsarten, die dir im Bestellvorgang angeboten
        werden. Die Zahlung wird über unseren Zahlungsdienstleister abgewickelt.
        Der Kaufpreis ist mit Abschluss der Bestellung fällig, soweit im
        Bestellvorgang nichts anderes angegeben ist.
      </p>

      <h2>§ 4 Lieferung</h2>
      <p>
        Wir liefern an die Adresse, die du im Bestellvorgang angibst. Die
        Lieferzeit und die Versandart zeigen wir dir im Bestellvorgang an.
      </p>
      <p>
        Ist ein bestelltes Produkt trotz rechtzeitiger Bestellung bei unserem
        Lieferanten nicht verfügbar, weil dieser uns ohne unser Verschulden
        nicht beliefert, informieren wir dich unverzüglich. In diesem Fall
        können wir vom Vertrag zurücktreten. Bereits geleistete Zahlungen
        erstatten wir dann unverzüglich.
      </p>

      <h2>§ 5 Eigentumsvorbehalt</h2>
      <p>
        Die Ware bleibt bis zur vollständigen Bezahlung unser Eigentum.
      </p>

      <h2>§ 6 Widerrufsrecht</h2>
      <p>
        Als Verbraucher hast du bei Bestellungen im Online-Shop ein gesetzliches
        Widerrufsrecht. Die Einzelheiten und ein Muster-Widerrufsformular
        findest du unter{" "}
        <LocalizedClientLink href="/widerrufsrecht">
          Widerrufsrecht
        </LocalizedClientLink>
        .
      </p>

      <h2>§ 7 Mängelhaftung</h2>
      <p>
        Es gelten die gesetzlichen Mängelhaftungsrechte. Garantien des
        Herstellers bestehen zusätzlich dazu und lassen deine gesetzlichen
        Rechte unberührt. Bei Fragen zu einem Mangel schreib uns an{" "}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
      </p>

      <h2>§ 8 Haftung</h2>
      <p>
        Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit, bei der
        Verletzung von Leben, Körper oder Gesundheit, nach dem
        Produkthaftungsgesetz und soweit wir eine Garantie übernommen haben.
        Bei einfach fahrlässiger Verletzung einer wesentlichen Vertragspflicht,
        also einer Pflicht, auf deren Einhaltung du regelmäßig vertrauen darfst,
        ist unsere Haftung auf den vorhersehbaren, vertragstypischen Schaden
        begrenzt. Im Übrigen ist die Haftung bei einfacher Fahrlässigkeit
        ausgeschlossen.
      </p>

      <h2>§ 9 Streitbeilegung</h2>
      <p>
        Wir sind nicht bereit und nicht verpflichtet, an einem
        Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
        teilzunehmen.
      </p>

      <h2>§ 10 Anwendbares Recht</h2>
      <p>
        Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Zwingende
        Verbraucherschutzvorschriften des Staates, in dem du deinen gewöhnlichen
        Aufenthalt hast, bleiben unberührt.
      </p>
    </LegalPage>
  )
}
