const Hero = () => {
  return (
    <section className="relative">
      <div
        className="relative flex min-h-[400px] items-end overflow-hidden bg-[#121212] bg-cover bg-[center_65%] md:min-h-[520px]"
        style={{
          backgroundImage:
            "linear-gradient(0deg, #121210 0%, rgba(18,16,14,.45) 45%, rgba(18,16,14,.1) 100%), url('/images/hero-autumn-ride.jpg')",
        }}
      >
        <div className="relative z-[1] max-w-[640px] px-[18px] pb-[30px] pt-8 md:px-12 md:pb-14">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[.1em] text-bo-accent">
            Herbst-Saison 2026
          </div>
          <h1 className="mt-2.5 max-w-[16ch] text-balance font-heading text-[30px] font-semibold leading-[1.08] text-[#f5f5f5] md:text-[46px]">
            Dein Bike beginnt mit einem Gespräch.
          </h1>
          <p className="mt-3.5 max-w-[48ch] text-[15px] leading-relaxed text-[#c2c2c2]">
            40+ Marken, persönliche Beratung in Oldenburg und Osnabrück, und
            eine Sitzposition, die wirklich passt — bevor du dich
            entscheidest.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <a
              href="#empfohlen"
              className="inline-flex items-center gap-2 rounded border-[1.5px] border-bo-accent bg-bo-accent px-[22px] py-[13px] text-[14.5px] font-semibold text-bo-accent-ink hover:border-[#f5f5f5] hover:bg-[#f5f5f5] hover:text-[#121212]"
            >
              Bikes entdecken.
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded border-[1.5px] border-[rgba(245,242,238,.5)] bg-transparent px-[22px] py-[13px] text-[14.5px] font-semibold text-[#f5f5f5] hover:border-[#f5f5f5]"
            >
              Beratungstermin buchen.
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
