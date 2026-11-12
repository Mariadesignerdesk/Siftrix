import type { ReactNode } from 'react'

interface FeatureCardItem {
  id: string
  index: string
  tag: string
  title: string
  description: string
  icon: ReactNode
}

const FEATURE_CARDS: ReadonlyArray<FeatureCardItem> = [
  {
    id: 'ai-detection',
    index: '01',
    tag: 'URL & Content Inspection',
    title: 'AI Detection',
    description:
      'Identify suspicious messages, disguised domains, and phishing URLs using multi-agent AI analysis.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
        <path
          d="M12 2.75L19.25 5.5V11.25C19.25 15.95 16.15 19.95 12 21.25C7.85 19.95 4.75 15.95 4.75 11.25V5.5L12 2.75Z"
          stroke="#D8B56D"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="11.5" r="2.25" stroke="#F7F3EC" strokeWidth="1.75" />
        <path
          d="M12 6.75V8.5M12 14.5V16.25M8.25 11.5H9.5M14.5 11.5H15.75"
          stroke="#C5A15D"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'threat-analysis',
    index: '02',
    tag: 'Risk Scoring & Signals',
    title: 'Threat Analysis',
    description:
      'Understand potential online threats clearly with structured agent signals, indicators, and risk grading.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
        <circle cx="12" cy="12" r="8.25" stroke="#9B958C" strokeWidth="1.75" />
        <circle
          cx="12"
          cy="12"
          r="4.5"
          stroke="#D8B56D"
          strokeWidth="1.5"
          strokeDasharray="3 2.5"
        />
        <circle cx="12" cy="12" r="1.5" fill="#C5A15D" />
        <path
          d="M12 12L17.25 6.75"
          stroke="#F7F3EC"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'easy-to-use',
    index: '03',
    tag: 'Bilingual Remediation',
    title: 'Easy to Use',
    description:
      'Simple and accessible security experience delivering instant guidance in both English and Urdu (اردو).',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
        <rect
          x="5.25"
          y="10.25"
          width="13.5"
          height="10"
          rx="2.5"
          stroke="#9B958C"
          strokeWidth="1.75"
        />
        <path
          d="M8.5 10.25V7.75C8.5 5.82 10.07 4.25 12 4.25C13.93 4.25 15.5 5.82 15.5 7.75V10.25"
          stroke="#D8B56D"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <path
          d="M9.75 15.25L11.25 16.75L14.5 13.5"
          stroke="#F7F3EC"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
]

export default function Features() {
  return (
    <section
      id="features"
      className="relative overflow-hidden px-5 sm:px-6 md:px-10 py-18 md:py-22 bg-siftrix-charcoal text-siftrix-pearl border-b border-siftrix-charcoal-border"
    >
      {/* Subtle Technical Grid & Warm Champagne Horizon */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 siftrix-charcoal-grid opacity-55"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-siftrix-champagne/70 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-[44rem] rounded-full bg-siftrix-gold/10 blur-3xl"
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12 pb-8 border-b border-siftrix-charcoal-border/90">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-siftrix-gold/45 bg-[#1D1D22] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-siftrix-champagne mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-siftrix-champagne" aria-hidden="true" />
              AI Capabilities
            </span>

            <h2 className="text-3xl sm:text-4xl font-bold text-siftrix-white tracking-tight">
              Why Choose{' '}
              <span className="font-editorial italic font-bold siftrix-gold-text pr-1">
                SIFTRIX?
              </span>
            </h2>

            <p className="text-[#CBC4B9] mt-3 text-base sm:text-lg leading-relaxed">
              Smart protection for a safer digital world — precision threat
              classification engineered for real-world clarity.
            </p>
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-siftrix-champagne/90">
            Intelligence · Protection · Confidence
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURE_CARDS.map((card) => (
            <article
              key={card.id}
              className="siftrix-panel-charcoal-inset siftrix-card-hover group relative overflow-hidden p-7 rounded-2xl flex flex-col justify-between"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-siftrix-champagne/55 to-transparent opacity-60 group-hover:opacity-100 transition-opacity"
              />

              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[#1B1B20] border border-siftrix-gold/40 flex items-center justify-center shadow-inner">
                    {card.icon}
                  </div>
                  <span className="font-mono text-xs font-semibold tracking-[0.2em] text-siftrix-champagne">
                    {card.index}
                  </span>
                </div>

                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-siftrix-champagne/85 mb-2">
                  {card.tag}
                </p>

                <h3 className="text-xl font-bold text-siftrix-white tracking-tight">
                  {card.title}
                </h3>

                <p className="text-[#C8C1B6] mt-3 leading-relaxed text-sm sm:text-base">
                  {card.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
