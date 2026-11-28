import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as apiClient from './apiClient'
import {
  AUTH_STORAGE_KEY,
  AUTH_TOKEN_KEY,
  evaluatePasswordStrength,
  getActiveUser,
  getAuthenticatedSession,
  getAuthToken,
  isRememberedSession,
  loginUser,
  logoutUser,
  mockLogin,
  mockSignup,
  registerUser,
  syncCrossTabAuthStorageEvent,
  validateLoginCredentials,
  validateSignupPayload,
  verifyCurrentSession,
} from './authService'
import {
  AUTH_PREVIEW_STORAGE_KEY,
  loadAuthPreviewSession,
  saveAuthPreviewSession,
} from '../utils/authPreview'
import {
  AUTHORIZATION_HEADER,
  SESSION_ID_HEADER,
  SESSION_ID_STORAGE_KEY,
  getSessionHeaders,
  loadSessionId,
  saveSessionId,
} from '../utils/session'

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

describe('authService', () => {
  beforeEach(() => {
    logoutUser()
  })

  it('evaluates password strength dynamically', () => {
    const empty = evaluatePasswordStrength('')
    expect(empty.score).toBe(0)
    expect(empty.label).toBe('Very Weak')

    const weak = evaluatePasswordStrength('123')
    expect(weak.score).toBeLessThanOrEqual(1)

    const good = evaluatePasswordStrength('GoodPass1')
    expect(good.score).toBeGreaterThanOrEqual(3)

    const strong = evaluatePasswordStrength('ChampagneGold2026!#Secure')
    expect(strong.score).toBe(4)
    expect(strong.label).toBe('Strong')
  })

  it('validates login credentials accurately', () => {
    expect(validateLoginCredentials({ email: '', password: '' })).toEqual({
      valid: false,
      error: 'Please enter your email address.',
    })

    expect(validateLoginCredentials({ email: 'bad-email', password: 'password123' })).toEqual({
      valid: false,
      error: 'Please enter a valid email address.',
    })

    expect(validateLoginCredentials({ email: 'analyst@siftrix.internal', password: 'short' })).toEqual({
      valid: false,
      error: 'Password must be at least 8 characters long.',
    })

    expect(validateLoginCredentials({ email: 'analyst@siftrix.internal', password: 'Password123!' })).toEqual({
      valid: true,
    })
  })

  it('validates signup payload accurately', () => {
    const invalid = validateSignupPayload({
      fullName: 'A',
      email: 'bad-email',
      password: '123',
      confirmPassword: '456',
      agreeToTerms: false,
    })
    expect(invalid.valid).toBe(false)
    expect(invalid.error).toBeDefined()

    const passwordMismatch = validateSignupPayload({
      fullName: 'Valid Analyst',
      email: 'analyst@siftrix.internal',
      password: 'Password123!',
      confirmPassword: 'Mismatch123!',
      agreeToTerms: true,
    })
    expect(passwordMismatch.valid).toBe(false)
    expect(passwordMismatch.error).toContain('Passwords do not match')

    const termsDeclined = validateSignupPayload({
      fullName: 'Valid Analyst',
      email: 'analyst@siftrix.internal',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      agreeToTerms: false,
    })
    expect(termsDeclined.valid).toBe(false)
    expect(termsDeclined.error).toContain('Terms & Conditions')

    const valid = validateSignupPayload({
      fullName: 'Elena Rostova',
      email: 'elena@cyber.io',
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
      agreeToTerms: true,
    })
    expect(valid.valid).toBe(true)
  })

  it('logs in successfully with mock credentials and stores session', async () => {
    const res = await mockLogin({
      email: 'analyst@siftrix.internal',
      password: 'Password123!',
      rememberMe: true,
    })
    expect(res.success).toBe(true)
    expect(res.user?.email).toBe('analyst@siftrix.internal')
    expect(res.user?.role).toBe('analyst')
    expect(res.token).toBeDefined()

    const active = getActiveUser()
    expect(active?.email).toBe('analyst@siftrix.internal')

    logoutUser()
    expect(getActiveUser()).toBeNull()
  })

  it('registers new user and assigns organization', async () => {
    const res = await mockSignup({
      fullName: 'Elena Rostova',
      email: 'elena@cyber.io',
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
      organization: 'Aegis Defense',
      agreeToTerms: true,
    })

    expect(res.success).toBe(true)
    expect(res.user?.name).toBe('Elena Rostova')
    expect(res.user?.organization).toBe('Aegis Defense')
    expect(res.user?.role).toBe('analyst')
  })

  describe('browser storage cleanup, rememberMe isolation, and siftrix:auth-change', () => {
    const hadWindow = 'window' in globalThis
    const originalWindow = globalThis.window
    const hadLocalStorage = 'localStorage' in globalThis
    const originalLocalStorage = globalThis.localStorage

    let localMock: Storage
    let sessionMock: Storage
    let eventTarget: EventTarget

    beforeEach(() => {
      localMock = createStorageMock()
      sessionMock = createStorageMock()
      eventTarget = new EventTarget()

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
    })

    afterEach(() => {
      vi.restoreAllMocks()
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

    it('clears user, token, memory fallback, guest session ID, and preview session on logoutUser and emits siftrix:auth-change after cleanup', async () => {
      saveSessionId('11111111-1111-4111-8111-111111111111')
      const loginRes = await mockLogin({
        email: 'user.a@siftrix.internal',
        password: 'Password123!',
        rememberMe: true,
      })
      expect(loginRes.success).toBe(true)

      // Also seed stale sessionStorage auth keys and UI preview session
      sessionMock.setItem(AUTH_STORAGE_KEY, JSON.stringify(loginRes.user))
      sessionMock.setItem(AUTH_TOKEN_KEY, 'stale_session_token')
      saveAuthPreviewSession({
        name: 'User A',
        email: 'user.a@siftrix.internal',
        mode: 'signin',
        createdAt: '2026-11-28T00:00:00Z',
      })

      expect(localMock.getItem(AUTH_STORAGE_KEY)).not.toBeNull()
      expect(localMock.getItem(AUTH_TOKEN_KEY)).not.toBeNull()
      expect(localMock.getItem(SESSION_ID_STORAGE_KEY)).not.toBeNull()
      expect(sessionMock.getItem(AUTH_PREVIEW_STORAGE_KEY)).not.toBeNull()
      expect(getActiveUser()?.email).toBe('user.a@siftrix.internal')

      let authChangeCount = 0
      let activeUserDuringEvent: ReturnType<typeof getActiveUser> = loginRes.user ?? null
      let authTokenDuringEvent: string | null = getAuthToken()
      let sessionIdDuringEvent: string | null = loadSessionId()
      let previewDuringEvent = loadAuthPreviewSession()

      window.addEventListener('siftrix:auth-change', () => {
        authChangeCount += 1
        activeUserDuringEvent = getActiveUser()
        authTokenDuringEvent = getAuthToken()
        sessionIdDuringEvent = loadSessionId()
        previewDuringEvent = loadAuthPreviewSession()
      })

      logoutUser()

      expect(authChangeCount).toBe(1)
      expect(activeUserDuringEvent).toBeNull()
      expect(authTokenDuringEvent).toBeNull()
      expect(sessionIdDuringEvent).toBeNull()
      expect(previewDuringEvent).toBeNull()
      expect(localMock.getItem(AUTH_STORAGE_KEY)).toBeNull()
      expect(localMock.getItem(AUTH_TOKEN_KEY)).toBeNull()
      expect(localMock.getItem(SESSION_ID_STORAGE_KEY)).toBeNull()
      expect(sessionMock.getItem(AUTH_STORAGE_KEY)).toBeNull()
      expect(sessionMock.getItem(AUTH_TOKEN_KEY)).toBeNull()
      expect(sessionMock.getItem(AUTH_PREVIEW_STORAGE_KEY)).toBeNull()
      expect(getAuthToken()).toBeNull()
      expect(getActiveUser()).toBeNull()
    })

    it('removes stale localStorage user and token entries when signing in with rememberMe=false', async () => {
      const userARes = await mockLogin({
        email: 'user.a@siftrix.internal',
        password: 'Password123!',
        rememberMe: true,
      })
      expect(userARes.success).toBe(true)
      expect(localMock.getItem(AUTH_STORAGE_KEY)).not.toBeNull()
      expect(localMock.getItem(AUTH_TOKEN_KEY)).not.toBeNull()

      // User B signs in with rememberMe=false without prior manual clear
      const userBRes = await mockLogin({
        email: 'user.b@siftrix.internal',
        password: 'Password123!',
        rememberMe: false,
      })
      expect(userBRes.success).toBe(true)

      expect(localMock.getItem(AUTH_STORAGE_KEY)).toBeNull()
      expect(localMock.getItem(AUTH_TOKEN_KEY)).toBeNull()
      expect(sessionMock.getItem(AUTH_STORAGE_KEY)).not.toBeNull()
      expect(sessionMock.getItem(AUTH_TOKEN_KEY)).toBe(userBRes.token)
      expect(getActiveUser()?.email).toBe('user.b@siftrix.internal')
      expect(getActiveUser()?.id).toBe(userBRes.user?.id)
    })

    it('authenticates via loginUser (POST /api/auth/login), forwards guest X-Session-ID, clears guest session on success, persists JWT, and emits siftrix:auth-change', async () => {
      const guestSessionId = '11111111-2222-4333-8444-555555555555'
      saveSessionId(guestSessionId)

      const postSpy = vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
        ok: true,
        status: 200,
        error: null,
        data: {
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.user_1',
          token_type: 'bearer',
          user: {
            id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
            email: 'sarah.analyst@siftrix.internal',
            full_name: 'Sarah Analyst',
            is_active: true,
            created_at: '2026-11-28T01:00:00Z',
            updated_at: '2026-11-28T01:00:00Z',
          },
        },
      })

      let authChangeFired = false
      let sessionIdAtAuthChange: string | null = guestSessionId
      let tokenAtAuthChange: string | null = null
      window.addEventListener('siftrix:auth-change', () => {
        authChangeFired = true
        sessionIdAtAuthChange = loadSessionId()
        tokenAtAuthChange = getAuthToken()
      })

      const res = await loginUser({
        email: '  Sarah.Analyst@Siftrix.Internal  ',
        password: 'Password123!',
        rememberMe: true,
      })

      expect(postSpy).toHaveBeenCalledWith(
        '/api/auth/login',
        {
          email: 'sarah.analyst@siftrix.internal',
          password: 'Password123!',
        },
        {
          headers: {
            [SESSION_ID_HEADER]: guestSessionId,
          },
        }
      )
      expect(res.success).toBe(true)
      expect(res.mode).toBe('api')
      expect(res.token).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.user_1')
      expect(res.user).toEqual({
        id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        name: 'Sarah Analyst',
        email: 'sarah.analyst@siftrix.internal',
        role: 'analyst',
        organization: 'SIFTRIX Cyber Defense',
        createdAt: '2026-11-28T01:00:00Z',
      })

      expect(authChangeFired).toBe(true)
      expect(sessionIdAtAuthChange).toBeNull()
      expect(tokenAtAuthChange).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.user_1')
      expect(loadSessionId()).toBeNull()
      expect(localMock.getItem(AUTH_TOKEN_KEY)).toBe(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.user_1'
      )
      expect(isRememberedSession()).toBe(true)
      expect(getSessionHeaders()).toEqual({
        [AUTHORIZATION_HEADER]:
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.user_1',
      })
    })

    it('registers via registerUser (POST /api/auth/register) with exact backend fields, forwards guest X-Session-ID, clears it on success, and persists JWT', async () => {
      const guestSessionId = '22222222-3333-4444-8555-666666666666'
      saveSessionId(guestSessionId)

      const postSpy = vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
        ok: true,
        status: 201,
        error: null,
        data: {
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.signup_1',
          token_type: 'bearer',
          user: {
            id: 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
            email: 'tariq.mansoor@defense.cyber',
            full_name: 'Tariq Mansoor',
            is_active: true,
            created_at: '2026-11-28T01:10:00Z',
            updated_at: '2026-11-28T01:10:00Z',
          },
        },
      })

      let authChangeCount = 0
      window.addEventListener('siftrix:auth-change', () => {
        authChangeCount += 1
      })

      const res = await registerUser({
        fullName: '  Tariq Mansoor  ',
        email: '  Tariq.Mansoor@Defense.Cyber ',
        password: 'CyberGuard#2026',
        confirmPassword: 'CyberGuard#2026',
        organization: 'National SOC Analyst Group',
        agreeToTerms: true,
      })

      expect(postSpy).toHaveBeenCalledWith(
        '/api/auth/register',
        {
          email: 'tariq.mansoor@defense.cyber',
          password: 'CyberGuard#2026',
          full_name: 'Tariq Mansoor',
        },
        {
          headers: {
            [SESSION_ID_HEADER]: guestSessionId,
          },
        }
      )
      expect(res.success).toBe(true)
      expect(res.mode).toBe('api')
      expect(res.token).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.signup_1')
      expect(res.user?.id).toBe('bbbbbbbb-cccc-4ddd-8eee-ffffffffffff')
      expect(res.user?.name).toBe('Tariq Mansoor')
      expect(res.user?.organization).toBe('National SOC Analyst Group')
      expect(loadSessionId()).toBeNull()
      expect(getAuthToken()).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.signup_1')
      expect(authChangeCount).toBe(1)
    })

    it('preserves guest X-Session-ID and saves nothing when loginUser or registerUser fails', async () => {
      const guestSessionId = '33333333-4444-4555-8666-777777777777'
      saveSessionId(guestSessionId)

      let authChangeCount = 0
      window.addEventListener('siftrix:auth-change', () => {
        authChangeCount += 1
      })

      // 1. Client-side validation failure
      const invalidClientLogin = await loginUser({
        email: 'not-an-email',
        password: 'Password123!',
      })
      expect(invalidClientLogin.success).toBe(false)
      expect(loadSessionId()).toBe(guestSessionId)

      // 2. Backend 401 wrong credentials on login
      vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
        ok: false,
        status: 401,
        data: null,
        error: 'Invalid email or password',
      })
      const wrongPwRes = await loginUser({
        email: 'sarah@siftrix.internal',
        password: 'WrongPassword123!',
      })
      expect(wrongPwRes).toEqual({
        success: false,
        error: 'Invalid email or password',
        mode: 'api',
      })
      expect(loadSessionId()).toBe(guestSessionId)
      expect(getAuthToken()).toBeNull()
      expect(getActiveUser()).toBeNull()

      // 3. Backend 409 duplicate email on registration
      vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
        ok: false,
        status: 409,
        data: null,
        error: 'An account with this email address already exists',
      })
      const dupSignupRes = await registerUser({
        fullName: 'Duplicate User',
        email: 'sarah@siftrix.internal',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        agreeToTerms: true,
      })
      expect(dupSignupRes).toEqual({
        success: false,
        error: 'An account with this email address already exists',
        mode: 'api',
      })
      expect(loadSessionId()).toBe(guestSessionId)
      expect(getAuthToken()).toBeNull()
      expect(getActiveUser()).toBeNull()

      // 4. Malformed 200 payload missing access_token
      vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { token_type: 'bearer' } as never,
        error: null,
      })
      const malformedRes = await loginUser({
        email: 'sarah@siftrix.internal',
        password: 'Password123!',
      })
      expect(malformedRes.success).toBe(false)
      expect(loadSessionId()).toBe(guestSessionId)
      expect(getAuthToken()).toBeNull()
      expect(getActiveUser()).toBeNull()
      expect(authChangeCount).toBe(0)
    })

    it('isolates rememberMe=true (localStorage) and rememberMe=false (sessionStorage) on loginUser', async () => {
      const postSpy = vi
        .spyOn(apiClient, 'apiPost')
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          error: null,
          data: {
            access_token: 'jwt_user_a_local',
            token_type: 'bearer',
            user: {
              id: '11111111-aaaa-4bbb-8ccc-111111111111',
              email: 'alice@siftrix.internal',
              full_name: 'Alice Analyst',
              is_active: true,
              created_at: '2026-11-28T01:00:00Z',
            },
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          error: null,
          data: {
            access_token: 'jwt_user_b_session',
            token_type: 'bearer',
            user: {
              id: '22222222-aaaa-4bbb-8ccc-222222222222',
              email: 'bob@siftrix.internal',
              full_name: 'Bob Responder',
              is_active: true,
              created_at: '2026-11-28T01:05:00Z',
            },
          },
        })

      // User A signs in with rememberMe=true
      const resA = await loginUser({
        email: 'alice@siftrix.internal',
        password: 'Password123!',
        rememberMe: true,
      })
      expect(resA.success).toBe(true)
      expect(isRememberedSession()).toBe(true)
      expect(localMock.getItem(AUTH_TOKEN_KEY)).toBe('jwt_user_a_local')
      expect(sessionMock.getItem(AUTH_TOKEN_KEY)).toBeNull()

      // User B signs in with rememberMe=false directly over User A
      const resB = await loginUser({
        email: 'bob@siftrix.internal',
        password: 'Password123!',
        rememberMe: false,
      })
      expect(resB.success).toBe(true)
      expect(postSpy).toHaveBeenCalledTimes(2)
      expect(isRememberedSession()).toBe(false)
      expect(localMock.getItem(AUTH_TOKEN_KEY)).toBeNull()
      expect(localMock.getItem(AUTH_STORAGE_KEY)).toBeNull()
      expect(sessionMock.getItem(AUTH_TOKEN_KEY)).toBe('jwt_user_b_session')
      expect(getAuthToken()).toBe('jwt_user_b_session')
      expect(getActiveUser()?.email).toBe('bob@siftrix.internal')
    })

    it('validates stored JWT via verifyCurrentSession (GET /api/auth/me), preserves storage tier, and cleans up on failure without wiping pure guest sessions', async () => {
      // 1. Pure unauthenticated guest session: verifyCurrentSession returns null WITHOUT wiping guest X-Session-ID
      const guestSessionId = '44444444-5555-4666-8777-888888888888'
      saveSessionId(guestSessionId)
      const guestVerify = await verifyCurrentSession()
      expect(guestVerify).toBeNull()
      expect(loadSessionId()).toBe(guestSessionId)
      logoutUser()

      // 2. Valid sessionStorage JWT (rememberMe=false) -> restores profile in sessionStorage without promoting to localStorage
      sessionMock.setItem(AUTH_TOKEN_KEY, 'jwt_session_valid')
      sessionMock.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          id: 'cccccccc-dddd-4eee-8fff-000000000000',
          name: 'Cached Name',
          email: 'cached@siftrix.internal',
          role: 'analyst',
          organization: 'Custom Cyber Unit',
          createdAt: '2026-11-28T00:00:00Z',
        })
      )

      const getSpy = vi.spyOn(apiClient, 'apiGet').mockResolvedValueOnce({
        ok: true,
        status: 200,
        error: null,
        data: {
          id: 'cccccccc-dddd-4eee-8fff-000000000000',
          email: 'cached@siftrix.internal',
          full_name: 'Verified Analyst',
          is_active: true,
          created_at: '2026-11-28T00:00:00Z',
          updated_at: '2026-11-28T01:15:00Z',
        },
      })

      const verified = await verifyCurrentSession()
      expect(getSpy).toHaveBeenCalledWith('/api/auth/me', {
        headers: {
          [AUTHORIZATION_HEADER]: 'Bearer jwt_session_valid',
        },
      })
      expect(verified).toEqual({
        id: 'cccccccc-dddd-4eee-8fff-000000000000',
        name: 'Verified Analyst',
        email: 'cached@siftrix.internal',
        role: 'analyst',
        organization: 'Custom Cyber Unit',
        createdAt: '2026-11-28T00:00:00Z',
      })
      expect(localMock.getItem(AUTH_TOKEN_KEY)).toBeNull()
      expect(sessionMock.getItem(AUTH_TOKEN_KEY)).toBe('jwt_session_valid')

      // 3. Expired/invalid JWT (401 from GET /api/auth/me) -> clears auth state and emits siftrix:auth-change
      saveAuthPreviewSession({
        id: 'cccccccc-dddd-4eee-8fff-000000000000',
        name: 'Verified Analyst',
        email: 'cached@siftrix.internal',
        mode: 'signin',
        createdAt: '2026-11-28T00:00:00Z',
      })
      vi.spyOn(apiClient, 'apiGet').mockResolvedValueOnce({
        ok: false,
        status: 401,
        data: null,
        error: 'Token has expired',
      })

      let logoutEvents = 0
      window.addEventListener('siftrix:auth-change', () => {
        logoutEvents += 1
      })

      const expiredResult = await verifyCurrentSession()
      expect(expiredResult).toBeNull()
      expect(logoutEvents).toBe(1)
      expect(getAuthToken()).toBeNull()
      expect(getActiveUser()).toBeNull()
      expect(loadAuthPreviewSession()).toBeNull()
    })

    it('preserves stored JWT and cached user on verifyCurrentSession transient errors (0, 408, 429, 503) and malformed 200 payloads, while cleaning up on 403 or inactive user', async () => {
      const cachedUser = {
        id: 'dddddddd-eeee-4fff-8000-111111111111',
        name: 'Resilient Analyst',
        email: 'resilient@siftrix.internal',
        role: 'analyst' as const,
        organization: 'SOC Alpha',
        createdAt: '2026-11-28T01:00:00Z',
      }
      localMock.setItem(AUTH_TOKEN_KEY, 'jwt_resilient_token')
      localMock.setItem(AUTH_STORAGE_KEY, JSON.stringify(cachedUser))

      let authChangeEvents = 0
      window.addEventListener('siftrix:auth-change', () => {
        authChangeEvents += 1
      })

      // 1. Transient statuses 0 (offline), 408 (timeout), 429 (rate-limit), and 503 (server error)
      for (const status of [0, 408, 429, 503]) {
        vi.spyOn(apiClient, 'apiGet').mockResolvedValueOnce({
          ok: false,
          status,
          data: null,
          error: `Transient failure ${status}`,
        })

        const result = await verifyCurrentSession()
        expect(result, `status ${status}`).toEqual(cachedUser)
        expect(getAuthToken(), `status ${status}`).toBe('jwt_resilient_token')
        expect(getActiveUser(), `status ${status}`).toEqual(cachedUser)
        expect(authChangeEvents, `status ${status}`).toBe(0)
      }

      // 2. Malformed 200 payload from /api/auth/me preserves existing JWT and cached user without overwriting
      vi.spyOn(apiClient, 'apiGet').mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { unexpected: 'shape' } as never,
        error: null,
      })

      const malformedMeResult = await verifyCurrentSession()
      expect(malformedMeResult).toEqual(cachedUser)
      expect(getAuthToken()).toBe('jwt_resilient_token')
      expect(localMock.getItem(AUTH_STORAGE_KEY)).toBe(JSON.stringify(cachedUser))
      expect(authChangeEvents).toBe(0)

      // 3. Valid 200 payload with is_active === false cleans up auth state via logoutUser()
      vi.spyOn(apiClient, 'apiGet').mockResolvedValueOnce({
        ok: true,
        status: 200,
        error: null,
        data: {
          id: cachedUser.id,
          email: cachedUser.email,
          full_name: cachedUser.name,
          is_active: false,
          created_at: cachedUser.createdAt,
        },
      })

      const inactiveResult = await verifyCurrentSession()
      expect(inactiveResult).toBeNull()
      expect(getAuthToken()).toBeNull()
      expect(getActiveUser()).toBeNull()
      expect(authChangeEvents).toBe(1)

      // 4. HTTP 403 Forbidden from /api/auth/me cleans up auth state via logoutUser()
      localMock.setItem(AUTH_TOKEN_KEY, 'jwt_forbidden_token')
      localMock.setItem(AUTH_STORAGE_KEY, JSON.stringify(cachedUser))
      authChangeEvents = 0

      vi.spyOn(apiClient, 'apiGet').mockResolvedValueOnce({
        ok: false,
        status: 403,
        data: null,
        error: 'User account is inactive',
      })

      const forbiddenResult = await verifyCurrentSession()
      expect(forbiddenResult).toBeNull()
      expect(getAuthToken()).toBeNull()
      expect(getActiveUser()).toBeNull()
      expect(authChangeEvents).toBe(1)
    })

    it('rejects whitespace-only tokens in isRememberedSession consistently with loadAuthToken', () => {
      localMock.setItem(AUTH_TOKEN_KEY, '    ')
      sessionMock.setItem(AUTH_TOKEN_KEY, 'jwt_session_real')

      expect(isRememberedSession()).toBe(false)
      expect(getAuthToken()).toBe('jwt_session_real')
    })

    it('handles corrupt localStorage user JSON and partial or full storage failures safely', async () => {
      const validSessionUser = {
        id: 'eeeeeeee-ffff-4000-8111-222222222222',
        name: 'Session Fallback Analyst',
        email: 'session.analyst@siftrix.internal',
        role: 'analyst' as const,
        organization: 'SIFTRIX SOC',
        createdAt: '2026-11-28T01:20:00Z',
      }

      // 1. Corrupt JSON and malformed user object in localStorage (with no local token) fall through to valid authenticated sessionStorage session
      localMock.setItem(AUTH_STORAGE_KEY, '{corrupt-json')
      sessionMock.setItem(AUTH_TOKEN_KEY, 'jwt_valid_session_fallback')
      sessionMock.setItem(AUTH_STORAGE_KEY, JSON.stringify(validSessionUser))
      expect(getActiveUser()).toEqual(validSessionUser)

      localMock.setItem(AUTH_STORAGE_KEY, JSON.stringify({ wrong: 'fields' }))
      expect(getActiveUser()).toEqual(validSessionUser)

      sessionMock.removeItem(AUTH_TOKEN_KEY)
      expect(getActiveUser()).toBeNull()

      // 2. Partial storage failure: localStorage throws SecurityError while sessionStorage works
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

      vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
        ok: true,
        status: 200,
        error: null,
        data: {
          access_token: 'jwt_partial_session_ok',
          token_type: 'bearer',
          user: {
            id: validSessionUser.id,
            email: validSessionUser.email,
            full_name: validSessionUser.name,
            is_active: true,
            created_at: validSessionUser.createdAt,
          },
        },
      })

      const partialLoginRes = await loginUser({
        email: validSessionUser.email,
        password: 'Password123!',
        rememberMe: false,
      })
      expect(partialLoginRes.success).toBe(true)
      expect(sessionMock.getItem(AUTH_TOKEN_KEY)).toBe('jwt_partial_session_ok')
      expect(getAuthToken()).toBe('jwt_partial_session_ok')
      expect(getActiveUser()?.email).toBe(validSessionUser.email)

      expect(() => logoutUser()).not.toThrow()
      expect(sessionMock.getItem(AUTH_TOKEN_KEY)).toBeNull()
      expect(sessionMock.getItem(AUTH_STORAGE_KEY)).toBeNull()
      expect(getAuthToken()).toBeNull()
      expect(getActiveUser()).toBeNull()

      // 3. Complete storage failure: both localStorage and sessionStorage throw -> memory fallback works without throwing
      Object.defineProperty(globalThis.window, 'sessionStorage', {
        value: throwingStorage,
        writable: true,
        configurable: true,
      })

      vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
        ok: true,
        status: 200,
        error: null,
        data: {
          access_token: 'jwt_memory_only_ok',
          token_type: 'bearer',
          user: {
            id: validSessionUser.id,
            email: validSessionUser.email,
            full_name: validSessionUser.name,
            is_active: true,
            created_at: validSessionUser.createdAt,
          },
        },
      })

      const memoryLoginRes = await loginUser({
        email: validSessionUser.email,
        password: 'Password123!',
        rememberMe: true,
      })
      expect(memoryLoginRes.success).toBe(true)
      expect(getAuthToken()).toBe('jwt_memory_only_ok')
      expect(getActiveUser()?.id).toBe(validSessionUser.id)

      expect(() => logoutUser()).not.toThrow()
      expect(getAuthToken()).toBeNull()
      expect(getActiveUser()).toBeNull()
    })

    it('preserves guest session on network failures and omits X-Session-ID header when no guest session exists', async () => {
      // 1. Login & register with NO guest session ID send empty headers {} (no X-Session-ID key)
      const postSpy = vi
        .spyOn(apiClient, 'apiPost')
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          error: null,
          data: {
            access_token: 'jwt_fresh_visitor_login',
            token_type: 'bearer',
            user: {
              id: 'ffffffff-0000-4111-8222-333333333333',
              email: 'visitor@siftrix.internal',
              full_name: 'Fresh Visitor',
              is_active: true,
              created_at: '2026-11-28T01:30:00Z',
            },
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          error: null,
          data: {
            access_token: 'jwt_fresh_visitor_signup',
            token_type: 'bearer',
            user: {
              id: 'ffffffff-0000-4111-8222-444444444444',
              email: 'newuser@siftrix.internal',
              full_name: 'New Visitor',
              is_active: true,
              created_at: '2026-11-28T01:31:00Z',
            },
          },
        })

      await loginUser({
        email: 'visitor@siftrix.internal',
        password: 'Password123!',
      })
      expect(postSpy.mock.calls[0][2]).toEqual({ headers: {} })
      logoutUser()

      await registerUser({
        fullName: 'New Visitor',
        email: 'newuser@siftrix.internal',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        agreeToTerms: true,
      })
      expect(postSpy.mock.calls[1][2]).toEqual({ headers: {} })
      logoutUser()

      // 2. Network failures (status 0) during login/register preserve existing guest X-Session-ID
      const guestSessionId = '55555555-6666-4777-8888-999999999999'
      saveSessionId(guestSessionId)

      vi.spyOn(apiClient, 'apiPost')
        .mockResolvedValueOnce({
          ok: false,
          status: 0,
          data: null,
          error:
            'Unable to reach the SIFTRIX backend at http://localhost:8000. (Failed to fetch)',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 0,
          data: null,
          error:
            'Unable to reach the SIFTRIX backend at http://localhost:8000. (Failed to fetch)',
        })

      const netLogin = await loginUser({
        email: 'visitor@siftrix.internal',
        password: 'Password123!',
      })
      expect(netLogin.success).toBe(false)
      expect(netLogin.error).toContain('Unable to reach the SIFTRIX backend')
      expect(loadSessionId()).toBe(guestSessionId)
      expect(getAuthToken()).toBeNull()

      const netSignup = await registerUser({
        fullName: 'New Visitor',
        email: 'newuser@siftrix.internal',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        agreeToTerms: true,
      })
      expect(netSignup.success).toBe(false)
      expect(netSignup.error).toContain('Unable to reach the SIFTRIX backend')
      expect(loadSessionId()).toBe(guestSessionId)
      expect(getAuthToken()).toBeNull()
    })

    describe('Phase 4 Step 2.1 — Race conditions, cross-tab logout, and token/user synchronization', () => {
      function createDeferred<T>() {
        let resolve!: (value: T) => void
        const promise = new Promise<T>((res) => {
          resolve = res
        })
        return { promise, resolve }
      }

      function buildSignedLikeJwt(sub: string): string {
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '')
        const payload = btoa(JSON.stringify({ sub, exp: 4102444800 }))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '')
        return `${header}.${payload}.signature_part`
      }

      const userABackend = {
        id: '10101010-2020-4030-8040-505050505050',
        email: 'alice@siftrix.internal',
        full_name: 'Alice Analyst',
        is_active: true,
        created_at: '2026-11-28T02:00:00Z',
      }

      const userBBackend = {
        id: '60606060-7070-4080-8090-aaaaaaaaaaaa',
        email: 'bob@siftrix.internal',
        full_name: 'Bob Responder',
        is_active: true,
        created_at: '2026-11-28T02:05:00Z',
      }

      it('1. does NOT restore User A when startup verifyCurrentSession() returns 200 after User A logs out', async () => {
        const tokenA = buildSignedLikeJwt(userABackend.id)
        vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
          ok: true,
          status: 200,
          error: null,
          data: {
            access_token: tokenA,
            token_type: 'bearer',
            user: userABackend,
          },
        })

        await loginUser({
          email: userABackend.email,
          password: 'Password123!',
          rememberMe: true,
        })
        expect(getAuthenticatedSession()?.id).toBe(userABackend.id)

        const deferredMe = createDeferred<apiClient.ApiResponse<typeof userABackend>>()
        vi.spyOn(apiClient, 'apiGet').mockReturnValueOnce(deferredMe.promise)

        const pendingVerify = verifyCurrentSession()

        // User A logs out while /api/auth/me is still in flight
        logoutUser()
        expect(getAuthToken()).toBeNull()
        expect(getActiveUser()).toBeNull()
        expect(getAuthenticatedSession()).toBeNull()

        let postLogoutAuthEvents = 0
        window.addEventListener('siftrix:auth-change', () => {
          postLogoutAuthEvents += 1
        })

        deferredMe.resolve({
          ok: true,
          status: 200,
          error: null,
          data: userABackend,
        })

        const verifyResult = await pendingVerify
        expect(verifyResult).toBeNull()
        expect(postLogoutAuthEvents).toBe(0)
        expect(localMock.getItem(AUTH_TOKEN_KEY)).toBeNull()
        expect(localMock.getItem(AUTH_STORAGE_KEY)).toBeNull()
        expect(sessionMock.getItem(AUTH_TOKEN_KEY)).toBeNull()
        expect(sessionMock.getItem(AUTH_STORAGE_KEY)).toBeNull()
        expect(getAuthToken()).toBeNull()
        expect(getActiveUser()).toBeNull()
        expect(getAuthenticatedSession()).toBeNull()
        expect(getSessionHeaders()).toEqual({})
      })

      it('2. keeps User B active when User A startup verifyCurrentSession() returns 200 after User B logs in', async () => {
        const tokenA = buildSignedLikeJwt(userABackend.id)
        const tokenB = buildSignedLikeJwt(userBBackend.id)

        vi.spyOn(apiClient, 'apiPost')
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            error: null,
            data: {
              access_token: tokenA,
              token_type: 'bearer',
              user: userABackend,
            },
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            error: null,
            data: {
              access_token: tokenB,
              token_type: 'bearer',
              user: userBBackend,
            },
          })

        await loginUser({
          email: userABackend.email,
          password: 'Password123!',
          rememberMe: true,
        })

        const deferredMeA = createDeferred<apiClient.ApiResponse<typeof userABackend>>()
        vi.spyOn(apiClient, 'apiGet').mockReturnValueOnce(deferredMeA.promise)

        const pendingVerifyA = verifyCurrentSession()

        // User B logs in (sessionStorage tier) before User A's startup verification completes
        await loginUser({
          email: userBBackend.email,
          password: 'Password123!',
          rememberMe: false,
        })
        expect(getAuthToken()).toBe(tokenB)
        expect(getAuthenticatedSession()?.id).toBe(userBBackend.id)

        deferredMeA.resolve({
          ok: true,
          status: 200,
          error: null,
          data: userABackend,
        })

        const verifyResult = await pendingVerifyA
        expect(verifyResult?.id).toBe(userBBackend.id)
        expect(verifyResult?.email).toBe(userBBackend.email)
        expect(localMock.getItem(AUTH_TOKEN_KEY)).toBeNull()
        expect(localMock.getItem(AUTH_STORAGE_KEY)).toBeNull()
        expect(sessionMock.getItem(AUTH_TOKEN_KEY)).toBe(tokenB)
        expect(JSON.parse(sessionMock.getItem(AUTH_STORAGE_KEY)!).id).toBe(
          userBBackend.id
        )
        expect(getAuthToken()).toBe(tokenB)
        expect(getActiveUser()?.id).toBe(userBBackend.id)
        expect(getAuthenticatedSession()?.id).toBe(userBBackend.id)
        expect(getSessionHeaders()).toEqual({
          [AUTHORIZATION_HEADER]: `Bearer ${tokenB}`,
        })
      })

      it('3. does NOT log out User B (or clear a post-logout guest session) when User A startup verifyCurrentSession() returns 401, 403, or inactive user', async () => {
        const tokenA = buildSignedLikeJwt(userABackend.id)
        const tokenB = buildSignedLikeJwt(userBBackend.id)

        for (const staleResponse of [
          {
            ok: false,
            status: 401,
            data: null,
            error: 'Token has expired',
          },
          {
            ok: false,
            status: 403,
            data: null,
            error: 'Forbidden',
          },
          {
            ok: true,
            status: 200,
            error: null,
            data: { ...userABackend, is_active: false },
          },
        ] as apiClient.ApiResponse<typeof userABackend>[]) {
          logoutUser()
          localMock.setItem(AUTH_TOKEN_KEY, tokenA)
          localMock.setItem(
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

          const deferredMeA = createDeferred<apiClient.ApiResponse<typeof userABackend>>()
          vi.spyOn(apiClient, 'apiGet').mockReturnValueOnce(deferredMeA.promise)

          const pendingVerifyA = verifyCurrentSession()

          vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
            ok: true,
            status: 200,
            error: null,
            data: {
              access_token: tokenB,
              token_type: 'bearer',
              user: userBBackend,
            },
          })
          await loginUser({
            email: userBBackend.email,
            password: 'Password123!',
            rememberMe: true,
          })

          deferredMeA.resolve(staleResponse)
          const result = await pendingVerifyA

          expect(result?.id).toBe(userBBackend.id)
          expect(localMock.getItem(AUTH_TOKEN_KEY)).toBe(tokenB)
          expect(JSON.parse(localMock.getItem(AUTH_STORAGE_KEY)!).id).toBe(
            userBBackend.id
          )
          expect(getAuthToken()).toBe(tokenB)
          expect(getActiveUser()?.id).toBe(userBBackend.id)
          expect(getAuthenticatedSession()?.id).toBe(userBBackend.id)
        }

        // Also ensure stale 401 after logout does not clear a newly established guest X-Session-ID
        logoutUser()
        localMock.setItem(AUTH_TOKEN_KEY, tokenA)
        const deferredGuestCase =
          createDeferred<apiClient.ApiResponse<typeof userABackend>>()
        vi.spyOn(apiClient, 'apiGet').mockReturnValueOnce(
          deferredGuestCase.promise
        )

        const pendingStale401 = verifyCurrentSession()
        logoutUser()
        const freshGuestId = '77777777-8888-4999-8aaa-bbbbbbbbbbbb'
        saveSessionId(freshGuestId)

        deferredGuestCase.resolve({
          ok: false,
          status: 401,
          data: null,
          error: 'Invalid token',
        })

        expect(await pendingStale401).toBeNull()
        expect(loadSessionId()).toBe(freshGuestId)
        expect(getAuthenticatedSession()).toBeNull()
      })

      it('4. does NOT resurrect User A when startup verifyCurrentSession() returns transient errors (0, 408, 503) after logout', async () => {
        const tokenA = buildSignedLikeJwt(userABackend.id)

        for (const status of [0, 408, 503]) {
          localMock.setItem(AUTH_TOKEN_KEY, tokenA)
          localMock.setItem(
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

          const deferredTransient =
            createDeferred<apiClient.ApiResponse<typeof userABackend>>()
          vi.spyOn(apiClient, 'apiGet').mockReturnValueOnce(
            deferredTransient.promise
          )

          const pendingVerify = verifyCurrentSession()
          logoutUser()

          deferredTransient.resolve({
            ok: false,
            status,
            data: null,
            error: `Transient failure ${status}`,
          })

          const result = await pendingVerify
          expect(result, `status ${status}`).toBeNull()
          expect(localMock.getItem(AUTH_TOKEN_KEY), `status ${status}`).toBeNull()
          expect(localMock.getItem(AUTH_STORAGE_KEY), `status ${status}`).toBeNull()
          expect(getAuthToken(), `status ${status}`).toBeNull()
          expect(getActiveUser(), `status ${status}`).toBeNull()
          expect(getAuthenticatedSession(), `status ${status}`).toBeNull()
        }
      })

      it('5. synchronizes Tab 1 to signed out when remembered User A logs out in Tab 2 without stale memory resurrection', async () => {
        const tokenA = buildSignedLikeJwt(userABackend.id)
        vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
          ok: true,
          status: 200,
          error: null,
          data: {
            access_token: tokenA,
            token_type: 'bearer',
            user: userABackend,
          },
        })

        await loginUser({
          email: userABackend.email,
          password: 'Password123!',
          rememberMe: true,
        })

        expect(localMock.getItem(AUTH_TOKEN_KEY)).toBe(tokenA)
        expect(getAuthToken()).toBe(tokenA)
        expect(getActiveUser()?.id).toBe(userABackend.id)
        expect(getAuthenticatedSession()?.id).toBe(userABackend.id)

        // Simulate Tab 2 removing localStorage auth keys and browser firing storage events in Tab 1
        localMock.removeItem(AUTH_STORAGE_KEY)
        expect(
          syncCrossTabAuthStorageEvent({
            key: AUTH_STORAGE_KEY,
            newValue: null,
            storageArea: localMock,
          })
        ).toBe(true)
        // Even after only AUTH_STORAGE_KEY is removed, Tab 1 refuses orphaned token without matching user
        expect(getActiveUser()).toBeNull()
        expect(getAuthenticatedSession()).toBeNull()

        localMock.removeItem(AUTH_TOKEN_KEY)
        expect(
          syncCrossTabAuthStorageEvent({
            key: AUTH_TOKEN_KEY,
            newValue: null,
            storageArea: localMock,
          })
        ).toBe(true)

        expect(localMock.getItem(AUTH_TOKEN_KEY)).toBeNull()
        expect(localMock.getItem(AUTH_STORAGE_KEY)).toBeNull()
        expect(getAuthToken()).toBeNull()
        expect(getActiveUser()).toBeNull()
        expect(getAuthenticatedSession()).toBeNull()
        expect(getSessionHeaders()).toEqual({})
      })

      it('6. preserves an independent sessionStorage session in Tab 1 across Tab 2 localStorage events and never mixes tokens and users across accounts', async () => {
        const tokenA = buildSignedLikeJwt(userABackend.id)
        const tokenB = buildSignedLikeJwt(userBBackend.id)

        vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
          ok: true,
          status: 200,
          error: null,
          data: {
            access_token: tokenB,
            token_type: 'bearer',
            user: userBBackend,
          },
        })

        await loginUser({
          email: userBBackend.email,
          password: 'Password123!',
          rememberMe: false,
        })

        expect(sessionMock.getItem(AUTH_TOKEN_KEY)).toBe(tokenB)
        expect(getAuthenticatedSession()?.id).toBe(userBBackend.id)

        // Unrelated Tab 2 localStorage event is ignored completely
        expect(
          syncCrossTabAuthStorageEvent({
            key: 'siftrix_theme_v1',
            newValue: 'dark',
            storageArea: localMock,
          })
        ).toBe(false)
        expect(sessionMock.getItem(AUTH_TOKEN_KEY)).toBe(tokenB)
        expect(getAuthToken()).toBe(tokenB)
        expect(getActiveUser()?.id).toBe(userBBackend.id)
        expect(getAuthenticatedSession()?.id).toBe(userBBackend.id)

        // Tab 2 localStorage logout event also preserves Tab 1's independent sessionStorage session
        expect(
          syncCrossTabAuthStorageEvent({
            key: AUTH_TOKEN_KEY,
            newValue: null,
            storageArea: localMock,
          })
        ).toBe(true)
        expect(sessionMock.getItem(AUTH_TOKEN_KEY)).toBe(tokenB)
        expect(getAuthToken()).toBe(tokenB)
        expect(getActiveUser()?.id).toBe(userBBackend.id)
        expect(getAuthenticatedSession()?.id).toBe(userBBackend.id)

        // Cross-tier mismatch: if Tab 2 writes User A's token to localStorage without User A's profile yet,
        // Tab 1 never pairs User A's localStorage token with User B's sessionStorage AuthUser
        localMock.setItem(AUTH_TOKEN_KEY, tokenA)
        expect(getAuthToken()).toBe(tokenA)
        expect(getActiveUser()).toBeNull()
        expect(getAuthenticatedSession()).toBeNull()

        // Same-tier JWT subject mismatch: User A's JWT in localStorage paired with User B's AuthUser is rejected
        localMock.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({
            id: userBBackend.id,
            name: userBBackend.full_name,
            email: userBBackend.email,
            role: 'analyst',
            organization: 'SIFTRIX Cyber Defense',
            createdAt: userBBackend.created_at,
          })
        )
        expect(getActiveUser()).toBeNull()
        expect(getAuthenticatedSession()).toBeNull()
      })

      it('7. preserves memory-only fallback when browser storage throws SecurityError/QuotaExceededError', async () => {
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

        const tokenA = buildSignedLikeJwt(userABackend.id)
        vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
          ok: true,
          status: 200,
          error: null,
          data: {
            access_token: tokenA,
            token_type: 'bearer',
            user: userABackend,
          },
        })

        const res = await loginUser({
          email: userABackend.email,
          password: 'Password123!',
          rememberMe: true,
        })

        expect(res.success).toBe(true)
        expect(getAuthToken()).toBe(tokenA)
        expect(getActiveUser()?.id).toBe(userABackend.id)
        expect(getAuthenticatedSession()?.id).toBe(userABackend.id)
        expect(getSessionHeaders()).toEqual({
          [AUTHORIZATION_HEADER]: `Bearer ${tokenA}`,
        })

        // Synthetic storage event while localStorage is unreadable must not wipe memory-only fallback
        syncCrossTabAuthStorageEvent({
          key: AUTH_TOKEN_KEY,
          newValue: null,
        })
        expect(getAuthToken()).toBe(tokenA)
        expect(getActiveUser()?.id).toBe(userABackend.id)
        expect(getAuthenticatedSession()?.id).toBe(userABackend.id)

        logoutUser()
        expect(getAuthToken()).toBeNull()
        expect(getActiveUser()).toBeNull()
        expect(getAuthenticatedSession()).toBeNull()
      })

      it('8. maintains active-token verifyCurrentSession() refresh and normal logoutUser() lifecycle', async () => {
        const tokenA = buildSignedLikeJwt(userABackend.id)
        vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
          ok: true,
          status: 200,
          error: null,
          data: {
            access_token: tokenA,
            token_type: 'bearer',
            user: userABackend,
          },
        })

        await loginUser({
          email: userABackend.email,
          password: 'Password123!',
          rememberMe: true,
        })
        expect(getAuthenticatedSession()).toEqual({
          id: userABackend.id,
          name: userABackend.full_name,
          email: userABackend.email,
          mode: 'signin',
          createdAt: userABackend.created_at,
        })

        vi.spyOn(apiClient, 'apiGet').mockResolvedValueOnce({
          ok: true,
          status: 200,
          error: null,
          data: {
            ...userABackend,
            full_name: 'Alice Lead Analyst',
          },
        })

        const refreshed = await verifyCurrentSession()
        expect(refreshed?.name).toBe('Alice Lead Analyst')
        expect(getAuthenticatedSession('signup')).toEqual({
          id: userABackend.id,
          name: 'Alice Lead Analyst',
          email: userABackend.email,
          mode: 'signup',
          createdAt: userABackend.created_at,
        })

        logoutUser()
        expect(localMock.getItem(AUTH_TOKEN_KEY)).toBeNull()
        expect(localMock.getItem(AUTH_STORAGE_KEY)).toBeNull()
        expect(getAuthToken()).toBeNull()
        expect(getActiveUser()).toBeNull()
        expect(getAuthenticatedSession()).toBeNull()
      })

      it('9. (B1) preserves an independent rememberMe=false memory-fallback session when sessionStorage.setItem throws QuotaExceededError and Tab 2 clears localStorage', async () => {
        const quotaSessionStorage: Storage = {
          getItem: (key: string) => sessionMock.getItem(key),
          setItem: () => {
            throw new Error('QuotaExceededError')
          },
          removeItem: (key: string) => sessionMock.removeItem(key),
          clear: () => sessionMock.clear(),
          get length() {
            return sessionMock.length
          },
          key: (i: number) => sessionMock.key(i),
        }

        Object.defineProperty(globalThis.window, 'sessionStorage', {
          value: quotaSessionStorage,
          writable: true,
          configurable: true,
        })

        const tokenB = buildSignedLikeJwt(userBBackend.id)
        vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
          ok: true,
          status: 200,
          error: null,
          data: {
            access_token: tokenB,
            token_type: 'bearer',
            user: userBBackend,
          },
        })

        // User B signs in with rememberMe=false; sessionStorage.setItem throws while localStorage remains readable
        const loginRes = await loginUser({
          email: userBBackend.email,
          password: 'Password123!',
          rememberMe: false,
        })

        expect(loginRes.success).toBe(true)
        expect(localMock.getItem(AUTH_TOKEN_KEY)).toBeNull()
        expect(sessionMock.getItem(AUTH_TOKEN_KEY)).toBeNull()
        expect(getAuthToken()).toBe(tokenB)
        expect(getActiveUser()?.id).toBe(userBBackend.id)
        expect(getAuthenticatedSession()?.id).toBe(userBBackend.id)

        // Tab 2 logs out of localStorage / clears localStorage while localMock.getItem works normally
        expect(
          syncCrossTabAuthStorageEvent({
            key: AUTH_STORAGE_KEY,
            newValue: null,
            storageArea: localMock,
          })
        ).toBe(true)
        expect(
          syncCrossTabAuthStorageEvent({
            key: AUTH_TOKEN_KEY,
            newValue: null,
            storageArea: localMock,
          })
        ).toBe(true)
        expect(
          syncCrossTabAuthStorageEvent({
            key: null,
            newValue: null,
            storageArea: localMock,
          })
        ).toBe(true)

        // Tab 1's independent rememberMe=false memory-fallback session remains intact
        expect(getAuthToken()).toBe(tokenB)
        expect(getActiveUser()?.id).toBe(userBBackend.id)
        expect(getAuthenticatedSession()?.id).toBe(userBBackend.id)
        expect(getSessionHeaders()).toEqual({
          [AUTHORIZATION_HEADER]: `Bearer ${tokenB}`,
        })
      })

      it('10. (B2) never returns a stale AuthUser from getActiveUser() when no valid token exists in localStorage, sessionStorage, or memory', async () => {
        const orphanUser = {
          id: userABackend.id,
          name: userABackend.full_name,
          email: userABackend.email,
          role: 'analyst' as const,
          organization: 'SIFTRIX Cyber Defense',
          createdAt: userABackend.created_at,
        }

        // 1. Orphaned user in localStorage with missing or blank token
        localMock.setItem(AUTH_STORAGE_KEY, JSON.stringify(orphanUser))
        expect(getAuthToken()).toBeNull()
        expect(getActiveUser()).toBeNull()
        expect(getAuthenticatedSession()).toBeNull()

        localMock.setItem(AUTH_TOKEN_KEY, '   ')
        expect(getAuthToken()).toBeNull()
        expect(getActiveUser()).toBeNull()
        expect(getAuthenticatedSession()).toBeNull()

        // 2. Orphaned user in sessionStorage with no token
        localMock.clear()
        sessionMock.setItem(AUTH_STORAGE_KEY, JSON.stringify(orphanUser))
        expect(getAuthToken()).toBeNull()
        expect(getActiveUser()).toBeNull()
        expect(getAuthenticatedSession()).toBeNull()

        // 3. Startup verifyCurrentSession() still scrubs orphaned AUTH_STORAGE_KEY records when no token exists
        let authEvents = 0
        window.addEventListener('siftrix:auth-change', () => {
          authEvents += 1
        })
        expect(await verifyCurrentSession()).toBeNull()
        expect(authEvents).toBe(1)
        expect(sessionMock.getItem(AUTH_STORAGE_KEY)).toBeNull()
        expect(getActiveUser()).toBeNull()
      })
    })
  })
})
