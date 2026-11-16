# Cookie- und Speicher-Inventar (Entwurf)

Entwurf, keine Rechtsberatung. Stand 2026-11-16, geprüft gegen den Code in
`backend/apps/storefront/src` (`lib/data/cookies.ts`, `middleware.ts`,
`lib/data/locale-actions.ts`, `modules/layout/components/store-picker`,
`modules/store-locator`). Der Shop setzt aktuell keine Analyse-, Marketing-
oder Social-Media-Cookies und bindet keine Drittinhalte ohne vorherige Aktion
des Besuchers ein. Alle unten genannten Einträge sind für den Betrieb des
Shops erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG); eine Einwilligung ist dafür nicht
nötig. Kommen Analyse, Pixel, eingebettete Videos oder Karten hinzu, ist vorher
ein Einwilligungsbanner mit gleichwertiger Schaltfläche "Ablehnen" auf der
ersten Ebene nötig.

## Text für die Datenschutzerklärung (zum Einfügen)

### Cookies und lokaler Speicher

Wir verwenden in unserem Online-Shop ausschließlich Cookies und ähnliche
Technologien, die für den Betrieb des Shops technisch erforderlich sind. Sie
dienen nicht der Analyse deines Verhaltens und nicht der Werbung. Rechtsgrundlage
für den Zugriff auf dein Endgerät ist § 25 Abs. 2 Nr. 2 TDDDG, für die
anschließende Verarbeitung personenbezogener Daten Art. 6 Abs. 1 lit. b DSGVO
(Vertragserfüllung) bzw. Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am
sicheren und funktionsfähigen Betrieb des Shops).

| Name | Zweck | Speicherdauer |
| --- | --- | --- |
| `_medusa_cart_id` | Merkt sich deinen Warenkorb, damit er beim Weitersurfen und im Bestellvorgang erhalten bleibt. | 7 Tage |
| `_medusa_jwt` | Hält dich nach dem Login angemeldet (Sitzungs-Token, nur für den Server lesbar, "httpOnly"). Wird beim Abmelden gelöscht. Nur gesetzt, wenn du dich anmeldest. | 7 Tage |
| `_medusa_pending_customer` | Hält deine Eingaben während der Kontoerstellung kurzzeitig vor (E-Mail-Adresse, Name, Telefonnummer, die du im Formular angegeben hast). Wird nach Abschluss gelöscht. Nur gesetzt, wenn du ein Konto anlegst. | 1 Tag |
| `_medusa_cache_id` | Zufällige Kennung ohne Personenbezug, mit der der Server seinen Zwischenspeicher für Produkt- und Preisdaten dem Besucher zuordnet. Wird beim ersten Seitenaufruf gesetzt. | 1 Tag |
| `_medusa_locale` | Merkt sich die gewählte Sprache. Nur gesetzt, wenn du die Sprache wechselst. | 1 Jahr |

Lokaler Speicher (localStorage) deines Browsers:

| Name | Zweck | Speicherdauer |
| --- | --- | --- |
| `bikeone_preferred_store` | Merkt sich den von dir gewählten Standort (Oldenburg oder Osnabrück), damit er beim nächsten Besuch vorausgewählt ist. Wird nur geschrieben, wenn du einen Standort auswählst. Verlässt deinen Browser nicht. | Bis du ihn über die Browser-Einstellungen löschst |

### Karte auf der Seite "Standorte" (OpenStreetMap)

Auf der Seite "Standorte" zeigen wir auf Wunsch eine Karte von OpenStreetMap.
Die Karte wird erst geladen, nachdem du auf "Karte laden" geklickt hast. Vorher
findet keine Verbindung zu OpenStreetMap statt. Beim Laden ruft dein Browser
Kartenkacheln von den Servern der OpenStreetMap Foundation ab (Betreiber:
OpenStreetMap Foundation, Vereinigtes Königreich; Auslieferung über ein
Content-Delivery-Network). Dabei wird deine IP-Adresse an diese Server
übermittelt. Rechtsgrundlage ist deine Einwilligung durch den Klick (Art. 6
Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Du kannst sie jederzeit widerrufen,
indem du die Seite verlässt oder neu lädst; sie wird nicht gespeichert.

(Vor Veröffentlichung prüfen: Angemessenheitsbeschluss für das Vereinigte
Königreich und die tatsächlich verwendete Kachel-Quelle. Platzhalter, bis der
Tile-Anbieter feststeht, siehe TODO.md.)

### Zahlungsdienstleister Stripe (nur falls aktiviert)

Aktuell ist Stripe nicht aktiv; dieser Abschnitt gilt nur, wenn
`NEXT_PUBLIC_STRIPE_KEY` gesetzt wird. Dann lädt die Zahlungsseite im
Bestellvorgang, und nur dort, Stripe.js von Stripe, damit du per Karte und
weiteren Verfahren bezahlen kannst. Dabei übermittelt dein Browser Daten wie
IP-Adresse und Geräteinformationen an Stripe, und Stripe kann eigene Cookies
bzw. Kennungen zur Betrugsprävention setzen. Rechtsgrundlage ist Art. 6 Abs. 1
lit. b DSGVO (Zahlungsabwicklung) und Art. 6 Abs. 1 lit. f DSGVO
(Betrugsprävention). Zweck und Dauer der Stripe-Kennungen bitte aus der
Stripe-Dokumentation übernehmen. Anbieter, Sitz und Drittlandübermittlung
(Standardvertragsklauseln / Data Privacy Framework) ergänzen.

### Zahlungsdienstleister SumUp

Bei Zahlung über SumUp wirst du auf die Zahlungsseite von SumUp weitergeleitet.
Dort gelten die Datenschutzhinweise von SumUp. Die Weiterleitung erfolgt erst
nach deinem Klick auf "Zahlungspflichtig bestellen".

## Hinweise für die Prüfung (nicht in den Text übernehmen)

- `_medusa_cache_id` wird in `middleware.ts` ohne `httpOnly`, ohne `secure`
  und ohne `sameSite` gesetzt, Dauer 1 Tag (`maxAge: 60 * 60 * 24`). Es ist
  eine zufällige UUID, keine Personenzuordnung. Die Einstufung als "technisch
  erforderlich" bitte mit dem Anwalt bestätigen.
- `_medusa_onboarding` wird nur gelöscht (`maxAge: -1`), nie gesetzt.
- `_medusa_locale` wird nur durch den Sprachumschalter im Seitenmenü gesetzt;
  die Locale-Schnittstelle des Backends existiert noch nicht (TODO.md).
- Schriftarten kommen über `next/font` vom eigenen Server, nicht von Google.
