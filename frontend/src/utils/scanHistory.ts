import type { ScanResponse, ScanRiskLevel, ScanVerdict } from '../services/api'
import { clampRiskScore } from './scanPresentation'

export type ScanVerdictFilter = 'all' | ScanVerdict
export type ScanRiskFilter = 'all' | ScanRiskLevel
export type ScanTargetFilter = 'all' | 'url' | 'message'
export type ScanSortField = 'date' | 'risk_score'
export type SortDirection = 'asc' | 'desc'

export interface ScanHistoryFilters {
  searchQuery: string
  verdict: ScanVerdictFilter
  riskLevel: ScanRiskFilter
  targetType: ScanTargetFilter
}

export const DEFAULT_SCAN_FILTERS: ScanHistoryFilters = {
  searchQuery: '',
  verdict: 'all',
  riskLevel: 'all',
  targetType: 'all',
}

export interface PaginatedResult<T> {
  items: T[]
  currentPage: number
  totalPages: number
  totalItems: number
  startIndex: number
  endIndex: number
}

export function hasActiveScanFilters(filters: ScanHistoryFilters): boolean {
  return (
    filters.searchQuery.trim().length > 0 ||
    filters.verdict !== 'all' ||
    filters.riskLevel !== 'all' ||
    filters.targetType !== 'all'
  )
}

/**
 * Filters scan records across search query, verdict, risk level, and target type.
 */
export function filterScans(
  scans: ScanResponse[],
  filters: ScanHistoryFilters
): ScanResponse[] {
  const query = filters.searchQuery.trim().toLowerCase()

  return scans.filter((scan) => {
    if (query) {
      const content = (scan.target_content || '').toLowerCase()
      if (!content.includes(query)) {
        return false
      }
    }

    if (filters.verdict !== 'all' && scan.verdict !== filters.verdict) {
      return false
    }

    if (filters.riskLevel !== 'all' && scan.risk_level !== filters.riskLevel) {
      return false
    }

    if (filters.targetType !== 'all' && scan.target_type !== filters.targetType) {
      return false
    }

    return true
  })
}

function compareByDate(
  a: ScanResponse,
  b: ScanResponse,
  direction: SortDirection
): number {
  const timeA = Date.parse(a.created_at || '')
  const timeB = Date.parse(b.created_at || '')
  const validA = !Number.isNaN(timeA)
  const validB = !Number.isNaN(timeB)

  if (!validA && !validB) return 0
  if (!validA) return 1
  if (!validB) return -1

  return direction === 'asc' ? timeA - timeB : timeB - timeA
}

/**
 * Sorts scans by date or clamped risk score without mutating the input array.
 */
export function sortScansByField(
  scans: ScanResponse[],
  sortBy: ScanSortField,
  direction: SortDirection
): ScanResponse[] {
  return [...scans].sort((a, b) => {
    if (sortBy === 'risk_score') {
      const scoreA = clampRiskScore(a.overall_risk_score)
      const scoreB = clampRiskScore(b.overall_risk_score)
      if (scoreA !== scoreB) {
        return direction === 'asc' ? scoreA - scoreB : scoreB - scoreA
      }
      return compareByDate(a, b, 'desc')
    }

    return compareByDate(a, b, direction)
  })
}

/**
 * Slices an item list into a deterministic page window with clamped bounds.
 */
export function paginateItems<T>(
  items: T[],
  requestedPage: number,
  pageSize: number
): PaginatedResult<T> {
  const safePageSize = Math.max(1, Math.floor(pageSize))
  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize))
  const currentPage = Math.min(totalPages, Math.max(1, Math.floor(requestedPage)))
  const startOffset = (currentPage - 1) * safePageSize
  const sliced = items.slice(startOffset, startOffset + safePageSize)

  return {
    items: sliced,
    currentPage,
    totalPages,
    totalItems,
    startIndex: totalItems === 0 ? 0 : startOffset + 1,
    endIndex: startOffset + sliced.length,
  }
}
