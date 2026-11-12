export const SESSION_ID_STORAGE_KEY = 'siftrix.session.id'
export const SESSION_ID_HEADER = 'X-Session-ID'

const MAX_SESSION_ID_LENGTH = 128

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
 * Returns true when an HTTP 401 occurs solely because no X-Session-ID has been
 * initialized yet in browser storage, allowing list/dashboard views to render
 * an empty initial state instead of an unexpected connection error.
 */
export function isMissingSessionUnauthorized(
  status: number,
  storage: SessionStorageLike | null = getDefaultSessionStorage()
): boolean {
  return status === 401 && !hasSavedSessionId(storage)
}

/**
 * Builds request headers containing X-Session-ID when a valid session exists.
 * Omits the header cleanly when absent instead of sending empty or null values.
 */
export function getSessionHeaders(
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
