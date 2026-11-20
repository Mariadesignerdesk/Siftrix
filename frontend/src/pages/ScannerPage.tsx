import Scanner from '../components/Scanner'
import type { NavigateFn } from '../utils/router'

interface ScannerPageProps {
  onNavigate: NavigateFn
}

export default function ScannerPage({ onNavigate }: ScannerPageProps) {
  return (
    <div
      className="min-h-screen bg-[#FAF7F2] dark:bg-[#FAF7F2] text-siftrix-graphite flex flex-col relative overflow-hidden"
      style={{
        backgroundColor: '#FAF7F2',
        backgroundImage:
          'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(216, 181, 109, 0.18) 0%, transparent 70%)',
      }}
    >
      <section
        aria-label="Dedicated Threat Scanner Page"
        className="px-4 sm:px-6 md:px-10 py-8 sm:py-10 md:py-12 max-w-7xl mx-auto space-y-6 w-full animate-siftrix-enter"
      >
        {/* Dedicated Scanner Page Header Banner */}
        <div className="siftrix-card-charcoal relative overflow-hidden rounded-2xl p-5 sm:p-6 md:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-siftrix-champagne/80 to-transparent"
          />

          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-siftrix-gold animate-pulse" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-siftrix-champagne">
                AI-Powered Threat Detection
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-siftrix-white dark:text-[#FAF6EF] mt-1 tracking-tight">
              Real-Time Threat Scanner
            </h1>
            <p className="text-[#C8C1B6] text-sm md:text-base mt-1 max-w-2xl leading-relaxed">
              Analyze suspicious URLs, SMS, WhatsApp lures, and phishing emails using multi-agent AI verification with instant bilingual guidance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="siftrix-btn-charcoal-outline px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer"
            >
              ← Back to Home
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/scans')}
              className="siftrix-btn-gold px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer"
            >
              View Scan History →
            </button>
          </div>
        </div>

        {/* Embedded Full Scanner Component */}
        <div className="rounded-2xl overflow-hidden border border-[#D7CFC2] dark:border-[#D7CFC2] shadow-sm">
          <Scanner />
        </div>
      </section>
    </div>
  )
}
