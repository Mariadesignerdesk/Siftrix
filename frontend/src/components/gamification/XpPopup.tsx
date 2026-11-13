import { useEffect } from 'react'
import type { UserGamificationProfile } from '../../services/gamificationService'

interface XpPopupProps {
  xpEarned: number
  profile: UserGamificationProfile
  leveledUp?: boolean
  onClose: () => void
}

export default function XpPopup({
  xpEarned,
  profile,
  leveledUp = false,
  onClose,
}: XpPopupProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 4500)
    return () => clearTimeout(timer)
  }, [onClose])

  const progressPercent = Math.min(
    100,
    Math.round((profile.currentLevelXp / profile.nextLevelXp) * 100)
  )

  return (
    <div
      role="dialog"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-92 max-w-[92vw] animate-siftrix-enter"
    >
      <div className="relative overflow-hidden rounded-2xl border-2 border-siftrix-gold bg-siftrix-charcoal p-5 text-siftrix-beige shadow-2xl">
        {/* Specular Top Shimmer */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-siftrix-gold via-siftrix-champagne to-siftrix-antique animate-pulse"
        />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FFF8E7] to-[#F1DFC0] text-2xl shadow-inner border border-siftrix-gold text-siftrix-charcoal">
              {leveledUp ? '🎉' : '⚡'}
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-siftrix-champagne">
                {leveledUp ? 'Level Up Achieved!' : 'Threat Telemetry Analyzed'}
              </p>
              <h4 className="text-lg font-bold text-siftrix-white">
                +{xpEarned} XP Earned
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss XP notification"
            className="text-xs text-[#A59F94] hover:text-white cursor-pointer transition-colors p-1"
          >
            ✕
          </button>
        </div>

        {/* Level and Progress Bar */}
        <div className="mt-3.5 space-y-1.5 pt-3 border-t border-siftrix-charcoal-border">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-siftrix-champagne">
              Level {profile.level}: {profile.levelTitle}
            </span>
            <span className="text-[#C8C1B6] siftrix-tabular">
              {profile.currentLevelXp} / {profile.nextLevelXp} XP
            </span>
          </div>

          <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-siftrix-gold via-siftrix-champagne to-siftrix-white transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
