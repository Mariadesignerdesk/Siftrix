import HeroShield3D from './HeroShield3D'

export default function Hero() {
  return (
    <section
      id="home"
      className="relative overflow-hidden bg-gradient-to-b from-siftrix-pearl via-siftrix-beige to-[#E8E0D2] border-b border-siftrix-border px-4 sm:px-6 md:px-10 py-10 sm:py-16 lg:py-20"
    >
      {/* Subtle Warm Studio Champagne Illumination */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-siftrix-sand/65 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-10 right-6 h-[28rem] w-[28rem] rounded-full bg-siftrix-champagne/25 blur-3xl"
      />

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-10 animate-siftrix-enter">
        {/* Left Editorial Composition */}
        <div className="w-full max-w-xl lg:flex-1">
          <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-siftrix-gold/50 bg-siftrix-white/90 px-4 py-1.5 text-[11px] font-semibold tracking-[0.16em] uppercase text-siftrix-graphite shadow-2xs mb-6">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-gradient-to-br from-siftrix-champagne to-siftrix-antique"
            />
            <span>AI-POWERED CYBERSECURITY</span>
          </div>

          <h1 className="text-[1.95rem] sm:text-5xl xl:text-[3.4rem] font-bold text-siftrix-charcoal leading-[1.12] tracking-[-0.03em]">
            Stay One Step Ahead of{' '}
            <span className="inline-block font-editorial italic font-bold text-[1.1em] siftrix-gold-text-on-light pr-2 pb-1 underline decoration-siftrix-gold/70 decoration-2 underline-offset-8">
              Online Scams.
            </span>
          </h1>

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-siftrix-antique-ink">
            SIFTRIX · Intelligence. Protection. Confidence.
          </p>

          <p className="text-siftrix-muted-dark mt-3 text-base sm:text-lg leading-relaxed max-w-lg">
            Protect yourself from phishing attacks and online scams with
            multi-agent AI threat orchestration across suspicious links, SMS,
            WhatsApp lures, and emails.
          </p>

          <div className="flex flex-col sm:flex-row gap-3.5 mt-8 w-full sm:w-auto">
            <button
              type="button"
              onClick={() =>
                document.getElementById('scan')?.scrollIntoView({ behavior: 'smooth' })
              }
              className="siftrix-btn-gold inline-flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-siftrix-beige focus-visible:ring-siftrix-charcoal px-7 py-3.5 rounded-xl whitespace-nowrap w-full sm:w-auto cursor-pointer"
              aria-label="Start scanning by scrolling to the threat analysis tool"
            >
              <span>Start Scanning</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 10h11" />
                <path d="M11 5l5 5-5 5" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() =>
                document
                  .getElementById('features')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
              className="siftrix-btn-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-siftrix-beige focus-visible:ring-siftrix-gold px-7 py-3.5 rounded-xl whitespace-nowrap w-full sm:w-auto text-center cursor-pointer font-semibold"
              aria-label="Explore platform features"
            >
              Explore Features
            </button>
          </div>

          {/* Preserved Factual Capability Badges */}
          <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-2.5 text-xs font-medium text-siftrix-graphite">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-siftrix-border bg-siftrix-white/92 px-3.5 py-1.5 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-siftrix-gold" aria-hidden="true" />
              URL &amp; SSRF Validation
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-siftrix-border bg-siftrix-white/92 px-3.5 py-1.5 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-siftrix-gold" aria-hidden="true" />
              Message &amp; Email Lure Checks
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-siftrix-border bg-siftrix-white/92 px-3.5 py-1.5 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-siftrix-gold" aria-hidden="true" />
              EN + اردو Advisories
            </span>
          </div>
        </div>

        {/* Right Open Floating 3D Shield + 3 Orbiting Agent Glass Nodes */}
        <div className="w-full lg:w-[30rem] xl:w-[36rem] lg:shrink-0 flex justify-center lg:justify-end">
          <HeroShield3D />
        </div>
      </div>
    </section>
  )
}
