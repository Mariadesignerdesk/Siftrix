import { useState } from 'react'
import AchievementBadgeCard from '../components/gamification/AchievementBadgeCard'
import {
  getAchievementBadges,
  getDailyStreakCalendar,
  getUserGamificationProfile,
  type AchievementBadge,
} from '../services/gamificationService'
import type { NavigateFn } from '../utils/router'

interface RewardsPageProps {
  onNavigate: NavigateFn
}

export default function RewardsPage({ onNavigate }: RewardsPageProps) {
  const [profile] = useState(() => getUserGamificationProfile())
  const [badges] = useState<AchievementBadge[]>(() => getAchievementBadges())
  const [streakDays] = useState(() => getDailyStreakCalendar())
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const progressPercent = Math.min(
    100,
    Math.round((profile.currentLevelXp / profile.nextLevelXp) * 100)
  )

  const unlockedCount = badges.filter((b) => b.unlocked).length

  const filteredBadges =
    filterCategory === 'all'
      ? badges
      : badges.filter((b) => b.category === filterCategory)

  return (
    <section
      aria-label="Security Rewards and Achievements"
      className="px-4 sm:px-6 md:px-10 py-8 sm:py-10 md:py-14 max-w-6xl mx-auto space-y-8 animate-siftrix-enter"
    >
      {/* Header Banner */}
      <div className="siftrix-card-charcoal relative overflow-hidden rounded-2xl p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-siftrix-champagne/80 to-transparent"
        />

        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-siftrix-gold animate-pulse" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-siftrix-champagne">
              Threat Hunting Recognition
            </p>
          </div>
          <h2 className="text-3xl font-bold text-siftrix-white mt-1 tracking-tight">
            Operative Rewards & Badges
          </h2>
          <p className="text-[#C8C1B6] text-sm md:text-base mt-1">
            Track your daily investigation streaks, unlock cybersecurity achievements, and rank up.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/leaderboard')}
            className="siftrix-btn-charcoal-outline px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer"
          >
            📊 View Leaderboard
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/', 'scan')}
            className="siftrix-btn-gold px-4.5 py-2 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer"
          >
            + Scan for XP
          </button>
        </div>
      </div>

      {/* Gamification Level & Streak Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* XP and Level Card */}
        <div className="lg:col-span-7 siftrix-card p-6 rounded-2xl space-y-5 border border-siftrix-border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-siftrix-gold">
                Active Operative Level
              </span>
              <h3 className="text-2xl font-bold text-siftrix-charcoal">
                Level {profile.level}: {profile.levelTitle}
              </h3>
            </div>
            <div className="rounded-2xl border border-siftrix-gold/50 bg-siftrix-pearl px-4 py-2 text-right">
              <span className="text-xl font-extrabold text-siftrix-charcoal siftrix-tabular">
                {profile.xp.toLocaleString()}
              </span>
              <p className="text-[10px] uppercase font-bold text-siftrix-gold">Total XP</p>
            </div>
          </div>

          {/* Progress bar to next level */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-siftrix-muted-dark font-medium">
              <span>Next Rank Progress</span>
              <span className="font-semibold text-siftrix-charcoal siftrix-tabular">
                {profile.currentLevelXp} / {profile.nextLevelXp} XP ({progressPercent}%)
              </span>
            </div>
            <div className="h-3 w-full bg-siftrix-sand rounded-full overflow-hidden p-0.5 border border-siftrix-border">
              <div
                className="h-full rounded-full bg-gradient-to-r from-siftrix-gold via-siftrix-champagne to-amber-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-siftrix-muted italic">
              Earn 50 XP per basic scan, +100 XP for malicious threat isolation, and +250 XP for achievements.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="rounded-xl bg-siftrix-pearl p-3 text-center border border-siftrix-border">
              <p className="text-lg font-bold text-siftrix-charcoal">{profile.scansCompleted}</p>
              <p className="text-[10px] text-siftrix-muted uppercase font-semibold">Total Scans</p>
            </div>
            <div className="rounded-xl bg-siftrix-pearl p-3 text-center border border-siftrix-border">
              <p className="text-lg font-bold text-siftrix-charcoal">{profile.threatsNeutralized}</p>
              <p className="text-[10px] text-siftrix-muted uppercase font-semibold">Threats Flagged</p>
            </div>
            <div className="rounded-xl bg-siftrix-pearl p-3 text-center border border-siftrix-border">
              <p className="text-lg font-bold text-siftrix-charcoal">{unlockedCount} / {badges.length}</p>
              <p className="text-[10px] text-siftrix-muted uppercase font-semibold">Badges Earned</p>
            </div>
          </div>
        </div>

        {/* Daily Streak Card */}
        <div className="lg:col-span-5 siftrix-card p-6 rounded-2xl space-y-4 border border-siftrix-border shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-siftrix-gold">
                Consistency Patrol
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/40 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                🔥 {profile.dailyStreak}-Day Streak
              </span>
            </div>
            <h3 className="text-xl font-bold text-siftrix-charcoal">
              Weekly Recon Streak
            </h3>
            <p className="text-xs text-siftrix-muted-dark">
              Inspect at least 1 URL, SMS, or email daily to maintain your investigation streak bonus.
            </p>
          </div>

          {/* 7-Day Streak Calendar */}
          <div className="grid grid-cols-7 gap-1.5 py-2">
            {streakDays.map((day) => (
              <div
                key={day.dayName}
                className={`flex flex-col items-center justify-center rounded-xl p-2 text-center border transition-all ${
                  day.active
                    ? 'bg-amber-100/70 border-amber-400 text-amber-900 shadow-xs'
                    : day.isToday
                      ? 'bg-siftrix-pearl border-siftrix-gold text-siftrix-charcoal ring-2 ring-siftrix-gold/40'
                      : 'bg-white border-siftrix-border text-siftrix-muted'
                }`}
              >
                <span className="text-[10px] font-bold uppercase">{day.dayName}</span>
                <span className="text-sm font-bold mt-0.5">{day.dayNumber}</span>
                <span className="text-xs mt-1">{day.active ? '🔥' : day.isToday ? '⏳' : '○'}</span>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-siftrix-pearl p-3 border border-siftrix-border text-xs text-siftrix-muted-dark flex items-center gap-2">
            <span className="text-base font-bold text-siftrix-gold">🎁</span>
            <span>Next Milestone: 7-Day Unbroken Aegis (+1,000 XP)</span>
          </div>
        </div>
      </div>

      {/* Badges Gallery Section */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-siftrix-border pb-3">
          <div>
            <h3 className="text-xl font-bold text-siftrix-charcoal">
              Cybersecurity Badges Gallery
            </h3>
            <p className="text-xs text-siftrix-muted">
              Unlocked {unlockedCount} of {badges.length} available operational credentials.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {['all', 'investigation', 'defense', 'streak', 'mastery'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`rounded-xl px-3 py-1 text-xs font-semibold capitalize transition-all cursor-pointer ${
                  filterCategory === cat
                    ? 'bg-siftrix-charcoal text-siftrix-champagne border border-siftrix-gold/40'
                    : 'bg-white text-siftrix-graphite border border-siftrix-border hover:border-siftrix-gold'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredBadges.map((badge) => (
            <AchievementBadgeCard key={badge.id} badge={badge} />
          ))}
        </div>
      </div>
    </section>
  )
}
