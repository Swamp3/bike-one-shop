import { Metadata } from "next"

import { COMPANY } from "@lib/data/company"
import LegalPage from "@modules/legal/templates/legal-page"

export const metadata: Metadata = {
  title: "Widerrufsrecht",
  description:
    "Widerrufsbelehrung und Muster-Widerrufsformular für Bestellungen im BikeOne-Shop.",
}

/*
 * DRAFT, not legal advice. The wording follows the statutory model texts
 * (Muster-Widerrufsbelehrung and Muster-Widerrufsformular, Anlage 1 und 2 zu
 * Art. 246a EGBGB, for goods delivered in one shipment). Open points are in
 * TODO.md ("German legal pages"); `legal-security-reviewer` before go-live:
 *  - Who pays return shipping is set to the consumer (the model default).
 *    Bikes are not normally returned by post, so § 357 Abs. 5 BGB also needs an
 *    estimate of the return cost in the text below once the shop knows it.
 *  - The order confirmation e-mail repeats this Widerrufsbelehrung and the
 *    form (backend/apps/backend/src/workflows/order-confirmation/build-email.ts).
 *    Keep both copies in sync.
 *  - The Widerrufsbelehrung block is verbatim from the model; keep it that
 *    way. Explanatory remarks go only into the separate "Hinweise" section
 *    after the form. The made-to-order exception is not mentioned until
 *    the owner says configured builds are really offered (Rückfragen file, no. 5).
 *  - COMPANY.phone is a placeholder the owner has to confirm.
 */
export default function WiderrufsrechtPage() {
  return (
    <LegalPage
      title="Widerrufsrecht"
      intro="Wenn du als Verbraucher online bei uns bestellst, kannst du den Kauf innerhalb von 14 Tagen ohne Angabe von Gründen widerrufen."
    >
      <h2>Widerrufsbelehrung</h2>

      <p>
        <strong>Widerrufsrecht</strong>
      </p>
      <p>
        Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen
        Vertrag zu widerrufen.
      </p>
      <p>
        Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem du oder ein
        von dir benannter Dritter, der nicht der Beförderer ist, die Waren in
        Besitz genommen hast bzw. hat.
      </p>
      <p>
        Um dein Widerrufsrecht auszuüben, musst du uns ({COMPANY.name},{" "}
        {COMPANY.street}, {COMPANY.city}, Telefon: {COMPANY.phone}, E-Mail:{" "}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>) mittels einer
        eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder
        eine E-Mail) über deinen Entschluss, diesen Vertrag zu widerrufen,
        informieren. Du kannst dafür das unten stehende Muster-Widerrufsformular
        verwenden, das jedoch nicht vorgeschrieben ist.
      </p>
      <p>
        Zur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung
        über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist
        absendest.
      </p>

      <p>
        <strong>Folgen des Widerrufs</strong>
      </p>
      <p>
        Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die
        wir von dir erhalten haben, einschließlich der Lieferkosten (mit
        Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass du eine
        andere Art der Lieferung als die von uns angebotene, günstigste
        Standardlieferung gewählt hast), unverzüglich und spätestens binnen
        vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über
        deinen Widerruf dieses Vertrags bei uns eingegangen ist. Für diese
        Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du bei der
        ursprünglichen Transaktion eingesetzt hast, es sei denn, mit dir wurde
        ausdrücklich etwas anderes vereinbart; in keinem Fall werden dir wegen
        dieser Rückzahlung Entgelte berechnet.
      </p>
      <p>
        Wir können die Rückzahlung verweigern, bis wir die Waren wieder
        zurückerhalten haben oder bis du den Nachweis erbracht hast, dass du
        die Waren zurückgesandt hast, je nachdem, welches der frühere Zeitpunkt
        ist.
      </p>
      <p>
        Du hast die Waren unverzüglich und in jedem Fall spätestens binnen
        vierzehn Tagen ab dem Tag, an dem du uns über den Widerruf dieses
        Vertrags unterrichtest, an uns zurückzusenden oder zu übergeben. Die
        Frist ist gewahrt, wenn du die Waren vor Ablauf der Frist von vierzehn
        Tagen absendest.
      </p>
      <p>Du trägst die unmittelbaren Kosten der Rücksendung der Waren.</p>
      <p>
        Du musst für einen etwaigen Wertverlust der Waren nur aufkommen, wenn
        dieser Wertverlust auf einen zum Prüfen der Beschaffenheit,
        Eigenschaften und Funktionsweise der Waren nicht notwendigen Umgang mit
        ihnen zurückzuführen ist.
      </p>

      <h2>Muster-Widerrufsformular</h2>
      <p>
        Wenn du den Vertrag widerrufen willst, kannst du dieses Formular
        ausfüllen und an uns zurücksenden. Eine formlose E-Mail genügt
        ebenfalls.
      </p>
      <ul className="list-none pl-0">
        <li>
          An: {COMPANY.name}, {COMPANY.street}, {COMPANY.city}, Telefon:{" "}
          {COMPANY.phone}, E-Mail: {COMPANY.email}
        </li>
        <li>
          Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen
          Vertrag über den Kauf der folgenden Waren (*):
        </li>
        <li>Bestellt am (*) / erhalten am (*):</li>
        <li>Name des/der Verbraucher(s):</li>
        <li>Anschrift des/der Verbraucher(s):</li>
        <li>
          Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier):
        </li>
        <li>Datum:</li>
      </ul>
      <p>(*) Unzutreffendes streichen.</p>

      <h2>Hinweise</h2>
      <p>
        Diese Hinweise gehören nicht zur Widerrufsbelehrung oben.
      </p>
      <p>
        Das Widerrufsrecht gilt für Verträge, die im Fernabsatz, also zum
        Beispiel über diesen Online-Shop, geschlossen werden. Kaufst du in
        einer unserer Filialen vor Ort, besteht es nicht.
      </p>
    </LegalPage>
  )
}
