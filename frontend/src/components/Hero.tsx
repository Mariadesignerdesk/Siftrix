import type { NavigateFn } from '../utils/router'
import HeroShield3D from './HeroShield3D'
import Theme4CyberBackground from './Theme4CyberBackground'

interface HeroProps {
  onNavigate?: NavigateFn
}

export default function Hero({ onNavigate }: HeroProps) {
  const handleStartScanning = () => {
    if (onNavigate) {
      onNavigate('/scanner')
    } else {
      window.location.href = '/scanner'
    }
  }

  const handleExploreFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      id="home"
      className="relative overflow-hidden bg-[#FAF6EF] dark:bg-[#111217] text-siftrix-charcoal dark:text-[#E9E5DC] border-b border-siftrix-border dark:border-[#262732] px-4 sm:px-6 md:px-10 py-12 sm:py-16 lg:py-24 transition-colors duration-500"
    >
      {/* Theme 4: Minimal Elegant Dark + Gold Cyber Background */}
      <Theme4CyberBackground />

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-12 animate-siftrix-enter">
        {/* Left Editorial Composition */}
        <div className="w-full max-w-xl lg:flex-1">
          <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-siftrix-gold/50 bg-siftrix-white/90 dark:bg-[#1B1C23]/90 px-4 py-1.5 text-[11px] font-semibold tracking-[0.16em] uppercase text-siftrix-graphite dark:text-siftrix-champagne shadow-2xs mb-6">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-gradient-to-br from-siftrix-champagne to-siftrix-antique"
            />
            <span>AI-POWERED CYBERSECURITY</span>
          </div>

          <h1 className="text-[1.8rem] min-[360px]:text-[1.95rem] sm:text-5xl xl:text-[3.4rem] font-bold text-siftrix-charcoal dark:text-[#FAF6EF] leading-[1.14] tracking-[-0.03em] break-words">
            Stay One Step Ahead of{' '}
            <span className="inline-block font-editorial italic font-bold text-[1.1em] siftrix-gold-text-on-light dark:text-siftrix-champagne pr-2 pb-1 underline decoration-siftrix-gold/70 decoration-2 underline-offset-8">
              Online Scams.
            </span>
          </h1>

          {/* New Clean Hero Description directly below main heading */}
          <p className="text-siftrix-muted-dark dark:text-[#D5CFC5] mt-3.5 sm:mt-4 text-base sm:text-lg leading-relaxed max-w-lg">
            Protect yourself from phishing attacks and online scams
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-3.5 mt-6 sm:mt-8 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleStartScanning}
              className="siftrix-btn-gold inline-flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-siftrix-beige focus-visible:ring-siftrix-charcoal px-6 sm:px-7 py-3 sm:py-3.5 rounded-xl whitespace-nowrap w-full sm:w-auto cursor-pointer"
              aria-label="Start scanning by opening the dedicated threat analysis tool"
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
              onClick={handleExploreFeatures}
              className="siftrix-btn-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-siftrix-beige focus-visible:ring-siftrix-gold px-6 sm:px-7 py-3 sm:py-3.5 rounded-xl whitespace-nowrap w-full sm:w-auto text-center cursor-pointer font-semibold"
              aria-label="Explore platform features"
            >
              Explore Features
            </button>
          </div>
        </div>

        {/* Right Open Floating 3D Shield */}
        <div className="w-full lg:w-[34rem] xl:w-[38rem] 2xl:w-[42rem] lg:shrink-0 flex justify-center lg:justify-end">
          <HeroShield3D />
        </div>
      </div>
    </section>
  )
}
