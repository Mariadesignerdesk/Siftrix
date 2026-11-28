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
      className="relative overflow-hidden px-4 sm:px-6 md:px-10 py-14 sm:py-18 md:py-24 border-b border-[#875E1C]/35 transition-colors duration-500"
      style={{
        background: 'linear-gradient(135deg, #EBD49E 0%, #D8B56D 50%, #A77B32 100%)',
      }}
    >
      {/* Theme 4: Minimal Elegant Cyber Elements (World Map & Light Trails over Section Base) */}
      <Theme4CyberBackground variant="features" />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 sm:mb-12 pb-6 sm:pb-8 border-b border-[#875E1C]/35">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#8F6621]/60 bg-[#17171B] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#EBD49E] shadow-sm mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-[#EBD49E]" aria-hidden="true" />
              AI Capabilities
            </span>

            <h2 className="text-3xl sm:text-4xl font-bold text-[#17171B] tracking-tight">
              Why Choose{' '}
              <span className="font-editorial italic font-bold text-[#3B2807] pr-1">
                SIFTRIX?
              </span>
            </h2>

            <p className="text-[#383126] mt-3 text-base sm:text-lg leading-relaxed font-medium">
              Smart protection for a safer digital world — precision threat
              classification engineered for real-world clarity.
            </p>
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#3B2807]">
            Intelligence · Protection · Confidence
          </p>
        </div>

        {/* 3-Column Solid Cards: #101014 in Dark Mode, #FFFFFF in Light Mode */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
          {FEATURE_CARDS.map((card) => (
            <article
              key={card.id}
              className="group relative overflow-hidden rounded-2xl p-4 sm:p-5 md:p-6 flex flex-col justify-between bg-[#FFFFFF] dark:bg-[#101014] border border-[#D7CFC2] dark:border-[#29272D] hover:border-[#A77B32]/70 dark:hover:border-[#D5B36B]/60 hover:-translate-y-1 transition-all duration-300 shadow-[0_4px_24px_-6px_rgba(48,46,43,0.08),0_12px_32px_-12px_rgba(48,46,43,0.1)] dark:shadow-[0_14px_36px_-12px_rgba(0,0,0,0.65)]"
            >
              <div className="space-y-4">
                {/* Visual Image Container with Balanced Border & Badges */}
                <div className="relative h-44 sm:h-48 w-full overflow-hidden rounded-xl border border-[#E2DBCF] dark:border-[#29272D] bg-[#F7F3EC] dark:bg-[#0A0A0D] group-hover:border-[#A77B32]/60 dark:group-hover:border-[#D5B36B]/50 transition-all duration-300">
                  <img
                    src={card.image}
                    alt={card.imageAlt}
                    className="w-full h-full object-cover object-center filter brightness-95 contrast-105 transition-transform duration-700 ease-out group-hover:scale-105"
                    loading="lazy"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-transparent"
                  />

                  {/* Floating Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/95 dark:bg-[#0A0A0D]/90 text-[#242424] dark:text-[#D5B36B] font-mono text-xs font-bold border border-[#A77B32]/50 dark:border-[#D5B36B]/40 shadow-sm backdrop-blur-md">
                      {card.index}
                    </span>
                    <span className="rounded-full bg-white/95 dark:bg-[#0A0A0D]/90 border border-[#A77B32]/50 dark:border-[#D5B36B]/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#242424] dark:text-[#D5B36B] shadow-sm backdrop-blur-md">
                      {card.tag}
                    </span>
                  </div>
                </div>

                {/* Card Title & Description */}
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-[#242424] dark:text-[#F5F0E5] tracking-tight group-hover:text-[#A77B32] dark:group-hover:text-[#D5B36B] transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-sm text-[#514B40] dark:text-[#D6D0C5] leading-relaxed mt-2 font-normal">
                    {card.description}
                  </p>
                </div>
              </div>

              {/* Sub-capability bullet list */}
              <div className="pt-4 mt-4 border-t border-[#EAE3D6] dark:border-[#29272D] space-y-1.5">
                {card.features.map((feat) => (
                  <div key={feat} className="flex items-center gap-2 text-xs text-[#514B40] dark:text-[#D6D0C5] font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#A77B32] dark:bg-[#D5B36B] shrink-0" aria-hidden="true" />
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
