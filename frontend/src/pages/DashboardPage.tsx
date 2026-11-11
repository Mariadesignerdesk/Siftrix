import { useCallback, useEffect, useMemo, useState } from 'react'
import { checkBackendHealth, fetchScans, type ScanResponse } from '../services/api'
import { clampRiskScore, formatTimestamp } from '../utils/scanPresentation'
import type { NavigateFn } from '../utils/router'
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
}

function computeStats(scans: ScanResponse[]): DashboardStats {
  let safe = 0
  let suspicious = 0
  let malicious = 0

  for (const scan of scans) {
    if (scan.verdict === 'safe') safe += 1
    else if (scan.verdict === 'suspicious') suspicious += 1
    else if (scan.verdict === 'malicious') malicious += 1
  }

  return {
    total: scans.length,
    safe,
    suspicious,
    malicious,
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
        setErrorMessage(
          scansRes.error || 'Unable to retrieve scan statistics from the backend.'
        )
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
  const recentScans = useMemo(() => sortRecentScans(scans).slice(0, 5), [scans])
  const hasError = Boolean(errorMessage)

  const statCards = [
    {
      label: 'Total Scans',
      value: stats.total,
      subtext: stats.total === 1 ? '1 recorded analysis' : `${stats.total} recorded analyses`,
      accentClass: 'text-siftrix-royal',
      dotClass: 'bg-siftrix-electric shadow-[0_0_8px_#8B6DFF]',
    },
    {
      label: 'Safe',
      value: stats.safe,
      subtext: `${getPercent(stats.safe, stats.total)}% of total scans`,
      accentClass: 'text-emerald-700',
      dotClass: 'bg-emerald-600',
    },
    {
      label: 'Suspicious',
      value: stats.suspicious,
      subtext: `${getPercent(stats.suspicious, stats.total)}% of total scans`,
      accentClass: 'text-amber-700',
      dotClass: 'bg-amber-500',
    },
    {
      label: 'Malicious',
      value: stats.malicious,
      subtext: `${getPercent(stats.malicious, stats.total)}% of total scans`,
      accentClass: 'text-red-700',
      dotClass: 'bg-red-600',
    },
  ]

  const healthBadgeConfig: Record<
    BackendHealthState,
    { label: string; badgeClass: string; dotClass: string }
  > = {
    checking: {
      label: 'Checking API...',
      badgeClass: 'bg-siftrix-royal/80 text-siftrix-soft border-siftrix-lavender/40',
      dotClass: 'bg-siftrix-lavender animate-pulse',
    },
    online: {
      label: 'Backend Online',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotClass: 'bg-emerald-600',
    },
    offline: {
      label: 'Backend Offline',
      badgeClass: 'bg-red-50 text-red-700 border-red-200',
      dotClass: 'bg-red-600',
    },
  }

  const currentHealth = healthBadgeConfig[healthState]

  return (
    <section
      aria-label="Security Dashboard"
      className="px-6 md:px-10 py-10 md:py-14 max-w-6xl mx-auto space-y-8"
    >
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-siftrix-lavender">
            Threat Intelligence Overview
          </p>
          <h2 className="text-3xl font-bold text-siftrix-soft mt-1">
            Security Dashboard
          </h2>
          <p className="text-siftrix-lavender/90 text-sm md:text-base mt-1">
            Monitor scan statistics, recent threat assessments, and backend availability.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            role="status"
            aria-live="polite"
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border ${currentHealth.badgeClass}`}
          >
            <span className={`w-2 h-2 rounded-full ${currentHealth.dotClass}`} />
            {currentHealth.label}
          </span>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => void handleRefresh()}
            aria-label="Refresh dashboard scan data"
            className="px-4 py-2 rounded-lg siftrix-btn-dark-secondary disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/', 'scan')}
            className="siftrix-btn-primary px-5 py-2 rounded-lg text-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-siftrix-navy focus-visible:ring-siftrix-electric"
          >
            + New Scan
          </button>
        </div>
      </div>

      {/* Explicit Backend Error Alert */}
      {!isLoading && hasError ? (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="space-y-1 text-sm">
            <p className="font-bold">Could not load backend scan data</p>
            <p className="text-red-700">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold cursor-pointer shrink-0 self-start sm:self-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
          >
            Retry Connection
          </button>
        </div>
      ) : null}

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="siftrix-card-3d siftrix-card-3d-hover p-6 rounded-2xl flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-siftrix-royal">{card.label}</span>
              <span className={`w-2.5 h-2.5 rounded-full ${card.dotClass}`} />
            </div>

            {isLoading ? (
              <div className="mt-4 space-y-2 animate-pulse" aria-busy="true">
                <div className="h-8 w-16 bg-siftrix-lavender/60 rounded" />
                <div className="h-3 w-28 bg-siftrix-lavender/40 rounded" />
              </div>
            ) : hasError ? (
              <div className="mt-4">
                <p className="text-3xl font-bold text-siftrix-royal/70">—</p>
                <p className="text-xs text-siftrix-royal/80 mt-1">Unavailable while backend is offline</p>
              </div>
            ) : (
              <div className="mt-4">
                <p className={`text-3xl font-bold ${card.accentClass}`}>{card.value}</p>
                <p className="text-xs text-siftrix-royal mt-1">{card.subtext}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Verdict Distribution Bar (when live scans exist) */}
      {!isLoading && !hasError && stats.total > 0 ? (
        <div className="siftrix-card-3d p-5 md:p-6 rounded-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-base font-bold text-siftrix-navy">Verdict Distribution</h3>
            <div className="flex flex-wrap items-center gap-4 text-xs text-siftrix-royal font-medium">
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

          <div
            role="img"
            aria-label={`Scan verdict breakdown: ${stats.safe} safe, ${stats.suspicious} suspicious, ${stats.malicious} malicious`}
            className="w-full h-3 bg-siftrix-navy/15 rounded-full overflow-hidden flex"
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
        </div>
      ) : null}

      {/* Lower Two-Column Grid: Recent Scans + Quick Scan Action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Scans */}
        <div className="lg:col-span-2 siftrix-card-3d p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-siftrix-lavender/80">
            <h3 className="text-lg font-bold text-siftrix-navy">Recent Scans</h3>
            {!isLoading && !hasError && scans.length > 0 ? (
              <span className="text-xs font-medium text-siftrix-royal">
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
                    <div className="h-5 w-16 bg-siftrix-lavender/60 rounded-full" />
                    <div className="h-5 w-20 bg-siftrix-lavender/60 rounded-full" />
                  </div>
                  <div className="h-4 w-3/4 bg-siftrix-lavender/60 rounded" />
                  <div className="h-3 w-1/3 bg-siftrix-lavender/60 rounded" />
                </div>
              ))}
            </div>
          ) : hasError ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-sm font-semibold text-siftrix-navy">
                Recent scans are unavailable
              </p>
              <p className="text-xs text-siftrix-royal max-w-md mx-auto">
                Start the FastAPI backend service and click Retry Connection to load recorded scans from <code className="font-mono bg-siftrix-royal/12 px-1 py-0.5 rounded">GET /api/scans</code>.
              </p>
            </div>
          ) : recentScans.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-base font-semibold text-siftrix-navy">
                No scans recorded yet
              </p>
              <p className="text-sm text-siftrix-royal max-w-md mx-auto">
                Analyze a suspicious URL or message using the threat scanner to see live statistics and scan records here.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('/', 'scan')}
                className="inline-block siftrix-btn-primary px-5 py-2.5 rounded-lg text-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-siftrix-electric"
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
                    className="p-4 rounded-xl siftrix-panel-inset space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <TargetTypeBadge targetType={scan.target_type} />
                        <VerdictBadge verdict={scan.verdict} withPrefix={false} />
                        <RiskLevelBadge riskLevel={scan.risk_level} withPrefix={false} />
                      </div>
                      <span className="text-xs font-bold text-siftrix-navy bg-siftrix-soft px-2.5 py-1 rounded-md border border-siftrix-lavender">
                        Risk: {score}/100
                      </span>
                    </div>

                    <p
                      className={`text-sm font-medium text-siftrix-navy line-clamp-2 ${
                        scan.target_type === 'url' ? 'break-all' : 'break-words'
                      }`}
                    >
                      {scan.target_content || 'No target content'}
                    </p>

                    {summaryPreview ? (
                      <p className="text-xs text-siftrix-royal line-clamp-2">{summaryPreview}</p>
                    ) : null}

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-siftrix-royal/85 pt-1">
                      <span>{formatTimestamp(scan.created_at)}</span>
                      <span className="font-mono text-siftrix-royal/75">
                        ID: {scan.id.slice(0, 8)}
                      </span>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Scan Action Panel */}
        <aside className="siftrix-card-3d p-6 rounded-2xl flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <span className="inline-block px-2.5 py-1 rounded-md bg-siftrix-royal text-siftrix-soft text-xs font-semibold border border-siftrix-electric/45">
              Quick Action
            </span>
            <h3 className="text-lg font-bold text-siftrix-navy">
              Analyze New Content
            </h3>
            <p className="text-sm text-siftrix-royal leading-relaxed">
              Submit suspicious links, SMS alerts, or phishing messages for real-time AI verdict scoring, bilingual summaries, and multi-agent inspection.
            </p>

            <ul className="space-y-2 text-xs text-siftrix-navy pt-2">
              <li className="flex items-start gap-2">
                <span className="text-siftrix-royal font-bold">✓</span>
                <span>Automatic URL and message classification</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-siftrix-royal font-bold">✓</span>
                <span>English and Urdu threat guidance</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-siftrix-royal font-bold">✓</span>
                <span>URL, message, and security advisor signals</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('/', 'scan')}
            className="w-full siftrix-btn-primary py-3 px-4 rounded-xl text-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-siftrix-electric"
          >
            Open Threat Scanner
          </button>
        </aside>
      </div>
    </section>
  )
}
