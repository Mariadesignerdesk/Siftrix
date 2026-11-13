import type { AchievementBadge } from '../../services/gamificationService'

interface AchievementBadgeCardProps {
  badge: AchievementBadge
}

export default function AchievementBadgeCard({ badge }: AchievementBadgeCardProps) {
  const { title, description, icon, unlocked, unlockedAt, xpReward, progress, category } = badge

  const progressPercent = progress ? Math.min(100, Math.round((progress.current / progress.max) * 100)) : 100

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-300 border ${
        unlocked
          ? 'bg-gradient-to-br from-white via-siftrix-pearl to-siftrix-sand/40 border-siftrix-gold/70 shadow-md hover:-translate-y-1 hover:shadow-xl'
          : 'bg-siftrix-charcoal/80 border-siftrix-charcoal-border/70 opacity-75 hover:opacity-95'
      }`}
    >
      {/* Top Hairline Indicator */}
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-1 ${
          unlocked
            ? 'bg-gradient-to-r from-siftrix-gold via-siftrix-champagne to-siftrix-antique'
            : 'bg-white/10'
        }`}
      />

      <div className="flex items-start justify-between gap-3">
        {/* Emblem & Icon */}
        <div
          className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-inner border ${
            unlocked
              ? 'bg-gradient-to-br from-[#FFF8E7] to-[#F1DFC0] border-siftrix-gold text-siftrix-charcoal shadow-amber-200/50'
              : 'bg-[#18181D] border-white/10 text-gray-500'
          }`}
        >
          {unlocked ? icon : '🔒'}
        </div>

        {/* XP Reward Pill */}
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider border ${
            unlocked
              ? 'bg-siftrix-gold/15 text-siftrix-antique-ink border-siftrix-gold/40'
              : 'bg-white/5 text-[#A59F94] border-white/10'
          }`}
        >
          +{xpReward} XP
        </span>
      </div>

      <div className="mt-3.5 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-siftrix-gold">
            {category}
          </span>
          {unlocked && (
            <span className="inline-flex items-center text-[10px] text-emerald-600 font-semibold">
              ✓ Unlocked
            </span>
          )}
        </div>
        <h4
          className={`text-base font-bold tracking-tight ${
            unlocked ? 'text-siftrix-charcoal' : 'text-siftrix-white'
          }`}
        >
          {title}
        </h4>
        <p
          className={`text-xs leading-relaxed ${
            unlocked ? 'text-siftrix-muted-dark' : 'text-[#A59F94]'
          }`}
        >
          {description}
        </p>
      </div>

      {/* Progress Bar or Unlocked Timestamp */}
      <div className="mt-4 pt-3 border-t border-siftrix-border/50">
        {unlocked ? (
          <p className="text-[11px] text-siftrix-muted font-medium">
            Earned {unlockedAt || 'recently'}
          </p>
        ) : progress ? (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-[#C8C1B6]">
              <span>Progress</span>
              <span className="font-semibold text-siftrix-champagne">
                {progress.current} / {progress.max}
              </span>
            </div>
            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-siftrix-gold to-siftrix-champagne transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-[#8E887E] italic">Locked requirement</p>
        )}
      </div>
    </div>
  )
}
