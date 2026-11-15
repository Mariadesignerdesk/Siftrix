import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import * as apiClient from './apiClient'
import {
  AUTH_STORAGE_KEY,
  AUTH_TOKEN_KEY,
  evaluatePasswordStrength,
  getActiveUser,
  getAuthToken,
  loginUser,
  logoutUser,
  mockLogin,
  mockSignup,
  registerUser,
  validateLoginCredentials,
  validateSignupPayload,
  verifyCurrentSession,
} from './authService'
import { loadAuthPreviewSession } from '../utils/authPreview'
import {
  AUTHORIZATION_HEADER,
  SESSION_ID_HEADER,
  loadSessionId,
  saveSessionId,
} from '../utils/session'

function createMockStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, val: string) => {
      map.set(key, val)
    },
    removeItem: (key: string) => {
      map.delete(key)
    },
    clear: () => {
      map.clear()
    },
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    get length() {
      return map.size
    },
  }
}

describe('authService', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMockStorage())
    vi.stubGlobal('sessionStorage', createMockStorage())
    logoutUser()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
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

  it('authenticates against POST /api/auth/login, stores token, and migrates guest X-Session-ID', async () => {
    const guestSessionId = '11111111-2222-4333-8444-555555555555'
    saveSessionId(guestSessionId)

    const postSpy = vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
      ok: true,
      status: 200,
      error: null,
      data: {
        access_token: 'jwt_real_token_user_1',
        token_type: 'bearer',
        expires_in: 86400,
        user: {
          id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
          email: 'analyst@siftrix.internal',
          full_name: 'Sarah Analyst',
          is_active: true,
          created_at: '2026-11-15T10:00:00Z',
        },
      },
    })

    const res = await loginUser({
      email: 'Analyst@Siftrix.Internal',
      password: 'Password123!',
      rememberMe: true,
    })

    expect(postSpy).toHaveBeenCalledWith(
      '/api/auth/login',
      {
        email: 'analyst@siftrix.internal',
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
    expect(res.token).toBe('jwt_real_token_user_1')
    expect(res.user?.id).toBe('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')
    expect(res.user?.name).toBe('Sarah Analyst')
    expect(getAuthToken()).toBe('jwt_real_token_user_1')
    expect(getActiveUser()?.email).toBe('analyst@siftrix.internal')
    expect(loadSessionId()).toBeNull()
  })

  it('rejects incorrect password on POST /api/auth/login and surfaces clear error', async () => {
    vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
      ok: false,
      status: 401,
      data: null,
      error: 'Invalid email or password',
    })

    const res = await loginUser({
      email: 'analyst@siftrix.internal',
      password: 'WrongPassword123!',
    })

    expect(res.success).toBe(false)
    expect(res.error).toBe('Invalid email or password')
    expect(getAuthToken()).toBeNull()
    expect(getActiveUser()).toBeNull()
  })

  it('registers new user via POST /api/auth/register and stores token and user', async () => {
    const postSpy = vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
      ok: true,
      status: 201,
      error: null,
      data: {
        access_token: 'jwt_signup_token_1',
        token_type: 'bearer',
        expires_in: 86400,
        user: {
          id: 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
          email: 'tariq@siftrix.internal',
          full_name: 'Tariq Mansoor',
          is_active: true,
          created_at: '2026-11-15T11:00:00Z',
        },
      },
    })

    const res = await registerUser({
      fullName: 'Tariq Mansoor',
      email: 'Tariq@Siftrix.Internal',
      password: 'CyberGuard#2026',
      confirmPassword: 'CyberGuard#2026',
      organization: 'National SOC',
      agreeToTerms: true,
    })

    expect(postSpy).toHaveBeenCalledWith(
      '/api/auth/register',
      {
        email: 'tariq@siftrix.internal',
        password: 'CyberGuard#2026',
        full_name: 'Tariq Mansoor',
      },
      expect.any(Object)
    )
    expect(res.success).toBe(true)
    expect(res.token).toBe('jwt_signup_token_1')
    expect(res.user?.id).toBe('bbbbbbbb-cccc-4ddd-8eee-ffffffffffff')
    expect(getAuthToken()).toBe('jwt_signup_token_1')
  })

  it('restores valid session on startup via GET /api/auth/me and clears expired or invalid tokens', async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'valid_startup_jwt')
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        id: 'cccccccc-dddd-4eee-8fff-000000000000',
        name: 'Cached User',
        email: 'cached@siftrix.internal',
        role: 'analyst',
        organization: 'SOC Team',
        createdAt: '2026-11-15T09:00:00Z',
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
        created_at: '2026-11-15T09:00:00Z',
      },
    })

    const restored = await verifyCurrentSession()
    expect(getSpy).toHaveBeenCalledWith('/api/auth/me', {
      headers: {
        [AUTHORIZATION_HEADER]: 'Bearer valid_startup_jwt',
      },
    })
    expect(restored?.name).toBe('Verified Analyst')
    expect(restored?.id).toBe('cccccccc-dddd-4eee-8fff-000000000000')
    expect(loadAuthPreviewSession()?.email).toBe('cached@siftrix.internal')

    // Now simulate an expired/invalid token (401 from /api/auth/me)
    vi.spyOn(apiClient, 'apiGet').mockResolvedValueOnce({
      ok: false,
      status: 401,
      data: null,
      error: 'Invalid or expired authentication token',
    })

    const expiredResult = await verifyCurrentSession()
    expect(expiredResult).toBeNull()
    expect(getAuthToken()).toBeNull()
    expect(getActiveUser()).toBeNull()
    expect(loadAuthPreviewSession()).toBeNull()
  })
})
