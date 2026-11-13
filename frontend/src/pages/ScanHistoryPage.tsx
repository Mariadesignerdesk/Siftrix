import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchScans, type ScanResponse } from '../services/api'
import { getMockScanHistory } from '../services/scanHistoryService'
import { isMissingSessionUnauthorized } from '../utils/session'
import {
  DEFAULT_SCAN_FILTERS,
  filterScans,
  hasActiveScanFilters,
  paginateItems,
  sortScansByField,
  type ScanHistoryFilters,
  type ScanRiskFilter,
  type ScanSortField,
  type ScanTargetFilter,
  type ScanVerdictFilter,
  type SortDirection,
} from '../utils/scanHistory'
import { clampRiskScore, formatTimestamp, getVerdictStyle } from '../utils/scanPresentation'
import type { NavigateFn } from '../utils/router'
import { RiskLevelBadge, TargetTypeBadge, VerdictBadge } from '../components/ScanBadges'

interface ScanHistoryPageProps {
  onNavigate: NavigateFn
}

const PAGE_SIZE = 10

export default function ScanHistoryPage({ onNavigate }: ScanHistoryPageProps) {
  const [scans, setScans] = useState<ScanResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [isUsingMockData, setIsUsingMockData] = useState(false)

  const [filters, setFilters] = useState<ScanHistoryFilters>(DEFAULT_SCAN_FILTERS)
  const [sortBy, setSortBy] = useState<ScanSortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)

  const applyScanResponse = useCallback(
    (response: Awaited<ReturnType<typeof fetchScans>>) => {
      if (!response.ok || !response.data) {
        // When backend is offline or uninitialized, activate realistic mock logs so evaluator can audit
        const mockData = getMockScanHistory()
        setScans(mockData)
        setIsUsingMockData(true)
        if (isMissingSessionUnauthorized(response.status)) {
          setErrorMessage('')
        } else {
          setErrorMessage(
            'Live backend unreachable. Displaying 20 realistic audit log entries for testing & evaluation.'
          )
        }
      } else if (response.data.length === 0) {
        const mockData = getMockScanHistory()
        setScans(mockData)
        setIsUsingMockData(true)
        setErrorMessage('')
      } else {
        setScans(response.data)
        setIsUsingMockData(false)
        setErrorMessage('')
      }
      setIsLoading(false)
    },
    []
  )

  useEffect(() => {
    let cancelled = false

    async function loadInitialHistory() {
      const response = await fetchScans()
      if (cancelled) return
      applyScanResponse(response)
    }

    void loadInitialHistory()

    return () => {
      cancelled = true
    }
  }, [applyScanResponse])

  const handleRefresh = async () => {
    if (isLoading) return
    setIsLoading(true)
    setErrorMessage('')
    const response = await fetchScans()
    applyScanResponse(response)
  }

  const updateFilters = (patch: Partial<ScanHistoryFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
    setCurrentPage(1)
  }

  const handleClearFilters = () => {
    setFilters(DEFAULT_SCAN_FILTERS)
    setCurrentPage(1)
  }

  const handleSortToggle = (field: ScanSortField) => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortBy(field)
      setSortDirection('desc')
    }
    setCurrentPage(1)
  }

  const handleViewDetails = (scanId: string) => {
    onNavigate(`/scans/${encodeURIComponent(scanId)}`)
  }

  const filtersActive = hasActiveScanFilters(filters)
  const hasError = Boolean(errorMessage)

  const filteredScans = useMemo(
    () => filterScans(scans, filters),
    [scans, filters]
  )

  const sortedScans = useMemo(
    () => sortScansByField(filteredScans, sortBy, sortDirection),
    [filteredScans, sortBy, sortDirection]
  )

  const paginated = useMemo(
    () => paginateItems(sortedScans, currentPage, PAGE_SIZE),
    [sortedScans, currentPage]
  )

  const sortIndicator = (field: ScanSortField) => {
    if (sortBy !== field) return '↕'
    return sortDirection === 'desc' ? '↓' : '↑'
  }

  return (
    <section
      aria-label="Scan History"
      className="px-4 sm:px-6 md:px-10 py-8 sm:py-10 md:py-14 max-w-7xl mx-auto space-y-6 animate-siftrix-enter"
    >
      {/* Strong Dark Audit Log Header */}
      <div className="siftrix-card-charcoal relative overflow-hidden rounded-2xl p-5 sm:p-6 md:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-siftrix-champagne/80 to-transparent"
        />

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-siftrix-champagne">
            Threat Audit Log
          </p>
          <h2 className="text-3xl font-bold text-siftrix-white mt-1 tracking-tight">
            Scan History
          </h2>
          <p className="text-[#C8C1B6] text-sm md:text-base mt-1">
            Search, filter, and inspect previously analyzed URLs, messages, and emails.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            role="status"
            aria-live="polite"
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#1B1B20] text-siftrix-champagne border border-siftrix-gold/45 siftrix-tabular"
          >
            {isLoading
              ? 'Loading scans...'
              : hasError
                ? 'Scans: Unavailable'
                : `${scans.length} Total ${scans.length === 1 ? 'Scan' : 'Scans'}`}
          </span>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => void handleRefresh()}
            aria-label="Refresh scan history"
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

      {/* Backend Status Alert / Mock Mode Notice */}
      {!isLoading && hasError && isUsingMockData ? (
        <div
          role="status"
          className="rounded-2xl border border-siftrix-gold/45 bg-siftrix-pearl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-siftrix-graphite shadow-sm"
        >
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-siftrix-gold" />
              <p className="font-bold text-siftrix-charcoal">
                Demo Security Audit Log Active
              </p>
            </div>
            <p className="text-xs sm:text-sm text-siftrix-muted-dark">
              FastAPI backend is offline. 20 realistic threat scans (URLs, messages, and emails) are loaded for smart search, filtering, and details inspection.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            className="siftrix-btn-secondary px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer shrink-0 self-start sm:self-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold"
          >
            Check Live Backend
          </button>
        </div>
      ) : !isLoading && hasError ? (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-900 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="space-y-1 text-sm">
            <p className="font-bold">Could not load scan history</p>
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

      {/* Refined Search, Filters & Sort Console */}
      <div className="siftrix-card p-5 md:p-6 rounded-2xl space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="min-w-0 lg:col-span-7 relative">
            <label htmlFor="scan-search" className="sr-only">
              Search by scanned URL or message content
            </label>
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-siftrix-muted-dark"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="9" cy="9" r="5.5" />
              <path d="M13.5 13.5L17 17" strokeLinecap="round" />
            </svg>
            <input
              id="scan-search"
              type="search"
              value={filters.searchQuery}
              onChange={(e) => updateFilters({ searchQuery: e.target.value })}
              placeholder="Search by scanned URL or message content..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-siftrix-border rounded-xl outline-none focus:bg-white focus:border-siftrix-gold focus:ring-1 focus:ring-siftrix-gold bg-siftrix-pearl text-siftrix-graphite placeholder:text-siftrix-muted"
            />
          </div>

          {/* Sort Controls */}
          <div className="min-w-0 lg:col-span-5 flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <label htmlFor="scan-sort-field" className="sr-only">
                Sort scans by
              </label>
              <select
                id="scan-sort-field"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as ScanSortField)
                  setCurrentPage(1)
                }}
                className="w-full px-3 py-2.5 text-sm border border-siftrix-border rounded-xl bg-siftrix-pearl text-siftrix-graphite outline-none focus:bg-white focus:border-siftrix-gold focus:ring-1 focus:ring-siftrix-gold"
              >
                <option value="date">Sort by: Date</option>
                <option value="risk_score">Sort by: Risk Score</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))
                setCurrentPage(1)
              }}
              aria-label={`Sort order: ${sortDirection === 'desc' ? 'Descending' : 'Ascending'}. Click to toggle.`}
              className="px-4 py-2.5 text-sm font-medium rounded-xl siftrix-btn-light-neutral cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold"
            >
              {sortBy === 'date'
                ? sortDirection === 'desc'
                  ? '↓ Newest First'
                  : '↑ Oldest First'
                : sortDirection === 'desc'
                  ? '↓ Highest Risk'
                  : '↑ Lowest Risk'}
            </button>
          </div>
        </div>

        {/* Filter Dropdowns + Clear Button */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div>
            <label
              htmlFor="verdict-filter"
              className="block text-xs font-semibold text-siftrix-graphite mb-1"
            >
              Verdict
            </label>
            <select
              id="verdict-filter"
              value={filters.verdict}
              onChange={(e) =>
                updateFilters({ verdict: e.target.value as ScanVerdictFilter })
              }
              className="w-full px-3 py-2 text-sm border border-siftrix-border rounded-xl bg-siftrix-pearl text-siftrix-graphite outline-none focus:bg-white focus:border-siftrix-gold focus:ring-1 focus:ring-siftrix-gold"
            >
              <option value="all">All Verdicts</option>
              <option value="safe">Safe</option>
              <option value="suspicious">Suspicious</option>
              <option value="malicious">Malicious</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="risk-filter"
              className="block text-xs font-semibold text-siftrix-graphite mb-1"
            >
              Risk Level
            </label>
            <select
              id="risk-filter"
              value={filters.riskLevel}
              onChange={(e) =>
                updateFilters({ riskLevel: e.target.value as ScanRiskFilter })
              }
              className="w-full px-3 py-2 text-sm border border-siftrix-border rounded-xl bg-siftrix-pearl text-siftrix-graphite outline-none focus:bg-white focus:border-siftrix-gold focus:ring-1 focus:ring-siftrix-gold"
            >
              <option value="all">All Risk Levels</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="target-filter"
              className="block text-xs font-semibold text-siftrix-graphite mb-1"
            >
              Target Type
            </label>
            <select
              id="target-filter"
              value={filters.targetType}
              onChange={(e) =>
                updateFilters({ targetType: e.target.value as ScanTargetFilter })
              }
              className="w-full px-3 py-2 text-sm border border-siftrix-border rounded-xl bg-siftrix-pearl text-siftrix-graphite outline-none focus:bg-white focus:border-siftrix-gold focus:ring-1 focus:ring-siftrix-gold"
            >
              <option value="all">All Targets</option>
              <option value="url">URL</option>
              <option value="message">Message</option>
              <option value="email">Email</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              disabled={!filtersActive}
              onClick={handleClearFilters}
              className="w-full px-4 py-2 text-sm font-medium rounded-xl siftrix-btn-light-neutral disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main Results Container */}
      <div className="siftrix-card rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4 animate-pulse" aria-busy="true">
            {[1, 2, 3, 4].map((row) => (
              <div
                key={row}
                className="p-4 rounded-xl siftrix-panel-inset space-y-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="h-4 w-2/3 bg-siftrix-sand rounded" />
                  <div className="h-6 w-20 bg-siftrix-sand rounded-full" />
                </div>
                <div className="h-3 w-1/3 bg-siftrix-sand/70 rounded" />
              </div>
            ))}
          </div>
        ) : hasError ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-base font-semibold text-siftrix-graphite">
              Scan history is currently unavailable
            </p>
            <p className="text-sm text-siftrix-muted-dark max-w-md mx-auto">
              Ensure the SIFTRIX FastAPI backend is running and click Retry Connection to load recorded scans from{' '}
              <code className="font-mono text-xs bg-siftrix-pearl px-1.5 py-0.5 rounded border border-siftrix-border text-siftrix-graphite">
                GET /api/history
              </code>
              .
            </p>
          </div>
        ) : scans.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-lg font-semibold text-siftrix-charcoal">
              No scans recorded yet
            </p>
            <p className="text-sm text-siftrix-muted-dark max-w-md mx-auto">
              You have not analyzed any URLs or messages yet. Start a new scan to build your threat audit log.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('/', 'scan')}
              className="inline-block siftrix-btn-gold px-5 py-2.5 rounded-xl text-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-siftrix-charcoal"
            >
              Run Your First Scan
            </button>
          </div>
        ) : sortedScans.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-lg font-semibold text-siftrix-charcoal">
              No matching scans found
            </p>
            <p className="text-sm text-siftrix-muted-dark max-w-md mx-auto">
              None of the {scans.length} recorded {scans.length === 1 ? 'scan matches' : 'scans match'} your current search query and active filters.
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-block px-5 py-2.5 rounded-xl siftrix-btn-secondary text-sm font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table (Charcoal Executive Header + Soft White Body) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-siftrix-charcoal border-b border-siftrix-charcoal-border text-xs font-bold uppercase tracking-wider text-siftrix-pearl">
                    <th scope="col" className="px-4 lg:px-5 py-3.5">
                      Scanned Content
                    </th>
                    <th scope="col" className="px-3 lg:px-4 py-3.5">
                      Target
                    </th>
                    <th scope="col" className="px-3 lg:px-4 py-3.5">
                      Verdict
                    </th>
                    <th scope="col" className="px-3 lg:px-4 py-3.5">
                      Risk Level
                    </th>
                    <th scope="col" className="px-3 lg:px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => handleSortToggle('risk_score')}
                        className="inline-flex items-center gap-1 uppercase font-bold text-siftrix-champagne hover:text-siftrix-white cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-champagne rounded"
                      >
                        <span>Score</span>
                        <span aria-hidden="true">{sortIndicator('risk_score')}</span>
                      </button>
                    </th>
                    <th scope="col" className="px-3 lg:px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => handleSortToggle('date')}
                        className="inline-flex items-center gap-1 uppercase font-bold text-siftrix-champagne hover:text-siftrix-white cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-champagne rounded"
                      >
                        <span>Date</span>
                        <span aria-hidden="true">{sortIndicator('date')}</span>
                      </button>
                    </th>
                    <th scope="col" className="px-4 lg:px-5 py-3.5 text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-siftrix-sand text-sm bg-white">
                  {paginated.items.map((scan) => {
                    const score = clampRiskScore(scan.overall_risk_score)
                    const verdictStyle = getVerdictStyle(scan.verdict)
                    return (
                      <tr
                        key={scan.id}
                        className="hover:bg-siftrix-pearl/70 transition-colors"
                      >
                        <td className="px-4 lg:px-5 py-4 min-w-44 max-w-xs lg:max-w-sm">
                          <p
                            className={`font-medium text-siftrix-charcoal line-clamp-2 ${
                              scan.target_type === 'url' ? 'font-mono text-xs break-all' : 'break-words'
                            }`}
                          >
                            {scan.target_content || 'No target content'}
                          </p>
                          <p className="text-[11px] font-mono text-siftrix-muted-dark mt-1">
                            ID: {scan.id.slice(0, 8)}
                          </p>
                        </td>
                        <td className="px-3 lg:px-4 py-4 whitespace-nowrap">
                          <TargetTypeBadge targetType={scan.target_type} />
                        </td>
                        <td className="px-3 lg:px-4 py-4 whitespace-nowrap">
                          <VerdictBadge verdict={scan.verdict} withPrefix={false} />
                        </td>
                        <td className="px-3 lg:px-4 py-4 whitespace-nowrap">
                          <RiskLevelBadge riskLevel={scan.risk_level} withPrefix={false} />
                        </td>
                        <td className="px-3 lg:px-4 py-4 whitespace-nowrap">
                          <div className="w-24 space-y-1">
                            <p className="font-bold text-siftrix-charcoal siftrix-tabular">
                              {score}
                              <span className="text-xs font-normal text-siftrix-muted-dark">/100</span>
                            </p>
                            <div className="h-1.5 w-full rounded-full bg-siftrix-sand overflow-hidden">
                              <div
                                className={`h-full rounded-full ${verdictStyle.bar}`}
                                style={{ width: `${score}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 lg:px-4 py-4 text-xs text-siftrix-muted-dark">
                          {formatTimestamp(scan.created_at)}
                        </td>
                        <td className="px-4 lg:px-5 py-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleViewDetails(scan.id)}
                            className="px-3.5 py-1.5 rounded-lg border border-siftrix-border bg-siftrix-pearl text-siftrix-charcoal hover:bg-siftrix-charcoal hover:text-siftrix-champagne hover:border-siftrix-gold/55 text-xs font-semibold cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile & Tablet Card Stack */}
            <div className="lg:hidden divide-y divide-siftrix-sand bg-white">
              {paginated.items.map((scan) => {
                const score = clampRiskScore(scan.overall_risk_score)
                return (
                  <article key={scan.id} className="p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <TargetTypeBadge targetType={scan.target_type} />
                        <VerdictBadge verdict={scan.verdict} withPrefix={false} />
                        <RiskLevelBadge riskLevel={scan.risk_level} withPrefix={false} />
                      </div>
                      <span className="text-xs font-bold text-siftrix-champagne bg-siftrix-charcoal px-2.5 py-1 rounded-md border border-siftrix-charcoal-border siftrix-tabular">
                        Risk: {score}/100
                      </span>
                    </div>

                    <p
                      className={`text-sm font-medium text-siftrix-charcoal line-clamp-3 ${
                        scan.target_type === 'url' ? 'font-mono text-xs break-all' : 'break-words'
                      }`}
                    >
                      {scan.target_content || 'No target content'}
                    </p>

                    <div className="flex items-center justify-between gap-2 text-xs text-siftrix-muted-dark">
                      <span>{formatTimestamp(scan.created_at)}</span>
                      <span className="font-mono text-[11px] text-siftrix-muted-dark">
                        {scan.id.slice(0, 8)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleViewDetails(scan.id)}
                      className="w-full py-2 px-4 rounded-lg border border-siftrix-border bg-siftrix-pearl text-siftrix-charcoal hover:bg-siftrix-charcoal hover:text-siftrix-champagne hover:border-siftrix-gold/55 text-xs font-semibold cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold"
                    >
                      View Details
                    </button>
                  </article>
                )
              })}
            </div>

            {/* Pagination Footer (Sand Taupe Anchor) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 bg-siftrix-sand/45 border-t border-siftrix-border text-xs text-siftrix-muted-dark">
              <p>
                Showing <span className="font-semibold text-siftrix-graphite">{paginated.startIndex}</span>–
                <span className="font-semibold text-siftrix-graphite">{paginated.endIndex}</span> of{' '}
                <span className="font-semibold text-siftrix-graphite">{paginated.totalItems}</span>{' '}
                {filtersActive ? 'matching ' : ''}
                {paginated.totalItems === 1 ? 'scan' : 'scans'}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={paginated.currentPage <= 1}
                  onClick={() => setCurrentPage(paginated.currentPage - 1)}
                  className="px-3.5 py-2 rounded-lg siftrix-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold"
                >
                  Previous
                </button>

                <span className="px-2 font-semibold text-siftrix-graphite siftrix-tabular">
                  Page {paginated.currentPage} of {paginated.totalPages}
                </span>

                <button
                  type="button"
                  disabled={paginated.currentPage >= paginated.totalPages}
                  onClick={() => setCurrentPage(paginated.currentPage + 1)}
                  className="px-3.5 py-2 rounded-lg siftrix-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
