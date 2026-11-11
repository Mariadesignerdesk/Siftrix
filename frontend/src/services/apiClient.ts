import { API_CONFIG } from './config'

/**
 * Standard generic response envelope returned by the API client.
 */
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  status: number
  ok: boolean
}

/**
 * Extracts a human-readable error message from a FastAPI or HTTP error payload.
 */
function extractHttpErrorMessage(
  status: number,
  statusText: string,
  responseData: unknown,
  rawText: string
): string {
  const defaultMessage = `HTTP Error ${status}: ${statusText || 'Request failed'}`

  if (responseData && typeof responseData === 'object') {
    const record = responseData as Record<string, unknown>

    if ('detail' in record) {
      const { detail } = record
      if (typeof detail === 'string' && detail.trim()) {
        return detail
      }
      if (Array.isArray(detail) && detail.length > 0) {
        const validationErrors = detail
          .map((item) => {
            if (!item || typeof item !== 'object') return String(item)
            const entry = item as { loc?: unknown; msg?: unknown }
            const msg = typeof entry.msg === 'string' ? entry.msg : JSON.stringify(item)
            if (Array.isArray(entry.loc) && entry.loc.length > 0) {
              const field = entry.loc[entry.loc.length - 1]
              return `${String(field)}: ${msg}`
            }
            return msg
          })
          .filter(Boolean)

        if (validationErrors.length > 0) {
          return validationErrors.join('; ')
        }
      }
      if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
        const detailRecord = detail as Record<string, unknown>
        if (typeof detailRecord.message === 'string' && detailRecord.message.trim()) {
          return detailRecord.message
        }
      }
    }

    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message
    }

    if (typeof record.error === 'string' && record.error.trim()) {
      return record.error
    }
  }

  if (rawText.trim() && !rawText.trim().startsWith('<')) {
    return `${defaultMessage} — ${rawText.trim().slice(0, 200)}`
  }

  return defaultMessage
}

/**
 * Generic HTTP request client with timeout handling and error parsing.
 * Uses the browser native fetch API.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // Normalize URL path
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const fullUrl = `${API_CONFIG.BASE_URL}${normalizedEndpoint}`

  // Timeout controller
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS)

  const headers = {
    ...API_CONFIG.DEFAULT_HEADERS,
    ...(options.headers || {}),
  }

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const rawText = await response.text()
    let responseData: T | null = null
    let jsonParseFailed = false

    const contentType = response.headers.get('content-type')
    const looksJson = Boolean(
      (contentType && contentType.includes('application/json')) ||
        rawText.trim().startsWith('{') ||
        rawText.trim().startsWith('[')
    )

    if (rawText.trim() && looksJson) {
      try {
        responseData = JSON.parse(rawText) as T
      } catch {
        responseData = null
        jsonParseFailed = true
      }
    }

    if (!response.ok) {
      return {
        data: null,
        error: extractHttpErrorMessage(
          response.status,
          response.statusText,
          responseData,
          rawText
        ),
        status: response.status,
        ok: false,
      }
    }

    if (jsonParseFailed) {
      return {
        data: null,
        error: 'The backend returned an invalid JSON response.',
        status: response.status,
        ok: false,
      }
    }

    return {
      data: responseData,
      error: null,
      status: response.status,
      ok: true,
    }
  } catch (err: unknown) {
    clearTimeout(timeoutId)

    // Handle abort/timeout
    if (err instanceof DOMException && err.name === 'AbortError') {
      return {
        data: null,
        error: `Request timed out after ${API_CONFIG.TIMEOUT_MS / 1000} seconds. The backend analysis took too long or the server may be offline.`,
        status: 408,
        ok: false,
      }
    }

    // Handle network dropouts / connection refused
    const message = err instanceof Error ? err.message : 'Unknown network error'
    return {
      data: null,
      error: `Unable to reach the SIFTRIX backend at ${API_CONFIG.BASE_URL}. Please ensure the FastAPI server is running. (${message})`,
      status: 0,
      ok: false,
    }
  }
}

/**
 * Convenient HTTP GET wrapper.
 */
export function apiGet<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'GET',
  })
}

/**
 * Convenient HTTP POST wrapper.
 */
export function apiPost<T>(
  endpoint: string,
  body?: unknown,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}
