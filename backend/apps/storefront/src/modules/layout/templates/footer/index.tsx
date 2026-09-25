import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import NewsletterForm from "@modules/layout/components/newsletter-form"

export default async function Footer() {
  const [{ collections }, categories] = await Promise.all([
    listCollections({ fields: "id,handle,title" }),
    listCategories().catch(() => null),
  ])
  const topLevelCategories = categories?.filter((c) => !c.parent_category)

  return (
    <footer className="mt-5 border-t border-bo-line bg-bo-surface">
      <div className="border-b border-bo-line bg-bo-surface-2 px-4 py-6 md:px-6 md:py-8">
        <h3 className="mb-1 font-heading text-lg font-semibold md:text-[19px]">
          Neuigkeiten, bevor sie im Laden stehen
        </h3>
        <p className="mb-3.5 max-w-[48ch] text-[13px] text-bo-ink-muted">
          Neue Modelle, Werkstatt-Termine und Filial-Events — max. zweimal im
          Monat, jederzeit abbestellbar.
        </p>
        <NewsletterForm />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-6 px-4 py-6 md:grid-cols-4 md:px-6 md:py-8">
        <div>
          <h4 className="mb-2.5 font-mono text-[11px] uppercase tracking-wide text-bo-ink-faint">
            Standorte
          </h4>
          <div className="mb-2.5 text-[12.5px] leading-relaxed text-bo-ink-muted">
            <b className="mb-0.5 block text-[13px] text-bo-ink">Oldenburg</b>
            Rheinstr. 16, 26135 Oldenburg
            <br />
            Mo–Fr 10:00–18:00, Sa 10:00–14:00
            <br />
            0441 984 894 83 · OL@bike-one.de
          </div>
          <div className="text-[12.5px] leading-relaxed text-bo-ink-muted">
            <b className="mb-0.5 block text-[13px] text-bo-ink">Osnabrück</b>
            Lengericher Landstraße 30, 49078 Osnabrück
            <br />
            Di–Fr 10:00–18:00, Sa 10:00–14:00
            <br />
            0541 440 952 84 · OS@bike-one.de
          </div>
        </div>

        <div>
          <h4 className="mb-2.5 font-mono text-[11px] uppercase tracking-wide text-bo-ink-faint">
            {collections.length ? "Marken" : "Service"}
          </h4>
          <ul className="flex flex-col gap-2">
            {collections.length ? (
              collections.map((c) => (
                <li key={c.id}>
                  <LocalizedClientLink
                    href={`/collections/${c.handle}`}
                    className="text-[13px] text-bo-ink-muted hover:text-bo-accent hover:underline"
                  >
                    {c.title}
                  </LocalizedClientLink>
                </li>
              ))
            ) : (
              <li className="text-[13px] text-bo-ink-muted">
                Bikefitting-Termin
              </li>
            )}
          </ul>
        </div>

        <div>
          <h4 className="mb-2.5 font-mono text-[11px] uppercase tracking-wide text-bo-ink-faint">
            Kategorien
          </h4>
          <ul className="flex flex-col gap-2">
            {topLevelCategories?.slice(0, 6).map((c) => (
              <li key={c.id}>
                <LocalizedClientLink
                  href={`/categories/${c.handle}`}
                  className="text-[13px] text-bo-ink-muted hover:text-bo-accent hover:underline"
                >
                  {c.name}
                </LocalizedClientLink>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-2.5 font-mono text-[11px] uppercase tracking-wide text-bo-ink-faint">
            Rechtliches
          </h4>
          <ul className="flex flex-col gap-2">
            <li>
              <a
                href="#"
                className="text-[13px] text-bo-ink-muted hover:text-bo-accent hover:underline"
              >
                Impressum
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-[13px] text-bo-ink-muted hover:text-bo-accent hover:underline"
              >
                AGB
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-[13px] text-bo-ink-muted hover:text-bo-accent hover:underline"
              >
                Datenschutz
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-[13px] text-bo-ink-muted hover:text-bo-accent hover:underline"
              >
                Widerrufsrecht
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-bo-line px-4 py-4 text-[11.5px] text-bo-ink-faint md:px-6">
        <span className="font-mono">© {new Date().getFullYear()} BIKE ONE</span>
        <span>Oldenburg · Osnabrück</span>
      </div>
    </footer>
  )
}
