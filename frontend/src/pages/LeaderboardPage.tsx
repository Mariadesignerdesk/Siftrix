import { useState } from 'react'
import {
  getLeaderboardRankings,
  getUserGamificationProfile,
  type LeaderboardEntry,
} from '../services/gamificationService'
import type { NavigateFn } from '../utils/router'

interface LeaderboardPageProps {
  onNavigate: NavigateFn
}

export default function LeaderboardPage({ onNavigate }: LeaderboardPageProps) {
  const [rankings] = useState<LeaderboardEntry[]>(() => getLeaderboardRankings())
  const userProfile = getUserGamificationProfile()

  const top3 = [rankings[1], rankings[0], rankings[2]] // 2nd, 1st, 3rd for podium layout

  const getTierBadge = (tier: LeaderboardEntry['tier']) => {
    switch (tier) {
      case 'Gold Sentinel':
        return (
          <span className="rounded-full bg-siftrix-gold/20 border border-siftrix-gold px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-siftrix-antique-ink">
            🥇 Gold Sentinel
          </span>
        )
      case 'Silver Warden':
        return (
          <span className="rounded-full bg-slate-300/30 border border-slate-400 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
            🥈 Silver Warden
          </span>
        )
      case 'Bronze Guardian':
        return (
          <span className="rounded-full bg-amber-700/15 border border-amber-700/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
            🥉 Bronze Guardian
          </span>
        )
      default:
        return (
          <span className="rounded-full bg-siftrix-border/50 border border-siftrix-border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-siftrix-muted-dark">
            🛡️ Field Analyst
          </span>
        )
    }
  }

  return (
    <section
      aria-label="Threat Hunter Leaderboard"
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
              Global Cyber Defense Network
            </p>
          </div>
          <h2 className="text-3xl font-bold text-siftrix-white mt-1 tracking-tight">
            Threat Hunter Leaderboard
          </h2>
          <p className="text-[#C8C1B6] text-sm md:text-base mt-1">
            Top security operatives ranked by verified threat verifications and XP contributions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/rewards')}
            className="siftrix-btn-charcoal-outline px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer"
          >
            🏆 View Badges & Streaks
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/', 'scan')}
            className="siftrix-btn-gold px-4.5 py-2 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer"
          >
            + Investigate Threat
          </button>
        </div>
      </div>

      {/* Top-3 Podium */}
      <div className="pt-4">
        <h3 className="text-center text-xs font-bold uppercase tracking-widest text-siftrix-muted-dark mb-6">
          Elite Tier Sentinels
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end max-w-4xl mx-auto">
          {/* 2nd Place */}
          <div className="order-2 md:order-1 siftrix-card p-5 rounded-2xl text-center space-y-3 border-2 border-slate-300 shadow-lg transform md:-translate-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 border-2 border-slate-400 text-2xl shadow-inner">
              🥈
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Rank #2
              </span>
              <h4 className="text-base font-bold text-siftrix-charcoal">
                {top3[0]?.name}
              </h4>
              <p className="text-xs text-siftrix-muted-dark">{top3[0]?.title}</p>
            </div>
            <div className="rounded-xl bg-siftrix-pearl p-2.5 border border-siftrix-border">
              <span className="text-lg font-bold text-siftrix-charcoal">
                {top3[0]?.xp.toLocaleString()} XP
              </span>
              <p className="text-[10px] text-siftrix-muted">{top3[0]?.accuracyRate} Accuracy</p>
            </div>
          </div>

          {/* 1st Place (Center Podium) */}
          <div className="order-1 md:order-2 siftrix-card p-6 rounded-2xl text-center space-y-3.5 border-2 border-siftrix-gold shadow-2xl bg-gradient-to-b from-white via-siftrix-pearl to-amber-50/40 transform md:-translate-y-6">
            <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-gradient-to-tr from-amber-200 to-amber-400 border-3 border-siftrix-gold text-3xl shadow-amber-300/50 shadow-lg">
              👑
            </div>
            <div>
              <span className="inline-block rounded-full bg-siftrix-gold/20 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-siftrix-antique-ink border border-siftrix-gold/40">
                Champion #1
              </span>
              <h4 className="text-lg font-extrabold text-siftrix-charcoal mt-1">
                {top3[1]?.name}
              </h4>
              <p className="text-xs text-siftrix-muted-dark">{top3[1]?.title}</p>
            </div>
            <div className="rounded-xl bg-siftrix-charcoal p-3 border border-siftrix-gold/40 text-siftrix-champagne">
              <span className="text-2xl font-extrabold text-siftrix-white">
                {top3[1]?.xp.toLocaleString()} XP
              </span>
              <p className="text-[11px] text-siftrix-champagne/80 font-medium">
                {top3[1]?.scansCount} Scans • {top3[1]?.accuracyRate} Accuracy
              </p>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="order-3 md:order-3 siftrix-card p-5 rounded-2xl text-center space-y-3 border-2 border-amber-700/30 shadow-lg transform md:-translate-y-1">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 border-2 border-amber-700/50 text-2xl shadow-inner">
              🥉
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                Rank #3
              </span>
              <h4 className="text-base font-bold text-siftrix-charcoal">
                {top3[2]?.name}
              </h4>
              <p className="text-xs text-siftrix-muted-dark">{top3[2]?.title}</p>
            </div>
            <div className="rounded-xl bg-siftrix-pearl p-2.5 border border-siftrix-border">
              <span className="text-lg font-bold text-siftrix-charcoal">
                {top3[2]?.xp.toLocaleString()} XP
              </span>
              <p className="text-[10px] text-siftrix-muted">{top3[2]?.accuracyRate} Accuracy</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rankings Table */}
      <div className="siftrix-card rounded-2xl overflow-hidden border border-siftrix-border shadow-sm">
        <div className="border-b border-siftrix-border bg-siftrix-pearl/80 px-6 py-4 flex items-center justify-between">
          <h4 className="text-sm font-bold text-siftrix-charcoal uppercase tracking-wider">
            All Operative Rankings
          </h4>
          <span className="text-xs text-siftrix-muted">
            Your Status: Rank #4 ({userProfile.xp} XP)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-siftrix-sand/30 text-[11px] font-bold uppercase tracking-wider text-siftrix-muted-dark border-b border-siftrix-border">
              <tr>
                <th scope="col" className="px-5 py-3.5">
                  Rank
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Operative
                </th>
                <th scope="col" className="px-5 py-3.5 hidden sm:table-cell">
                  Tier
                </th>
                <th scope="col" className="px-5 py-3.5 hidden md:table-cell">
                  Accuracy
                </th>
                <th scope="col" className="px-5 py-3.5 hidden sm:table-cell">
                  Scans
                </th>
                <th scope="col" className="px-5 py-3.5 text-right">
                  Score (XP)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-siftrix-border/60">
              {rankings.map((entry) => {
                const isUser = entry.isCurrentUser
                return (
                  <tr
                    key={entry.rank}
                    className={`transition-colors ${
                      isUser
                        ? 'bg-amber-50/70 font-semibold border-l-4 border-l-siftrix-gold'
                        : 'hover:bg-siftrix-pearl/50'
                    }`}
                  >
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                          entry.rank === 1
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : entry.rank === 2
                              ? 'bg-slate-200 text-slate-800 border border-slate-300'
                              : entry.rank === 3
                                ? 'bg-amber-800/10 text-amber-900 border border-amber-800/30'
                                : 'text-siftrix-muted-dark'
                        }`}
                      >
                        {entry.rank}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-bold text-siftrix-charcoal">
                          {entry.name}
                        </p>
                        <p className="text-xs text-siftrix-muted-dark">{entry.title}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell whitespace-nowrap">
                      {getTierBadge(entry.tier)}
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell whitespace-nowrap text-xs text-siftrix-graphite font-medium">
                      {entry.accuracyRate}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell whitespace-nowrap text-xs text-siftrix-graphite font-medium">
                      {entry.scansCount}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap font-bold text-siftrix-charcoal siftrix-tabular">
                      {entry.xp.toLocaleString()} XP
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
