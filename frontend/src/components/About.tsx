import BrandMark from './BrandMark'

const ABOUT_PILLARS = [
  {
    code: '01',
    title: 'Multi-Agent Triage',
    text: 'Specialized URL, message, and advisory agents collaborate to explain risk clearly.',
  },
  {
    code: '02',
    title: 'Built-In SSRF Guardrails',
    text: 'Strict URL scheme normalization and private-network filtering before analysis begins.',
  },
  {
    code: '03',
    title: 'English + اردو Guidance',
    text: 'Clear bilingual summaries and remediation checklists designed for everyday users.',
  },
] as const

/**
 * Editorial About composition framed on Sand Taupe contrast.
 */
export default function About() {
  return (
    <section
      id="about"
      className="relative overflow-hidden bg-siftrix-sand border-b border-siftrix-border px-5 sm:px-6 md:px-10 py-18 md:py-22"
    >
      <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        {/* Editorial Mission Column */}
        <div className="lg:col-span-7 space-y-5 text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-siftrix-gold/55 bg-siftrix-pearl px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-siftrix-graphite shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-siftrix-gold" aria-hidden="true" />
            Our Mission
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-siftrix-charcoal tracking-tight leading-tight">
            About{' '}
            <span className="font-editorial italic font-bold siftrix-gold-text-on-light pr-1">
              SIFTRIX
            </span>
          </h2>

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-siftrix-antique-ink">
            Intelligence. Protection. Confidence.
          </p>

          <p className="text-[#46423D] text-base sm:text-lg leading-relaxed max-w-2xl">
            SIFTRIX is an AI-powered cybersecurity platform designed to help
            individuals and businesses identify suspicious messages, phishing
            attempts, and potential online threats. Our mission is to make digital
            security intuitive, transparent, and accessible for everyone.
          </p>
        </div>

        {/* Architectural Brand Seal + Principles Card */}
        <div className="lg:col-span-5">
          <div className="siftrix-card-charcoal relative overflow-hidden rounded-2xl p-6 sm:p-7 space-y-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-siftrix-champagne/70 to-transparent"
            />

            <div className="flex items-center gap-3.5 pb-4 border-b border-siftrix-charcoal-border">
              <BrandMark className="h-11 w-11 shrink-0" />
              <div>
                <p className="text-sm font-bold text-siftrix-white tracking-wide">
                  SIFTRIX Security Core
                </p>
                <p className="text-xs text-siftrix-champagne mt-0.5">
                  Intelligence Behind Every Scan
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              {ABOUT_PILLARS.map((pillar) => (
                <div
                  key={pillar.code}
                  className="flex items-start gap-3 rounded-xl bg-[#1D1D22] border border-siftrix-charcoal-border px-3.5 py-3"
                >
                  <span className="font-mono text-xs font-bold text-siftrix-champagne mt-0.5">
                    {pillar.code}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-siftrix-white">
                      {pillar.title}
                    </p>
                    <p className="text-xs text-[#C2BBB0] mt-0.5 leading-relaxed">
                      {pillar.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
