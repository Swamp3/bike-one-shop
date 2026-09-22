# Schritt 2 — Produktanforderungen / Projektplan: Offene Fragen

Maßgebliche Fassung (die englische `questions.md` wurde entfernt, da inhaltlich vollständig hierher übernommen).

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
2. **Katalogumfang beim Launch** — Scope entschieden (nur Artikel mit physischem Vor-Ort-Bestand in den Läden: einige Räder + etwas Zubehör; Tridata bleibt Source of Truth für den Gesamtbestand), genaue Anzahl Produkte/Marken innerhalb dieses Scopes noch final festzulegen. _(Abschnitt 5)_

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
  → Zum Start beschränkt auf Artikel, die physisch in den Läden vorhanden sind (einige Räder und etwas Zubehör) — keine Auflistung von Tridata-Artikeln ohne Vor-Ort-Bestand. Genaue Anzahl/Marken innerhalb dieser Einschränkung noch nicht final beziffert. Tridata bleibt Source of Truth für den gesamten Bestand.
  Begründung: Es gibt aktuell kein dediziertes Logistikpersonal für Versand — daher bewusst kleine Artikelzahl zum Start sinnvoll, später ausbaufähig sobald Fulfillment-Kapazität aufgebaut ist.
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
- **Neu erkannt (September 2026):** Ab 27.09.2026 gelten neue EU-Informationspflichten für den Verkauf physischer Waren an Verbraucher — Garantiehinweise und das sogenannte "GARAN"-Label müssen auf Produktdetailseiten angezeigt werden. Shopware unterstützt dies nativ ab Version 6.7.14.0 ohne zusätzliche Erweiterung. Sollte im Rahmen der anwaltlichen AGB-Prüfung mit abgedeckt werden, da das Datum sehr kurzfristig ist (in dieser Woche in Kraft, direkt betroffen wäre aber erst der spätere Go-Live).
- **Weitere EU-Regularien, die für die anwaltliche Prüfung relevant sein könnten** (recherchiert September 2026, keine Rechtsberatung — vom Anwalt final zu bewerten):
  - **GPSR (Produktsicherheitsverordnung, (EU) 2023/988)** — bereits seit 13.12.2024 in Kraft, Durchsetzung 2026 spürbar verschärft (u. a. automatisierte Kontrollen von Produktseiten). Verlangt auf jeder Produktseite selbst (nicht nur im Impressum): Kontaktdaten von Hersteller und EU-verantwortlicher Person, Produktbild, Sicherheits-/Warnhinweise. Betrifft alle Kategorien (Räder, Zubehör, Bekleidung) — hohe Priorität, direkt Shop-Frontend-relevant.
  - **EU-Batterieverordnung ((EU) 2023/1542)** — nur relevant, falls E-Bikes oder abnehmbare E-Bike-Akkus ins Sortiment kommen. Verlangt Kennzeichnung (Kapazität, Lebensdauer, Entsorgung) ab 2026, kostenlose Rücknahme mit "angemessener Rückgabemöglichkeit" auch online, ab 18.02.2027 einen elektronischen "Batteriepass" pro Akku. **Zu klären:** Ist Verkauf von E-Bikes/E-Bike-Akkus für v1 oder später geplant?
  - **Verpackungsgesetz / LUCID-Registrierung** — jeder Versandhändler mit verpackter Ware an Endkunden muss (unabhängig von Unternehmensgröße) im Verpackungsregister LUCID registriert sein und an einem dualen System teilnehmen. Neu-Registrierungsfrist 12.09.2026 ist zum Zeitpunkt dieses Dokuments bereits verstrichen — **zu klären, ob bike-one.org für den bestehenden Versandhandel schon registriert ist**, sonst droht Bußgeld bis 100.000 € (fehlende Registrierung) bzw. 200.000 € (fehlende Systemteilnahme). Ab 12.08.2026 löst das neue VerpackDG das bisherige Gesetz ab (Angleichung an die EU-Verpackungsverordnung PPWR). Reine Registrierungs-/Organisationspflicht, kein Shop-Feature.
  - **ElektroG / WEEE-Registrierung (Stiftung EAR)** — analog zu LUCID, aber für Elektro-/Elektronikgeräte. Nur relevant, falls Zubehör wie Bike-Computer, Lichter oder E-Bike-Motoren/-Akkus verkauft werden.
  - **Recht-auf-Reparatur-Richtlinie ((EU) 2024/1799)** — EU-weit ab 31.07.2026 anwendbar, Geltungsbereich aktuell auf Produkte mit bestehenden Reparierbarkeitsvorgaben beschränkt (u. a. Akkus von E-Bikes als "leichte Verkehrsmittel"); reguläre Fahrräder sind aktuell **nicht** erfasst. Nur relevant zusammen mit der Batterieverordnung oben.
  - **Textil-EPR (geplantes deutsches Textilgesetz)** — noch kein verabschiedetes Gesetz (Eckpunktepapier 27.03.2026 des BMU, Entwurf evtl. Ende September 2026 erwartet), Umsetzungsfrist 17.06.2027 gemäß EU-Richtlinie (EU) 2025/1892. Relevant für die Bekleidungs-Kategorie — aktuell nur beobachten, noch kein Handlungsbedarf.
  - **Digital Services Act** — betrifft primär Online-Marktplätze mit Drittanbietern (z. B. Prüfpflichten für fremde Händler); bike-one.org betreibt einen Einzelhändler-Shop, keinen Marktplatz, daher greifen die schwersten DSA-Pflichten voraussichtlich nicht. Allgemeine Transparenz-/Dark-Pattern-Regeln gelten trotzdem für jede kommerzielle Website.

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

## 9. SEO & Google Shopping (hohe Priorität)

- **Anforderung:** SEO hat für v1 hohe Priorität. Produktlistings müssen für Google Shopping / Shopping Ads ("gesponsert"-Platzierungen in der Google-Suche) infrage kommen, nicht nur für organisches Ranking.
- **Auswirkung — technisches SEO:** erfordert einen Google-Merchant-Center-Produktfeed (Produkt-ID, Titel, Beschreibung, Preis, Verfügbarkeit, GTIN/MPN, Bild, Kategorie), der laufend mit Live-Bestand/-Preis aus Tridata via TriCon synchron gehalten wird. Feed-Genauigkeit ist direkt relevant — Merchant Center sperrt Konten bei veralteten Preis-/Verfügbarkeitsangaben.
- **Auswirkung — Google Ads:** die gesponserte Platzierung selbst erfordert eine laufende Google-Ads-Shopping-Kampagne, verknüpft mit dem Merchant-Center-Feed; das ist ein Budget-/Ops-Thema, kein reiner Dev-Task — zu klären, wer Ad-Budget und Kampagnenmanagement verantwortet.
- **Auswirkung — Frontend-Architektur:** Angular rendert standardmäßig client-seitig, was für Crawlbarkeit und Core Web Vitals schwach ist (beides fließt ins organische Ranking und in die Merchant-Center-Prüfung ein). Angular Universal (SSR) oder Prerendering für Produkt-/Kategorieseiten nötig, plus schema.org-`Product`-Strukturdaten, kanonische URLs, sitemap.xml. Als Architekturentscheidung für Schritt 3 markiert, nicht nur als Content-Aufgabe.
- Wer verantwortet Qualität der Produkttexte/Metadaten (Titel, Beschreibungen), die sowohl für SEO als auch für Feed-Freigabe nötig sind — Ladenpersonal, Agentur, oder KI-Entwurf mit interner Prüfung?
  → Texte werden von Mitarbeitern erarbeitet und entweder direkt freigegeben oder durch die Geschäftsleitung geprüft. KI kann zur Analyse/Unterstützung eingesetzt werden.

---

Sobald diese offenen Punkte geklärt sind, wird als Nächstes das Anforderungsdokument + der Projektplan (Roadmap Schritt 2) erstellt, das in Schritt 3 (Architektur- & Tech-Stack-Entscheidungen) einfließt.
