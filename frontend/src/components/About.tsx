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
      className="relative overflow-hidden bg-siftrix-sand dark:bg-[#1B1C23] border-b border-siftrix-border dark:border-[#2E2F3B] px-4 sm:px-6 md:px-10 py-14 sm:py-18 md:py-22 transition-colors duration-500"
    >
      <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Editorial Mission Column */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-5 text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-siftrix-gold/55 bg-siftrix-pearl dark:bg-[#252632] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-siftrix-graphite dark:text-siftrix-champagne shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-siftrix-gold" aria-hidden="true" />
            Our Mission
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-siftrix-charcoal dark:text-[#FAF6EF] tracking-tight leading-tight">
            About{' '}
            <span className="font-editorial italic font-bold siftrix-gold-text-on-light dark:siftrix-gold-text pr-1">
              SIFTRIX
            </span>
          </h2>

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-siftrix-antique-ink dark:text-siftrix-champagne">
            Intelligence. Protection. Confidence.
          </p>

          <p className="text-[#38342E] dark:text-[#D5CFC5] text-base sm:text-lg leading-relaxed max-w-2xl font-normal">
            SIFTRIX is an AI-powered cybersecurity platform designed to help
            individuals and businesses identify suspicious messages, phishing
            attempts, and potential online threats. Our mission is to make digital
            security intuitive, transparent, and accessible for everyone.
          </p>
        </div>

        {/* Architectural Brand Seal + Principles Card */}
        <div className="lg:col-span-5">
          <div className="siftrix-card-charcoal dark:bg-[#292A32] dark:border-[#3A3B49] relative overflow-hidden rounded-2xl p-4 sm:p-6 md:p-7 space-y-4 sm:space-y-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-siftrix-champagne/70 to-transparent"
            />

            <div className="flex items-center gap-3.5 pb-4 border-b border-siftrix-charcoal-border">
              <BrandMark className="h-10 w-10 sm:h-11 sm:w-11 shrink-0" />
              <div>
                <p className="text-sm font-bold text-siftrix-white dark:text-[#F5F0E5] tracking-wide">
                  SIFTRIX Security Core
                </p>
                <p className="text-xs text-siftrix-champagne mt-0.5">
                  Intelligence Behind Every Scan
                </p>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-3.5">
              {ABOUT_PILLARS.map((pillar) => (
                <div
                  key={pillar.code}
                  className="flex items-start gap-3 rounded-xl bg-[#1D1D22] border border-siftrix-charcoal-border p-3 sm:px-3.5 sm:py-3"
                >
                  <span className="font-mono text-xs font-bold text-siftrix-champagne mt-0.5 shrink-0">
                    {pillar.code}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-siftrix-white dark:text-[#F5F0E5]">
                      {pillar.title}
                    </p>
                    <p className="text-xs sm:text-[13px] text-[#C2BBB0] mt-0.5 leading-relaxed">
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
