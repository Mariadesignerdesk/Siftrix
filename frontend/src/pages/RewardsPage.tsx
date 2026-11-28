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
          <h2 className="text-3xl font-bold text-siftrix-white dark:text-[#FAF6EF] mt-1 tracking-tight">
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
            className="siftrix-btn-charcoal-outline inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="h-4 w-4 shrink-0 text-siftrix-champagne"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 17h14" />
              <path d="M6 17V11" />
              <path d="M10 17V7" />
              <path d="M14 17V4" />
            </svg>
            <span>View Leaderboard</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/scanner')}
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
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                </svg>
                <span>{profile.dailyStreak}-Day Streak</span>
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
                    ? 'bg-amber-100/70 border-amber-400 text-amber-900 shadow-xs dark:bg-amber-950/40 dark:border-amber-600/60 dark:text-amber-200'
                    : day.isToday
                      ? 'bg-siftrix-pearl border-siftrix-gold text-siftrix-charcoal ring-2 ring-siftrix-gold/40'
                      : 'bg-siftrix-white border-siftrix-border text-siftrix-muted'
                }`}
              >
                <span className="text-[10px] font-bold uppercase">{day.dayName}</span>
                <span className="text-sm font-bold mt-0.5">{day.dayNumber}</span>
                <span className="text-xs mt-1.5 flex items-center justify-center h-4 w-4">
                  {day.active ? (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                    </svg>
                  ) : day.isToday ? (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      className="h-3.5 w-3.5 text-siftrix-gold animate-pulse shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 3h10" />
                      <path d="M5 17h10" />
                      <path d="M6 3v3.5a4.5 4.5 0 0 0 2 3.5 4.5 4.5 0 0 0-2 3.5V17" />
                      <path d="M14 3v3.5a4.5 4.5 0 0 1-2 3.5 4.5 4.5 0 0 1 2 3.5V17" />
                    </svg>
                  ) : (
                    <span
                      className="h-2 w-2 rounded-full border-2 border-siftrix-border dark:border-siftrix-charcoal-border shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-siftrix-pearl p-3 border border-siftrix-border text-xs text-siftrix-muted-dark flex items-center gap-2.5">
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="h-4.5 w-4.5 shrink-0 text-siftrix-gold"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="8" width="14" height="9" rx="1.5" />
              <path d="M10 8v9" />
              <path d="M2 5.5h16v2.5H2z" />
              <path d="M10 5.5c-1.5 0-3-1-3-2.25s1-2.25 2.5-1 3 2.5 3 3.25" />
              <path d="M10 5.5c1.5 0 3-1 3-2.25s-1-2.25-2.5-1-3 2.5-3 3.25" />
            </svg>
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
                    ? 'bg-siftrix-charcoal text-siftrix-pearl border border-siftrix-gold/45 shadow-xs dark:bg-siftrix-sand dark:text-siftrix-champagne dark:border-siftrix-gold'
                    : 'bg-siftrix-white text-siftrix-graphite border border-siftrix-border hover:border-siftrix-gold hover:text-siftrix-charcoal'
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
