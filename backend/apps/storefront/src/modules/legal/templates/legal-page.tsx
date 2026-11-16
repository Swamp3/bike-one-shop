import PlpBreadcrumb from "@modules/store/components/plp-breadcrumb"

/** Shared frame for text pages (AGB, Widerrufsbelehrung, Kontakt): breadcrumb, title, readable prose. */
export default function LegalPage({
  title,
  intro,
  children,
}: {
  title: string
  intro?: string
  children: React.ReactNode
}) {
  return (
    <div className="pb-16">
      <PlpBreadcrumb items={[{ label: "Start", href: "/" }, { label: title }]} />
      <div className="px-4 pt-3.5 md:px-6">
        <h1 className="m-0 font-heading text-[26px] font-semibold leading-tight md:text-[30px]">
          {title}
        </h1>
        {intro && (
          <p className="mt-1.5 max-w-[60ch] text-[13.5px] leading-relaxed text-bo-ink-muted">
            {intro}
          </p>
        )}
        <div className="mt-6 max-w-[75ch] text-[14px] leading-relaxed text-bo-ink-muted [&_a]:text-bo-accent [&_a]:underline [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:font-heading [&_h2]:text-[18px] [&_h2]:font-semibold [&_h2]:text-bo-ink [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_strong]:text-bo-ink [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </div>
    </div>
  )
}
