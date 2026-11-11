import HeroShield3D from './HeroShield3D'

const HERO_PARTICLES: ReadonlyArray<{
  top: string
  left: string
  size: string
  delay: string
  tone: 'electric' | 'lavender'
}> = [
  { top: '16%', left: '8%', size: 'w-1.5 h-1.5', delay: '0s', tone: 'lavender' },
  { top: '28%', left: '42%', size: 'w-1 h-1', delay: '1.1s', tone: 'electric' },
  { top: '72%', left: '14%', size: 'w-1.5 h-1.5', delay: '2.2s', tone: 'electric' },
  { top: '80%', left: '48%', size: 'w-1 h-1', delay: '0.7s', tone: 'lavender' },
  { top: '20%', left: '68%', size: 'w-1.5 h-1.5', delay: '1.7s', tone: 'lavender' },
  { top: '66%', left: '88%', size: 'w-1.5 h-1.5', delay: '2.8s', tone: 'electric' },
  { top: '14%', left: '90%', size: 'w-1 h-1', delay: '3.4s', tone: 'lavender' },
  { top: '84%', left: '72%', size: 'w-1 h-1', delay: '1.9s', tone: 'electric' },
]

export default function Hero() {
  return (
    <section
      id="home"
      className="relative overflow-hidden bg-gradient-to-br from-siftrix-navy via-siftrix-royal/40 to-siftrix-navy border-b border-siftrix-royal/50 px-6 md:px-10 py-16 md:py-24 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-10"
    >
      {/* Subtle Ambient Background Lighting & Floating Particles */}
      <div
        aria-hidden="true"
        className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-siftrix-royal/30 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-24 right-0 w-96 h-96 rounded-full bg-siftrix-electric/15 blur-3xl pointer-events-none"
      />
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
        {HERO_PARTICLES.map((particle, idx) => (
          <span
            key={idx}
            className={`absolute rounded-full animate-siftrix-particle ${particle.size} ${
              particle.tone === 'electric'
                ? 'bg-siftrix-electric shadow-[0_0_10px_rgba(139,109,255,0.85)]'
                : 'bg-siftrix-lavender shadow-[0_0_8px_rgba(185,169,245,0.75)]'
            }`}
            style={{
              top: particle.top,
              left: particle.left,
              animationDelay: particle.delay,
            }}
          />
        ))}
      </div>

      {/* Left Content */}
      <div className="relative z-10 max-w-xl md:max-w-lg lg:max-w-xl">
        <p className="text-siftrix-lavender font-semibold tracking-wide mb-4">
          AI-POWERED CYBERSECURITY
        </p>

        <h1 className="text-4xl md:text-5xl font-bold text-siftrix-soft leading-tight">
          Stay One Step Ahead of Online Scams.
        </h1>

        <p className="text-siftrix-lavender/90 mt-6 text-lg">
          Protect yourself from phishing attacks and online scams
          with intelligent AI-powered security analysis.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => document.getElementById('scan')?.scrollIntoView({ behavior: 'smooth' })}
            className="siftrix-btn-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-siftrix-navy focus-visible:ring-siftrix-electric px-6 py-3 rounded-lg whitespace-nowrap w-full sm:w-auto text-center cursor-pointer"
            aria-label="Start scanning by scrolling to the threat analysis tool"
          >
            Start Scanning
          </button>

          <button
            type="button"
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            className="siftrix-btn-dark-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-siftrix-navy focus-visible:ring-siftrix-electric px-6 py-3 rounded-lg whitespace-nowrap w-full sm:w-auto text-center cursor-pointer"
            aria-label="Explore platform features"
          >
            Explore Features
          </button>
        </div>
      </div>

      {/* Right Content: 3D Cybersecurity Shield */}
      <div className="relative z-10">
        <HeroShield3D />
      </div>
    </section>
  )
}
