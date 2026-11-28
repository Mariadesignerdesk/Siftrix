import type { checkBackendHealth, fetchScans, ScanResponse } from '../services/api'
import { getMockScanHistory } from '../services/scanHistoryService'
import { clampRiskScore } from './scanPresentation'
import { isMissingSessionUnauthorized, type SessionStorageLike } from './session'

export type BackendHealthState = 'checking' | 'online' | 'offline'

export type DemoPreviewReason =
  | 'none'
  | 'empty_history'
  | 'missing_session'
  | 'api_failure'

export interface DashboardStats {
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

export interface DashboardResolvedState {
  scans: ScanResponse[]
  isDemoPreview: boolean
  demoPreviewReason: DemoPreviewReason
  errorMessage: string
  healthState: BackendHealthState
}

/**
 * Pure resolver that partitions real user telemetry from illustrative demo preview data.
 * Guarantees that sample records are never mixed with authentic user scans.
 */
export function resolveDashboardData(
  scansRes: Awaited<ReturnType<typeof fetchScans>>,
  healthRes: Awaited<ReturnType<typeof checkBackendHealth>>,
  sessionStorage?: SessionStorageLike | null
): DashboardResolvedState {
  const healthState: BackendHealthState = healthRes.ok ? 'online' : 'offline'

  // Case 1: Real scans exist — show ONLY real data, no demo preview
  if (scansRes.ok && Array.isArray(scansRes.data) && scansRes.data.length > 0) {
    return {
      scans: scansRes.data,
      isDemoPreview: false,
      demoPreviewReason: 'none',
      errorMessage: '',
      healthState,
    }
  }

  // Case 2: Confirmed empty history — backend verified 0 recorded scans
  if (scansRes.ok && Array.isArray(scansRes.data) && scansRes.data.length === 0) {
    return {
      scans: getMockScanHistory(),
      isDemoPreview: true,
      demoPreviewReason: 'empty_history',
      errorMessage: '',
      healthState,
    }
  }

  // Case 3: Unauthorized missing X-Session-ID (initial unauthenticated guest visit)
  if (isMissingSessionUnauthorized(scansRes.status, sessionStorage, scansRes.error)) {
    return {
      scans: getMockScanHistory(),
      isDemoPreview: true,
      demoPreviewReason: 'missing_session',
      errorMessage: '',
      healthState,
    }
  }

  // Case 4: Backend offline or API / authorization failure
  return {
    scans: getMockScanHistory(),
    isDemoPreview: true,
    demoPreviewReason: 'api_failure',
    errorMessage: !healthRes.ok
      ? 'FastAPI backend offline — displaying realistic telemetry dataset.'
      : scansRes.error || 'Could not load backend scan data.',
    healthState,
  }
}

export function computeStats(scans: ScanResponse[]): DashboardStats {
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

export function getPercent(count: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((count / total) * 100)
}

export function sortRecentScans(scans: ScanResponse[]): ScanResponse[] {
  return [...scans].sort((a, b) => {
    const timeA = Date.parse(a.created_at || '')
    const timeB = Date.parse(b.created_at || '')
    if (Number.isNaN(timeA) && Number.isNaN(timeB)) return 0
    if (Number.isNaN(timeA)) return 1
    if (Number.isNaN(timeB)) return -1
    return timeB - timeA
  })
}

export function getPointStrokeColor(verdict: ScanResponse['verdict']): string {
  if (verdict === 'safe') return '#10B981'
  if (verdict === 'suspicious') return '#F59E0B'
  return '#EF4444'
}

export const Y_AXIS_LEVELS = [
  { score: 100, y: 26 },
  { score: 75, y: 54 },
  { score: 50, y: 82 },
  { score: 25, y: 110 },
  { score: 0, y: 138 },
] as const
