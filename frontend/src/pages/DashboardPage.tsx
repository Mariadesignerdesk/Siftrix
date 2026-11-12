import { useCallback, useEffect, useMemo, useState } from 'react'
import { checkBackendHealth, fetchScans, type ScanResponse } from '../services/api'
import { isMissingSessionUnauthorized } from '../utils/session'
import { clampRiskScore, formatTimestamp } from '../utils/scanPresentation'
import { handleSpaLinkClick, type NavigateFn } from '../utils/router'
import { RiskLevelBadge, TargetTypeBadge, VerdictBadge } from '../components/ScanBadges'

interface DashboardPageProps {
  onNavigate: NavigateFn
}

type BackendHealthState = 'checking' | 'online' | 'offline'

interface DashboardStats {
  total: number
  safe: number
  suspicious: number
  malicious: number
  averageScore: number
  targetCounts: {
    url: number
    message: number
    email: number
  }
}

function computeStats(scans: ScanResponse[]): DashboardStats {
  let safe = 0
  let suspicious = 0
  let malicious = 0
  let totalScore = 0
  let url = 0
  let message = 0
  let email = 0

  for (const scan of scans) {
    if (scan.verdict === 'safe') safe += 1
    else if (scan.verdict === 'suspicious') suspicious += 1
    else if (scan.verdict === 'malicious') malicious += 1

    totalScore += clampRiskScore(scan.overall_risk_score)

    if (scan.target_type === 'url') url += 1
    else if (scan.target_type === 'email') email += 1
    else message += 1
  }

  return {
    total: scans.length,
    safe,
    suspicious,
    malicious,
    averageScore: scans.length > 0 ? Math.round(totalScore / scans.length) : 0,
    targetCounts: { url, message, email },
  }
}

function getPercent(count: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((count / total) * 100)
}

function sortRecentScans(scans: ScanResponse[]): ScanResponse[] {
  return [...scans].sort((a, b) => {
    const timeA = Date.parse(a.created_at || '')
    const timeB = Date.parse(b.created_at || '')
    if (Number.isNaN(timeA) && Number.isNaN(timeB)) return 0
    if (Number.isNaN(timeA)) return 1
    if (Number.isNaN(timeB)) return -1
    return timeB - timeA
  })
}

function getPointStrokeColor(verdict: ScanResponse['verdict']): string {
  if (verdict === 'safe') return '#10B981'
  if (verdict === 'suspicious') return '#F59E0B'
  return '#EF4444'
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [scans, setScans] = useState<ScanResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [healthState, setHealthState] = useState<BackendHealthState>('checking')

  const applyDashboardResponses = useCallback(
    (
      scansRes: Awaited<ReturnType<typeof fetchScans>>,
      healthRes: Awaited<ReturnType<typeof checkBackendHealth>>
    ) => {
      setHealthState(healthRes.ok ? 'online' : 'offline')

      if (!scansRes.ok || !scansRes.data) {
        setScans([])
        if (isMissingSessionUnauthorized(scansRes.status)) {
          setErrorMessage('')
        } else {
          setErrorMessage(
            scansRes.error || 'Unable to retrieve scan statistics from the backend.'
          )
        }
      } else {
        setScans(scansRes.data)
        setErrorMessage('')
      }
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

  const stats = useMemo(() => computeStats(scans), [scans])
  const sortedScans = useMemo(() => sortRecentScans(scans), [scans])
  const recentScans = useMemo(() => sortedScans.slice(0, 5), [sortedScans])

  const trajectoryPoints = useMemo(() => {
    const windowScans = sortedScans.slice(0, 10).reverse()
    if (windowScans.length === 0) return []
    const width = 460
    const leftPad = 24
    const usableWidth = width - leftPad * 2
    const minY = 26
    const maxY = 138
    const spanY = maxY - minY

    return windowScans.map((scan, index) => {
      const x =
        windowScans.length === 1
          ? width / 2
          : leftPad + (index / (windowScans.length - 1)) * usableWidth
      const score = clampRiskScore(scan.overall_risk_score)
      const y = maxY - (score / 100) * spanY
      return {
        id: scan.id,
        x: Math.round(x),
        y: Math.round(y),
        score,
        color: getPointStrokeColor(scan.verdict),
      }
    })
  }, [sortedScans])

  const hasError = Boolean(errorMessage)

  const statCards = [
    {
      label: 'Total Scans',
      value: stats.total,
      subtext: stats.total === 1 ? '1 recorded analysis' : `${stats.total} recorded analyses`,
      surface: 'dark' as const,
      accentClass: 'text-siftrix-champagne',
      dotClass: 'bg-siftrix-champagne',
    },
    {
      label: 'Safe',
      value: stats.safe,
      subtext: `${getPercent(stats.safe, stats.total)}% of total scans`,
      surface: 'light' as const,
      accentClass: 'text-emerald-700',
      dotClass: 'bg-emerald-600',
    },
    {
      label: 'Suspicious',
      value: stats.suspicious,
      subtext: `${getPercent(stats.suspicious, stats.total)}% of total scans`,
      surface: 'light' as const,
      accentClass: 'text-amber-700',
      dotClass: 'bg-amber-500',
    },
    {
      label: 'Malicious',
      value: stats.malicious,
      subtext: `${getPercent(stats.malicious, stats.total)}% of total scans`,
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
      badgeClass: 'bg-siftrix-charcoal-soft text-siftrix-beige border-[#494750]',
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
          <h2 className="text-3xl sm:text-4xl font-bold text-siftrix-white mt-1.5 tracking-tight">
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
            onClick={() => void handleRefresh()}
            aria-label="Refresh dashboard scan data"
            className="px-4 py-2 rounded-xl siftrix-btn-charcoal-outline disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-champagne"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/', 'scan')}
            className="siftrix-btn-gold px-5 py-2 rounded-xl text-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-siftrix-charcoal focus-visible:ring-siftrix-champagne"
          >
            + New Scan
          </button>
        </div>
      </div>

      {/* Explicit Backend Error Alert */}
      {!isLoading && hasError ? (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-900 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="space-y-1 text-sm">
            <p className="font-bold">Could not load backend scan data</p>
            <p className="text-red-700">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleRefresh()}
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
                <span
                  className={`text-sm font-semibold ${
                    isDark ? 'text-siftrix-pearl' : 'text-siftrix-muted-dark'
                  }`}
                >
                  {card.label}
                </span>
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
              ) : hasError ? (
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
                      isDark ? 'text-[#C8C1B6]' : 'text-siftrix-muted-dark'
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

      {/* Gold-Accented Analytics & Verdict Distribution (Rendered Only When Real Scans Exist) */}
      {!isLoading && !hasError && stats.total > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Champagne Gold Trajectory Area Chart from Real Recorded Scans */}
          <div className="min-w-0 lg:col-span-7 siftrix-card-charcoal rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-siftrix-charcoal-border">
              <div>
                <h3 className="text-base font-bold text-siftrix-white">
                  Recent Risk Trajectory
                </h3>
                <p className="text-xs text-[#BFB8AC]">
                  Latest {trajectoryPoints.length} recorded {trajectoryPoints.length === 1 ? 'scan' : 'scans'} scored 0–100
                </p>
              </div>
              <span className="rounded-lg bg-[#1B1B20] border border-siftrix-gold/45 px-3 py-1 text-xs font-semibold text-siftrix-champagne siftrix-tabular">
                Avg Risk: {stats.averageScore}/100
              </span>
            </div>

            <svg
              viewBox="0 0 460 160"
              aria-label="Recent recorded scan risk score chart"
              className="w-full h-auto"
            >
              <defs>
                <linearGradient id="dash-risk-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D8B56D" stopOpacity="0.34" />
                  <stop offset="100%" stopColor="#D8B56D" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {[26, 63, 100, 138].map((y) => (
                <line
                  key={y}
                  x1="18"
                  y1={y}
                  x2="442"
                  y2={y}
                  stroke="#3E3C44"
                  strokeDasharray="3 4"
                  strokeWidth="1"
                />
              ))}

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

              {trajectoryPoints.map((point) => (
                <g key={point.id}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    fill="#1B1B20"
                    stroke={point.color}
                    strokeWidth="2.25"
                  />
                  <text
                    x={point.x}
                    y={point.y - 10}
                    textAnchor="middle"
                    fill="#EDE6DA"
                    fontSize="9.5"
                    fontFamily="monospace"
                  >
                    {point.score}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Verdict Distribution + Target Vector Breakdown */}
          <div className="min-w-0 lg:col-span-5 siftrix-card p-6 rounded-2xl flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="h-3.5 w-1 rounded-full bg-siftrix-gold" aria-hidden="true" />
                  <h3 className="text-base font-bold text-siftrix-charcoal">
                    Verdict Distribution
                  </h3>
                </div>
                <span className="text-xs text-siftrix-muted-dark siftrix-tabular">
                  {stats.total} total
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
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-siftrix-antique-ink">
                Target Mix
              </p>
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
            <h3 className="text-lg font-bold text-siftrix-charcoal">Recent Scans</h3>
            {!isLoading && !hasError && scans.length > 0 ? (
              <span className="text-xs font-medium text-siftrix-muted-dark bg-siftrix-pearl px-2.5 py-0.5 rounded-md border border-siftrix-border">
                Showing {recentScans.length} of {scans.length}
              </span>
            ) : null}
          </div>

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
          ) : hasError ? (
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
                onClick={() => onNavigate('/', 'scan')}
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
                      <span className="text-xs font-bold text-siftrix-champagne bg-siftrix-charcoal px-2.5 py-1 rounded-md border border-siftrix-charcoal-border siftrix-tabular">
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
                      <p className="text-xs text-[#494641] line-clamp-2">{summaryPreview}</p>
                    ) : null}

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-siftrix-muted-dark pt-1 border-t border-siftrix-border/70">
                      <div className="flex items-center gap-3">
                        <span>{formatTimestamp(scan.created_at)}</span>
                        <span className="font-mono text-siftrix-muted-dark">
                          ID: {scan.id.slice(0, 8)}
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
            <h3 className="text-lg font-bold text-siftrix-white">
              Analyze New Content
            </h3>
            <p className="text-sm text-[#C8C1B6] leading-relaxed">
              Submit suspicious links, SMS alerts, or phishing emails for real-time AI verdict scoring, bilingual summaries, and multi-agent inspection.
            </p>

            <ul className="space-y-2 text-xs text-siftrix-pearl pt-2">
              <li className="flex items-start gap-2">
                <span className="text-siftrix-champagne font-bold">✓</span>
                <span>Automatic URL, message, and email triage</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-siftrix-champagne font-bold">✓</span>
                <span>English and Urdu (اردو) threat guidance</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-siftrix-champagne font-bold">✓</span>
                <span>URL, message, and security advisor signals</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => onNavigate('/', 'scan')}
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
