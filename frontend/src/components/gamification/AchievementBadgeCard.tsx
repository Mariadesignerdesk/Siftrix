import type { AchievementBadge } from '../../services/gamificationService'

interface AchievementBadgeCardProps {
  badge: AchievementBadge
}

function renderBadgeIcon(icon: string) {
  switch (icon) {
    case 'target':
    case '🎯':
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
        </svg>
      )
    case 'phish':
    case '🎣':
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 3v7a5 5 0 0 1-10 0v-2" />
          <path d="M4 11l3-3 3 3" />
          <circle cx="17" cy="3" r="1.5" />
          <path d="M12 18v3m-3 0h6" />
        </svg>
      )
    case 'globe':
    case '🌐':
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3.6 9h16.8M3.6 15h16.8" />
          <path d="M11.5 3a13 13 0 0 0 0 18m1-18a13 13 0 0 1 0 18" />
        </svg>
      )
    case 'flame':
    case '🔥':
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      )
    case 'shield':
    case '🛡️':
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3L4 6.5v6.2c0 5 3.4 9.6 8 11.3 4.6-1.7 8-6.3 8-11.3V6.5L12 3z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      )
    case 'zap':
    case '⚡':
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      )
    case 'award':
    case '🎖️':
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="15" r="6" />
          <path d="M8.21 13.89L7 22l5-3 5 3-1.21-8.11" />
          <path d="M12 9V3m-4 1l1.5 5m6.5-5l-1.5 5" />
          <circle cx="12" cy="15" r="2.5" fill="currentColor" fillOpacity="0.2" />
        </svg>
      )
    case 'crown':
    case '👑':
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 18h18l-2-10-4.5 4.5L12 4l-2.5 8.5L5 8z" />
          <path d="M4 18v2h16v-2" />
          <circle cx="12" cy="4" r="1" fill="currentColor" />
          <circle cx="5" cy="8" r="1" fill="currentColor" />
          <circle cx="19" cy="8" r="1" fill="currentColor" />
        </svg>
      )
    default:
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3L4 6.5v6.2c0 5 3.4 9.6 8 11.3 4.6-1.7 8-6.3 8-11.3V6.5L12 3z" />
        </svg>
      )
  }
}

export default function AchievementBadgeCard({ badge }: AchievementBadgeCardProps) {
  const { title, description, icon, unlocked, unlockedAt, xpReward, progress, category } = badge

  const progressPercent = progress ? Math.min(100, Math.round((progress.current / progress.max) * 100)) : 100

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-300 border ${
        unlocked
          ? 'bg-gradient-to-br from-siftrix-white via-siftrix-pearl to-siftrix-sand/35 border-siftrix-gold/70 shadow-md hover:-translate-y-1 hover:shadow-xl dark:border-siftrix-gold/50'
          : 'bg-siftrix-pearl/70 border-siftrix-border/90 opacity-85 hover:opacity-100 dark:bg-siftrix-sand/20 dark:border-siftrix-charcoal-border/70'
      }`}
    >
      {/* Top Hairline Indicator */}
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-1 ${
          unlocked
            ? 'bg-gradient-to-r from-siftrix-gold via-siftrix-champagne to-siftrix-antique'
            : 'bg-siftrix-border/60 dark:bg-siftrix-charcoal-border/60'
        }`}
      />

      <div className="flex items-start justify-between gap-3">
        {/* Emblem & Icon */}
        <div
          className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl shadow-inner border transition-colors ${
            unlocked
              ? 'bg-gradient-to-br from-[#FFF8E7] to-[#F1DFC0] border-siftrix-gold text-siftrix-charcoal shadow-amber-200/50 dark:from-[#2B271F] dark:to-[#1E1B15] dark:border-siftrix-gold/60 dark:text-siftrix-champagne dark:shadow-none'
              : 'bg-siftrix-sand/50 border-siftrix-border text-siftrix-muted-dark dark:bg-siftrix-obsidian/70 dark:border-siftrix-charcoal-border dark:text-siftrix-muted'
          }`}
        >
          {unlocked ? (
            renderBadgeIcon(icon)
          ) : (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5 text-siftrix-muted-dark dark:text-siftrix-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              <circle cx="12" cy="16" r="1.2" fill="currentColor" />
            </svg>
          )}
        </div>

        {/* XP Reward Pill */}
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider border ${
            unlocked
              ? 'bg-siftrix-gold/15 text-siftrix-antique-ink border-siftrix-gold/40 dark:text-siftrix-champagne'
              : 'bg-siftrix-sand/40 text-siftrix-muted-dark border-siftrix-border dark:bg-white/5 dark:text-siftrix-muted dark:border-white/10'
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
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-3 w-3 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3.5 8.5l3 3 6-6" />
              </svg>
              <span>Unlocked</span>
            </span>
          )}
        </div>
        <h4 className="text-base font-bold tracking-tight text-siftrix-charcoal">
          {title}
        </h4>
        <p className="text-xs leading-relaxed text-siftrix-muted-dark">
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
            <div className="flex justify-between text-[11px] text-siftrix-muted-dark">
              <span>Progress</span>
              <span className="font-semibold text-siftrix-charcoal siftrix-tabular">
                {progress.current} / {progress.max}
              </span>
            </div>
            <div className="h-1.5 w-full bg-siftrix-sand dark:bg-black/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-siftrix-gold to-siftrix-champagne transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-siftrix-muted italic">Locked requirement</p>
        )}
      </div>
    </div>
  )
}
