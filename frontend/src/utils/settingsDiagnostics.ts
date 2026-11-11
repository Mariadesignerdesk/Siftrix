import type { ApiResponse } from '../services/api'

export type BackendDiagnosticStatus = 'checking' | 'connected' | 'disconnected'

export interface BackendDiagnosticState {
  status: BackendDiagnosticStatus
  backendReportedStatus?: string
  errorMessage?: string
  statusCode?: number
  lastCheckedAt?: string
}

/**
 * Converts a GET /api/health response into an explicit backend diagnostic state.
 * Never reports 'connected' unless response.ok is true.
 */
export function resolveBackendHealthState(
  response: ApiResponse<{ status?: string }>,
  checkedAtIso: string
): BackendDiagnosticState {
  if (response.ok) {
    const reportedStatus =
      response.data &&
      typeof response.data.status === 'string' &&
      response.data.status.trim()
        ? response.data.status.trim()
        : undefined

    return {
      status: 'connected',
      backendReportedStatus: reportedStatus,
      statusCode: response.status,
      lastCheckedAt: checkedAtIso,
    }
  }

  return {
    status: 'disconnected',
    errorMessage:
      response.error ||
      'Unable to confirm backend availability from the health check endpoint.',
    statusCode: response.status,
    lastCheckedAt: checkedAtIso,
  }
}
