import { API_CONFIG } from './config'
import { apiGet, apiPost } from './apiClient'
import type { ApiResponse } from './apiClient'
import {
  SESSION_ID_HEADER,
  clearSessionId,
  getSessionHeaders,
  normalizeSessionId,
  saveSessionId,
} from '../utils/session'

export { API_CONFIG }
export type { ApiResponse }

export const HISTORY_PAGE_SIZE = 100
export const MAX_HISTORY_PAGES = 100

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
  target_content_preview?: string
  overall_risk_score: number
  verdict: ScanVerdict
  risk_level: ScanRiskLevel
  summary?: BilingualSummary | null
  recommendations?: BilingualRecommendations | null
  agent_findings?: AgentFindings | null
  created_at: string
  updated_at: string
}

function isInvalidSessionError(status: number, error: string | null): boolean {
  return status === 400 && Boolean(error && error.toLowerCase().includes('x-session-id'))
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
 * for multi-agent threat analysis, persisting any returned X-Session-ID header.
 */
export async function submitScan(payload: ScanRequest): Promise<ApiResponse<ScanResponse>> {
  const response = await apiPost<ScanResponse>(
    '/api/scan',
    {
      target_type: payload.target_type,
      content: payload.content,
      metadata: payload.metadata ?? {},
    },
    {
      headers: getSessionHeaders(),
    }
  )

  if (response.ok) {
    const responseSessionId = normalizeSessionId(
      response.headers?.get(SESSION_ID_HEADER)
    )
    if (responseSessionId) {
      saveSessionId(responseSessionId)
    }
  } else if (isInvalidSessionError(response.status, response.error)) {
    clearSessionId()
  }

  return response
}

/**
 * Verifies that an API payload conforms to the minimum expected ScanResponse
 * or ScanHistoryItem shape so malformed responses fail safely.
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
 * Normalizes a GET /api/history payload whether the backend returns a paginated
 * ScanHistoryListResponse ({ items, total, page, ... }), wrapper object, or array.
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

interface ParsedHistoryPage {
  items: ScanResponse[]
  hasNextPage: boolean
}

function parseHistoryPageResponse(
  data: unknown,
  currentPage: number,
  accumulatedCount: number
): ParsedHistoryPage | null {
  const items = normalizeScanListResponse(data)
  if (!items) {
    return null
  }

  if (items.length === 0) {
    return { items, hasNextPage: false }
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const record = data as Record<string, unknown>
    const hasNextFlag =
      typeof record.has_next === 'boolean' ? record.has_next : undefined
    const totalPages =
      typeof record.total_pages === 'number' && Number.isFinite(record.total_pages)
        ? record.total_pages
        : undefined
    const totalItems =
      typeof record.total === 'number' && Number.isFinite(record.total)
        ? record.total
        : undefined

    if (hasNextFlag !== undefined) {
      return { items, hasNextPage: hasNextFlag }
    }
    if (totalPages !== undefined) {
      return { items, hasNextPage: currentPage < totalPages }
    }
    if (totalItems !== undefined) {
      return { items, hasNextPage: accumulatedCount + items.length < totalItems }
    }
  }

  return { items, hasNextPage: false }
}

/**
 * Fetches complete scan history across all backend pages from GET /api/history,
 * attaching any saved X-Session-ID header.
 */
export async function fetchScans(): Promise<ApiResponse<ScanResponse[]>> {
  const collected: ScanResponse[] = []
  const seenIds = new Set<string>()
  let lastStatus = 200
  let lastHeaders: Headers | undefined

  for (let page = 1; page <= MAX_HISTORY_PAGES; page += 1) {
    const response = await apiGet<unknown>(
      `/api/history?page=${page}&page_size=${HISTORY_PAGE_SIZE}`,
      {
        headers: getSessionHeaders(),
      }
    )

    lastStatus = response.status
    lastHeaders = response.headers

    if (!response.ok) {
      if (isInvalidSessionError(response.status, response.error)) {
        clearSessionId()
      }

      return {
        data: null,
        error: response.error,
        status: response.status,
        ok: false,
        headers: response.headers,
      }
    }

    const parsedPage = parseHistoryPageResponse(response.data, page, collected.length)
    if (!parsedPage) {
      return {
        data: null,
        error: 'Received an unexpected scan list format from the backend server.',
        status: response.status,
        ok: false,
        headers: response.headers,
      }
    }

    for (const item of parsedPage.items) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id)
        collected.push(item)
      }
    }

    if (!parsedPage.hasNextPage) {
      break
    }
  }

  return {
    data: collected,
    error: null,
    status: lastStatus,
    ok: true,
    headers: lastHeaders,
  }
}

/**
 * Fetches a single scan record by ID from GET /api/history/{scan_id},
 * attaching any saved X-Session-ID header.
 */
export async function fetchScanById(scanId: string): Promise<ApiResponse<ScanResponse>> {
  const response = await apiGet<unknown>(
    `/api/history/${encodeURIComponent(scanId)}`,
    {
      headers: getSessionHeaders(),
    }
  )

  if (!response.ok) {
    if (isInvalidSessionError(response.status, response.error)) {
      clearSessionId()
    }

    return {
      data: null,
      error: response.error,
      status: response.status,
      ok: false,
      headers: response.headers,
    }
  }

  if (!isValidScanResponse(response.data)) {
    return {
      data: null,
      error: 'Received an incomplete or unexpected scan detail format from the backend server.',
      status: response.status,
      ok: false,
      headers: response.headers,
    }
  }

  return {
    data: response.data,
    error: null,
    status: response.status,
    ok: true,
    headers: response.headers,
  }
}
