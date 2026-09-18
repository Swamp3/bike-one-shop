# Schritt 2 — Produktanforderungen / Projektplan: Offene Fragen

Deutsche Übersetzung von `questions.md` inkl. bereits eingetragener Antworten. Original (Englisch) bleibt als Referenz erhalten.

Bereits bekannter Kontext aus Schritt 1 (`planning/1-Market_Competitor_Research/`):

- Dies ist die digitale Erweiterung von **bike-one.org**, das bereits zwei physische Standorte betreibt (Raum Oldenburg/Osnabrück), mit bestehender Distributorbeziehung (Sport Import) und bestehenden Lieferantenverträgen.
- Drei mögliche Positionierungsoptionen wurden vorgeschlagen: (1) Omnichannel Premium Hub, (2) B2B-Leasing & Gravel Spezialist, (3) Boutique für Performance-Upgrades & Customization.
- Frontend-Stack-Präferenz: **Angular**, evtl. **Tailwind**.
- **Tridata** als erforderliche Software genannt.
- Shopsystem: **Shopware**.
- Zahlungsdienstleister: **SumUp**.
- Backend/Wawi: **Tridata**, Anbindung über **TriCon**.

---

## ⚠️ Zusammenfassung: Offene Punkte

Fachlich geklärt sind Datenfluss (1), sonstige Systeme (2), Auth-Strategie (3) und Budget (5) — Details siehe jeweiliger Abschnitt. Verbleibend:

1. **Anwaltliche Prüfung AGB/Widerrufsrecht** — Notwendigkeit bestätigt (gesetzlich vorgeschrieben), als offenes TODO vor Launch getrackt, aktuell noch nicht durchgeführt. _(Abschnitt 6)_
2. **Katalogumfang beim Launch** — Prinzip + Begründung entschieden (kleine Startauswahl aus Tridata, mangels Logistikpersonal; Tridata bleibt Source of Truth), genaue Anzahl Produkte/Marken noch final festzulegen. _(Abschnitt 5)_

Entschieden seit letzter Fassung: Shopsystem **Shopware**, Zahlungsdienstleister **SumUp** (siehe [docs/DECISIONS.md](../../docs/DECISIONS.md)); Datenfluss Tridata↔Shop, Auth-Strategie, sonstige Bestandssysteme (WordPress-Seite vorhanden), kein festes Budget-Limit.

Hinweis zu Abschnitt 2, Frage "Ist Tridata Single Source of Truth?": formal mit "?" offen gelassen, faktisch aber schon in der Antwort zur TriCon-Frage beantwortet ("Tridata remains the definitive Single Source of Truth"). Empfehlung: im finalen Dokument als beantwortet übernehmen, keine erneute Rückfrage nötig.

---

## 1. Positionierung

- Welche der 3 Positionierungsoptionen (oder Mischform) legen wir für v1 fest? Bestimmt Katalogumfang, Markenmix und Preisniveau im gesamten Plan.
  → Start als **Omnichannel Premium Hub**, danach Angriff auf Leasing-Optionen, später Upgrades & Customization.
- Ziel-Launchregion: DACH-weit von Anfang an, oder erst regional (~150 km um Oldenburg/Osnabrück) und später ausweiten?
  → Start mit regionalem Ansatz, mit Bike-Fitting im Laden und Aufbauten vor Ort oder Versand vormontierter Rahmen.

## 2. Bestehende Systeme & Integrationen

- **Tridata** — was genau ist das (POS / ERP / Warenwirtschaft / Buchhaltung) und wie ist der aktuelle Einsatz in den zwei Filialen?
  → Tridata ist ein umfassendes ERP-, POS- und Warenwirtschaftssystem, das stark in der Fahrrad- und Sportfachhandelsbranche verbreitet ist.
- Welche Daten müssen zwischen Tridata und dem neuen Online-Shop fließen, und in welche Richtung(en)? (z. B. Lagerbestand raus, Bestellungen rein, Preissync, Kundendaten)
  → Bestand: Tridata → Shop, Echtzeit via TriCon (Ladenverkauf aktualisiert sofort Online-Bestand).
  Preise: Tridata → Shop, periodisch/on-demand Sync.
  Bestellungen: Shop → Tridata, neue Order wird bei Checkout angelegt.
  Kundendaten: primär Shop → Tridata beim Kaufabschluss (Rechnungsadresse etc.), kein Rücksync für v1 nötig.
- Bietet Tridata eine API, Exportdateien oder eine DB, gegen die integriert werden kann? Bestehende Doku/Zugangsdaten/Sandbox vorhanden?
  → ⚬ **TriCon WebService:** Tridata bietet ein speziell für E-Commerce gebautes API-Modul namens TriCon. Ermöglicht individuelle Integrationen; vorgefertigte Connectoren für gängige Plattformen wie WooCommerce und Shopify sind ebenfalls verfügbar.
  ⚬ **Source of Truth:** Tridata bleibt die definitive Single Source of Truth (SSOT).
  ⚬ **Datenbankarchitektur:** Der Online-Shop braucht eine eigene lokale Datenbank für schnelle Seitenladezeiten und Verwaltung von Web-Assets, fungiert dabei aber als untergeordnetes System. Lagerbestand synchronisiert fortlaufend über die API, sodass Ladenverkäufe sofort den Online-Bestand aktualisieren und Überverkauf vermieden wird.
- Ist Tridata Single Source of Truth für den Lagerbestand, oder braucht der Shop eine eigene, periodisch synchronisierte Produkt-/Bestandsdatenbank?
  → **OFFEN** Tridata die single source of truth (formal — inhaltlich siehe Hinweis oben: bereits durch vorherige Antwort beantwortet)
- Weitere bestehende Systeme im Einsatz (Buchhaltung, Versand-/Carrier-Tools, CRM, Newsletter, Zahlungsterminal), die an den Shop angebunden werden müssen?
  → Es gibt eine WordPress-Seite, auf der Artikel angezeigt bzw. verlinkt werden. Für v1 sonst keine weitere Anbindung geplant (Buchhaltung/CRM/Newsletter/Versandtool kein Blocker für Launch, ggf. später).

## 3. Tech-Stack

- Bestätigung: Angular für Frontend, Tailwind fürs Styling — final oder noch offen?
  → Angular final, Tailwind vorgeschlagen (nicht final).
- Shopsystem?
  → **Shopware**, final entschieden.
- Backend: Präferenz/Einschränkung (Sprache/Framework), oder komplett offen bei Neuaufbau?
  → keine Einschränkung, evtl. JS. Wawi/Backend ist **Tridata**, Anbindung über **TriCon**.
- Hosting/Infra-Präferenz (Cloud-Anbieter, On-Premise, bestehendes Hosting von bike-one.org)?
  → zunächst auf einem Dev-Server, bevorzugt dockerisiert.
- Auth: neue Kundenkonten von Grund auf, oder existiert bei bike-one.org bereits ein Kunden-/Bonussystem zur Anbindung?
  → Kein bekanntes Bonus-/Kundensystem bei bike-one.org. Neue Kundenkonten im Shop (Shopware-Standard), zusätzlich Gast-Checkout. Später erweiterbar, falls Bonusprogramm entsteht.

## 4. Store- & Fulfillment-Integration

- Click & Collect: Anforderung für v1 oder spätere Phase?
  → Anforderung für v1. Räder werden vormontiert und können im Laden auf den Fahrer angepasst werden.
- In-Store "Ready to Ride"-Vormontage vor Versand: v1-Anforderung oder später?
  → Vormontierte Custom-Bikes sind ein Feature für nach dem initialen Launch — sollte aber das erste nachgelagerte Feature sein.
- Sollen Online-Bestellungen für Ladenpersonal sichtbar/verwaltbar sein (gemeinsame Order-Queue), und über welches System — Tridata selbst oder eigenes Shop-Admin?
  → Die bereits bestehende Tridata-Instanz bleibt Single Source of Truth.
- Retouren: Rückgabe im Laden für Online-Bestellungen — v1-Anforderung?
  → Ja. Retouren können physisch in den Filialen erfolgen.

## 5. Katalog- & Commerce-Umfang

- Produkttypen für v1: nur Räder, oder Räder + Zubehör/Bekleidung/Komponenten zusammen?
  → Kann ein großer Teil des Filialbestands sein — also Zubehör, Komponenten, Räder/Rahmen.
- Geschätzte Kataloggröße (# Produkte, # Marken) beim Launch?
  → Zum Start wird nur eine ausgewählte Teilmenge der Produkte aus Tridata im Online-Shop angeboten (genaue Anzahl/Marken noch zu definieren). Tridata bleibt Source of Truth für den gesamten Bestand.
  Begründung: Es gibt aktuell kein dediziertes Logistikpersonal für Versand — daher bewusst kleine Artikelzahl zum Start sinnvoll, später ausbaufähig sobald Fulfillment-Kapazität aufgebaut ist. Auswahlkriterien für die Startliste: Bestseller, margenstarke Artikel, sofort lagernd, ausgewählte Kernmarken.
- Bike-Konfigurator (Rahmen-/Komponenten-Customization, gemäß Option 3) — v1 oder spätere Phase?
  → Spätere Phase, zeitnah nach v1.
- JobRad / BusinessBike / Lease a Bike Leasing-Checkout-Integration — v1 oder spätere Phase?
  → Spätere Phase.
- Zahlungsmethoden beim Launch (Karte, PayPal, SEPA, Finanzierungs-/Leasinganbieter, Klarna etc.)?
  → Zahlungsdienstleister final entschieden: **SumUp**. Konkrete Methoden (Karte/PayPal/SEPA etc.) im Detail noch abzustimmen.

## 6. Compliance (DACH/EU)

- Bestehende Rechtstexte (Impressum, DSGVO) von bike-one.org zur Wiederverwendung, oder muss alles neu erstellt werden?
  → Eventuell Texte von bike-one.org vorhanden — falls möglich, wiederverwenden.
- Bestätigung: Anwalt prüft AGB/Widerrufsrecht vor Launch (gemäß Roadmap Schritt 12) — Zeitpunkt der Prüfung?
  → Ja, erforderlich (Fernabsatzrecht, Widerrufsbelehrung, Impressum, DSGVO gesetzlich vorgeschrieben für Online-Handel in DE). Als TODO vor Launch bestätigt — aktuell noch nicht erledigt, muss vor Go-Live abgeschlossen sein.

## 7. Umfang, Zeitplan, Budget

- Ziel-Launchdatum oder Zeitrahmen?
  → Bevorzugt Launch Ende 2026 oder Anfang 2027.
- Feste Budgetobergrenze, die Umfang/Tech-Entscheidungen einschränken sollte?
  → Kein festes Budget in diesem Sinne — der Shop soll auf jeden Fall gebaut werden, unabhängig von einer Obergrenze. Kein Constraint für Scope-/Tech-Entscheidungen.
- MVP-Definition: kleinste sinnvolle Version für den ersten Launch vs. was auf v2 warten kann?
  → Shop-Frontend mit Tridata-Anbindung (TriCon?) und mindestens 1 kaufbares Produkt.
  → Weiteres Feature für später: Sync mit `ebay Kleinanzeigen`.

## 8. Nutzer & Rollen

- Wer braucht Admin-/Backoffice-Zugang (Ladenpersonal, Inhaber, externe Agentur)? Ungefähre Anzahl Nutzer, welche Rollen?
  → Aktuell nur Inhaber, Admin und ggf. einige Ladenmitarbeiter benötigen Zugang.
- Mehrsprachigkeit erforderlich (nur Deutsch, oder Deutsch + Englisch) für DACH/EU-weite Reichweite?
  → Primärsprache Deutsch. Englisch kann als Sekundärsprache ergänzt werden.

---

Sobald diese offenen Punkte geklärt sind, wird als Nächstes das Anforderungsdokument + der Projektplan (Roadmap Schritt 2) erstellt, das in Schritt 3 (Architektur- & Tech-Stack-Entscheidungen) einfließt.
