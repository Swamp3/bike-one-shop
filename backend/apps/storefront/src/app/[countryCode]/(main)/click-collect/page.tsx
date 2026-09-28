import { Metadata } from "next"

import PlpBreadcrumb from "@modules/store/components/plp-breadcrumb"
import StoreSelect from "@modules/click-collect/components/store-select"

export const metadata: Metadata = {
  title: "Filiale wählen",
  description: "Wähle deine bevorzugte BikeOne Filiale in Oldenburg oder Osnabrück.",
}

export default function ClickCollectPage() {
  return (
    <div className="pb-16">
      <PlpBreadcrumb items={[{ label: "Start", href: "/" }, { label: "Filiale wählen" }]} />

      <div className="px-4 pt-3.5 md:px-6">
        <h1 className="m-0 font-heading text-[26px] font-semibold leading-tight md:text-[30px]">
          Filiale wählen
        </h1>
        <p className="mt-1.5 max-w-[60ch] text-[13.5px] leading-relaxed text-bo-ink-muted">
          Wähle deine bevorzugte BikeOne-Filiale — für Beratung vor Ort, den
          Werkstatt-Kontakt und um sie im Header vorausgewählt zu haben.
        </p>

        <div className="mt-3 inline-flex items-start gap-2 rounded-[9px] border border-bo-line bg-bo-wait-bg px-3 py-2.5 text-[12.5px] leading-snug text-bo-wait">
          <span className="mt-[1px] font-mono text-[10px] font-bold uppercase tracking-wide">
            Bald verfügbar
          </span>
          <span className="text-bo-ink-muted">
            — Click &amp; Collect als echte Bestellart (online reservieren,
            in der Filiale abholen) ist noch nicht buchbar. Es gibt aktuell
            keine Abholungs-Fulfillment-Option und keine
            filialgenauen Lagerbestände im Shop.
          </span>
        </div>
      </div>

      <div className="mt-5 px-4 md:px-6">
        <StoreSelect />
      </div>
    </div>
  )
}
