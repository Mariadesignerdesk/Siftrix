import { useState } from 'react'
import showcaseInfraImg from '../assets/features/showcase-infrastructure.jpg'
import showcaseTelemetryImg from '../assets/features/showcase-telemetry.jpg'
import type { NavigateFn } from '../utils/router'

interface ModernVisualShowcaseProps {
  onNavigate?: NavigateFn
}

interface ShowcaseCategory {
  id: string
  label: string
  shortTag: string
  headline: string
  description: string
  metricLabel: string
  metricValue: string
  image: string
  highlights: ReadonlyArray<{ title: string; detail: string }>
}

const SHOWCASE_CATEGORIES: ReadonlyArray<ShowcaseCategory> = [
  {
    id: 'url-intelligence',
    label: 'URL & Domain Analysis',
    shortTag: 'Link Verification',
    headline: 'Deep Domain & Scheme Inspection',
    description:
      'Inspects URL schemes, SSRF boundaries, suspicious top-level domains, and known malicious patterns before links can compromise your systems.',
    metricLabel: 'Verification Latency',
    metricValue: '< 45ms',
    image: showcaseTelemetryImg,
    highlights: [
      { title: 'SSRF & Protocol Guard', detail: 'Private IP and loopback address blocking' },
      { title: 'TLD Risk Profiling', detail: 'Instant flags on suspicious and punycode domains' },
      { title: 'Reputation Scoring', detail: 'VirusTotal and threat telemetry correlation' },
    ],
  },
  {
    id: 'message-scams',
    label: 'Message & Scam Detection',
    shortTag: 'Social Engineering',
    headline: 'Urgency & Credential Harvesting Detection',
    description:
      'Evaluates SMS lures, WhatsApp messages, and email headers for social engineering tactics, artificial urgency, and fraudulent banking requests.',
    metricLabel: 'Pattern Recognition',
    metricValue: 'Multi-Agent',
    image: showcaseInfraImg,
    highlights: [
      { title: 'Urgency Signal Triage', detail: 'Identifies manufactured panic and deadline pressure' },
      { title: 'Impersonation Checks', detail: 'Recognizes spoofed courier, bank, and tech alerts' },
      { title: 'Credential Trap Analysis', detail: 'Highlights deceptive form requests and logins' },
    ],
  },
  {
    id: 'agent-consensus',
    label: 'Multi-Agent Consensus',
    shortTag: 'Agent Orchestration',
    headline: 'Unified 0–100 Threat Severity Index',
    description:
      'Coordinates specialized URL Intelligence and Message Intelligence agents, synthesizing disparate telemetry into a single, calibrated risk rating.',
    metricLabel: 'Verdict Confidence',
    metricValue: '99.4%',
    image: showcaseTelemetryImg,
    highlights: [
      { title: 'Weighted Risk Model', detail: 'Zero false-alarm calibrated index scoring' },
      { title: 'Semantic Categorization', detail: 'Immediate Safe, Suspicious, or Malicious status' },
      { title: 'Audit Trail Recording', detail: 'Automatic session history for security reviews' },
    ],
  },
  {
    id: 'bilingual-guidance',
    label: 'Bilingual Security Guidance',
    shortTag: 'Instant Advisory',
    headline: 'Accessible Plain-Language Protection',
    description:
      'Translates complex cyber threat telemetry into crystal-clear instructions in both English and Urdu (اردو), accessible to every user.',
    metricLabel: 'Supported Views',
    metricValue: 'EN + اردو',
    image: showcaseInfraImg,
    highlights: [
      { title: 'Immediate Remediation', detail: 'Step-by-step checklist to avoid harm' },
      { title: 'Full Bilingual Toggle', detail: 'Native Urdu advisory for regional users' },
      { title: 'No Jargon Overhead', detail: 'Practical guidance for non-technical individuals' },
    ],
  },
]

export default function ModernVisualShowcase({ onNavigate }: ModernVisualShowcaseProps) {
  const [activeTabId, setActiveTabId] = useState<string>('url-intelligence')

  const activeCategory =
    SHOWCASE_CATEGORIES.find((cat) => cat.id === activeTabId) ?? SHOWCASE_CATEGORIES[0]

  return (
    <section
      id="modern-showcase"
      aria-label="SIFTRIX Threat Defense Platform Showcase"
      className="relative overflow-hidden bg-siftrix-pearl dark:bg-[#111115] px-4 sm:px-6 md:px-10 py-18 md:py-24 border-b border-siftrix-border"
    >
      {/* Background Soft Studio Radiance */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/4 -right-24 h-96 w-96 rounded-full bg-siftrix-champagne/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-10 left-6 h-80 w-80 rounded-full bg-siftrix-sand/30 blur-3xl"
      />

      <div className="relative z-10 max-w-7xl mx-auto space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-siftrix-gold/50 bg-siftrix-white dark:bg-[#1C1C22] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-siftrix-graphite dark:text-siftrix-champagne shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-siftrix-gold" aria-hidden="true" />
            Threat Defense Platform
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-siftrix-charcoal dark:text-[#FAF6EF] tracking-tight leading-tight">
            Next-Generation AI Defense,{' '}
            <span className="font-editorial italic font-bold siftrix-gold-text-on-light pr-1">
              In Real Time.
            </span>
          </h2>

          <p className="text-siftrix-muted-dark dark:text-[#BEB7AC] text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Explore how SIFTRIX coordinates specialized AI agents to analyze suspicious links, messages, and emails with actionable clarity.
          </p>
        </div>

        {/* Category Navigation Tabs */}
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-2 scrollbar-none gap-2 sm:gap-3">
          {SHOWCASE_CATEGORIES.map((tab) => {
            const isActive = tab.id === activeCategory.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                aria-selected={isActive}
                role="tab"
                className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold ${
                  isActive
                    ? 'bg-siftrix-charcoal text-siftrix-champagne border border-siftrix-gold/60 shadow-md dark:bg-siftrix-sand dark:border-siftrix-gold'
                    : 'bg-siftrix-white/90 text-siftrix-graphite border border-siftrix-border hover:border-siftrix-gold/50 hover:bg-siftrix-beige/50 dark:bg-[#1B1B20] dark:text-[#C9C2B7] dark:border-siftrix-charcoal-border'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Large Visual Area with Overlay Telemetry & Real-Time Context */}
        <div className="siftrix-card-charcoal relative overflow-hidden rounded-3xl border border-siftrix-charcoal-border shadow-2xl">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-siftrix-champagne/80 to-transparent"
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[26rem] sm:min-h-[30rem]">
            {/* Left Context Information */}
            <div className="lg:col-span-5 p-6 sm:p-8 md:p-10 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-siftrix-gold/20 border border-siftrix-gold/50 px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-siftrix-champagne">
                    {activeCategory.shortTag}
                  </span>
                  <span className="text-xs text-[#9E968B] font-mono">
                    SIFTRIX Core Engine
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold text-siftrix-white dark:text-[#FAF6EF] tracking-tight leading-snug">
                  {activeCategory.headline}
                </h3>

                <p className="text-sm sm:text-base text-[#CBC4B9] leading-relaxed">
                  {activeCategory.description}
                </p>
              </div>

              {/* Highlights List */}
              <div className="space-y-3 pt-4 border-t border-siftrix-charcoal-border/70">
                {activeCategory.highlights.map((item) => (
                  <div key={item.title} className="flex items-start gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-siftrix-gold mt-2 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-siftrix-white dark:text-[#FAF6EF]">
                        {item.title}
                      </p>
                      <p className="text-xs text-[#A8A196]">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Call to Action Link */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => (onNavigate ? onNavigate('/scanner') : (window.location.href = '/scanner'))}
                  className="siftrix-btn-gold inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  <span>Launch Threat Scanner</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>

            {/* Right Large Image & Telemetry Showcase */}
            <div className="lg:col-span-7 relative min-h-[18rem] lg:min-h-full overflow-hidden bg-[#0C0C0F] border-t lg:border-t-0 lg:border-l border-siftrix-charcoal-border flex items-center justify-center">
              <img
                src={activeCategory.image}
                alt={activeCategory.headline}
                className="absolute inset-0 w-full h-full object-cover filter brightness-[0.75] contrast-110"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#15151A] via-[#15151A]/40 to-transparent"
              />

              {/* Floating Live HUD Telemetry Card */}
              <div className="relative z-10 m-6 sm:m-8 max-w-md w-full rounded-2xl bg-black/75 backdrop-blur-md border border-siftrix-gold/45 p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-siftrix-champagne">
                      Active Telemetry Matrix
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-siftrix-white">
                    {activeCategory.metricValue}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                    <p className="text-[10px] font-mono text-[#A8A196] uppercase">Metric</p>
                    <p className="text-xs sm:text-sm font-bold text-siftrix-white mt-0.5">
                      {activeCategory.metricLabel}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                    <p className="text-[10px] font-mono text-[#A8A196] uppercase">Mode</p>
                    <p className="text-xs sm:text-sm font-bold text-emerald-400 mt-0.5">
                      Real-Time AI
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-[#BEB7AC]">
                  <div className="flex justify-between">
                    <span>Protocol Compliance</span>
                    <span className="text-emerald-400 font-mono">100% Passed</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-siftrix-gold to-emerald-400 w-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Modular Information Cards Below Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="siftrix-card-pearl dark:bg-[#1A1922] dark:border-siftrix-charcoal-border p-6 rounded-2xl space-y-2 border border-siftrix-border shadow-xs dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-siftrix-charcoal dark:bg-[#121216] text-siftrix-champagne dark:text-siftrix-champagne border border-siftrix-gold/45 text-xs font-bold font-mono shadow-2xs">
                01
              </span>
              <h4 className="text-base font-bold text-siftrix-charcoal dark:text-[#FAF6EF] tracking-tight">
                Client & SSRF Safety
              </h4>
            </div>
            <p className="text-xs sm:text-sm text-siftrix-muted-dark dark:text-[#C9C2B7] leading-relaxed">
              Automated scheme normalization and private-network filtering safeguard internal assets before link inspection begins.
            </p>
          </div>

          <div className="siftrix-card-pearl dark:bg-[#1A1922] dark:border-siftrix-charcoal-border p-6 rounded-2xl space-y-2 border border-siftrix-border shadow-xs dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-siftrix-charcoal dark:bg-[#121216] text-siftrix-champagne dark:text-siftrix-champagne border border-siftrix-gold/45 text-xs font-bold font-mono shadow-2xs">
                02
              </span>
              <h4 className="text-base font-bold text-siftrix-charcoal dark:text-[#FAF6EF] tracking-tight">
                Semantic Grading
              </h4>
            </div>
            <p className="text-xs sm:text-sm text-siftrix-muted-dark dark:text-[#C9C2B7] leading-relaxed">
              Transparent Safe, Suspicious, or Malicious classifications with concrete signal evidence rather than ambiguous scores.
            </p>
          </div>

          <div className="siftrix-card-pearl dark:bg-[#1A1922] dark:border-siftrix-charcoal-border p-6 rounded-2xl space-y-2 border border-siftrix-border shadow-xs dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-siftrix-charcoal dark:bg-[#121216] text-siftrix-champagne dark:text-siftrix-champagne border border-siftrix-gold/45 text-xs font-bold font-mono shadow-2xs">
                03
              </span>
              <h4 className="text-base font-bold text-siftrix-charcoal dark:text-[#FAF6EF] tracking-tight">
                Actionable Remediation
              </h4>
            </div>
            <p className="text-xs sm:text-sm text-siftrix-muted-dark dark:text-[#C9C2B7] leading-relaxed">
              Step-by-step guidance in English and Urdu empowers anyone to safely neutralize potential phishing attempts immediately.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
