import { describe, it, expect } from 'vitest'
import {
  SESSION_ID_HEADER,
  SESSION_ID_STORAGE_KEY,
  clearSessionId,
  getSessionHeaders,
  hasSavedSessionId,
  isMissingSessionUnauthorized,
  loadSessionId,
  normalizeSessionId,
  saveSessionId,
  type SessionStorageLike,
} from './session'

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

    expect(isMissingSessionUnauthorized(401, emptyStorage)).toBe(true)
    expect(isMissingSessionUnauthorized(401, populatedStorage)).toBe(false)
    expect(isMissingSessionUnauthorized(500, emptyStorage)).toBe(false)
    expect(isMissingSessionUnauthorized(0, emptyStorage)).toBe(false)
  })
})
