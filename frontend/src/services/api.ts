import { API_CONFIG } from './config'
import { apiGet, apiPost } from './apiClient'
import type { ApiResponse } from './apiClient'

export { API_CONFIG }
export type { ApiResponse }

export type ScanTargetType = 'url' | 'message' | 'email'
export type ScanVerdict = 'safe' | 'suspicious' | 'malicious'
export type ScanRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface BilingualSummary {
  en?: string
  ur?: string
}

export interface BilingualRecommendations {
  en?: string[]
  ur?: string[]
}

export interface AgentFindings {
  message_intelligence?: Record<string, unknown> | null
  url_intelligence?: Record<string, unknown> | null
  security_advisor?: Record<string, unknown> | null
  raw_metadata?: Record<string, unknown> | null
  [key: string]: unknown
}

export interface ScanRequest {
  target_type: ScanTargetType
  content: string
  metadata?: Record<string, unknown>
}

export interface ScanResponse {
  id: string
  user_id: string | null
  target_type: ScanTargetType
  target_content: string
  overall_risk_score: number
  verdict: ScanVerdict
  risk_level: ScanRiskLevel
  summary: BilingualSummary
  recommendations: BilingualRecommendations
  agent_findings: AgentFindings
  created_at: string
  updated_at: string
}

/**
 * Checks whether the FastAPI backend health endpoint is reachable.
 */
export async function checkBackendHealth(
  healthEndpoint = '/api/health'
): Promise<ApiResponse<{ status?: string }>> {
  return apiGet<{ status?: string }>(healthEndpoint)
}

/**
 * Submits a validated URL, message, or email payload to POST /api/scan
 * for multi-agent threat analysis.
 */
export async function submitScan(payload: ScanRequest): Promise<ApiResponse<ScanResponse>> {
  return apiPost<ScanResponse>('/api/scan', {
    target_type: payload.target_type,
    content: payload.content,
    metadata: payload.metadata ?? {},
  })
}

/**
 * Verifies that an API payload conforms to the minimum expected ScanResponse shape
 * so malformed or partial server responses fail safely instead of rendering broken UI.
 */
export function isValidScanResponse(data: unknown): data is ScanResponse {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false
  }

  const candidate = data as Partial<ScanResponse>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.overall_risk_score === 'number' &&
    !Number.isNaN(candidate.overall_risk_score) &&
    typeof candidate.verdict === 'string' &&
    typeof candidate.risk_level === 'string'
  )
}

/**
 * Normalizes a GET /api/scans payload whether the backend returns a raw JSON array
 * or a wrapper envelope ({ items, scans, results, data }). Returns null if invalid.
 */
export function normalizeScanListResponse(data: unknown): ScanResponse[] | null {
  let rawList: unknown[] | null = null

  if (Array.isArray(data)) {
    rawList = data
  } else if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    for (const key of ['items', 'scans', 'results', 'data']) {
      if (Array.isArray(record[key])) {
        rawList = record[key] as unknown[]
        break
      }
    }
  }

  if (!rawList) {
    return null
  }

  return rawList.filter((item): item is ScanResponse => isValidScanResponse(item))
}

/**
 * Fetches scan history records from GET /api/scans.
 */
export async function fetchScans(): Promise<ApiResponse<ScanResponse[]>> {
  const response = await apiGet<unknown>('/api/scans')

  if (!response.ok) {
    return {
      data: null,
      error: response.error,
      status: response.status,
      ok: false,
    }
  }

  const normalized = normalizeScanListResponse(response.data)
  if (!normalized) {
    return {
      data: null,
      error: 'Received an unexpected scan list format from the backend server.',
      status: response.status,
      ok: false,
    }
  }

  return {
    data: normalized,
    error: null,
    status: response.status,
    ok: true,
  }
}

/**
 * Fetches a single scan record by ID from GET /api/scans/{scan_id}.
 */
export async function fetchScanById(scanId: string): Promise<ApiResponse<ScanResponse>> {
  const response = await apiGet<unknown>(`/api/scans/${encodeURIComponent(scanId)}`)

  if (!response.ok) {
    return {
      data: null,
      error: response.error,
      status: response.status,
      ok: false,
    }
  }

  if (!isValidScanResponse(response.data)) {
    return {
      data: null,
      error: 'Received an incomplete or unexpected scan detail format from the backend server.',
      status: response.status,
      ok: false,
    }
  }

  return {
    data: response.data,
    error: null,
    status: response.status,
    ok: true,
  }
}
