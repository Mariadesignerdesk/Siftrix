import { useCallback, useEffect, useMemo, useState } from 'react'
import { checkBackendHealth, fetchScans, type ScanResponse } from '../services/api'
import { getUserGamificationProfile } from '../services/gamificationService'
import {
  computeStats,
  getPercent,
  getPointStrokeColor,
  resolveDashboardData,
  sortRecentScans,
  Y_AXIS_LEVELS,
  type BackendHealthState,
  type DemoPreviewReason,
} from '../utils/dashboardUtils'
import { clampRiskScore, formatTimestamp } from '../utils/scanPresentation'
import { handleSpaLinkClick, type NavigateFn } from '../utils/router'
import { RiskLevelBadge, TargetTypeBadge, VerdictBadge } from '../components/ScanBadges'

export interface DashboardPageProps {
  onNavigate: NavigateFn
}

function formatShortTime(isoString?: string): string {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  } catch {
    // fallback
  }
  return ''
}

export interface DashboardContentProps {
  scans: ScanResponse[]
  isLoading: boolean
  hasError: boolean
  errorMessage: string
  healthState: BackendHealthState
  isDemoPreview: boolean
  demoPreviewReason?: DemoPreviewReason
  onNavigate: NavigateFn
  onRefresh: () => void
}

export function DashboardContent({
  scans,
  isLoading,
  hasError,
  errorMessage,
  healthState,
  isDemoPreview,
  demoPreviewReason,
  onNavigate,
  onRefresh,
}: DashboardContentProps) {
  const effectiveDemoReason: DemoPreviewReason = !isDemoPreview
    ? 'none'
    : demoPreviewReason && demoPreviewReason !== 'none'
    ? demoPreviewReason
    : hasError
    ? 'api_failure'
    : 'empty_history'
  const stats = useMemo(() => computeStats(scans), [scans])
  const sortedScans = useMemo(() => sortRecentScans(scans), [scans])
  const recentScans = useMemo(() => sortedScans.slice(0, 5), [sortedScans])

  const trajectoryPoints = useMemo(() => {
    const windowScans = sortedScans.slice(0, 10).reverse()
    if (windowScans.length === 0) return []
    const width = 460
    const leftPad = 48
    const rightPad = 24
    const usableWidth = width - leftPad - rightPad
    const minY = 26
    const maxY = 138
    const spanY = maxY - minY

    return windowScans.map((scan, index) => {
      const x =
        windowScans.length === 1
          ? leftPad + usableWidth / 2
          : leftPad + (index / (windowScans.length - 1)) * usableWidth
      const score = clampRiskScore(scan.overall_risk_score)
      const y = maxY - (score / 100) * spanY
      return {
        id: scan.id,
        x: Math.round(x),
        y: Math.round(y),
        score,
        color: getPointStrokeColor(scan.verdict),
        timeLabel: formatShortTime(scan.created_at),
        scanIndex: index + 1,
      }
    })
  }, [sortedScans])

  const statCards = [
    {
      label: 'Total Scans',
      value: stats.total,
      subtext: isDemoPreview
        ? `${stats.total} sample analyses (Demo)`
        : stats.total === 1
        ? '1 recorded analysis'
        : `${stats.total} recorded analyses`,
      surface: 'dark' as const,
      accentClass: 'text-siftrix-champagne',
      dotClass: 'bg-siftrix-champagne',
    },
    {
      label: 'Safe',
      value: stats.safe,
      subtext: isDemoPreview
        ? `${getPercent(stats.safe, stats.total)}% sample distribution`
        : `${getPercent(stats.safe, stats.total)}% of total scans`,
      surface: 'light' as const,
      accentClass: 'text-emerald-700 dark:text-emerald-400',
      dotClass: 'bg-emerald-600',
    },
    {
      label: 'Suspicious',
      value: stats.suspicious,
      subtext: isDemoPreview
        ? `${getPercent(stats.suspicious, stats.total)}% sample distribution`
        : `${getPercent(stats.suspicious, stats.total)}% of total scans`,
      surface: 'light' as const,
      accentClass: 'text-amber-700 dark:text-amber-400',
      dotClass: 'bg-amber-500',
    },
    {
      label: 'Malicious',
      value: stats.malicious,
      subtext: isDemoPreview
        ? `${getPercent(stats.malicious, stats.total)}% sample distribution`
        : `${getPercent(stats.malicious, stats.total)}% of total scans`,
      surface: 'dark' as const,
      accentClass: 'text-red-400',
      dotClass: 'bg-red-500',
    },
  ]

  const healthBadgeConfig: Record<
    BackendHealthState,
    { label: string; badgeClass: string; dotClass: string }
  > = {
    checking: {
      label: 'Checking API...',
      badgeClass: 'bg-[#2E2D33] text-[#EDE6DC] border-[#494750]',
      dotClass: 'bg-[#ACA69E] animate-pulse',
    },
    online: {
      label: 'Backend Online',
      badgeClass: 'bg-emerald-950/75 text-emerald-300 border-emerald-500/45',
      dotClass: 'bg-emerald-400',
    },
    offline: {
      label: 'Backend Offline',
      badgeClass: 'bg-red-950/75 text-red-300 border-red-500/45',
      dotClass: 'bg-red-400',
    },
  }

  const currentHealth = healthBadgeConfig[healthState]

  return (
    <section
      aria-label="Security Dashboard"
      className="px-4 sm:px-6 md:px-10 py-8 sm:py-10 md:py-14 max-w-7xl mx-auto space-y-8 animate-siftrix-enter"
    >
      {/* Strong Dark Command Center Header */}
      <div className="siftrix-card-charcoal relative overflow-hidden rounded-2xl p-5 sm:p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-siftrix-champagne/80 to-transparent"
        />

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-siftrix-champagne">
            AI Cybersecurity Command Center
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-siftrix-white dark:text-[#FAF6EF] mt-1.5 tracking-tight">
            Security Dashboard
          </h2>
          <p className="text-[#C8C1B6] text-sm md:text-base mt-1.5 max-w-2xl">
            Monitor live scan telemetry, verdict distribution, risk trajectories, and backend availability.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            role="status"
            aria-live="polite"
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${currentHealth.badgeClass}`}
          >
            <span className={`w-2 h-2 rounded-full ${currentHealth.dotClass}`} />
            {currentHealth.label}
          </span>

          <a
            href="/scans"
            onClick={(e) => handleSpaLinkClick(e, onNavigate, '/scans')}
            className="px-4 py-2 rounded-xl siftrix-btn-charcoal-outline text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-champagne"
          >
            Scan History
          </a>

          <button
            type="button"
            disabled={isLoading}
            onClick={onRefresh}
            aria-label="Refresh dashboard scan data"
            className="px-4 py-2 rounded-xl siftrix-btn-charcoal-outline disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-champagne"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/scanner')}
            className="siftrix-btn-gold px-5 py-2 rounded-xl text-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-siftrix-charcoal focus-visible:ring-siftrix-champagne"
          >
            + New Scan
          </button>
        </div>
      </div>

      {/* Premium Champagne-Gold Demo Banner (distinguishes empty history, missing session, and API failure) */}
      {!isLoading && isDemoPreview ? (
        <div
          role="region"
          aria-label="Demo Telemetry Preview"
          className="rounded-2xl border border-siftrix-gold/60 bg-gradient-to-r from-[#242329] via-[#1E1D22] to-[#242329] dark:from-[#17161C] dark:via-[#131217] dark:to-[#17161C] p-5 sm:p-6 shadow-md text-siftrix-pearl relative overflow-hidden animate-siftrix-enter"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-siftrix-gold to-transparent"
          />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-siftrix-gold/20 border border-siftrix-gold/50 text-siftrix-champagne text-[11px] font-bold uppercase tracking-wider">
                  <span className="h-2 w-2 rounded-full bg-siftrix-gold animate-pulse" />
                  Illustrative Preview
                </span>
                <span className="text-xs text-[#ACA69E]">
                  {effectiveDemoReason === 'empty_history'
                    ? '0 recorded scans found'
                    : effectiveDemoReason === 'missing_session'
                    ? 'No active scan session'
                    : 'Actual scan history unavailable'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-siftrix-white dark:text-[#FAF6EF] tracking-tight">
                {effectiveDemoReason === 'empty_history'
                  ? 'DEMO PREVIEW — These are illustrative sample analytics, not your actual scan history.'
                  : effectiveDemoReason === 'missing_session'
                  ? 'Illustrative preview — sample data, not your actual scan history.'
                  : 'DEMO PREVIEW — Sample analytics are being displayed because actual scan history could not be loaded.'}
              </h3>
              <p className="text-xs sm:text-sm text-[#C8C1B6] max-w-3xl leading-relaxed">
                {effectiveDemoReason === 'empty_history'
                  ? 'You have not performed any scans yet. Explore this live telemetry preview to see how real-time risk trajectories, verdict distributions, and multi-agent intelligence will appear once you scan suspicious links or messages.'
                  : effectiveDemoReason === 'missing_session'
                  ? 'No active scan session is initialized in this browser yet. Explore these sample telemetry charts, or run a scan to initialize your session history.'
                  : 'Actual scan history could not be loaded from the backend. Illustrative sample analytics are shown below as a preview alongside the error notice.'}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start lg:self-center">
              <button
                type="button"
                onClick={() => onNavigate('/scanner')}
                className="siftrix-btn-gold px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold cursor-pointer shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-champagne flex items-center gap-2"
              >
                <span>
                  {effectiveDemoReason === 'empty_history'
                    ? 'Run Your First Scan'
                    : 'Open Threat Scanner'}
                </span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Gamification Level & XP Progress Banner */}
      {(() => {
        const gamificationProfile = getUserGamificationProfile()
        const xpProgressPercent = Math.min(
          100,
          Math.round((gamificationProfile.currentLevelXp / gamificationProfile.nextLevelXp) * 100)
        )
        return (
          <div className="rounded-2xl border border-siftrix-gold/40 bg-[#E8D5B5] dark:bg-gradient-to-r dark:from-siftrix-pearl dark:via-[#1D1C24] dark:to-siftrix-pearl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-siftrix-gold/20 border border-siftrix-gold/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-siftrix-antique-ink">
                  Level {gamificationProfile.level} Operative
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                  🔥 {gamificationProfile.dailyStreak}-Day Streak
                </span>
                <span className="text-xs text-siftrix-muted-dark">
                  Rank #4 on Global Board
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-siftrix-charcoal truncate">
                {gamificationProfile.levelTitle}
              </h3>

              <div className="space-y-1 pt-1 max-w-md">
                <div className="flex justify-between text-xs text-siftrix-muted-dark font-medium">
                  <span>Level Progress</span>
                  <span className="font-semibold text-siftrix-charcoal siftrix-tabular">
                    {gamificationProfile.currentLevelXp} / {gamificationProfile.nextLevelXp} XP ({xpProgressPercent}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-siftrix-sand rounded-full overflow-hidden border border-siftrix-border">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-siftrix-gold to-siftrix-champagne transition-all duration-500"
                    style={{ width: `${xpProgressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('/rewards')}
                className="siftrix-btn-secondary px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer text-siftrix-graphite dark:text-[#FAF6EF] dark:bg-[#25242C] dark:border-siftrix-charcoal-border"
              >
                🎖️ Rewards &amp; Badges
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/leaderboard')}
                className="siftrix-btn-charcoal px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer text-siftrix-pearl dark:text-white"
              >
                🏆 Leaderboard
              </button>
            </div>
          </div>
        )
      })()}

      {/* Explicit Backend Error Alert */}
      {!isLoading && hasError ? (
        <div
          role="alert"
          className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-900 dark:text-red-200 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="space-y-1 text-sm">
            <p className="font-bold">Could not load backend scan data</p>
            <p className="text-red-700 dark:text-red-300">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer shrink-0 self-start sm:self-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Retry Connection
          </button>
        </div>
      ) : null}

      {/* Mixed Light & Dark Editorial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card) => {
          const isDark = card.surface === 'dark'
          return (
            <div
              key={card.label}
              className={`${
                isDark ? 'siftrix-card-charcoal' : 'siftrix-card-pearl'
              } siftrix-card-hover p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden`}
            >
              {isDark ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-siftrix-gold/55 to-transparent"
                />
              ) : null}

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`text-sm font-semibold ${
                      isDark ? 'text-siftrix-pearl dark:text-white' : 'text-siftrix-muted-dark dark:text-white'
                    }`}
                  >
                    {card.label}
                  </span>
                  {isDemoPreview ? (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-siftrix-gold/20 text-siftrix-champagne border border-siftrix-gold/40">
                      Sample
                    </span>
                  ) : null}
                </div>
                <span className={`w-2.5 h-2.5 rounded-full ${card.dotClass}`} />
              </div>

              {isLoading ? (
                <div className="mt-4 space-y-2 animate-pulse" aria-busy="true">
                  <div
                    className={`h-8 w-16 rounded ${
                      isDark ? 'bg-[#3A3942]' : 'bg-siftrix-sand'
                    }`}
                  />
                  <div
                    className={`h-3 w-28 rounded ${
                      isDark ? 'bg-[#34333B]' : 'bg-siftrix-sand/70'
                    }`}
                  />
                </div>
              ) : hasError && !isDemoPreview ? (
                <div className="mt-4">
                  <p
                    className={`text-3xl font-bold ${
                      isDark ? 'text-[#8E897F]' : 'text-siftrix-muted'
                    }`}
                  >
                    —
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      isDark ? 'text-[#ACA69E]' : 'text-siftrix-muted-dark'
                    }`}
                  >
                    Unavailable while backend is offline
                  </p>
                </div>
              ) : (
                <div className="mt-4">
                  <p className={`text-3xl font-bold siftrix-tabular ${card.accentClass}`}>
                    {card.value}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      isDark ? 'text-[#C8C1B6] dark:text-[#D5CFC5]' : 'text-siftrix-muted-dark dark:text-[#D5CFC5]'
                    }`}
                  >
                    {card.subtext}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Gold-Accented Analytics & Verdict Distribution (Rendered for Real Scans or Demo Preview) */}
      {!isLoading && (stats.total > 0 || isDemoPreview) ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Champagne Gold Trajectory Area Chart */}
          <div className="min-w-0 lg:col-span-7 siftrix-card-charcoal rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-siftrix-charcoal-border">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-siftrix-white dark:text-[#FAF6EF]">
                    Recent Risk Trajectory
                  </h3>
                  {isDemoPreview ? (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-siftrix-gold/20 text-siftrix-champagne border border-siftrix-gold/40">
                      Sample Data
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-[#BFB8AC]">
                  {isDemoPreview
                    ? 'Demonstrating 10 sample threat scans scored 0–100'
                    : trajectoryPoints.length < 3
                    ? `Showing ${trajectoryPoints.length} recorded ${
                        trajectoryPoints.length === 1 ? 'scan' : 'scans'
                      }. Risk trends will become clearer as more targets are analyzed.`
                    : `Latest ${trajectoryPoints.length} recorded scans scored 0–100`}
                </p>
              </div>
              <span className="rounded-lg bg-[#1B1B20] border border-siftrix-gold/45 px-3 py-1 text-xs font-semibold text-siftrix-champagne siftrix-tabular">
                {isDemoPreview ? 'Sample Avg Risk: ' : 'Avg Risk: '}
                {stats.averageScore}/100
              </span>
            </div>

            <svg
              viewBox="0 0 460 172"
              aria-label="Recent recorded scan risk score chart"
              className="w-full h-auto select-none"
            >
              <defs>
                <linearGradient id="dash-risk-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D8B56D" stopOpacity="0.34" />
                  <stop offset="100%" stopColor="#D8B56D" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Exact Y-Axis Gridlines & Aligned Labels (100, 75, 50, 25, 0) */}
              {Y_AXIS_LEVELS.map(({ score, y }) => (
                <g key={score}>
                  <text
                    x="28"
                    y={y + 3}
                    textAnchor="end"
                    fill="#8E897F"
                    fontSize="8.5"
                    fontFamily="monospace"
                  >
                    {score}
                  </text>
                  <line
                    x1="36"
                    y1={y}
                    x2="442"
                    y2={y}
                    stroke="#3E3C44"
                    strokeDasharray="3 4"
                    strokeWidth="1"
                  />
                </g>
              ))}

              {/* Subtle Vertical Dashed Drop-Stems from Each Scan Point to Baseline */}
              {trajectoryPoints.map((point) => (
                <line
                  key={`stem-${point.id}`}
                  x1={point.x}
                  y1={point.y}
                  x2={point.x}
                  y2={138}
                  stroke="#D8B56D"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                  opacity="0.45"
                />
              ))}

              {/* Shaded Area and Polyline connecting points */}
              {trajectoryPoints.length > 1 ? (
                <>
                  <path
                    d={`M ${trajectoryPoints[0].x} 138 L ${trajectoryPoints
                      .map((p) => `${p.x} ${p.y}`)
                      .join(' L ')} L ${trajectoryPoints[trajectoryPoints.length - 1].x} 138 Z`}
                    fill="url(#dash-risk-area)"
                  />
                  <polyline
                    fill="none"
                    stroke="#D8B56D"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={trajectoryPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                  />
                </>
              ) : null}

              {/* Circular Markers with Subtle Gold Halo / Outline and Score text */}
              {trajectoryPoints.map((point, index) => (
                <g key={point.id}>
                  {/* Subtle Gold Outer Halo/Glow */}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="8.5"
                    fill="none"
                    stroke="#D8B56D"
                    strokeWidth="1"
                    opacity="0.45"
                  />
                  {/* Main Marker Circle */}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="5.5"
                    fill="#15141A"
                    stroke={point.color}
                    strokeWidth="2.5"
                  />
                  {/* Inner Solid Center */}
                  <circle cx={point.x} cy={point.y} r="2" fill={point.color} />

                  {/* Score Label Above Point */}
                  <text
                    x={point.x}
                    y={point.y - 11}
                    textAnchor="middle"
                    fill="#FAF6EF"
                    fontSize="9.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {point.score}
                  </text>

                  {/* Short Scan Identifier / Timestamp Beneath Baseline */}
                  {trajectoryPoints.length <= 4 ? (
                    <>
                      <text
                        x={point.x}
                        y="152"
                        textAnchor="middle"
                        fill="#C8C1B6"
                        fontSize="8.5"
                        fontFamily="monospace"
                      >
                        Scan #{point.scanIndex}
                      </text>
                      {point.timeLabel ? (
                        <text
                          x={point.x}
                          y="163"
                          textAnchor="middle"
                          fill="#8E897F"
                          fontSize="7.5"
                          fontFamily="monospace"
                        >
                          {point.timeLabel}
                        </text>
                      ) : null}
                    </>
                  ) : (
                    <text
                      x={point.x}
                      y="154"
                      textAnchor="middle"
                      fill="#8E897F"
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      {point.timeLabel || `#${index + 1}`}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>

          {/* Verdict Distribution + Target Vector Breakdown */}
          <div className="min-w-0 lg:col-span-5 siftrix-card p-6 rounded-2xl flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="h-3.5 w-1 rounded-full bg-siftrix-gold" aria-hidden="true" />
                  <h3 className="text-base font-bold text-siftrix-charcoal">
                    Verdict Distribution
                  </h3>
                  {isDemoPreview ? (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-siftrix-gold/20 text-siftrix-antique-ink dark:text-siftrix-champagne border border-siftrix-gold/40">
                      Sample Preview
                    </span>
                  ) : null}
                </div>
                <span className="text-xs text-siftrix-muted-dark siftrix-tabular">
                  {stats.total} {isDemoPreview ? 'sample targets' : 'total'}
                </span>
              </div>

              <div
                role="img"
                aria-label={`Scan verdict breakdown: ${stats.safe} safe, ${stats.suspicious} suspicious, ${stats.malicious} malicious`}
                className="w-full h-3.5 bg-siftrix-pearl border border-siftrix-border rounded-full overflow-hidden flex"
              >
                {stats.safe > 0 ? (
                  <div
                    className="bg-emerald-600 h-full transition-all duration-300"
                    style={{ width: `${(stats.safe / stats.total) * 100}%` }}
                  />
                ) : null}
                {stats.suspicious > 0 ? (
                  <div
                    className="bg-amber-500 h-full transition-all duration-300"
                    style={{ width: `${(stats.suspicious / stats.total) * 100}%` }}
                  />
                ) : null}
                {stats.malicious > 0 ? (
                  <div
                    className="bg-red-600 h-full transition-all duration-300"
                    style={{ width: `${(stats.malicious / stats.total) * 100}%` }}
                  />
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-siftrix-muted-dark font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  Safe ({getPercent(stats.safe, stats.total)}%)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Suspicious ({getPercent(stats.suspicious, stats.total)}%)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                  Malicious ({getPercent(stats.malicious, stats.total)}%)
                </span>
              </div>
            </div>

            {/* Target Vector Breakdown */}
            <div className="pt-4 border-t border-siftrix-border space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-siftrix-antique-ink">
                  Target Mix
                </p>
                {isDemoPreview ? (
                  <span className="text-[10px] font-medium text-siftrix-muted">
                    Illustrative breakdown
                  </span>
                ) : null}
              </div>
              {(
                [
                  { label: 'URL Scans', count: stats.targetCounts.url },
                  { label: 'Message Scans', count: stats.targetCounts.message },
                  { label: 'Email Scans', count: stats.targetCounts.email },
                ] as const
              ).map((row) => (
                <div key={row.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-siftrix-graphite">{row.label}</span>
                    <span className="font-semibold text-siftrix-charcoal siftrix-tabular">
                      {row.count} ({getPercent(row.count, stats.total)}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-siftrix-pearl overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-siftrix-antique to-siftrix-champagne"
                      style={{ width: `${getPercent(row.count, stats.total)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Lower Two-Column Grid: Recent Scans + Quick Scan Action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Scans */}
        <div className="min-w-0 lg:col-span-2 siftrix-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-siftrix-border">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-siftrix-charcoal">Recent Scans</h3>
              {isDemoPreview ? (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                  Sample Data Feed
                </span>
              ) : null}
            </div>
            {!isLoading && scans.length > 0 ? (
              <span className="text-xs font-medium text-siftrix-muted-dark bg-siftrix-pearl px-2.5 py-0.5 rounded-md border border-siftrix-border">
                {isDemoPreview
                  ? `Sample Preview: Showing ${recentScans.length} of ${scans.length}`
                  : `Showing ${recentScans.length} of ${scans.length}`}
              </span>
            ) : null}
          </div>

          {/* Sample Data Feed Notice in Demo Mode */}
          {isDemoPreview && !isLoading ? (
            <div className="p-3.5 rounded-xl bg-siftrix-sand/30 dark:bg-[#1E1D24] border border-siftrix-gold/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-siftrix-champagne text-sm" aria-hidden="true">ℹ️</span>
                <span className="text-siftrix-graphite dark:text-[#E8E2D8] font-medium">
                  Showing simulated threat intelligence fixtures. Your scans will appear here automatically.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/scanner')}
                className="text-xs font-bold text-siftrix-antique-ink dark:text-siftrix-champagne hover:underline shrink-0 text-left cursor-pointer"
              >
                Run Live Scan →
              </button>
            </div>
          ) : null}

          {isLoading ? (
            <div className="space-y-3" aria-busy="true">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="p-4 rounded-xl siftrix-panel-inset animate-pulse space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-16 bg-siftrix-sand rounded-full" />
                    <div className="h-5 w-20 bg-siftrix-sand rounded-full" />
                  </div>
                  <div className="h-4 w-3/4 bg-siftrix-sand rounded" />
                  <div className="h-3 w-1/3 bg-siftrix-sand/70 rounded" />
                </div>
              ))}
            </div>
          ) : hasError && !isDemoPreview ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-sm font-semibold text-siftrix-graphite">
                Recent scans are unavailable
              </p>
              <p className="text-xs text-siftrix-muted-dark max-w-md mx-auto">
                Start the FastAPI backend service and click Retry Connection to load recorded scans from{' '}
                <code className="font-mono bg-siftrix-pearl px-1.5 py-0.5 rounded border border-siftrix-border text-siftrix-graphite">
                  GET /api/history
                </code>
                .
              </p>
            </div>
          ) : recentScans.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-base font-semibold text-siftrix-charcoal">
                No scans recorded yet
              </p>
              <p className="text-sm text-siftrix-muted-dark max-w-md mx-auto">
                Analyze a suspicious URL or message using the threat scanner to see live statistics and scan records here.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('/scanner')}
                className="inline-block siftrix-btn-gold px-5 py-2.5 rounded-xl text-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-siftrix-charcoal"
              >
                Run Your First Scan
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentScans.map((scan) => {
                const score = clampRiskScore(scan.overall_risk_score)
                const summaryPreview = scan.summary?.en?.trim()

                return (
                  <article
                    key={scan.id}
                    className="p-4 rounded-xl siftrix-panel-inset space-y-2.5 transition-colors hover:border-siftrix-gold/80"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <TargetTypeBadge targetType={scan.target_type} />
                        <VerdictBadge verdict={scan.verdict} withPrefix={false} />
                        <RiskLevelBadge riskLevel={scan.risk_level} withPrefix={false} />
                      </div>
                      <span className="text-xs font-bold text-siftrix-champagne bg-siftrix-charcoal dark:bg-siftrix-sand px-2.5 py-1 rounded-md border border-siftrix-charcoal-border dark:border-siftrix-gold/40 siftrix-tabular">
                        Risk: {score}/100
                      </span>
                    </div>

                    <p
                      className={`text-sm font-medium text-siftrix-charcoal line-clamp-2 ${
                        scan.target_type === 'url' ? 'font-mono break-all' : 'break-words'
                      }`}
                    >
                      {scan.target_content || 'No target content'}
                    </p>

                    {summaryPreview ? (
                      <p className="text-xs text-[#494641] dark:text-siftrix-muted-dark line-clamp-2">{summaryPreview}</p>
                    ) : null}

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-siftrix-muted-dark pt-1 border-t border-siftrix-border/70">
                      <div className="flex items-center gap-3">
                        <span>{formatTimestamp(scan.created_at)}</span>
                        <span className="font-mono text-siftrix-muted-dark">
                          ID: {scan.id.slice(0, 8)} {isDemoPreview ? '(Sample)' : ''}
                        </span>
                      </div>

                      <a
                        href={`/scans/${encodeURIComponent(scan.id)}`}
                        onClick={(e) =>
                          handleSpaLinkClick(
                            e,
                            onNavigate,
                            `/scans/${encodeURIComponent(scan.id)}`
                          )
                        }
                        className="font-semibold text-siftrix-antique-ink hover:text-siftrix-charcoal transition-colors"
                      >
                        Inspect Report →
                      </a>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Scan Action Panel (Deep Charcoal Anchor) */}
        <aside className="min-w-0 siftrix-card-charcoal p-6 rounded-2xl flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1B1B20] text-siftrix-champagne text-xs font-semibold border border-siftrix-gold/45">
              <span className="h-1.5 w-1.5 rounded-full bg-siftrix-champagne" aria-hidden="true" />
              Quick Action
            </span>
            <h3 className="text-lg font-bold text-siftrix-white dark:text-[#FAF6EF]">
              Analyze New Content
            </h3>
            <p className="text-sm text-[#C8C1B6] leading-relaxed">
              Submit suspicious links, SMS alerts, or phishing emails for real-time AI verdict scoring, bilingual summaries, and multi-agent inspection.
            </p>

            <ul className="space-y-2 text-xs text-siftrix-pearl dark:text-[#FAF6EF] pt-2">
              <li className="flex items-start gap-2">
                <span className="text-siftrix-champagne font-bold leading-tight select-none">✓</span>
                <span className="leading-tight">Automatic URL, message, and email triage</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-siftrix-champagne font-bold leading-tight select-none">✓</span>
                <span className="leading-tight">English and Urdu (اردو) threat guidance</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-siftrix-champagne font-bold leading-tight select-none">✓</span>
                <span className="leading-tight">URL, message, and security advisor signals</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => onNavigate('/scanner')}
              className="w-full siftrix-btn-gold py-3 px-4 rounded-xl text-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-siftrix-charcoal focus-visible:ring-siftrix-champagne"
            >
              Open Threat Scanner
            </button>

            <a
              href="/settings"
              onClick={(e) => handleSpaLinkClick(e, onNavigate, '/settings')}
              className="block w-full text-center py-2.5 px-4 rounded-xl siftrix-btn-charcoal-outline text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-champagne"
            >
              Preferences &amp; Diagnostics
            </a>
          </div>
        </aside>
      </div>
    </section>
  )
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [scans, setScans] = useState<ScanResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [healthState, setHealthState] = useState<BackendHealthState>('checking')
  const [isDemoPreview, setIsDemoPreview] = useState(false)
  const [demoPreviewReason, setDemoPreviewReason] = useState<DemoPreviewReason>('none')

  const applyDashboardResponses = useCallback(
    (
      scansRes: Awaited<ReturnType<typeof fetchScans>>,
      healthRes: Awaited<ReturnType<typeof checkBackendHealth>>
    ) => {
      const resolved = resolveDashboardData(scansRes, healthRes)
      setHealthState(resolved.healthState)
      setScans(resolved.scans)
      setIsDemoPreview(resolved.isDemoPreview)
      setDemoPreviewReason(resolved.demoPreviewReason)
      setErrorMessage(resolved.errorMessage)
      setIsLoading(false)
    },
    []
  )

  useEffect(() => {
    let cancelled = false

    async function loadInitialDashboard() {
      const [scansRes, healthRes] = await Promise.all([
        fetchScans(),
        checkBackendHealth(),
      ])

      if (cancelled) return
      applyDashboardResponses(scansRes, healthRes)
    }

    void loadInitialDashboard()

    return () => {
      cancelled = true
    }
  }, [applyDashboardResponses])

  const handleRefresh = async () => {
    if (isLoading) return
    setIsLoading(true)
    setHealthState('checking')
    setErrorMessage('')

    const [scansRes, healthRes] = await Promise.all([
      fetchScans(),
      checkBackendHealth(),
    ])
    applyDashboardResponses(scansRes, healthRes)
  }

  const hasError = Boolean(errorMessage)

  return (
    <DashboardContent
      scans={scans}
      isLoading={isLoading}
      hasError={hasError}
      errorMessage={errorMessage}
      healthState={healthState}
      isDemoPreview={isDemoPreview}
      demoPreviewReason={demoPreviewReason}
      onNavigate={onNavigate}
      onRefresh={() => void handleRefresh()}
    />
  )
}
