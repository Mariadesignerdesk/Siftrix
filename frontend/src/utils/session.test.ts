import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AUTHORIZATION_HEADER,
  AUTH_TOKEN_STORAGE_KEY,
  SESSION_ID_HEADER,
  SESSION_ID_STORAGE_KEY,
  clearSessionId,
  getGuestSessionHeaders,
  getSessionHeaders,
  hasSavedAuthToken,
  hasSavedSessionId,
  isMissingSessionUnauthorized,
  loadAuthToken,
  loadSessionId,
  normalizeSessionId,
  saveSessionId,
  setMemoryAuthToken,
  type SessionStorageLike,
} from './session'
import {
  loadAuthPreviewSession,
  saveAuthPreviewSession,
} from './authPreview'

function createMemoryStorage(initial: Record<string, string> = {}): {
  storage: SessionStorageLike
  backing: Map<string, string>
} {
  const backing = new Map<string, string>(Object.entries(initial))
  return {
    backing,
    storage: {
      getItem: (key: string) => backing.get(key) ?? null,
      setItem: (key: string, value: string) => {
        backing.set(key, value)
      },
      removeItem: (key: string) => {
        backing.delete(key)
      },
    },
  }
}

describe('session persistence helpers', () => {
  afterEach(() => {
    setMemoryAuthToken(null)
    vi.unstubAllGlobals()
  })
  it('saves, loads, clears, and builds X-Session-ID headers safely', () => {
    const { storage, backing } = createMemoryStorage({
      unrelated_key: 'keep-intact',
    })

    expect(loadSessionId(storage)).toBeNull()
    expect(hasSavedSessionId(storage)).toBe(false)
    expect(getSessionHeaders(storage)).toEqual({})

    const generatedSession = '11111111-1111-4111-8111-111111111111'
    expect(saveSessionId(`  ${generatedSession}  `, storage)).toBe(true)
    expect(backing.get(SESSION_ID_STORAGE_KEY)).toBe(generatedSession)
    expect(loadSessionId(storage)).toBe(generatedSession)
    expect(hasSavedSessionId(storage)).toBe(true)
    expect(getSessionHeaders(storage)).toEqual({
      [SESSION_ID_HEADER]: generatedSession,
    })

    expect(clearSessionId(storage)).toBe(true)
    expect(loadSessionId(storage)).toBeNull()
    expect(hasSavedSessionId(storage)).toBe(false)
    expect(getSessionHeaders(storage)).toEqual({})
    expect(backing.get('unrelated_key')).toBe('keep-intact')
  })

  it('rejects empty, oversized, or control-character session values', () => {
    const { storage } = createMemoryStorage()

    expect(normalizeSessionId(null)).toBeNull()
    expect(normalizeSessionId(undefined)).toBeNull()
    expect(normalizeSessionId('   ')).toBeNull()
    expect(normalizeSessionId('bad\nid')).toBeNull()
    expect(normalizeSessionId('bad\rid')).toBeNull()
    expect(normalizeSessionId('a'.repeat(129))).toBeNull()

    expect(saveSessionId('', storage)).toBe(false)
    expect(saveSessionId('bad\nvalue', storage)).toBe(false)
    expect(loadSessionId(storage)).toBeNull()
  })

  it('handles missing or throwing browser storage gracefully without crashing', () => {
    const brokenStorage: SessionStorageLike = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => {
        throw new Error('SecurityError')
      },
    }

    expect(loadSessionId(null)).toBeNull()
    expect(saveSessionId('11111111-1111-4111-8111-111111111111', null)).toBe(false)
    expect(clearSessionId(null)).toBe(false)
    expect(getSessionHeaders(null)).toEqual({})

    expect(loadSessionId(brokenStorage)).toBeNull()
    expect(
      saveSessionId('11111111-1111-4111-8111-111111111111', brokenStorage)
    ).toBe(false)
    expect(clearSessionId(brokenStorage)).toBe(false)
    expect(getSessionHeaders(brokenStorage)).toEqual({})
  })

  it('identifies 401 caused solely by an uninitialized session cleanly', () => {
    const { storage: emptyStorage } = createMemoryStorage()
    const { storage: populatedStorage } = createMemoryStorage({
      [SESSION_ID_STORAGE_KEY]: '11111111-1111-4111-8111-111111111111',
    })
    const missingSessionDetail =
      'Authentication or X-Session-ID header required to access scan history'

    expect(isMissingSessionUnauthorized(401, emptyStorage, missingSessionDetail)).toBe(true)
    expect(isMissingSessionUnauthorized(401, emptyStorage)).toBe(false)
    expect(isMissingSessionUnauthorized(401, emptyStorage, undefined)).toBe(false)
    expect(isMissingSessionUnauthorized(401, emptyStorage, null)).toBe(false)
    expect(isMissingSessionUnauthorized(401, emptyStorage, '')).toBe(false)
    expect(isMissingSessionUnauthorized(401, emptyStorage, 'Token has expired')).toBe(false)
    expect(
      isMissingSessionUnauthorized(401, populatedStorage, missingSessionDetail)
    ).toBe(false)
    expect(
      isMissingSessionUnauthorized(500, emptyStorage, missingSessionDetail)
    ).toBe(false)
    expect(
      isMissingSessionUnauthorized(0, emptyStorage, missingSessionDetail)
    ).toBe(false)
  })

  it('loads auth tokens across localStorage, sessionStorage, and memory fallback safely', () => {
    const { storage: localMock } = createMemoryStorage()
    const { storage: sessionMock } = createMemoryStorage()

    vi.stubGlobal('localStorage', localMock)
    vi.stubGlobal('sessionStorage', sessionMock)

    expect(loadAuthToken()).toBeNull()
    expect(hasSavedAuthToken()).toBe(false)

    // 1. Memory token fallback when both browser storages are empty
    setMemoryAuthToken('  jwt_memory_token_01  ')
    expect(loadAuthToken()).toBe('jwt_memory_token_01')
    expect(hasSavedAuthToken()).toBe(true)

    // 2. sessionStorage (rememberMe=false) takes precedence over memory fallback
    sessionMock.setItem(AUTH_TOKEN_STORAGE_KEY, '  jwt_session_token_02  ')
    expect(loadAuthToken()).toBe('jwt_session_token_02')

    // 3. localStorage (rememberMe=true) takes precedence over sessionStorage and memory
    localMock.setItem(AUTH_TOKEN_STORAGE_KEY, '  jwt_local_token_03  ')
    expect(loadAuthToken()).toBe('jwt_local_token_03')

    // 4. Rejects blank, control-character, and oversized token values
    localMock.setItem(AUTH_TOKEN_STORAGE_KEY, 'bad\r\ntoken')
    sessionMock.setItem(AUTH_TOKEN_STORAGE_KEY, '   ')
    setMemoryAuthToken('a'.repeat(4097))
    expect(loadAuthToken()).toBeNull()
    expect(hasSavedAuthToken()).toBe(false)

    // 5. Falls back cleanly to memory token when browser storage throws SecurityError
    const throwingStorage: SessionStorageLike = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('SecurityError')
      },
    }
    vi.stubGlobal('localStorage', throwingStorage)
    vi.stubGlobal('sessionStorage', throwingStorage)
    setMemoryAuthToken('jwt_resilient_memory_token')
    expect(loadAuthToken()).toBe('jwt_resilient_memory_token')
    expect(loadAuthToken(throwingStorage)).toBeNull()
    expect(loadAuthToken(null)).toBeNull()
  })

  it('prioritizes Authorization Bearer header in getSessionHeaders and isolates X-Session-ID in getGuestSessionHeaders', () => {
    const guestSessionId = '22222222-2222-4222-8222-222222222222'
    const { storage: localMock } = createMemoryStorage({
      [SESSION_ID_STORAGE_KEY]: guestSessionId,
    })
    const { storage: sessionMock } = createMemoryStorage()

    vi.stubGlobal('localStorage', localMock)
    vi.stubGlobal('sessionStorage', sessionMock)

    // Unauthenticated guest -> both helpers return X-Session-ID
    expect(getSessionHeaders()).toEqual({
      [SESSION_ID_HEADER]: guestSessionId,
    })
    expect(getGuestSessionHeaders()).toEqual({
      [SESSION_ID_HEADER]: guestSessionId,
    })

    // Authenticated via memory fallback -> Bearer wins in getSessionHeaders; getGuestSessionHeaders still returns only X-Session-ID
    setMemoryAuthToken('jwt_mem_priority')
    expect(getSessionHeaders()).toEqual({
      [AUTHORIZATION_HEADER]: 'Bearer jwt_mem_priority',
    })
    expect(getGuestSessionHeaders()).toEqual({
      [SESSION_ID_HEADER]: guestSessionId,
    })

    // Authenticated via sessionStorage -> Bearer wins
    sessionMock.setItem(AUTH_TOKEN_STORAGE_KEY, 'jwt_session_priority')
    expect(getSessionHeaders()).toEqual({
      [AUTHORIZATION_HEADER]: 'Bearer jwt_session_priority',
    })
    expect(getGuestSessionHeaders()).toEqual({
      [SESSION_ID_HEADER]: guestSessionId,
    })

    // Authenticated via localStorage -> Bearer wins (both default and explicit storage)
    localMock.setItem(AUTH_TOKEN_STORAGE_KEY, 'jwt_local_priority')
    expect(getSessionHeaders()).toEqual({
      [AUTHORIZATION_HEADER]: 'Bearer jwt_local_priority',
    })
    expect(getSessionHeaders(localMock)).toEqual({
      [AUTHORIZATION_HEADER]: 'Bearer jwt_local_priority',
    })
    expect(getGuestSessionHeaders(localMock)).toEqual({
      [SESSION_ID_HEADER]: guestSessionId,
    })

    // When guest X-Session-ID is cleared, getGuestSessionHeaders returns {}
    clearSessionId(localMock)
    expect(getGuestSessionHeaders(localMock)).toEqual({})
  })

  it('never treats expired JWT 401 or authenticated 401 as missing-session guest history', () => {
    const missingSessionDetail =
      'Authentication or X-Session-ID header required to access scan history'
    const expiredTokenDetail = 'Token has expired'
    const invalidTokenDetail = 'Could not validate authentication credentials'

    const { storage: localMock } = createMemoryStorage()
    const { storage: sessionMock } = createMemoryStorage()
    vi.stubGlobal('localStorage', localMock)
    vi.stubGlobal('sessionStorage', sessionMock)

    // First-time guest with neither session ID nor token + missing-session detail -> true
    expect(isMissingSessionUnauthorized(401, undefined, missingSessionDetail)).toBe(
      true
    )

    // Expired or invalid JWT 401 EVEN AFTER token/session storage was cleared by auto-logout -> false
    expect(isMissingSessionUnauthorized(401, undefined, expiredTokenDetail)).toBe(
      false
    )
    expect(isMissingSessionUnauthorized(401, undefined, invalidTokenDetail)).toBe(
      false
    )

    // Any stored token (localStorage, sessionStorage, or memory) prevents missing-session classification
    setMemoryAuthToken('jwt_active_mem')
    expect(isMissingSessionUnauthorized(401, undefined, missingSessionDetail)).toBe(
      false
    )
    setMemoryAuthToken(null)

    sessionMock.setItem(AUTH_TOKEN_STORAGE_KEY, 'jwt_active_session')
    expect(isMissingSessionUnauthorized(401, undefined, missingSessionDetail)).toBe(
      false
    )
    sessionMock.removeItem?.(AUTH_TOKEN_STORAGE_KEY)

    localMock.setItem(AUTH_TOKEN_STORAGE_KEY, 'jwt_active_local')
    expect(isMissingSessionUnauthorized(401, undefined, missingSessionDetail)).toBe(
      false
    )
    expect(isMissingSessionUnauthorized(401, localMock, missingSessionDetail)).toBe(
      false
    )
  })

  it('supports optional id field on AuthPreviewSession while preserving existing preview behavior', () => {
    const { storage } = createMemoryStorage()
    const previewStorage = {
      getItem: storage.getItem,
      setItem: storage.setItem,
      removeItem: storage.removeItem!,
    }

    // With optional id present (and trimmed)
    saveAuthPreviewSession(
      {
        id: '  aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee  ',
        name: 'Sarah Analyst',
        email: 'sarah@siftrix.internal',
        mode: 'signin',
        createdAt: '2026-11-28T01:00:00Z',
      },
      previewStorage
    )
    expect(loadAuthPreviewSession(previewStorage)).toEqual({
      id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      name: 'Sarah Analyst',
      email: 'sarah@siftrix.internal',
      mode: 'signin',
      createdAt: '2026-11-28T01:00:00Z',
    })

    // Without id (existing preview shape preserved identically)
    saveAuthPreviewSession(
      {
        name: 'Guest Preview',
        email: 'preview@siftrix.internal',
        mode: 'signup',
        createdAt: '2026-11-28T01:05:00Z',
      },
      previewStorage
    )
    expect(loadAuthPreviewSession(previewStorage)).toEqual({
      name: 'Guest Preview',
      email: 'preview@siftrix.internal',
      mode: 'signup',
      createdAt: '2026-11-28T01:05:00Z',
    })
  })
})
