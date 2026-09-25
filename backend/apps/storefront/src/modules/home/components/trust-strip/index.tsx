const items = [
  {
    title: "Dein Körper ist unser Maß",
    body: "Individuelle Sitzpositions-Analyse in Oldenburg & Osnabrück — mit oder ohne Kauf.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
  {
    title: "So schnell wie online, so persönlich wie vor Ort",
    body: "Click & Collect: online reservieren, innerhalb von 2 Stunden abholbereit im Wunschstore.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V5a4 4 0 0 1 8 0v2" />
      </svg>
    ),
  },
  {
    title: "Ohne Umwege zurück",
    body: "30 Tage Rückgaberecht, unkompliziert an beiden Standorten — ohne Versandetikett.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
      </svg>
    ),
  },
]

const TrustStrip = () => {
  return (
    <section className="px-4 py-7 md:px-6 md:py-9">
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-3 rounded-[10px] border border-bo-line bg-bo-surface p-3.5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-bo-line bg-bo-surface-2 text-bo-accent [&>svg]:h-[18px] [&>svg]:w-[18px]">
              {item.icon}
            </div>
            <div>
              <h3 className="m-0 mb-0.5 font-heading text-[14.5px] font-semibold">
                {item.title}
              </h3>
              <p className="m-0 text-[12.5px] leading-relaxed text-bo-ink-muted">
                {item.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default TrustStrip
