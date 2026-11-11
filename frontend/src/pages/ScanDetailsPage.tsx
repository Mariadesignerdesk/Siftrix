import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchScanById } from '../services/api'
import {
  getInitialScanDetailsState,
  normalizeScanId,
  resolveScanDetailsState,
  type ScanDetailsViewState,
} from '../utils/scanDetails'
import {
  clampRiskScore,
  formatTimestamp,
  getVerdictStyle,
} from '../utils/scanPresentation'
import { handleSpaLinkClick, type NavigateFn } from '../utils/router'
import {
  RiskLevelBadge,
  TargetTypeBadge,
  VerdictBadge,
} from '../components/ScanBadges'
import ScanResultCard from '../components/ScanResultCard'

interface ScanDetailsPageProps {
  scanId: string
  onNavigate: NavigateFn
}

interface ScanDetailsContentProps {
  scanId: string
  viewState: ScanDetailsViewState
  onRetry: () => void
  onRefresh: () => void
  onNavigate: NavigateFn
}

function getTargetContentHeading(targetType: string | undefined): string {
  if (targetType === 'url') return 'Scanned URL'
  if (targetType === 'email') return 'Scanned Email'
  return 'Scanned Message'
}

/**
 * Pure presentation body for Scan Details covering loading skeletons,
 * 404 not-found, retryable API error, and full scan overview + analysis states.
 */
export function ScanDetailsContent({
  scanId,
  viewState,
  onRetry,
  onRefresh,
  onNavigate,
}: ScanDetailsContentProps) {
  const normalizedId = normalizeScanId(scanId)
  const isLoading = viewState.status === 'loading'

  return (
    <section
      aria-label="Scan Details"
      className="px-6 md:px-10 py-10 md:py-14 max-w-6xl mx-auto space-y-6"
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-siftrix-lavender">
            Scan Inspection
          </p>
          <h2 className="text-3xl font-bold text-siftrix-soft mt-1">
            Scan Details
          </h2>
          <p className="text-siftrix-lavender/90 text-sm md:text-base mt-1">
            Complete security analysis of the selected scan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isLoading || !normalizedId}
            onClick={onRefresh}
            aria-label="Refresh scan details"
            className="px-4 py-2 rounded-lg siftrix-btn-dark-secondary disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>

          <a
            href="/dashboard"
            onClick={(e) => handleSpaLinkClick(e, onNavigate, '/dashboard')}
            className="px-4 py-2 rounded-lg siftrix-btn-dark-secondary text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric"
          >
            Dashboard
          </a>

          <a
            href="/scans"
            onClick={(e) => handleSpaLinkClick(e, onNavigate, '/scans')}
            className="siftrix-btn-primary px-5 py-2 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-siftrix-navy focus-visible:ring-siftrix-electric"
          >
            Back to History
          </a>
        </div>
      </div>

      {/* State 1: Loading Skeleton */}
      {viewState.status === 'loading' ? (
        <div
          role="status"
          aria-busy="true"
          aria-label="Loading scan details"
          className="space-y-6"
        >
          <span className="sr-only">Loading scan details...</span>

          <div className="siftrix-card-3d p-6 md:p-8 rounded-2xl animate-pulse space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-siftrix-lavender/80">
              <div className="space-y-3">
                <div className="h-5 w-32 bg-siftrix-lavender/60 rounded" />
                <div className="flex flex-wrap gap-2">
                  <div className="h-7 w-28 bg-siftrix-lavender/60 rounded-full" />
                  <div className="h-7 w-28 bg-siftrix-lavender/60 rounded-full" />
                  <div className="h-7 w-20 bg-siftrix-lavender/60 rounded-full" />
                </div>
              </div>
              <div className="h-16 w-48 bg-siftrix-lavender/60 rounded-xl" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl siftrix-panel-inset space-y-2"
                >
                  <div className="h-3 w-20 bg-siftrix-lavender/60 rounded" />
                  <div className="h-4 w-4/5 bg-siftrix-lavender/60 rounded" />
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl siftrix-panel-inset space-y-2">
              <div className="h-3 w-28 bg-siftrix-lavender/60 rounded" />
              <div className="h-4 w-full bg-siftrix-lavender/60 rounded" />
              <div className="h-4 w-2/3 bg-siftrix-lavender/60 rounded" />
            </div>
          </div>

          <div className="siftrix-card-3d p-6 md:p-8 rounded-2xl animate-pulse space-y-5">
            <div className="h-6 w-64 bg-siftrix-lavender/60 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-28 bg-siftrix-lavender/60 rounded-xl" />
              <div className="h-28 bg-siftrix-lavender/60 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-24 bg-siftrix-lavender/60 rounded-xl" />
              <div className="h-24 bg-siftrix-lavender/60 rounded-xl" />
            </div>
            <div className="space-y-3 pt-2">
              <div className="h-5 w-36 bg-siftrix-lavender/60 rounded" />
              <div className="h-20 bg-siftrix-lavender/60 rounded-xl" />
              <div className="h-20 bg-siftrix-lavender/60 rounded-xl" />
              <div className="h-20 bg-siftrix-lavender/60 rounded-xl" />
            </div>
          </div>
        </div>
      ) : null}

      {/* State 2: API / Network / Server Error State */}
      {viewState.status === 'error' ? (
        <div
          role="alert"
          className="bg-siftrix-soft rounded-2xl shadow-[0_14px_36px_rgba(23,21,46,0.55)] border border-red-300 p-6 md:p-8 space-y-5"
        >
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 md:p-5 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                {viewState.statusCode === 0
                  ? 'Connection Error'
                  : viewState.statusCode === 408
                    ? 'Request Timeout'
                    : viewState.statusCode > 0
                      ? `HTTP ${viewState.statusCode}`
                      : 'API Error'}
              </span>
              <h3 className="text-base font-bold text-red-900">
                {viewState.title}
              </h3>
            </div>
            <p className="text-sm text-red-800">{viewState.message}</p>
            {viewState.scanId ? (
              <p className="text-xs text-red-700">
                Requested Scan ID:{' '}
                <code className="font-mono bg-white/80 px-2 py-0.5 rounded border border-red-200 break-all">
                  {viewState.scanId}
                </code>
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="px-5 py-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-sm font-semibold cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-700"
            >
              Retry
            </button>

            <a
              href="/scans"
              onClick={(e) => handleSpaLinkClick(e, onNavigate, '/scans')}
              className="px-5 py-2.5 rounded-lg siftrix-btn-light-neutral text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric"
            >
              Back to History
            </a>

            <a
              href="/dashboard"
              onClick={(e) => handleSpaLinkClick(e, onNavigate, '/dashboard')}
              className="px-5 py-2.5 rounded-lg siftrix-btn-light-neutral text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric"
            >
              Dashboard
            </a>
          </div>
        </div>
      ) : null}

      {/* State 3: Not-Found State (404 or missing scan identifier) */}
      {viewState.status === 'not_found' ? (
        <div
          role="status"
          aria-live="polite"
          className="siftrix-card-3d rounded-2xl p-8 md:p-10 text-center space-y-4"
        >
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            Scan Not Found
          </span>
          <h3 className="text-2xl font-bold text-siftrix-navy">
            This scan record is unavailable
          </h3>
          <p className="text-sm text-siftrix-royal max-w-lg mx-auto">
            {viewState.message}
          </p>
          {viewState.scanId ? (
            <p className="text-xs text-siftrix-royal">
              Scan ID:{' '}
              <code className="font-mono siftrix-panel-inset px-2 py-1 rounded text-siftrix-navy break-all">
                {viewState.scanId}
              </code>
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href="/scans"
              onClick={(e) => handleSpaLinkClick(e, onNavigate, '/scans')}
              className="siftrix-btn-primary px-5 py-2.5 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-siftrix-electric"
            >
              Back to History
            </a>

            <a
              href="/dashboard"
              onClick={(e) => handleSpaLinkClick(e, onNavigate, '/dashboard')}
              className="px-5 py-2.5 rounded-lg border border-siftrix-royal text-siftrix-navy hover:bg-siftrix-royal hover:text-siftrix-soft text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric"
            >
              Dashboard
            </a>

            <button
              type="button"
              onClick={() => onNavigate('/', 'scan')}
              className="px-5 py-2.5 rounded-lg siftrix-btn-light-neutral text-sm font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric"
            >
              Run New Scan
            </button>
          </div>
        </div>
      ) : null}

      {/* State 4: Successful Scan Details */}
      {viewState.status === 'ready' ? (
        <div className="space-y-6">
          {/* Scan Overview Card */}
          <article
            aria-label="Scan Overview"
            className="siftrix-card-3d p-6 md:p-8 rounded-2xl space-y-6"
          >
            {(() => {
              const { scan } = viewState
              const score = clampRiskScore(scan.overall_risk_score)
              const verdictStyle = getVerdictStyle(scan.verdict)

              return (
                <>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-siftrix-lavender/80">
                    <div className="space-y-3">
                      <h3 className="text-lg font-bold text-siftrix-navy">
                        Scan Overview
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <VerdictBadge verdict={scan.verdict} />
                        <RiskLevelBadge riskLevel={scan.risk_level} />
                        <TargetTypeBadge targetType={scan.target_type} />
                      </div>
                    </div>

                    <div className="siftrix-panel-inset px-4 py-3 rounded-xl min-w-48">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-xs font-semibold text-siftrix-royal uppercase">
                          Risk Score
                        </span>
                        <span className="text-2xl font-bold text-siftrix-navy">
                          {score}
                          <span className="text-sm font-normal text-siftrix-royal">
                            /100
                          </span>
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label="Overall risk score"
                        aria-valuenow={score}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="w-full h-2 bg-siftrix-navy/15 rounded-full overflow-hidden mt-2"
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${verdictStyle.bar}`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl siftrix-panel-inset space-y-1">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-siftrix-royal">
                        Scan ID
                      </dt>
                      <dd className="font-mono text-xs text-siftrix-navy break-all">
                        {scan.id}
                      </dd>
                    </div>

                    <div className="p-4 rounded-xl siftrix-panel-inset space-y-1">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-siftrix-royal">
                        Scan Date & Time
                      </dt>
                      <dd className="text-sm font-medium text-siftrix-navy">
                        {formatTimestamp(scan.created_at)}
                      </dd>
                    </div>

                    <div className="p-4 rounded-xl siftrix-panel-inset space-y-1">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-siftrix-royal">
                        Last Updated
                      </dt>
                      <dd className="text-sm font-medium text-siftrix-navy">
                        {formatTimestamp(scan.updated_at)}
                      </dd>
                    </div>
                  </dl>

                  {/* Full Scanned URL / Message */}
                  <div className="p-4 rounded-xl siftrix-panel-inset space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-siftrix-royal block">
                      {getTargetContentHeading(scan.target_type)}
                    </span>
                    {scan.target_content ? (
                      <p
                        className={`text-sm text-siftrix-navy leading-relaxed ${
                          scan.target_type === 'url'
                            ? 'font-mono break-all'
                            : 'break-words whitespace-pre-wrap'
                        }`}
                      >
                        {scan.target_content}
                      </p>
                    ) : (
                      <p className="text-sm text-siftrix-royal/85 italic">
                        No target content recorded for this scan.
                      </p>
                    )}
                  </div>
                </>
              )
            })()}
          </article>

          {/* Reused Bilingual Security Analysis, Recommendations, Agents & Metadata */}
          <ScanResultCard
            result={viewState.scan}
            showOverview={false}
            defaultOpenMetadata
          />
        </div>
      ) : null}
    </section>
  )
}

/**
 * Container component that loads real scan details for /scans/:scanId
 * from GET /api/scans/{scan_id} and manages retry and refresh cycles.
 */
export default function ScanDetailsPage({
  scanId,
  onNavigate,
}: ScanDetailsPageProps) {
  const normalizedId = normalizeScanId(scanId)
  const [viewState, setViewState] = useState<ScanDetailsViewState>(() =>
    getInitialScanDetailsState(scanId)
  )
  const requestSeqRef = useRef(0)

  const executeFetch = useCallback(async (targetId: string, seq: number) => {
    const response = await fetchScanById(targetId)
    if (requestSeqRef.current !== seq) {
      return
    }
    setViewState(resolveScanDetailsState(response, targetId))
  }, [])

  useEffect(() => {
    if (!normalizedId) {
      requestSeqRef.current += 1
      return
    }

    const seq = requestSeqRef.current + 1
    requestSeqRef.current = seq
    void executeFetch(normalizedId, seq)

    return () => {
      requestSeqRef.current += 1
    }
  }, [normalizedId, executeFetch])

  const effectiveState: ScanDetailsViewState = !normalizedId
    ? getInitialScanDetailsState(scanId)
    : viewState.scanId !== normalizedId
      ? getInitialScanDetailsState(normalizedId)
      : viewState

  const handleRetryOrRefresh = () => {
    if (!normalizedId || effectiveState.status === 'loading') {
      return
    }
    const seq = requestSeqRef.current + 1
    requestSeqRef.current = seq
    setViewState({ scanId: normalizedId, status: 'loading' })
    void executeFetch(normalizedId, seq)
  }

  return (
    <ScanDetailsContent
      scanId={scanId}
      viewState={effectiveState}
      onRetry={handleRetryOrRefresh}
      onRefresh={handleRetryOrRefresh}
      onNavigate={onNavigate}
    />
  )
}
