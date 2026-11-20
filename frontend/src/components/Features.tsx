import aiDetectionImg from '../assets/features/ai-detection.jpg'
import threatAnalysisImg from '../assets/features/threat-analysis.jpg'
import bilingualGuidanceImg from '../assets/features/bilingual-guidance.jpg'
import Theme4CyberBackground from './Theme4CyberBackground'

interface FeatureCardItem {
  id: string
  index: string
  tag: string
  title: string
  description: string
  image: string
  imageAlt: string
  features: ReadonlyArray<string>
}

const FEATURE_CARDS: ReadonlyArray<FeatureCardItem> = [
  {
    id: 'ai-detection',
    index: '01',
    tag: 'URL & Content Inspection',
    title: 'AI Detection',
    description:
      'Identify suspicious messages, disguised domains, and phishing URLs using multi-agent AI analysis.',
    image: aiDetectionImg,
    imageAlt: 'AI Detection inspecting URL schemes, obfuscated links, and suspicious cyber targets',
    features: ['URL Schemes & SSRF Safety', 'Multi-Agent Target Triage', 'Domain Obfuscation Checks'],
  },
  {
    id: 'threat-analysis',
    index: '02',
    tag: 'Risk Scoring & Signals',
    title: 'Threat Analysis',
    description:
      'Understand potential online threats clearly with structured agent signals, indicators, and risk grading.',
    image: threatAnalysisImg,
    imageAlt: 'Threat analysis operations dashboard monitoring risk scores and signals in real time',
    features: ['0–100 Unified Risk Scoring', 'Safe / Suspicious / Malicious Verdicts', 'Technical Indicator Breakdown'],
  },
  {
    id: 'bilingual-guidance',
    index: '03',
    tag: 'Bilingual Remediation',
    title: 'Bilingual Security Guidance',
    description:
      'Simple and accessible security experience delivering instant guidance in both English and Urdu (اردو).',
    image: bilingualGuidanceImg,
    imageAlt: 'Bilingual cybersecurity protection delivering guidance in English and Urdu',
    features: ['English & Urdu (اردو) Advisories', 'Actionable Mitigation Checklists', 'Everyday User Clarity'],
  },
]

export default function Features() {
  return (
    <section
      id="features"
      className="relative overflow-hidden px-5 sm:px-6 md:px-10 py-18 md:py-24 bg-[#FAF6EF] dark:bg-[#0A0A0E] text-siftrix-charcoal dark:text-siftrix-pearl border-b border-siftrix-border dark:border-[#2D2A35] transition-colors duration-500"
    >
      {/* Theme 4: Minimal Elegant Dark + Gold Background (Features Variant) */}
      <Theme4CyberBackground variant="features" />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12 pb-8 border-b border-siftrix-border/80 dark:border-siftrix-charcoal-border/90">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-siftrix-gold/45 bg-[#1D1D22] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-siftrix-champagne mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-siftrix-champagne" aria-hidden="true" />
              AI Capabilities
            </span>

            <h2 className="text-3xl sm:text-4xl font-bold text-siftrix-charcoal dark:text-[#FAF6EF] tracking-tight">
              Why Choose{' '}
              <span className="font-editorial italic font-bold siftrix-gold-text pr-1">
                SIFTRIX?
              </span>
            </h2>

            <p className="text-siftrix-muted-dark dark:text-[#CBC4B9] mt-3 text-base sm:text-lg leading-relaxed">
              Smart protection for a safer digital world — precision threat
              classification engineered for real-world clarity.
            </p>
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-siftrix-graphite dark:text-siftrix-champagne/90">
            Intelligence · Protection · Confidence
          </p>
        </div>

        {/* 3-Column Visual Feature Cards with Real High-Quality Imagery */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {FEATURE_CARDS.map((card) => (
            <article
              key={card.id}
              className="siftrix-card-charcoal group relative overflow-hidden rounded-2xl p-5 sm:p-6 flex flex-col justify-between border border-siftrix-charcoal-border hover:border-siftrix-champagne/60 hover:-translate-y-1 transition-all duration-300 shadow-md"
            >
              {/* Top Accent Light Highlight */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-siftrix-champagne/50 to-transparent group-hover:via-siftrix-champagne transition-all"
              />

              <div className="space-y-4">
                {/* Visual Image Container with Dark Gradient Mask & Badges */}
                <div className="relative h-48 w-full overflow-hidden rounded-xl border border-siftrix-charcoal-border bg-[#101014] group-hover:border-siftrix-gold/50 transition-all duration-300">
                  <img
                    src={card.image}
                    alt={card.imageAlt}
                    className="w-full h-full object-cover object-center filter brightness-90 contrast-105 transition-transform duration-700 ease-out group-hover:scale-105"
                    loading="lazy"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1A1A20] via-black/35 to-transparent"
                  />

                  {/* Floating Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/70 backdrop-blur-md text-siftrix-champagne font-mono text-xs font-bold border border-siftrix-gold/45 shadow-sm">
                      {card.index}
                    </span>
                    <span className="rounded-full bg-black/70 backdrop-blur-md border border-siftrix-gold/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-siftrix-champagne">
                      {card.tag}
                    </span>
                  </div>
                </div>

                {/* Card Title & Description */}
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-siftrix-white dark:text-[#FAF6EF] tracking-tight group-hover:text-siftrix-champagne transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-sm text-[#CBC4B9] leading-relaxed mt-2">
                    {card.description}
                  </p>
                </div>
              </div>

              {/* Sub-capability bullet list */}
              <div className="pt-4 mt-4 border-t border-siftrix-charcoal-border/70 space-y-1.5">
                {card.features.map((feat) => (
                  <div key={feat} className="flex items-center gap-2 text-xs text-[#BEB7AC]">
                    <span className="h-1.5 w-1.5 rounded-full bg-siftrix-gold/80 shrink-0" aria-hidden="true" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
