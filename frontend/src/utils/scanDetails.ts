import {
  isValidScanResponse,
  type ApiResponse,
  type ScanResponse,
} from '../services/api'

export type ScanDetailsStatus = 'loading' | 'ready' | 'not_found' | 'error'

export type ScanDetailsViewState =
  | {
      scanId: string
      status: 'loading'
    }
  | {
      scanId: string
      status: 'ready'
      scan: ScanResponse
    }
  | {
      scanId: string
      status: 'not_found'
      message: string
      statusCode?: number
    }
  | {
      scanId: string
      status: 'error'
      title: string
      message: string
      statusCode: number
    }

/**
 * Normalizes a route scan identifier by trimming surrounding whitespace.
 */
export function normalizeScanId(scanId: string): string {
  return scanId.trim()
}

/**
 * Returns the initial view state for the Scan Details page before API fetch completes.
 */
export function getInitialScanDetailsState(scanId: string): ScanDetailsViewState {
  const normalizedId = normalizeScanId(scanId)
  if (!normalizedId) {
    return {
      scanId: normalizedId,
      status: 'not_found',
      message: 'No scan identifier was provided in the route.',
    }
  }

  return {
    scanId: normalizedId,
    status: 'loading',
  }
}

/**
 * Maps HTTP or client failure status codes to specific error headings
 * without conflating server or connectivity errors with missing records.
 */
export function getScanDetailsErrorTitle(status: number): string {
  if (status === 0) {
    return 'Unable to reach the backend server'
  }
  if (status === 408) {
    return 'Scan details request timed out'
  }
  if (status === 400 || status === 422) {
    return 'Invalid scan identifier format'
  }
  if (status === 401 || status === 403) {
    return 'Access denied when loading scan details'
  }
  if (status >= 500) {
    return 'Backend server error'
  }
  if (status >= 200 && status < 300) {
    return 'Unexpected scan detail format'
  }
  return 'Could not load scan details'
}

/**
 * Converts a GET /api/history/{scan_id} response into a discriminated view state,
 * distinguishing 404 Not Found from network, timeout, server, or payload errors.
 */
export function resolveScanDetailsState(
  response: ApiResponse<ScanResponse>,
  scanId: string
): ScanDetailsViewState {
  const normalizedId = normalizeScanId(scanId)

  if (!normalizedId) {
    return {
      scanId: normalizedId,
      status: 'not_found',
      message: 'No scan identifier was provided in the route.',
    }
  }

  if (response.ok && response.data && isValidScanResponse(response.data)) {
    return {
      scanId: normalizedId,
      status: 'ready',
      scan: response.data,
    }
  }

  if (!response.ok && response.status === 404) {
    return {
      scanId: normalizedId,
      status: 'not_found',
      message:
        response.error ||
        `No recorded scan was found for identifier "${normalizedId}".`,
      statusCode: 404,
    }
  }

  return {
    scanId: normalizedId,
    status: 'error',
    title: getScanDetailsErrorTitle(response.status),
    message:
      response.error ||
      'Unable to retrieve scan details from the backend server.',
    statusCode: response.status,
  }
}
