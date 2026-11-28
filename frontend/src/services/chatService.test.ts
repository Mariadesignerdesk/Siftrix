import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MarkdownMessage from '../components/MarkdownMessage'
import * as apiClient from './apiClient'
import {
  AUTH_STORAGE_KEY,
  AUTH_TOKEN_KEY,
  loginUser,
  logoutUser,
} from './authService'
import {
  CHAT_STORAGE_KEY,
  CHAT_SYNC_EVENT,
  clearChatHistory,
  createUserMessage,
  DEFAULT_SUGGESTED_QUESTIONS,
  extractPlainHttpUrl,
  getChatStorageKey,
  loadChatHistory,
  saveChatHistory,
  sendChatMessage,
  subscribeChatHistory,
  type ChatMessage,
} from './chatService'
import { saveSessionId } from '../utils/session'

describe('chatService', () => {
  beforeEach(() => {
    clearChatHistory()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads default initial greeting when storage is clean', () => {
    const history = loadChatHistory()
    expect(history.length).toBeGreaterThanOrEqual(1)
    expect(history[0].role).toBe('assistant')
    expect(history[0].citations).toBeDefined()
  })

  it('creates typed user message with unique ID', () => {
    const msg = createUserMessage('Is this link safe?')
    expect(msg.role).toBe('user')
    expect(msg.content).toBe('Is this link safe?')
    expect(msg.id).toContain('usr_')
    expect(msg.timestamp).toBeDefined()
  })

  it('persists and clears chat messages safely', () => {
    const custom: ChatMessage[] = [
      {
        id: 'test-1',
        role: 'user',
        content: 'Test message',
        timestamp: new Date().toISOString(),
      },
    ]
    saveChatHistory(custom)
    expect(loadChatHistory()).toEqual(custom)

    clearChatHistory()
    const resetHistory = loadChatHistory()
    expect(resetHistory[0].id).toBe('msg_welcome')
  })

  it('responds with phishing containment protocol when clicked is mentioned', async () => {
    const history = loadChatHistory()
    const response = await sendChatMessage('I accidentally clicked a suspicious link!', history)
    expect(response.role).toBe('assistant')
    expect(response.content).toContain('Breach Containment Protocol')
    expect(response.citations?.length).toBeGreaterThan(0)
  })

  it('provides Urdu responses when Urdu text or query is detected', async () => {
    const history = loadChatHistory()
    const response = await sendChatMessage('کیا یہ لنک محفوظ ہے؟', history)
    expect(response.role).toBe('assistant')
    expect(response.content).toContain('سائبر سیکیورٹی مشیر')
    expect(response.citations).toContain('SIFTRIX اردو سیکیورٹی گائیڈ')
  })

  it('has default suggested cybersecurity questions', () => {
    expect(DEFAULT_SUGGESTED_QUESTIONS.length).toBeGreaterThanOrEqual(4)
  })

  describe('extractPlainHttpUrl & URL chat handling', () => {
    it('strips trailing punctuation and unbalanced brackets while preserving balanced parens', () => {
      expect(extractPlainHttpUrl('Visit https://example.com.')).toBe('https://example.com')
      expect(extractPlainHttpUrl('Check (https://example.com/login)!')).toBe(
        'https://example.com/login'
      )
      expect(extractPlainHttpUrl('See [https://example.com/docs], please;')).toBe(
        'https://example.com/docs'
      )
      expect(
        extractPlainHttpUrl('Read https://en.wikipedia.org/wiki/Phishing_(security).')
      ).toBe('https://en.wikipedia.org/wiki/Phishing_(security)')
      expect(extractPlainHttpUrl('یہ لنک دیکھیں https://example.com/path۔')).toBe(
        'https://example.com/path'
      )
    })

    it('preserves ports, query strings, fragments, and percent-encoded characters and renders safely', async () => {
      vi.useFakeTimers()
      const complexUrl =
        'https://portal.example.org:8443/v1/verify?redirect=%2Fhome&name=Jane%20Doe#step-2'
      const prompt = `Please inspect (${complexUrl}), thanks!`

      expect(extractPlainHttpUrl(prompt)).toBe(complexUrl)

      const pending = sendChatMessage(prompt, loadChatHistory())
      await vi.advanceTimersByTimeAsync(700)
      const reply = await pending

      const html = renderToStaticMarkup(createElement(MarkdownMessage, { content: reply.content }))
      expect(html).toContain(
        'href="https://portal.example.org:8443/v1/verify?redirect=%2Fhome&amp;name=Jane%20Doe#step-2"'
      )
      expect(html).toContain('target="_blank"')
      expect(html).toContain('rel="noopener noreferrer nofollow"')
    })

    it('ignores malformed, credentialed, or inline-code URLs without errors and preserves normal responses', async () => {
      vi.useFakeTimers()

      expect(extractPlainHttpUrl('')).toBeNull()
      expect(extractPlainHttpUrl('What does https:// or https://... mean?')).toBeNull()
      expect(extractPlainHttpUrl('Malformed https://example..com or https://a.com:99999')).toBeNull()
      expect(extractPlainHttpUrl('Spoof https://chase.com@evil.example/login')).toBeNull()
      expect(extractPlainHttpUrl('Code sample `https://chase.com` in backticks')).toBeNull()

      // Falls through to normal SSRF/phishing/general responses without claiming a broken URL is a link
      const malformedPending = sendChatMessage(
        'Why is https://... or `https://chase.com` risky in phishing?',
        loadChatHistory()
      )
      await vi.advanceTimersByTimeAsync(700)
      const malformedReply = await malformedPending
      expect(malformedReply.content).toContain('How to Identify Phishing Links')
      expect(malformedReply.content).not.toContain('Here is the URL you shared')

      // Normal English SSRF & fallback responses remain unchanged
      const ssrfPending = sendChatMessage('What is SSRF?', loadChatHistory())
      await vi.advanceTimersByTimeAsync(700)
      expect((await ssrfPending).content).toContain('Server-Side Request Forgery (SSRF) Explained')

      const generalPending = sendChatMessage('Tell me about MFA hygiene', loadChatHistory())
      await vi.advanceTimersByTimeAsync(700)
      expect((await generalPending).content).toContain('Thank you for your cybersecurity question.')
    })
  })

  describe('Phase 4 Step 2.3 — Session-scoped chat privacy, async write guards, and legacy isolation', () => {
    function createStorageMock(): Storage {
      let store: Record<string, string> = {}
      return {
        getItem: (key: string) => (key in store ? store[key] : null),
        setItem: (key: string, value: string) => {
          store[key] = String(value)
        },
        removeItem: (key: string) => {
          delete store[key]
        },
        clear: () => {
          store = {}
        },
        get length() {
          return Object.keys(store).length
        },
        key: (i: number) => Object.keys(store)[i] || null,
      }
    }

    const hadWindow = 'window' in globalThis
    const originalWindow = globalThis.window
    const hadLocalStorage = 'localStorage' in globalThis
    const originalLocalStorage = globalThis.localStorage

    let localMock: Storage
    let sessionMock: Storage

    const userABackend = {
      id: 'aaaa1111-2222-4333-8444-555555555555',
      email: 'alice@siftrix.internal',
      full_name: 'Alice Analyst',
      is_active: true,
      created_at: '2026-11-28T03:00:00Z',
    }

    const userBBackend = {
      id: 'bbbb1111-2222-4333-8444-666666666666',
      email: 'bob@siftrix.internal',
      full_name: 'Bob Responder',
      is_active: true,
      created_at: '2026-11-28T03:05:00Z',
    }

    function seedAuthenticatedUser(
      user: typeof userABackend,
      token: string,
      storage: Storage = localMock
    ) {
      storage.setItem(AUTH_TOKEN_KEY, token)
      storage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          id: user.id,
          name: user.full_name,
          email: user.email,
          role: 'analyst',
          organization: 'SIFTRIX Cyber Defense',
          createdAt: user.created_at,
        })
      )
    }

    beforeEach(() => {
      localMock = createStorageMock()
      sessionMock = createStorageMock()
      const eventTarget = new EventTarget()

      Object.defineProperty(globalThis, 'localStorage', {
        value: localMock,
        writable: true,
        configurable: true,
      })
      Object.defineProperty(globalThis, 'window', {
        value: {
          localStorage: localMock,
          sessionStorage: sessionMock,
          addEventListener: eventTarget.addEventListener.bind(eventTarget),
          removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
          dispatchEvent: eventTarget.dispatchEvent.bind(eventTarget),
        },
        writable: true,
        configurable: true,
      })

      logoutUser()
      clearChatHistory()
    })

    afterEach(() => {
      vi.restoreAllMocks()
      vi.useRealTimers()
      logoutUser()

      if (hadWindow) {
        Object.defineProperty(globalThis, 'window', {
          value: originalWindow,
          writable: true,
          configurable: true,
        })
      } else {
        Reflect.deleteProperty(globalThis, 'window')
      }

      if (hadLocalStorage) {
        Object.defineProperty(globalThis, 'localStorage', {
          value: originalLocalStorage,
          writable: true,
          configurable: true,
        })
      } else {
        Reflect.deleteProperty(globalThis, 'localStorage')
      }
    })

    it('1. isolates storage keys and chat histories between User A and User B', () => {
      seedAuthenticatedUser(userABackend, 'jwt_alice_chat')
      const keyA = getChatStorageKey()
      expect(keyA).toBe(`siftrix_chat_history_usr_${userABackend.id}`)

      const aliceMsg = createUserMessage('Alice private phishing URL: https://alice-target.example')
      saveChatHistory([...loadChatHistory(), aliceMsg])
      expect(loadChatHistory().some((m) => m.content.includes('alice-target.example'))).toBe(true)

      // Switch to User B
      logoutUser()
      seedAuthenticatedUser(userBBackend, 'jwt_bob_chat')
      const keyB = getChatStorageKey()
      expect(keyB).toBe(`siftrix_chat_history_usr_${userBBackend.id}`)
      expect(keyB).not.toBe(keyA)

      // User B starts with clean greeting and cannot see Alice's messages
      const bobInitial = loadChatHistory()
      expect(bobInitial).toHaveLength(1)
      expect(bobInitial[0].id).toBe('msg_welcome')
      expect(bobInitial.some((m) => m.content.includes('alice-target.example'))).toBe(false)

      const bobMsg = createUserMessage('Bob SOC incident query')
      saveChatHistory([...bobInitial, bobMsg])

      expect(localMock.getItem(keyA)).toContain('alice-target.example')
      expect(localMock.getItem(keyA)).not.toContain('Bob SOC incident query')
      expect(localMock.getItem(keyB)).toContain('Bob SOC incident query')
      expect(localMock.getItem(keyB)).not.toContain('alice-target.example')
    })

    it('2. separates guest session history (by guest X-Session-ID and fresh guest) from authenticated history', () => {
      // Guest Session 1
      const guestSession1 = '11111111-2222-4333-8444-aaaaaaaaaaaa'
      saveSessionId(guestSession1)
      const guestKey1 = getChatStorageKey()
      expect(guestKey1).toBe(`siftrix_chat_history_sess_${guestSession1}`)

      const guestMsg1 = createUserMessage('Guest 1 suspicious SMS check')
      saveChatHistory([...loadChatHistory(), guestMsg1])
      expect(loadChatHistory().some((m) => m.content === 'Guest 1 suspicious SMS check')).toBe(true)

      // Guest Session 2 has its own separate history
      const guestSession2 = '22222222-3333-4444-8555-bbbbbbbbbbbb'
      saveSessionId(guestSession2)
      expect(getChatStorageKey()).toBe(`siftrix_chat_history_sess_${guestSession2}`)
      expect(loadChatHistory().some((m) => m.content === 'Guest 1 suspicious SMS check')).toBe(false)

      // Authenticated User A does not inherit Guest 1 or Guest 2 chat history
      seedAuthenticatedUser(userABackend, 'jwt_alice_chat')
      expect(loadChatHistory().some((m) => m.content === 'Guest 1 suspicious SMS check')).toBe(false)
      saveChatHistory([...loadChatHistory(), createUserMessage('Alice private note')])

      // Logging out returns to clean guest mode without exposing Alice's history
      logoutUser()
      expect(getChatStorageKey()).toBe('siftrix_chat_history_guest')
      expect(loadChatHistory().some((m) => m.content === 'Alice private note')).toBe(false)
      expect(loadChatHistory()[0].id).toBe('msg_welcome')
    })

    it('3. preserves and reloads the same user history across logout and subsequent re-login', () => {
      seedAuthenticatedUser(userABackend, 'jwt_alice_session_1')
      const alicePrompt = createUserMessage('Inspect https://bank-verify-alert.xyz')
      saveChatHistory([...loadChatHistory(), alicePrompt])

      // Alice logs out -> Guest uses chat -> Bob logs in and clears his own chat -> Bob logs out
      logoutUser()
      saveChatHistory([...loadChatHistory(), createUserMessage('Temporary guest question')])

      seedAuthenticatedUser(userBBackend, 'jwt_bob_session_1')
      saveChatHistory([...loadChatHistory(), createUserMessage('Bob message')])
      clearChatHistory()
      logoutUser()

      // Alice logs back in -> her own history is still intact
      seedAuthenticatedUser(userABackend, 'jwt_alice_session_2')
      const reloadedAlice = loadChatHistory()
      expect(reloadedAlice.some((m) => m.content === 'Inspect https://bank-verify-alert.xyz')).toBe(
        true
      )
      expect(reloadedAlice.some((m) => m.content === 'Temporary guest question')).toBe(false)
      expect(reloadedAlice.some((m) => m.content === 'Bob message')).toBe(false)
    })

    it('4. keeps in-memory fallback strictly isolated by scope when localStorage throws', async () => {
      const throwingStorage: Storage = {
        getItem: () => {
          throw new Error('SecurityError')
        },
        setItem: () => {
          throw new Error('QuotaExceededError')
        },
        removeItem: () => {
          throw new Error('SecurityError')
        },
        clear: () => {
          throw new Error('SecurityError')
        },
        length: 0,
        key: () => null,
      }

      Object.defineProperty(globalThis, 'localStorage', {
        value: throwingStorage,
        writable: true,
        configurable: true,
      })
      Object.defineProperty(globalThis.window, 'localStorage', {
        value: throwingStorage,
        writable: true,
        configurable: true,
      })
      Object.defineProperty(globalThis.window, 'sessionStorage', {
        value: throwingStorage,
        writable: true,
        configurable: true,
      })

      vi.spyOn(apiClient, 'apiPost')
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          error: null,
          data: {
            access_token: 'jwt_mem_alice',
            token_type: 'bearer',
            user: userABackend,
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          error: null,
          data: {
            access_token: 'jwt_mem_bob',
            token_type: 'bearer',
            user: userBBackend,
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          error: null,
          data: {
            access_token: 'jwt_mem_alice_again',
            token_type: 'bearer',
            user: userABackend,
          },
        })

      // Alice in memory-only mode
      await loginUser({
        email: userABackend.email,
        password: 'Password123!',
        rememberMe: true,
      })
      saveChatHistory([...loadChatHistory(), createUserMessage('Alice memory-only secret')])
      expect(loadChatHistory().some((m) => m.content === 'Alice memory-only secret')).toBe(true)

      // Logout to Guest in memory-only mode -> Alice's history is not visible
      logoutUser()
      expect(loadChatHistory().some((m) => m.content === 'Alice memory-only secret')).toBe(false)
      saveChatHistory([...loadChatHistory(), createUserMessage('Guest memory-only note')])

      // Bob logs in (memory-only) -> sees neither Alice's nor Guest's messages
      await loginUser({
        email: userBBackend.email,
        password: 'Password123!',
        rememberMe: true,
      })
      expect(loadChatHistory().some((m) => m.content === 'Alice memory-only secret')).toBe(false)
      expect(loadChatHistory().some((m) => m.content === 'Guest memory-only note')).toBe(false)

      // Alice logs back in within same page lifetime -> her memory-scoped history is still isolated & intact
      await loginUser({
        email: userABackend.email,
        password: 'Password123!',
        rememberMe: true,
      })
      expect(loadChatHistory().some((m) => m.content === 'Alice memory-only secret')).toBe(true)
      clearChatHistory()
      logoutUser()
      clearChatHistory()
    })

    it('5. prevents a pending User A sendChatMessage() from saving into Guest history after logout', async () => {
      vi.useFakeTimers()

      seedAuthenticatedUser(userABackend, 'jwt_alice_inflight')
      const aliceUserMsg = createUserMessage(
        'Confidential clicked link https://corp-payroll-login.example'
      )
      const aliceHistory = [...loadChatHistory(), aliceUserMsg]
      saveChatHistory(aliceHistory)

      const pendingReply = sendChatMessage(aliceUserMsg.content, aliceHistory)

      // User A logs out before the 600ms response finishes
      logoutUser()
      expect(getChatStorageKey()).toBe('siftrix_chat_history_guest')

      await vi.advanceTimersByTimeAsync(700)
      const reply = await pendingReply

      // Response format still resolves cleanly for caller finally-blocks
      expect(reply.role).toBe('assistant')
      expect(reply.content).toContain('https://corp-payroll-login.example')

      // Guest history was NOT written or polluted by User A's pending request
      expect(localMock.getItem('siftrix_chat_history_guest')).toBeNull()
      const guestHistory = loadChatHistory()
      expect(guestHistory).toHaveLength(1)
      expect(guestHistory[0].id).toBe('msg_welcome')
      expect(
        guestHistory.some((m) => m.content.includes('corp-payroll-login.example'))
      ).toBe(false)
    })

    it('6. prevents a pending User A sendChatMessage() from overwriting User B history after account switch', async () => {
      vi.useFakeTimers()

      seedAuthenticatedUser(userABackend, 'jwt_alice_inflight')
      const aliceUserMsg = createUserMessage('Alice clicked a phishing lure')
      const aliceHistory = [...loadChatHistory(), aliceUserMsg]
      saveChatHistory(aliceHistory)

      const pendingAlice = sendChatMessage(aliceUserMsg.content, aliceHistory)

      // User A logs out and User B logs in and records User B's own chat message while Alice's request is pending
      logoutUser()
      seedAuthenticatedUser(userBBackend, 'jwt_bob_active')
      const bobKey = getChatStorageKey()
      const bobMsg = createUserMessage('Bob SSRF architecture review')
      const bobHistory = [...loadChatHistory(), bobMsg]
      saveChatHistory(bobHistory)

      await vi.advanceTimersByTimeAsync(700)
      await pendingAlice

      // User B's history remains intact and contains none of Alice's messages
      const activeBobHistory = loadChatHistory()
      expect(activeBobHistory).toEqual(bobHistory)
      expect(activeBobHistory.some((m) => m.content.includes('Alice clicked'))).toBe(false)
      expect(localMock.getItem(bobKey)).toContain('Bob SSRF architecture review')
      expect(localMock.getItem(bobKey)).not.toContain('Alice clicked')
    })

    it('7. never loads, copies, displays, or deletes legacy shared siftrix_chat_history_v1 data', async () => {
      vi.useFakeTimers()

      const legacyPayload = JSON.stringify([
        {
          id: 'legacy_msg_1',
          role: 'user',
          content: 'Legacy shared sensitive URL https://legacy-secret.example',
          timestamp: '2026-11-20T00:00:00Z',
        },
      ])
      localMock.setItem(CHAT_STORAGE_KEY, legacyPayload)

      // 1. Fresh guest never loads legacy shared key
      expect(loadChatHistory()).toHaveLength(1)
      expect(loadChatHistory()[0].id).toBe('msg_welcome')

      // 2. Guest with X-Session-ID never loads legacy shared key
      saveSessionId('99999999-aaaa-4bbb-8ccc-dddddddddddd')
      expect(loadChatHistory()).toHaveLength(1)
      expect(loadChatHistory()[0].id).toBe('msg_welcome')

      // 3. Authenticated user never loads or copies legacy shared key when sending new messages
      seedAuthenticatedUser(userABackend, 'jwt_alice_legacy_check')
      const startHistory = loadChatHistory()
      expect(startHistory.some((m) => m.content.includes('legacy-secret.example'))).toBe(false)

      const userMsg = createUserMessage('What is SSRF?')
      const nextHistory = [...startHistory, userMsg]
      saveChatHistory(nextHistory)
      const pending = sendChatMessage(userMsg.content, nextHistory)
      await vi.advanceTimersByTimeAsync(700)
      await pending

      expect(
        loadChatHistory().some((m) => m.content.includes('legacy-secret.example'))
      ).toBe(false)

      // 4. Clearing scoped history and logging out leave the legacy key untouched
      clearChatHistory()
      logoutUser()
      expect(localMock.getItem(CHAT_STORAGE_KEY)).toBe(legacyPayload)
    })

    it('8. handles corrupt scoped JSON in localStorage gracefully without throwing', () => {
      seedAuthenticatedUser(userABackend, 'jwt_alice_corrupt')
      localMock.setItem(getChatStorageKey(), '{corrupt-json')

      const fallback = loadChatHistory()
      expect(fallback).toHaveLength(1)
      expect(fallback[0].id).toBe('msg_welcome')

      localMock.setItem(getChatStorageKey(), JSON.stringify([{ invalid: true }]))
      expect(loadChatHistory()[0].id).toBe('msg_welcome')
    })

    describe('Phase 4 Step 2.4 — Guest migration, same-scope async/clear safety, quota fallback, and dual-widget sync', () => {
      it('1. (C1) migrates pre-scan sessionless guest history to the assigned X-Session-ID in both localStorage and memory fallback, removing the old guest bucket', () => {
        // A. Normal localStorage migration
        expect(getChatStorageKey()).toBe('siftrix_chat_history_guest')
        const preScanPrompt = createUserMessage(
          'Pre-scan guest query about https://suspicious-parcel.example'
        )
        saveChatHistory([...loadChatHistory(), preScanPrompt])
        expect(localMock.getItem('siftrix_chat_history_guest')).toContain(
          'suspicious-parcel.example'
        )

        // Scan completes and assigns X-Session-ID
        const assignedSessionId = '33333333-4444-4555-8666-cccccccccccc'
        saveSessionId(assignedSessionId)

        const migrated = loadChatHistory()
        expect(getChatStorageKey()).toBe(
          `siftrix_chat_history_sess_${assignedSessionId}`
        )
        expect(
          migrated.some((m) => m.content.includes('suspicious-parcel.example'))
        ).toBe(true)
        expect(
          localMock.getItem(`siftrix_chat_history_sess_${assignedSessionId}`)
        ).toContain('suspicious-parcel.example')
        expect(localMock.getItem('siftrix_chat_history_guest')).toBeNull()

        // B. Scoped memory-fallback migration when localStorage.setItem throws QuotaExceededError
        logoutUser()
        const quotaStorage: Storage = {
          getItem: (k: string) => localMock.getItem(k),
          setItem: () => {
            throw new Error('QuotaExceededError')
          },
          removeItem: (k: string) => localMock.removeItem(k),
          clear: () => localMock.clear(),
          get length() {
            return localMock.length
          },
          key: (i: number) => localMock.key(i),
        }
        Object.defineProperty(globalThis, 'localStorage', {
          value: quotaStorage,
          writable: true,
          configurable: true,
        })
        Object.defineProperty(globalThis.window, 'localStorage', {
          value: quotaStorage,
          writable: true,
          configurable: true,
        })

        const memGuestMsg = createUserMessage('Memory pre-scan guest question')
        saveChatHistory([...loadChatHistory(), memGuestMsg])
        expect(
          loadChatHistory().some((m) => m.content === 'Memory pre-scan guest question')
        ).toBe(true)

        // Simulate X-Session-ID becoming readable (e.g., in backing store)
        const memSessionId = '44444444-5555-4666-8777-dddddddddddd'
        localMock.setItem('siftrix.session.id', memSessionId)

        const migratedMem = loadChatHistory()
        expect(getChatStorageKey()).toBe(
          `siftrix_chat_history_sess_${memSessionId}`
        )
        expect(
          migratedMem.some((m) => m.content === 'Memory pre-scan guest question')
        ).toBe(true)

        // Clearing X-Session-ID shows old memory guest bucket was removed after migration
        localMock.removeItem('siftrix.session.id')
        expect(
          loadChatHistory().some((m) => m.content === 'Memory pre-scan guest question')
        ).toBe(false)
      })

      it('2. (C1) never overwrites existing session-scoped history with older sessionless guest history during migration', () => {
        const sessionId = '55555555-6666-4777-8888-eeeeeeeeeeee'
        const destKey = `siftrix_chat_history_sess_${sessionId}`

        // Seed existing destination session history first
        saveSessionId(sessionId)
        const existingSessionMsg = createUserMessage('Existing session-scoped message')
        const expectedDestHistory = [...loadChatHistory(), existingSessionMsg]
        saveChatHistory(expectedDestHistory)

        // Seed older sessionless guest bucket alongside existing session bucket
        localMock.setItem(
          'siftrix_chat_history_guest',
          JSON.stringify([
            {
              id: 'old_guest_1',
              role: 'user',
              content: 'Older stale guest message',
              timestamp: '2026-11-28T01:00:00Z',
            },
          ])
        )

        const loaded = loadChatHistory()
        expect(loaded).toEqual(expectedDestHistory)
        expect(loaded.some((m) => m.content === 'Older stale guest message')).toBe(
          false
        )
        expect(localMock.getItem(destKey)).toContain(
          'Existing session-scoped message'
        )
        expect(localMock.getItem('siftrix_chat_history_guest')).toBeNull()
      })

      it('3. (C1) ensures sessionless guest history never migrates into an authenticated account and never reappears after login/logout', async () => {
        // Visitor 1 chats as a sessionless guest (no scan performed)
        const visitor1Msg = createUserMessage(
          'Visitor 1 pre-login sensitive URL https://hr-portal-reset.example'
        )
        saveChatHistory([...loadChatHistory(), visitor1Msg])
        expect(
          loadChatHistory().some((m) => m.content.includes('hr-portal-reset.example'))
        ).toBe(true)

        // Visitor 1 signs in as Alice
        vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
          ok: true,
          status: 200,
          error: null,
          data: {
            access_token: 'jwt_alice_step24',
            token_type: 'bearer',
            user: userABackend,
          },
        })
        await loginUser({
          email: userABackend.email,
          password: 'Password123!',
          rememberMe: true,
        })

        // Alice's account does NOT inherit sessionless guest history
        expect(
          loadChatHistory().some((m) => m.content.includes('hr-portal-reset.example'))
        ).toBe(false)

        // Alice signs out -> Visitor 2 sitting at the browser in sessionless guest mode sees clean greeting
        logoutUser()
        expect(getChatStorageKey()).toBe('siftrix_chat_history_guest')
        expect(localMock.getItem('siftrix_chat_history_guest')).toBeNull()
        const postLogoutGuest = loadChatHistory()
        expect(postLogoutGuest).toHaveLength(1)
        expect(postLogoutGuest[0].id).toBe('msg_welcome')
        expect(
          postLogoutGuest.some((m) => m.content.includes('hr-portal-reset.example'))
        ).toBe(false)
      })

      it('4. (C2) prevents a pending sendChatMessage() from resurrecting history after clearChatHistory()', async () => {
        vi.useFakeTimers()

        seedAuthenticatedUser(userABackend, 'jwt_alice_clear_race')
        const aliceScopeKey = getChatStorageKey()
        const msg1 = createUserMessage('Question before clicking Clear History')
        const historyBeforeClear = [...loadChatHistory(), msg1]
        saveChatHistory(historyBeforeClear)

        const pendingReply = sendChatMessage(msg1.content, historyBeforeClear)

        // User clicks Clear History while the 600ms request is still pending
        const cleared = clearChatHistory()
        expect(cleared).toHaveLength(1)
        expect(cleared[0].id).toBe('msg_welcome')
        expect(localMock.getItem(aliceScopeKey)).toBeNull()

        await vi.advanceTimersByTimeAsync(700)
        await pendingReply

        // Cleared history stays cleared in both localStorage and loadChatHistory()
        expect(localMock.getItem(aliceScopeKey)).toBeNull()
        const afterResolve = loadChatHistory()
        expect(afterResolve).toHaveLength(1)
        expect(afterResolve[0].id).toBe('msg_welcome')
        expect(
          afterResolve.some((m) => m.content.includes('Question before clicking Clear'))
        ).toBe(false)
      })

      it('5. (C2) prevents an older pending request from overwriting newer messages in the same scope', async () => {
        vi.useFakeTimers()

        seedAuthenticatedUser(userABackend, 'jwt_alice_same_scope_race')
        const initial = loadChatHistory()
        const olderUserMsg = createUserMessage('Older question about phishing links')
        const snapshotAtOlderStart = [...initial, olderUserMsg]
        saveChatHistory(snapshotAtOlderStart)

        // Start older request with snapshot that does NOT include newerUserMsg
        const pendingOlder = sendChatMessage(
          olderUserMsg.content,
          snapshotAtOlderStart
        )

        // Newer message is saved in the same scope before pendingOlder resolves
        await vi.advanceTimersByTimeAsync(200)
        const newerUserMsg = createUserMessage('Newer urgent SSRF follow-up')
        saveChatHistory([...loadChatHistory(), newerUserMsg])

        await vi.advanceTimersByTimeAsync(500)
        const olderReply = await pendingOlder

        const finalHistory = loadChatHistory()
        expect(finalHistory.some((m) => m.id === olderUserMsg.id)).toBe(true)
        expect(finalHistory.some((m) => m.id === newerUserMsg.id)).toBe(true)
        expect(finalHistory.some((m) => m.id === olderReply.id)).toBe(true)
      })

      it('6. (C3) returns newer memoryChatStores history after QuotaExceededError instead of stale localStorage content', () => {
        seedAuthenticatedUser(userABackend, 'jwt_alice_quota_c3')
        const msg1 = createUserMessage('First message persisted before quota limit')
        saveChatHistory([...loadChatHistory(), msg1])
        expect(loadChatHistory().some((m) => m.id === msg1.id)).toBe(true)

        // Now localStorage.setItem throws QuotaExceededError while getItem still returns stale [welcome, msg1]
        let failWrites = true
        const flakyQuotaStorage: Storage = {
          getItem: (k: string) => localMock.getItem(k),
          setItem: (k: string, v: string) => {
            if (failWrites) {
              throw new Error('QuotaExceededError')
            }
            localMock.setItem(k, v)
          },
          removeItem: (k: string) => localMock.removeItem(k),
          clear: () => localMock.clear(),
          get length() {
            return localMock.length
          },
          key: (i: number) => localMock.key(i),
        }
        Object.defineProperty(globalThis, 'localStorage', {
          value: flakyQuotaStorage,
          writable: true,
          configurable: true,
        })
        Object.defineProperty(globalThis.window, 'localStorage', {
          value: flakyQuotaStorage,
          writable: true,
          configurable: true,
        })

        const msg2 = createUserMessage('Second message saved during QuotaExceededError')
        saveChatHistory([...loadChatHistory(), msg2])

        // Stale localStorage still only has msg1, but loadChatHistory() returns newer memory fallback with msg1 + msg2
        expect(localMock.getItem(getChatStorageKey())).not.toContain(msg2.content)
        const loadedDuringQuota = loadChatHistory()
        expect(loadedDuringQuota.some((m) => m.id === msg1.id)).toBe(true)
        expect(loadedDuringQuota.some((m) => m.id === msg2.id)).toBe(true)

        // User B still cannot see Alice's memory-fallback history
        logoutUser()
        seedAuthenticatedUser(userBBackend, 'jwt_bob_quota_c3')
        expect(loadChatHistory().some((m) => m.id === msg2.id)).toBe(false)

        // When quota recovers for Alice, saving msg3 persists full history back to localStorage cleanly
        logoutUser()
        seedAuthenticatedUser(userABackend, 'jwt_alice_quota_c3_recovered')
        failWrites = false
        const msg3 = createUserMessage('Third message after quota recovery')
        saveChatHistory([...loadChatHistory(), msg3])
        expect(localMock.getItem(getChatStorageKey())).toContain(msg2.content)
        expect(localMock.getItem(getChatStorageKey())).toContain(msg3.content)
      })

      it('7. (P1) prevents two concurrent chat widgets in the same scope from overwriting each other and emits bounded sync events', async () => {
        vi.useFakeTimers()

        seedAuthenticatedUser(userABackend, 'jwt_alice_dual_widgets')
        const syncSnapshots: Array<{ scopeKey: string; count: number }> = []
        let domSyncEvents = 0

        const unsubscribe = subscribeChatHistory((messages, scopeKey) => {
          syncSnapshots.push({ scopeKey, count: messages.length })
        })
        window.addEventListener(CHAT_SYNC_EVENT, () => {
          domSyncEvents += 1
        })

        // Both AssistantPage (Widget A) and CyberAssistant (Widget B) mount with [msg_welcome]
        const widgetAInitial = loadChatHistory()
        const widgetBInitial = loadChatHistory()

        // Widget A sends a message and receives a reply
        const msgFromWidgetA = createUserMessage('Widget A: Inspect https://login-check.example')
        const widgetANext = [...widgetAInitial, msgFromWidgetA]
        saveChatHistory(widgetANext)
        const pendingA = sendChatMessage(msgFromWidgetA.content, widgetANext)
        await vi.advanceTimersByTimeAsync(700)
        const replyA = await pendingA

        // Widget B (still holding its initial [msg_welcome] state) sends a message without remounting
        const msgFromWidgetB = createUserMessage('Widget B: What is SSRF?')
        const widgetBNext = [...widgetBInitial, msgFromWidgetB]
        saveChatHistory(widgetBNext)
        const pendingB = sendChatMessage(msgFromWidgetB.content, widgetBNext)
        await vi.advanceTimersByTimeAsync(700)
        const replyB = await pendingB

        unsubscribe()

        const combined = loadChatHistory()
        const ids = combined.map((m) => m.id)
        expect(new Set(ids).size).toBe(ids.length) // Zero duplicate messages
        expect(combined[0].id).toBe('msg_welcome')
        expect(combined.some((m) => m.id === msgFromWidgetA.id)).toBe(true)
        expect(combined.some((m) => m.id === replyA.id)).toBe(true)
        expect(combined.some((m) => m.id === msgFromWidgetB.id)).toBe(true)
        expect(combined.some((m) => m.id === replyB.id)).toBe(true)

        // Exactly 4 bounded sync emissions (2 user saves + 2 assistant saves), no infinite loop
        expect(syncSnapshots).toHaveLength(4)
        expect(domSyncEvents).toBe(4)
      })

      describe('Phase 4 Step 2.4A — Migration failure cleanup, rejected promotion invalidation, and clear tombstone regressions', () => {
        it('8. cleans up localStorage guest bucket when destination migration falls back to memory (QuotaExceededError) across localStorage and split memory/localStorage combinations', () => {
          // Combination A: Source persisted in localStorage, destination hits QuotaExceededError
          const visitor1Msg1 = createUserMessage(
            'Visitor 1 pre-scan secret https://payroll-audit.corp.example'
          )
          saveChatHistory([...loadChatHistory(), visitor1Msg1])
          expect(localMock.getItem('siftrix_chat_history_guest')).toContain(
            'payroll-audit.corp.example'
          )

          let failSetItem = true
          const quotaOnSetStorage: Storage = {
            getItem: (k: string) => localMock.getItem(k),
            setItem: (k: string, v: string) => {
              if (failSetItem) {
                throw new Error('QuotaExceededError')
              }
              localMock.setItem(k, v)
            },
            removeItem: (k: string) => localMock.removeItem(k),
            clear: () => localMock.clear(),
            get length() {
              return localMock.length
            },
            key: (i: number) => localMock.key(i),
          }
          Object.defineProperty(globalThis, 'localStorage', {
            value: quotaOnSetStorage,
            writable: true,
            configurable: true,
          })
          Object.defineProperty(globalThis.window, 'localStorage', {
            value: quotaOnSetStorage,
            writable: true,
            configurable: true,
          })

          // Assign Visitor 1 X-Session-ID directly into backing store while setItem throws QuotaExceededError
          const visitor1Session = '66666666-7777-4888-8999-111111111111'
          localMock.setItem('siftrix.session.id', visitor1Session)

          // Visitor 1 retains history in memory fallback, and old localStorage guest bucket is removed
          const visitor1Migrated = loadChatHistory()
          expect(
            visitor1Migrated.some((m) => m.id === visitor1Msg1.id)
          ).toBe(true)
          expect(localMock.getItem('siftrix_chat_history_guest')).toBeNull()

          // Visitor 2 arriving with a different guest session or no session ID sees clean greeting
          const visitor2Session = '66666666-7777-4888-8999-222222222222'
          localMock.setItem('siftrix.session.id', visitor2Session)
          expect(
            loadChatHistory().some((m) => m.id === visitor1Msg1.id)
          ).toBe(false)

          localMock.removeItem('siftrix.session.id')
          expect(
            loadChatHistory().some((m) => m.id === visitor1Msg1.id)
          ).toBe(false)

          // Visitor 1 returning to their session when quota recovers persists full history cleanly
          localMock.setItem('siftrix.session.id', visitor1Session)
          failSetItem = false
          const visitor1FollowUp = createUserMessage('Visitor 1 post-recovery follow-up')
          saveChatHistory([...loadChatHistory(), visitor1FollowUp])
          const persistedDest = localMock.getItem(
            `siftrix_chat_history_sess_${visitor1Session}`
          )
          expect(persistedDest).toContain('payroll-audit.corp.example')
          expect(persistedDest).toContain('Visitor 1 post-recovery follow-up')

          // Combination B: Split source (msgA in localStorage + msgB in memory fallback) -> QuotaExceededError on migration
          logoutUser()
          const splitMsgA = createUserMessage('Split source msgA in localStorage')
          saveChatHistory([...loadChatHistory(), splitMsgA])
          expect(localMock.getItem('siftrix_chat_history_guest')).toContain(
            'Split source msgA in localStorage'
          )

          failSetItem = true
          const splitMsgB = createUserMessage('Split source msgB in memory fallback')
          saveChatHistory([...loadChatHistory(), splitMsgB])
          expect(localMock.getItem('siftrix_chat_history_guest')).not.toContain(
            'Split source msgB in memory fallback'
          )

          const splitSession = '66666666-7777-4888-8999-333333333333'
          localMock.setItem('siftrix.session.id', splitSession)
          const splitMigrated = loadChatHistory()
          expect(splitMigrated.some((m) => m.id === splitMsgA.id)).toBe(true)
          expect(splitMigrated.some((m) => m.id === splitMsgB.id)).toBe(true)
          expect(localMock.getItem('siftrix_chat_history_guest')).toBeNull()

          // Another visitor still cannot see either message
          localMock.setItem(
            'siftrix.session.id',
            '66666666-7777-4888-8999-444444444444'
          )
          const unrelatedHistory = loadChatHistory()
          expect(unrelatedHistory.some((m) => m.id === splitMsgA.id)).toBe(false)
          expect(unrelatedHistory.some((m) => m.id === splitMsgB.id)).toBe(false)

          // Combination C: Both setItem and removeItem throw during migration while getItem remains readable
          failSetItem = false
          logoutUser()
          const readOnlyMsg = createUserMessage('Visitor read-only trap guest secret')
          saveChatHistory([...loadChatHistory(), readOnlyMsg])
          expect(localMock.getItem('siftrix_chat_history_guest')).toContain(
            'Visitor read-only trap guest secret'
          )

          const readOnlyStorage: Storage = {
            getItem: (k: string) => localMock.getItem(k),
            setItem: () => {
              throw new Error('SecurityError')
            },
            removeItem: () => {
              throw new Error('SecurityError')
            },
            clear: () => {
              throw new Error('SecurityError')
            },
            get length() {
              return localMock.length
            },
            key: (i: number) => localMock.key(i),
          }
          Object.defineProperty(globalThis, 'localStorage', {
            value: readOnlyStorage,
            writable: true,
            configurable: true,
          })
          Object.defineProperty(globalThis.window, 'localStorage', {
            value: readOnlyStorage,
            writable: true,
            configurable: true,
          })

          const roSession1 = '66666666-7777-4888-8999-555555555555'
          localMock.setItem('siftrix.session.id', roSession1)
          expect(loadChatHistory().some((m) => m.id === readOnlyMsg.id)).toBe(true)

          // Tombstone blocks unrelated guest session even though backing localMock still holds the unremoved string
          expect(localMock.getItem('siftrix_chat_history_guest')).toContain(
            'Visitor read-only trap guest secret'
          )
          localMock.setItem(
            'siftrix.session.id',
            '66666666-7777-4888-8999-666666666666'
          )
          expect(loadChatHistory().some((m) => m.id === readOnlyMsg.id)).toBe(false)
          localMock.removeItem('siftrix.session.id')
          expect(loadChatHistory().some((m) => m.id === readOnlyMsg.id)).toBe(false)
        })

        it('9. invalidates a pending sessionless guest request when migration is rejected by an existing destination session', async () => {
          vi.useFakeTimers()

          const existingSessionId = '77777777-8888-4999-8aaa-111111111111'
          const existingScopeKey = `siftrix_chat_history_sess_${existingSessionId}`

          // Seed pre-existing session history
          saveSessionId(existingSessionId)
          const existingMsg = createUserMessage('Authoritative existing session message')
          const expectedSessionHistory = [...loadChatHistory(), existingMsg]
          saveChatHistory(expectedSessionHistory)

          // Case A: Pending sessionless guest request WITH saved sessionless guest history
          localMock.removeItem('siftrix.session.id')
          sessionMock.removeItem('siftrix.session.id')
          expect(getChatStorageKey()).toBe('siftrix_chat_history_guest')

          const rejectedGuestMsg = createUserMessage(
            'Rejected guest clicked https://stale-guest-lure.example'
          )
          const guestSnapshot = [...loadChatHistory(), rejectedGuestMsg]
          saveChatHistory(guestSnapshot)
          const pendingRejected = sendChatMessage(
            rejectedGuestMsg.content,
            guestSnapshot
          )

          // Destination switches to the pre-existing session before the 600ms timer resolves
          await vi.advanceTimersByTimeAsync(200)
          saveSessionId(existingSessionId)
          expect(loadChatHistory()).toEqual(expectedSessionHistory)

          await vi.advanceTimersByTimeAsync(500)
          const resolvedReply = await pendingRejected
          expect(resolvedReply.role).toBe('assistant')

          expect(loadChatHistory()).toEqual(expectedSessionHistory)
          expect(localMock.getItem(existingScopeKey)).not.toContain(
            'stale-guest-lure.example'
          )
          expect(localMock.getItem('siftrix_chat_history_guest')).toBeNull()

          // Case B: Pending sessionless guest request WITHOUT prior saveChatHistory
          localMock.removeItem('siftrix.session.id')
          sessionMock.removeItem('siftrix.session.id')
          expect(getChatStorageKey()).toBe('siftrix_chat_history_guest')

          const unsavedGuestMsg = createUserMessage('Unsaved guest SSRF question')
          const pendingUnsaved = sendChatMessage(unsavedGuestMsg.content, [
            ...loadChatHistory(),
            unsavedGuestMsg,
          ])

          await vi.advanceTimersByTimeAsync(250)
          saveSessionId(existingSessionId)
          await vi.advanceTimersByTimeAsync(450)
          const unsavedReply = await pendingUnsaved

          const finalExisting = loadChatHistory()
          expect(finalExisting).toEqual(expectedSessionHistory)
          expect(finalExisting.some((m) => m.id === unsavedGuestMsg.id)).toBe(false)
          expect(finalExisting.some((m) => m.id === unsavedReply.id)).toBe(false)
        })

        it('10. promotes a valid pending sessionless guest request into a newly assigned empty X-Session-ID without leaking to other sessions', async () => {
          vi.useFakeTimers()

          expect(getChatStorageKey()).toBe('siftrix_chat_history_guest')
          const guestUserMsg = createUserMessage(
            'Pre-scan guest question about https://parcel-fee-alert.example'
          )
          const preScanHistory = [...loadChatHistory(), guestUserMsg]
          saveChatHistory(preScanHistory)

          const pendingGuest = sendChatMessage(guestUserMsg.content, preScanHistory)

          // Concurrent scan assigns a brand-new empty X-Session-ID while chat reply is in flight
          await vi.advanceTimersByTimeAsync(250)
          const newSessionId = '88888888-9999-4aaa-8bbb-111111111111'
          saveSessionId(newSessionId)
          const promotedKey = `siftrix_chat_history_sess_${newSessionId}`
          expect(getChatStorageKey()).toBe(promotedKey)

          await vi.advanceTimersByTimeAsync(450)
          const assistantReply = await pendingGuest

          const promotedHistory = loadChatHistory()
          expect(promotedHistory.some((m) => m.id === guestUserMsg.id)).toBe(true)
          expect(promotedHistory.some((m) => m.id === assistantReply.id)).toBe(true)
          expect(localMock.getItem(promotedKey)).toContain('parcel-fee-alert.example')
          expect(localMock.getItem(promotedKey)).toContain(assistantReply.id)
          expect(localMock.getItem('siftrix_chat_history_guest')).toBeNull()
        })

        it('11. prevents a pending promoted guest request from resurrecting history if clearChatHistory() runs before or after session promotion', async () => {
          vi.useFakeTimers()

          // Case A: clearChatHistory() called AFTER session promotion while request is still in flight
          const guestMsgA = createUserMessage('Guest message cleared after promotion')
          const snapA = [...loadChatHistory(), guestMsgA]
          saveChatHistory(snapA)
          const pendingA = sendChatMessage(guestMsgA.content, snapA)

          await vi.advanceTimersByTimeAsync(200)
          const promotedSessionA = '99999999-0000-4aaa-8bbb-111111111111'
          saveSessionId(promotedSessionA)
          expect(loadChatHistory().some((m) => m.id === guestMsgA.id)).toBe(true)

          await vi.advanceTimersByTimeAsync(150)
          const clearedA = clearChatHistory()
          expect(clearedA).toHaveLength(1)
          expect(clearedA[0].id).toBe('msg_welcome')

          await vi.advanceTimersByTimeAsync(350)
          const replyA = await pendingA

          expect(
            localMock.getItem(`siftrix_chat_history_sess_${promotedSessionA}`)
          ).toBeNull()
          const afterResolveA = loadChatHistory()
          expect(afterResolveA).toHaveLength(1)
          expect(afterResolveA[0].id).toBe('msg_welcome')
          expect(afterResolveA.some((m) => m.id === guestMsgA.id)).toBe(false)
          expect(afterResolveA.some((m) => m.id === replyA.id)).toBe(false)

          // Case B: clearChatHistory() called BEFORE session assignment while request is still in flight
          logoutUser()
          const guestMsgB = createUserMessage('Guest message cleared before promotion')
          const snapB = [...loadChatHistory(), guestMsgB]
          saveChatHistory(snapB)
          const pendingB = sendChatMessage(guestMsgB.content, snapB)

          await vi.advanceTimersByTimeAsync(150)
          clearChatHistory()

          await vi.advanceTimersByTimeAsync(150)
          const promotedSessionB = '99999999-0000-4aaa-8bbb-222222222222'
          saveSessionId(promotedSessionB)

          await vi.advanceTimersByTimeAsync(400)
          const replyB = await pendingB

          expect(
            localMock.getItem(`siftrix_chat_history_sess_${promotedSessionB}`)
          ).toBeNull()
          const afterResolveB = loadChatHistory()
          expect(afterResolveB).toHaveLength(1)
          expect(afterResolveB[0].id).toBe('msg_welcome')
          expect(afterResolveB.some((m) => m.id === guestMsgB.id)).toBe(false)
          expect(afterResolveB.some((m) => m.id === replyB.id)).toBe(false)
        })

        it('12. prevents stale localStorage history from reappearing when removeItem throws while getItem remains readable, without breaking future messages', () => {
          seedAuthenticatedUser(userABackend, 'jwt_alice_remove_throws')
          const aliceKey = getChatStorageKey()

          const staleSecretMsg = createUserMessage(
            'Stale secret that removeItem fails to delete'
          )
          saveChatHistory([...loadChatHistory(), staleSecretMsg])
          expect(localMock.getItem(aliceKey)).toContain(staleSecretMsg.content)

          let failRemove = true
          let failSet = true
          const brokenRemoveStorage: Storage = {
            getItem: (k: string) => localMock.getItem(k),
            setItem: (k: string, v: string) => {
              if (failSet) {
                throw new Error('QuotaExceededError')
              }
              localMock.setItem(k, v)
            },
            removeItem: (k: string) => {
              if (failRemove) {
                throw new Error('SecurityError')
              }
              localMock.removeItem(k)
            },
            clear: () => localMock.clear(),
            get length() {
              return localMock.length
            },
            key: (i: number) => localMock.key(i),
          }
          Object.defineProperty(globalThis, 'localStorage', {
            value: brokenRemoveStorage,
            writable: true,
            configurable: true,
          })
          Object.defineProperty(globalThis.window, 'localStorage', {
            value: brokenRemoveStorage,
            writable: true,
            configurable: true,
          })

          // clearChatHistory() throws inside removeItem while getItem still returns staleSecretMsg
          const cleared = clearChatHistory()
          expect(cleared).toHaveLength(1)
          expect(cleared[0].id).toBe('msg_welcome')
          expect(localMock.getItem(aliceKey)).toContain(staleSecretMsg.content)

          // Tombstone ensures loadChatHistory() does NOT resurrect staleSecretMsg
          const loadedAfterClear = loadChatHistory()
          expect(loadedAfterClear).toHaveLength(1)
          expect(loadedAfterClear[0].id).toBe('msg_welcome')
          expect(
            loadedAfterClear.some((m) => m.id === staleSecretMsg.id)
          ).toBe(false)

          // Saving a new message while setItem still fails stores only the new post-clear conversation in memory
          const postClearMemMsg = createUserMessage('New message in memory after broken clear')
          saveChatHistory([...loadChatHistory(), postClearMemMsg])
          const loadedMem = loadChatHistory()
          expect(loadedMem.some((m) => m.id === postClearMemMsg.id)).toBe(true)
          expect(loadedMem.some((m) => m.id === staleSecretMsg.id)).toBe(false)

          // Clearing a second time while removeItem still throws returns to clean greeting again
          clearChatHistory()
          expect(loadChatHistory()).toHaveLength(1)
          expect(loadChatHistory()[0].id).toBe('msg_welcome')

          // Once storage writes recover, saving a new message overwrites localStorage cleanly without resurrecting staleSecretMsg
          failSet = false
          failRemove = false
          const recoveredMsg = createUserMessage('Clean message after storage recovery')
          saveChatHistory([...loadChatHistory(), recoveredMsg])

          const loadedRecovered = loadChatHistory()
          expect(loadedRecovered.some((m) => m.id === recoveredMsg.id)).toBe(true)
          expect(loadedRecovered.some((m) => m.id === staleSecretMsg.id)).toBe(false)
          expect(localMock.getItem(aliceKey)).toContain(recoveredMsg.content)
          expect(localMock.getItem(aliceKey)).not.toContain(staleSecretMsg.content)
        })

        it('13. emits post-cleanup auth-transition sync, filters cross-tab storage events to active scope, and short-circuits unchanged saveChatHistory calls', async () => {
          const observedSyncs: Array<{ scopeKey: string; contents: string[] }> = []
          const unsubscribe = subscribeChatHistory((messages, scopeKey) => {
            observedSyncs.push({
              scopeKey,
              contents: messages.map((m) => m.content),
            })
          })

          // Guest saves pre-login message
          const guestSecret = createUserMessage('Guest pre-login confidential query')
          const guestList = [...loadChatHistory(), guestSecret]
          saveChatHistory(guestList)
          const countAfterFirstSave = observedSyncs.length

          // Re-saving identical history snapshot is a safe no-op (no duplicate sync loop)
          saveChatHistory(loadChatHistory())
          expect(observedSyncs).toHaveLength(countAfterFirstSave)

          // Login as Alice -> auth transition purges guest history first, then emits Alice's clean scope
          vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
            ok: true,
            status: 200,
            error: null,
            data: {
              access_token: 'jwt_alice_sync_24b',
              token_type: 'bearer',
              user: userABackend,
            },
          })
          await loginUser({
            email: userABackend.email,
            password: 'Password123!',
            rememberMe: true,
          })

          const aliceKey = `siftrix_chat_history_usr_${userABackend.id}`
          const lastAfterLogin = observedSyncs[observedSyncs.length - 1]
          expect(lastAfterLogin.scopeKey).toBe(aliceKey)
          expect(
            lastAfterLogin.contents.some((c) =>
              c.includes('Guest pre-login confidential query')
            )
          ).toBe(false)
          expect(localMock.getItem('siftrix_chat_history_guest')).toBeNull()

          // Cross-tab storage event for Bob's inactive scope is ignored while Alice is active
          const countBeforeStorage = observedSyncs.length
          const bobKey = `siftrix_chat_history_usr_${userBBackend.id}`
          const bobCrossTabMsg = createUserMessage('Bob cross-tab message')
          localMock.setItem(bobKey, JSON.stringify([bobCrossTabMsg]))
          const inactiveEvt = new Event('storage')
          Object.defineProperty(inactiveEvt, 'key', { value: bobKey })
          window.dispatchEvent(inactiveEvt)
          expect(observedSyncs).toHaveLength(countBeforeStorage)

          // Cross-tab storage event for Alice's active scope updates subscribers
          const aliceCrossTabMsg = createUserMessage('Alice cross-tab synced question')
          localMock.setItem(
            aliceKey,
            JSON.stringify([...loadChatHistory(), aliceCrossTabMsg])
          )
          const activeEvt = new Event('storage')
          Object.defineProperty(activeEvt, 'key', { value: aliceKey })
          window.dispatchEvent(activeEvt)
          expect(observedSyncs).toHaveLength(countBeforeStorage + 1)
          expect(observedSyncs[observedSyncs.length - 1].scopeKey).toBe(aliceKey)
          expect(observedSyncs[observedSyncs.length - 1].contents).toContain(
            'Alice cross-tab synced question'
          )

          unsubscribe()
        })

        it('14. invalidates pending sendChatMessage() on cross-tab clear (active-key removal & localStorage.clear), validates storageArea, ignores authenticated siftrix.session.id events, and reconciles cross-tab auth changes safely', async () => {
          vi.useFakeTimers()

          seedAuthenticatedUser(userABackend, 'jwt_alice_xtab_clear')
          const aliceKey = getChatStorageKey()
          const syncEvents: Array<{ scopeKey: string; count: number }> = []
          const unsubscribe = subscribeChatHistory((msgs, scopeKey) => {
            syncEvents.push({ scopeKey, count: msgs.length })
          })

          // 1. Wrong storageArea (sessionStorage clear / remove) is ignored and never clears localStorage chat history
          const msg1 = createUserMessage('Alice persisted message before sessionStorage clear')
          const initialSnap = [...loadChatHistory(), msg1]
          saveChatHistory(initialSnap)
          const countAfterSave = syncEvents.length

          const wrongAreaClearEvt = new Event('storage')
          Object.defineProperties(wrongAreaClearEvt, {
            key: { value: null },
            newValue: { value: null },
            storageArea: { value: sessionMock },
          })
          window.dispatchEvent(wrongAreaClearEvt)
          expect(syncEvents).toHaveLength(countAfterSave)
          expect(loadChatHistory().some((m) => m.id === msg1.id)).toBe(true)

          // 2. Authenticated user ignores cross-tab siftrix.session.id storage events
          localMock.setItem('siftrix.session.id', '12121212-3434-4565-8787-999999999999')
          const guestSessionEvt = new Event('storage')
          Object.defineProperties(guestSessionEvt, {
            key: { value: 'siftrix.session.id' },
            newValue: { value: '12121212-3434-4565-8787-999999999999' },
            storageArea: { value: localMock },
          })
          window.dispatchEvent(guestSessionEvt)
          expect(syncEvents).toHaveLength(countAfterSave)

          // 3. Cross-tab active-key removal (newValue === null) advances clear generation & blocks in-flight sendChatMessage
          const pendingBeforeActiveRemove = sendChatMessage(msg1.content, initialSnap)
          await vi.advanceTimersByTimeAsync(200)

          localMock.removeItem(aliceKey)
          const activeRemoveEvt = new Event('storage')
          Object.defineProperties(activeRemoveEvt, {
            key: { value: aliceKey },
            newValue: { value: null },
            storageArea: { value: localMock },
          })
          window.dispatchEvent(activeRemoveEvt)

          expect(syncEvents[syncEvents.length - 1]).toEqual({
            scopeKey: aliceKey,
            count: 1,
          })

          await vi.advanceTimersByTimeAsync(500)
          await pendingBeforeActiveRemove
          expect(localMock.getItem(aliceKey)).toBeNull()
          expect(loadChatHistory()).toHaveLength(1)
          expect(loadChatHistory()[0].id).toBe('msg_welcome')

          // 4. Cross-tab localStorage.clear() (key === null) while authenticated via sessionStorage blocks in-flight sendChatMessage
          logoutUser()
          sessionMock.setItem(AUTH_TOKEN_KEY, 'jwt_alice_session_only')
          sessionMock.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify({
              id: userABackend.id,
              name: userABackend.full_name,
              email: userABackend.email,
              role: 'analyst',
              organization: 'SIFTRIX Cyber Defense',
              createdAt: userABackend.created_at,
            })
          )
          expect(getChatStorageKey()).toBe(aliceKey)

          const msg2 = createUserMessage('Message before cross-tab localStorage.clear()')
          const snap2 = [...loadChatHistory(), msg2]
          saveChatHistory(snap2)
          const pendingBeforeFullClear = sendChatMessage(msg2.content, snap2)
          await vi.advanceTimersByTimeAsync(200)

          localMock.clear()
          const fullClearEvt = new Event('storage')
          Object.defineProperties(fullClearEvt, {
            key: { value: null },
            newValue: { value: null },
            storageArea: { value: localMock },
          })
          window.dispatchEvent(fullClearEvt)

          await vi.advanceTimersByTimeAsync(500)
          await pendingBeforeFullClear
          expect(localMock.getItem(aliceKey)).toBeNull()
          expect(loadChatHistory()).toHaveLength(1)
          expect(loadChatHistory()[0].id).toBe('msg_welcome')

          // 5. Partial/mismatched auth storage in localStorage is rejected without spurious auth transitions
          logoutUser()
          const countInGuest = syncEvents.length
          localMock.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify({
              id: userBBackend.id,
              name: userBBackend.full_name,
              email: userBBackend.email,
              role: 'analyst',
              createdAt: userBBackend.created_at,
            })
          )
          // Missing AUTH_TOKEN_KEY -> not a valid authenticated session
          const partialAuthEvt = new Event('storage')
          Object.defineProperties(partialAuthEvt, {
            key: { value: AUTH_STORAGE_KEY },
            newValue: { value: localMock.getItem(AUTH_STORAGE_KEY) },
            storageArea: { value: localMock },
          })
          window.dispatchEvent(partialAuthEvt)
          expect(getChatStorageKey()).toBe('siftrix_chat_history_guest')
          expect(syncEvents).toHaveLength(countInGuest)

          unsubscribe()
        })
      })
    })
  })
})
