import type { NavigateFn } from '../utils/router'

interface HowItWorksProps {
  onNavigate?: NavigateFn
}

const WORKFLOW_STEPS = [
  {
    step: '01',
    phase: 'Intake & Validation',
    title: 'Paste Link or Message',
    description:
      'Auto-Detect classifies URLs versus SMS, WhatsApp, or phishing emails while applying client-side scheme and SSRF safety checks.',
  },
  {
    step: '02',
    phase: 'Orchestrated AI Inspection',
    title: 'Multi-Agent Analysis',
    description:
      'URL Intelligence and Message Intelligence inspect domain signals, obfuscation, social-engineering urgency, and credential lures via POST /api/scan.',
  },
  {
    step: '03',
    phase: 'Actionable Clarity',
    title: 'Score & Bilingual Guidance',
    description:
      'Security Advisor compiles a 0–100 risk score, semantic verdict (Safe, Suspicious, Malicious), and mitigation steps in English and اردو.',
  },
] as const

/**
 * Architectural 3-step workflow section on Warm Beige with metallic champagne-gold
 * connecting paths linking each stage of SIFTRIX threat analysis.
 */
export default function HowItWorks({ onNavigate }: HowItWorksProps) {
  return (
    <section
      id="how-it-works"
      aria-label="How SIFTRIX Works"
      className="relative overflow-hidden bg-siftrix-beige px-5 sm:px-6 md:px-10 py-18 md:py-22 border-b border-siftrix-border"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-12 h-72 w-72 rounded-full bg-siftrix-champagne/20 blur-3xl"
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-siftrix-gold/50 bg-siftrix-pearl px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-siftrix-graphite shadow-2xs mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-siftrix-gold" aria-hidden="true" />
            Detection Workflow
          </span>

          <h2 className="text-3xl sm:text-4xl font-bold text-siftrix-charcoal tracking-tight">
            How SIFTRIX{' '}
            <span className="font-editorial italic font-bold siftrix-gold-text-on-light pr-1">
              Protects You
            </span>
          </h2>

          <p className="text-siftrix-muted-dark mt-3 text-base">
            From raw message or link to verified bilingual advice in three transparent steps.
          </p>
        </div>

        {/* Connected Step Cards */}
        <div className="relative">
          {/* Desktop Horizontal Metallic Gold Connector Track */}
          <div
            aria-hidden="true"
            className="hidden lg:block pointer-events-none absolute top-[3.125rem] inset-x-[16.5%] h-px bg-gradient-to-r from-siftrix-antique/40 via-siftrix-gold to-siftrix-antique/40"
          />

          <ol className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 relative z-10">
            {WORKFLOW_STEPS.map((item, idx) => (
              <li
                key={item.step}
                className="siftrix-card-pearl siftrix-card-hover relative rounded-2xl p-6 sm:p-7 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-6">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-siftrix-charcoal text-siftrix-champagne font-mono text-sm font-bold border border-siftrix-gold/55 shadow-sm">
                      {item.step}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-siftrix-antique-ink">
                        {item.phase}
                      </span>
                      {idx < WORKFLOW_STEPS.length - 1 ? (
                        <span
                          aria-hidden="true"
                          className="hidden lg:inline-flex h-5 w-5 items-center justify-center rounded-full border border-siftrix-gold/45 bg-siftrix-white text-[10px] text-siftrix-antique-ink"
                        >
                          →
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-siftrix-charcoal tracking-tight">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm sm:text-base text-siftrix-muted-dark leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div
                  aria-hidden="true"
                  className="mt-6 h-px w-full bg-gradient-to-r from-siftrix-gold/55 via-siftrix-gold/15 to-transparent"
                />
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (onNavigate) {
                onNavigate('/', 'scan')
              } else {
                document.getElementById('scan')?.scrollIntoView({ behavior: 'smooth' })
              }
            }}
            className="siftrix-btn-charcoal px-6 py-2.5 rounded-xl text-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold"
          >
            Try Live Threat Scanner
          </button>
        </div>
      </div>
    </section>
  )
}
