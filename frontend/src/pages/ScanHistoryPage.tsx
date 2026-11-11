import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchScans, type ScanResponse } from '../services/api'
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
import { clampRiskScore, formatTimestamp } from '../utils/scanPresentation'
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

  const [filters, setFilters] = useState<ScanHistoryFilters>(DEFAULT_SCAN_FILTERS)
  const [sortBy, setSortBy] = useState<ScanSortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)

  const applyScanResponse = useCallback(
    (response: Awaited<ReturnType<typeof fetchScans>>) => {
      if (!response.ok || !response.data) {
        setScans([])
        setErrorMessage(
          response.error || 'Unable to load scan history from the backend server.'
        )
      } else {
        setScans(response.data)
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
      className="px-6 md:px-10 py-10 md:py-14 max-w-6xl mx-auto space-y-6"
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-siftrix-lavender">
            Threat Audit Log
          </p>
          <h2 className="text-3xl font-bold text-siftrix-soft mt-1">
            Scan History
          </h2>
          <p className="text-siftrix-lavender/90 text-sm md:text-base mt-1">
            Search, filter, and inspect previously analyzed URLs and messages.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            role="status"
            aria-live="polite"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-siftrix-royal/80 text-siftrix-soft border border-siftrix-lavender/35"
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

      {/* Backend Error Alert */}
      {!isLoading && hasError ? (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="space-y-1 text-sm">
            <p className="font-bold">Could not load scan history</p>
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

      {/* Search, Filters & Sort Controls */}
      <div className="siftrix-card-3d p-5 md:p-6 rounded-2xl space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-7">
            <label htmlFor="scan-search" className="sr-only">
              Search by scanned URL or message content
            </label>
            <input
              id="scan-search"
              type="search"
              value={filters.searchQuery}
              onChange={(e) => updateFilters({ searchQuery: e.target.value })}
              placeholder="Search by scanned URL or message content..."
              className="w-full px-4 py-2.5 text-sm border border-siftrix-lavender rounded-xl outline-none focus:border-siftrix-electric focus:ring-1 focus:ring-siftrix-electric bg-white/75 text-siftrix-navy placeholder:text-siftrix-royal/70"
            />
          </div>

          {/* Sort Controls */}
          <div className="lg:col-span-5 flex flex-col sm:flex-row gap-2">
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
                className="w-full px-3 py-2.5 text-sm border border-siftrix-lavender rounded-xl bg-white/75 text-siftrix-navy outline-none focus:border-siftrix-electric focus:ring-1 focus:ring-siftrix-electric"
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
              className="px-4 py-2.5 text-sm font-medium rounded-xl siftrix-btn-light-neutral cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric"
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
              className="block text-xs font-semibold text-siftrix-royal mb-1"
            >
              Verdict
            </label>
            <select
              id="verdict-filter"
              value={filters.verdict}
              onChange={(e) =>
                updateFilters({ verdict: e.target.value as ScanVerdictFilter })
              }
              className="w-full px-3 py-2 text-sm border border-siftrix-lavender rounded-xl bg-white/75 text-siftrix-navy outline-none focus:border-siftrix-electric focus:ring-1 focus:ring-siftrix-electric"
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
              className="block text-xs font-semibold text-siftrix-royal mb-1"
            >
              Risk Level
            </label>
            <select
              id="risk-filter"
              value={filters.riskLevel}
              onChange={(e) =>
                updateFilters({ riskLevel: e.target.value as ScanRiskFilter })
              }
              className="w-full px-3 py-2 text-sm border border-siftrix-lavender rounded-xl bg-white/75 text-siftrix-navy outline-none focus:border-siftrix-electric focus:ring-1 focus:ring-siftrix-electric"
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
              className="block text-xs font-semibold text-siftrix-royal mb-1"
            >
              Target Type
            </label>
            <select
              id="target-filter"
              value={filters.targetType}
              onChange={(e) =>
                updateFilters({ targetType: e.target.value as ScanTargetFilter })
              }
              className="w-full px-3 py-2 text-sm border border-siftrix-lavender rounded-xl bg-white/75 text-siftrix-navy outline-none focus:border-siftrix-electric focus:ring-1 focus:ring-siftrix-electric"
            >
              <option value="all">All Targets</option>
              <option value="url">URL</option>
              <option value="message">Message</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              disabled={!filtersActive}
              onClick={handleClearFilters}
              className="w-full px-4 py-2 text-sm font-medium rounded-xl siftrix-btn-light-neutral disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main Results Container */}
      <div className="siftrix-card-3d rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4 animate-pulse" aria-busy="true">
            {[1, 2, 3, 4].map((row) => (
              <div
                key={row}
                className="p-4 rounded-xl siftrix-panel-inset space-y-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="h-4 w-2/3 bg-siftrix-lavender/60 rounded" />
                  <div className="h-6 w-20 bg-siftrix-lavender/60 rounded-full" />
                </div>
                <div className="h-3 w-1/3 bg-siftrix-lavender/60 rounded" />
              </div>
            ))}
          </div>
        ) : hasError ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-base font-semibold text-siftrix-navy">
              Scan history is currently unavailable
            </p>
            <p className="text-sm text-siftrix-royal max-w-md mx-auto">
              Ensure the SIFTRIX FastAPI backend is running and click Retry Connection to load recorded scans from{' '}
              <code className="font-mono text-xs bg-siftrix-royal/12 px-1.5 py-0.5 rounded">
                GET /api/scans
              </code>
              .
            </p>
          </div>
        ) : scans.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-lg font-semibold text-siftrix-navy">
              No scans recorded yet
            </p>
            <p className="text-sm text-siftrix-royal max-w-md mx-auto">
              You have not analyzed any URLs or messages yet. Start a new scan to build your threat audit log.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('/', 'scan')}
              className="inline-block siftrix-btn-primary px-5 py-2.5 rounded-lg text-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-siftrix-electric"
            >
              Run Your First Scan
            </button>
          </div>
        ) : sortedScans.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-lg font-semibold text-siftrix-navy">
              No matching scans found
            </p>
            <p className="text-sm text-siftrix-royal max-w-md mx-auto">
              None of the {scans.length} recorded {scans.length === 1 ? 'scan matches' : 'scans match'} your current search query and active filters.
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-block px-5 py-2.5 rounded-lg border border-siftrix-royal text-siftrix-navy hover:bg-siftrix-royal hover:text-siftrix-soft text-sm font-semibold cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-siftrix-royal border-b border-siftrix-electric/35 text-xs font-bold uppercase tracking-wider text-siftrix-soft">
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
                        className="inline-flex items-center gap-1 uppercase font-bold text-siftrix-soft hover:text-siftrix-lavender cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric rounded"
                      >
                        <span>Score</span>
                        <span aria-hidden="true">{sortIndicator('risk_score')}</span>
                      </button>
                    </th>
                    <th scope="col" className="px-3 lg:px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => handleSortToggle('date')}
                        className="inline-flex items-center gap-1 uppercase font-bold text-siftrix-soft hover:text-siftrix-lavender cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric rounded"
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
                <tbody className="divide-y divide-siftrix-lavender/60 text-sm">
                  {paginated.items.map((scan) => {
                    const score = clampRiskScore(scan.overall_risk_score)
                    return (
                      <tr
                        key={scan.id}
                        className="hover:bg-siftrix-lavender/25 transition-colors"
                      >
                        <td className="px-4 lg:px-5 py-4 min-w-44 max-w-xs lg:max-w-sm">
                          <p
                            className={`font-medium text-siftrix-navy line-clamp-2 ${
                              scan.target_type === 'url' ? 'break-all' : 'break-words'
                            }`}
                          >
                            {scan.target_content || 'No target content'}
                          </p>
                          <p className="text-[11px] font-mono text-siftrix-royal/80 mt-1">
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
                        <td className="px-3 lg:px-4 py-4 whitespace-nowrap font-bold text-siftrix-navy">
                          {score}
                          <span className="text-xs font-normal text-siftrix-royal">/100</span>
                        </td>
                        <td className="px-3 lg:px-4 py-4 text-xs text-siftrix-royal">
                          {formatTimestamp(scan.created_at)}
                        </td>
                        <td className="px-4 lg:px-5 py-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleViewDetails(scan.id)}
                            className="px-3 py-1.5 rounded-lg border border-siftrix-royal text-siftrix-navy hover:bg-siftrix-royal hover:text-siftrix-soft text-xs font-semibold cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric"
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
            <div className="lg:hidden divide-y divide-siftrix-lavender/60">
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
                      <span className="text-xs font-bold text-siftrix-navy siftrix-panel-inset px-2.5 py-1 rounded-md">
                        Risk: {score}/100
                      </span>
                    </div>

                    <p
                      className={`text-sm font-medium text-siftrix-navy line-clamp-3 ${
                        scan.target_type === 'url' ? 'break-all' : 'break-words'
                      }`}
                    >
                      {scan.target_content || 'No target content'}
                    </p>

                    <div className="flex items-center justify-between gap-2 text-xs text-siftrix-royal">
                      <span>{formatTimestamp(scan.created_at)}</span>
                      <span className="font-mono text-[11px] text-siftrix-royal/80">
                        {scan.id.slice(0, 8)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleViewDetails(scan.id)}
                      className="w-full py-2 px-4 rounded-lg border border-siftrix-royal text-siftrix-navy hover:bg-siftrix-royal hover:text-siftrix-soft text-xs font-semibold cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric"
                    >
                      View Details
                    </button>
                  </article>
                )
              })}
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 bg-siftrix-lavender/30 border-t border-siftrix-lavender text-xs text-siftrix-royal">
              <p>
                Showing <span className="font-semibold text-siftrix-navy">{paginated.startIndex}</span>–
                <span className="font-semibold text-siftrix-navy">{paginated.endIndex}</span> of{' '}
                <span className="font-semibold text-siftrix-navy">{paginated.totalItems}</span>{' '}
                {filtersActive ? 'matching ' : ''}
                {paginated.totalItems === 1 ? 'scan' : 'scans'}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={paginated.currentPage <= 1}
                  onClick={() => setCurrentPage(paginated.currentPage - 1)}
                  className="px-3 py-1.5 rounded-lg siftrix-btn-light-neutral disabled:opacity-50 disabled:cursor-not-allowed font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric"
                >
                  Previous
                </button>

                <span className="px-2 font-semibold text-siftrix-navy">
                  Page {paginated.currentPage} of {paginated.totalPages}
                </span>

                <button
                  type="button"
                  disabled={paginated.currentPage >= paginated.totalPages}
                  onClick={() => setCurrentPage(paginated.currentPage + 1)}
                  className="px-3 py-1.5 rounded-lg siftrix-btn-light-neutral disabled:opacity-50 disabled:cursor-not-allowed font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric"
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
