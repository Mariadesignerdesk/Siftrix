export const SESSION_ID_STORAGE_KEY = 'siftrix.session.id'
export const SESSION_ID_HEADER = 'X-Session-ID'
export const AUTH_TOKEN_STORAGE_KEY = 'siftrix_auth_token_v2'
export const AUTHORIZATION_HEADER = 'Authorization'

const MAX_SESSION_ID_LENGTH = 128
const MAX_AUTH_TOKEN_LENGTH = 4096

let memoryAuthToken: string | null = null

export function setMemoryAuthToken(token: string | null): void {
  memoryAuthToken = token
}

export interface SessionStorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem?: (key: string) => void
}

function getDefaultSessionStorage(): SessionStorageLike | null {
  try {
    if (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined'
    ) {
      return window.localStorage
    }
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      return globalThis.localStorage ?? null
    }
  } catch {
    return null
  }
  return null
}

/**
 * Validates and trims a session identifier without exposing or defaulting to
 * any hardcoded value. Rejects blank or multi-line header values.
 */
export function normalizeSessionId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed || trimmed.length > MAX_SESSION_ID_LENGTH) {
    return null
  }

  for (let i = 0; i < trimmed.length; i += 1) {
    const code = trimmed.charCodeAt(i)
    if (code < 32 || code === 127) {
      return null
    }
  }

  return trimmed
}

/**
 * Safely loads the saved X-Session-ID from browser storage.
 * Returns null if missing, invalid, or storage is inaccessible.
 */
export function loadSessionId(
  storage: SessionStorageLike | null = getDefaultSessionStorage()
): string | null {
  if (!storage) {
    return null
  }

  try {
    return normalizeSessionId(storage.getItem(SESSION_ID_STORAGE_KEY))
  } catch {
    return null
  }
}

/**
 * Safely persists a valid X-Session-ID to browser storage.
 * Never throws when storage is unavailable or quota-restricted.
 */
export function saveSessionId(
  sessionId: unknown,
  storage: SessionStorageLike | null = getDefaultSessionStorage()
): boolean {
  const normalized = normalizeSessionId(sessionId)
  if (!normalized || !storage) {
    return false
  }

  try {
    storage.setItem(SESSION_ID_STORAGE_KEY, normalized)
    return true
  } catch {
    return false
  }
}

/**
 * Removes any persisted X-Session-ID from browser storage cleanly.
 */
export function clearSessionId(
  storage: SessionStorageLike | null = getDefaultSessionStorage()
): boolean {
  if (!storage) {
    return false
  }

  try {
    if (typeof storage.removeItem === 'function') {
      storage.removeItem(SESSION_ID_STORAGE_KEY)
    } else {
      storage.setItem(SESSION_ID_STORAGE_KEY, '')
    }
    return true
  } catch {
    return false
  }
}

/**
 * Returns whether a valid X-Session-ID is currently stored.
 */
export function hasSavedSessionId(
  storage: SessionStorageLike | null = getDefaultSessionStorage()
): boolean {
  return loadSessionId(storage) !== null
}

/**
 * Safely loads the saved JWT bearer token from browser storage or memory fallback.
 */
export function loadAuthToken(
  storage?: SessionStorageLike | null
): string | null {
  if (storage !== undefined) {
    if (!storage) return null
    try {
      const raw = storage.getItem(AUTH_TOKEN_STORAGE_KEY)
      if (typeof raw === 'string' && raw.trim() && raw.trim().length <= MAX_AUTH_TOKEN_LENGTH) {
        return raw.trim()
      }
    } catch {
      return null
    }
    return null
  }

  try {
    const defaultStorage = getDefaultSessionStorage()
    if (defaultStorage) {
      const fromLocal = defaultStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
      if (typeof fromLocal === 'string' && fromLocal.trim() && fromLocal.trim().length <= MAX_AUTH_TOKEN_LENGTH) {
        return fromLocal.trim()
      }
    }
    if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
      const fromSession = window.sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
      if (typeof fromSession === 'string' && fromSession.trim() && fromSession.trim().length <= MAX_AUTH_TOKEN_LENGTH) {
        return fromSession.trim()
      }
    }
  } catch {
    // Fall back to memory token
  }

  return memoryAuthToken
}

/**
 * Returns whether a valid authentication bearer token is currently stored.
 */
export function hasSavedAuthToken(
  storage?: SessionStorageLike | null
): boolean {
  return loadAuthToken(storage) !== null
}

/**
 * Returns true when an HTTP 401 occurs solely because no X-Session-ID or auth token
 * has been initialized yet in browser storage, allowing list/dashboard views to render
 * an empty initial state instead of an unexpected connection error.
 */
export function isMissingSessionUnauthorized(
  status: number,
  storage: SessionStorageLike | null = getDefaultSessionStorage()
): boolean {
  return (
    status === 401 &&
    !hasSavedSessionId(storage) &&
    !hasSavedAuthToken(storage)
  )
}

/**
 * Builds request headers containing only the guest X-Session-ID when present.
 * Used during login/signup so the backend can migrate prior guest scans.
 */
export function getGuestSessionHeaders(
  storage: SessionStorageLike | null = getDefaultSessionStorage()
): Record<string, string> {
  const sessionId = loadSessionId(storage)
  if (!sessionId) {
    return {}
  }

  return {
    [SESSION_ID_HEADER]: sessionId,
  }
}

/**
 * Builds request headers for API calls:
 * - Priority 1: Authorization Bearer token when the user is authenticated.
 * - Priority 2: X-Session-ID header when operating as a guest session.
 * Omits headers cleanly when absent.
 */
export function getSessionHeaders(
  storage?: SessionStorageLike | null
): Record<string, string> {
  const token = loadAuthToken(storage)
  if (token) {
    return {
      [AUTHORIZATION_HEADER]: `Bearer ${token}`,
    }
  }

  const targetStorage = storage === undefined ? getDefaultSessionStorage() : storage
  return getGuestSessionHeaders(targetStorage)
}
