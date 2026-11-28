import type { FC } from 'react'
import type { NavigateFn } from '../utils/router'
import {
  AnalystMessageInspectionSvg,
  SecurityExpertDetectionSvg,
  ShieldProtectedUserSvg,
  type IllustrationProps,
} from './illustrations/ProtectionIllustrations'

interface HowItWorksProps {
  onNavigate?: NavigateFn
}

interface WorkflowStep {
  readonly step: string
  readonly phase: string
  readonly title: string
  readonly description: string
  readonly illustration: FC<IllustrationProps>
}

const WORKFLOW_STEPS: ReadonlyArray<WorkflowStep> = [
  {
    step: '01',
    phase: 'INTAKE & VALIDATION',
    title: 'Paste a Link or Message',
    description:
      'Auto-Detect classifies URLs versus SMS, WhatsApp, or phishing emails while applying client-side scheme and SSRF safety checks.',
    illustration: AnalystMessageInspectionSvg,
  },
  {
    step: '02',
    phase: 'ORCHESTRATED AI INSPECTION',
    title: 'Multi-Agent Threat Analysis',
    description:
      'URL Intelligence and Message Intelligence inspect domain signals, obfuscation, social-engineering urgency, and credential lures via POST /api/scan.',
    illustration: SecurityExpertDetectionSvg,
  },
  {
    step: '03',
    phase: 'ACTIONABLE CLARITY',
    title: 'Threat Score & Bilingual Guidance',
    description:
      'Security Advisor compiles a 0–100 risk score, semantic verdict (Safe, Suspicious, Malicious), and mitigation steps in English and اردو.',
    illustration: ShieldProtectedUserSvg,
  },
]

/**
 * Architectural 3-step workflow section framed on a linear golden gradient section background.
 * Solid dark cards (#101014) in Dark Mode, solid deep-charcoal cards (#242329) in Light Mode.
 * Preserves engaging vector illustrations and interactive scanner navigation.
 */
export default function HowItWorks({ onNavigate }: HowItWorksProps) {
  return (
    <section
      id="how-it-works"
      aria-label="How SIFTRIX Works"
      className="relative overflow-hidden px-5 sm:px-6 md:px-10 py-18 md:py-24 border-b border-[#875E1C]/35 transition-colors duration-500"
      style={{
        background: 'linear-gradient(135deg, #EBD49E 0%, #D8B56D 50%, #A77B32 100%)',
      }}
    >
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#8F6621]/60 bg-[#17171B] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#EBD49E] shadow-sm mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-[#EBD49E]" aria-hidden="true" />
            Detection Workflow
          </span>

          <h2 className="text-3xl sm:text-4xl font-bold text-[#17171B] tracking-tight">
            How SIFTRIX{' '}
            <span className="font-editorial italic font-bold text-[#3B2807] pr-1">
              Protects You
            </span>
          </h2>

          <p className="text-[#383126] mt-3 text-base font-medium">
            From raw message or link to verified bilingual advice in three transparent steps.
          </p>
        </div>

        {/* Connected Step Cards */}
        <div className="relative">
          {/* Desktop Horizontal Connector Track */}
          <div
            aria-hidden="true"
            className="hidden lg:block pointer-events-none absolute top-[3.125rem] inset-x-[16.5%] h-px bg-gradient-to-r from-[#A77B32]/40 via-[#6F4C14] to-[#A77B32]/40"
          />

          <ol className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 relative z-10">
            {WORKFLOW_STEPS.map((item, idx) => {
              const IllustrationComponent = item.illustration
              return (
                <li
                  key={item.step}
                  className="group relative rounded-2xl p-6 sm:p-7 flex flex-col justify-between h-full bg-[#242329] dark:bg-[#101014] border border-[#38343D] dark:border-[#29272D] hover:border-[#D5B36B]/60 dark:hover:border-[#D5B36B]/60 transition-all duration-300 shadow-[0_8px_28px_-6px_rgba(20,18,25,0.4)] dark:shadow-[0_14px_36px_-12px_rgba(0,0,0,0.65)] hover:-translate-y-1"
                >
                  <div className="flex-1 flex flex-col">
                    {/* Header Row: Step Number & Phase Badge */}
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1A191F] dark:bg-[#0A0A0D] text-[#D5B36B] font-mono text-sm font-bold border border-[#D5B36B]/40 shadow-sm">
                        {item.step}
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#D5B36B]">
                          {item.phase}
                        </span>
                        {idx < WORKFLOW_STEPS.length - 1 ? (
                          <span
                            aria-hidden="true"
                            className="hidden lg:inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#D5B36B]/40 bg-[#1A191F] dark:bg-[#0A0A0D] text-[10px] text-[#D5B36B]"
                          >
                            →
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Engaging Vector Character Illustration Frame */}
                    <div className="relative w-full h-44 sm:h-48 mb-5 rounded-xl overflow-hidden border border-[#38343D] dark:border-[#29272D] bg-gradient-to-b from-[#2C2B33] to-[#1D1C22] dark:from-[#18181D] dark:to-[#0C0C0F] flex items-center justify-center p-2.5 transition-all duration-300 group-hover:border-[#D5B36B]/50 shadow-inner">
                      <IllustrationComponent className="w-full h-full object-contain" />
                    </div>

                    <h3 className="text-xl font-bold text-[#F5F0E5] tracking-tight group-hover:text-[#D5B36B] transition-colors">
                      {item.title}
                    </h3>

                    <p className="mt-3 text-sm sm:text-base text-[#D6D0C5] leading-relaxed font-normal">
                      {item.description}
                    </p>
                  </div>

                  <div
                    aria-hidden="true"
                    className="mt-6 h-px w-full bg-gradient-to-r from-[#D5B36B]/50 via-[#D5B36B]/20 to-transparent"
                  />
                </li>
              )
            })}
          </ol>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (onNavigate) {
                onNavigate('/scanner')
              } else {
                window.location.href = '/scanner'
              }
            }}
            className="siftrix-btn-charcoal px-6 py-2.5 rounded-xl text-sm font-semibold text-[#FAF6EF] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17171B] shadow-md"
          >
            Try Live Threat Scanner
          </button>
        </div>
      </div>
    </section>
  )
}
