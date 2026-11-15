import { apiGet, apiPost } from './apiClient'
import {
  clearAuthPreviewSession,
  saveAuthPreviewSession,
} from '../utils/authPreview'
import {
  AUTHORIZATION_HEADER,
  clearSessionId,
  getGuestSessionHeaders,
  loadAuthToken,
  setMemoryAuthToken,
} from '../utils/session'
import {
  notifyChatSessionChange,
  resetChatStateOnSignOut,
  setActiveChatUserId,
} from './chatService'
import {
  resetGamificationStateOnSignOut,
  setActiveGamificationUserId,
} from './gamificationService'
import { clearCustomMockScans } from './scanHistoryService'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'analyst' | 'admin' | 'guest'
  avatarUrl?: string
  organization?: string
  createdAt: string
}

export interface BackendUserPublic {
  id: string
  email: string
  full_name: string
  is_active: boolean
  created_at: string
}

export interface BackendTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: BackendUserPublic
}

export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

export interface SignupPayload {
  fullName: string
  email: string
  password: string
  confirmPassword: string
  organization?: string
  agreeToTerms: boolean
}

export interface AuthResponse {
  success: boolean
  user?: AuthUser
  token?: string
  error?: string
  mode: 'demo_mock' | 'api'
}

export interface PasswordStrength {
  score: number // 0 to 4
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong'
  colorClass: string
  feedback: string[]
}

export const AUTH_STORAGE_KEY = 'siftrix_auth_user_v2'
export const AUTH_TOKEN_KEY = 'siftrix_auth_token_v2'

let memoryStoredUser: AuthUser | null = null

function safeEncode(val: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(val)
  }
  return 'demo_token_' + Date.now()
}

/**
 * Calculates password strength and provides feedback rules.
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: 'Very Weak',
      colorClass: 'bg-red-500',
      feedback: ['Enter a password with at least 8 characters.'],
    }
  }

  let score = 0
  const feedback: string[] = []

  if (password.length >= 8) score += 1
  else feedback.push('Use at least 8 characters')

  if (/[A-Z]/.test(password)) score += 1
  else feedback.push('Include at least one uppercase letter')

  if (/[0-9]/.test(password)) score += 1
  else feedback.push('Include at least one number')

  if (/[^A-Za-z0-9]/.test(password)) score += 1
  else feedback.push('Include a special symbol (@, #, $, etc.)')

  if (password.length >= 12 && score === 4) {
    score = 4
  }

  const labelMap: Record<number, PasswordStrength['label']> = {
    0: 'Very Weak',
    1: 'Weak',
    2: 'Fair',
    3: 'Good',
    4: 'Strong',
  }

  const colorMap: Record<number, string> = {
    0: 'bg-red-500',
    1: 'bg-orange-500',
    2: 'bg-amber-500',
    3: 'bg-blue-500',
    4: 'bg-emerald-500',
  }

  return {
    score,
    label: labelMap[score] || 'Weak',
    colorClass: colorMap[score] || 'bg-red-500',
    feedback,
  }
}

/**
 * Validates login credentials on the client.
 */
export function validateLoginCredentials(credentials: LoginCredentials): {
  valid: boolean
  error?: string
} {
  const email = credentials.email.trim()
  if (!email) {
    return { valid: false, error: 'Please enter your email address.' }
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Please enter a valid email address.' }
  }
  if (!credentials.password) {
    return { valid: false, error: 'Please enter your password.' }
  }
  if (credentials.password.length < 8) {
    return {
      valid: false,
      error: 'Password must be at least 8 characters long.',
    }
  }
  return { valid: true }
}

/**
 * Validates signup payload on the client.
 */
export function validateSignupPayload(payload: SignupPayload): {
  valid: boolean
  error?: string
} {
  const name = payload.fullName.trim()
  if (name.length < 2) {
    return {
      valid: false,
      error: 'Please enter your full name (at least 2 characters).',
    }
  }

  const credCheck = validateLoginCredentials({
    email: payload.email,
    password: payload.password,
  })
  if (!credCheck.valid) {
    return credCheck
  }

  if (payload.password !== payload.confirmPassword) {
    return {
      valid: false,
      error: 'Passwords do not match. Please re-enter both password fields.',
    }
  }

  if (!payload.agreeToTerms) {
    return {
      valid: false,
      error: 'You must agree to the SIFTRIX Security Terms & Conditions.',
    }
  }

  return { valid: true }
}

function mapBackendUserToAuthUser(
  backendUser: BackendUserPublic,
  organization?: string
): AuthUser {
  return {
    id: String(backendUser.id),
    name: backendUser.full_name?.trim() || deriveNameFromEmail(backendUser.email),
    email: backendUser.email.toLowerCase().trim(),
    role: 'analyst',
    organization: organization?.trim() || 'SIFTRIX Cyber Defense',
    createdAt: backendUser.created_at || new Date().toISOString(),
  }
}

/**
 * Authenticates a user against POST /api/auth/login.
 */
export async function loginUser(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  const validation = validateLoginCredentials(credentials)
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      mode: 'api',
    }
  }

  const res = await apiPost<BackendTokenResponse>(
    '/api/auth/login',
    {
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    },
    {
      headers: getGuestSessionHeaders(),
    }
  )

  if (!res.ok || !res.data || !res.data.access_token || !res.data.user) {
    return {
      success: false,
      error: res.error || 'Invalid email or password.',
      mode: 'api',
    }
  }

  const user = mapBackendUserToAuthUser(res.data.user)
  const token = res.data.access_token

  // Clear guest X-Session-ID now that backend migrated any guest scans to user.id
  clearSessionId()
  saveStoredUser(user, token, credentials.rememberMe ?? true)

  return {
    success: true,
    user,
    token,
    mode: 'api',
  }
}

/**
 * Registers a new user account via POST /api/auth/register.
 */
export async function registerUser(
  payload: SignupPayload
): Promise<AuthResponse> {
  const validation = validateSignupPayload(payload)
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      mode: 'api',
    }
  }

  const res = await apiPost<BackendTokenResponse>(
    '/api/auth/register',
    {
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      full_name: payload.fullName.trim(),
    },
    {
      headers: getGuestSessionHeaders(),
    }
  )

  if (!res.ok || !res.data || !res.data.access_token || !res.data.user) {
    return {
      success: false,
      error:
        res.error ||
        'Registration failed. Please verify your details and try again.',
      mode: 'api',
    }
  }

  const user = mapBackendUserToAuthUser(
    res.data.user,
    payload.organization?.trim() || 'Independent Security Team'
  )
  const token = res.data.access_token

  clearSessionId()
  saveStoredUser(user, token, true)

  return {
    success: true,
    user,
    token,
    mode: 'api',
  }
}

/**
 * Verifies the stored JWT token on app startup via GET /api/auth/me.
 * Clears invalid or expired sessions so the user is not left logged in.
 */
export async function verifyCurrentSession(): Promise<AuthUser | null> {
  const token = getAuthToken()
  if (!token) {
    logoutUser()
    return null
  }

  const res = await apiGet<BackendUserPublic>('/api/auth/me', {
    headers: {
      [AUTHORIZATION_HEADER]: `Bearer ${token}`,
    },
  })

  if (!res.ok || !res.data || !res.data.id) {
    logoutUser()
    return null
  }

  const existing = getActiveUser()
  const remember = isRememberedSession()
  const verifiedUser = mapBackendUserToAuthUser(
    res.data,
    existing?.organization || 'SIFTRIX Cyber Defense'
  )
  saveStoredUser(verifiedUser, token, remember)
  return verifiedUser
}

/**
 * Retrieves the active JWT access token if present.
 */
export function getAuthToken(): string | null {
  return loadAuthToken()
}

function getSafeLocalStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage
    }
  } catch {
    return null
  }
  return null
}

function getSafeSessionStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage
    }
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage
    }
  } catch {
    return null
  }
  return null
}

function isRememberedSession(): boolean {
  try {
    const local = getSafeLocalStorage()
    if (local) {
      return Boolean(local.getItem(AUTH_TOKEN_KEY))
    }
  } catch {
    // Ignore storage read issues
  }
  return true
}

/**
 * Mock authentication service function that simulates login network round-trip.
 * Prepares the architecture for connecting to FastAPI `/api/auth/login`.
 */
export async function mockLogin(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 450))

  const validation = validateLoginCredentials(credentials)
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      mode: 'demo_mock',
    }
  }

  // Pre-configured demo failure case for testing error boundaries
  if (credentials.email.toLowerCase() === 'blocked@example.com') {
    return {
      success: false,
      error: 'This account has been temporarily locked due to suspicious activity.',
      mode: 'demo_mock',
    }
  }

  const user: AuthUser = {
    id: `usr_${Math.random().toString(36).slice(2, 10)}`,
    name: deriveNameFromEmail(credentials.email),
    email: credentials.email.toLowerCase().trim(),
    role: 'analyst',
    organization: 'SIFTRIX Cyber Defense',
    createdAt: new Date().toISOString(),
  }

  const token = `sfx_${safeEncode(user.id + ':' + Date.now())}`

  saveStoredUser(user, token, credentials.rememberMe ?? true)

  return {
    success: true,
    user,
    token,
    mode: 'demo_mock',
  }
}

/**
 * Mock signup function that simulates user creation.
 * Prepares the architecture for connecting to FastAPI `/api/auth/register`.
 */
export async function mockSignup(
  payload: SignupPayload
): Promise<AuthResponse> {
  await new Promise((resolve) => setTimeout(resolve, 500))

  const validation = validateSignupPayload(payload)
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      mode: 'demo_mock',
    }
  }

  const user: AuthUser = {
    id: `usr_${Math.random().toString(36).slice(2, 10)}`,
    name: payload.fullName.trim(),
    email: payload.email.toLowerCase().trim(),
    role: 'analyst',
    organization: payload.organization?.trim() || 'Independent Security Team',
    createdAt: new Date().toISOString(),
  }

  const token = `sfx_${safeEncode(user.id + ':' + Date.now())}`

  saveStoredUser(user, token, true)

  return {
    success: true,
    user,
    token,
    mode: 'demo_mock',
  }
}

/**
 * Retrieves the currently active user session from browser storage.
 */
export function getActiveUser(): AuthUser | null {
  try {
    const local = getSafeLocalStorage()
    const session = getSafeSessionStorage()
    const raw =
      local?.getItem(AUTH_STORAGE_KEY) ||
      session?.getItem(AUTH_STORAGE_KEY) ||
      null
    if (!raw) return memoryStoredUser
    return JSON.parse(raw) as AuthUser
  } catch {
    return memoryStoredUser
  }
}

/**
 * Clears the active user session across storage providers and resets session-scoped UI caches.
 */
export function logoutUser(): void {
  memoryStoredUser = null
  setMemoryAuthToken(null)
  setActiveChatUserId(null)
  setActiveGamificationUserId(null)
  try {
    const local = getSafeLocalStorage()
    const session = getSafeSessionStorage()
    local?.removeItem(AUTH_STORAGE_KEY)
    local?.removeItem(AUTH_TOKEN_KEY)
    session?.removeItem(AUTH_STORAGE_KEY)
    session?.removeItem(AUTH_TOKEN_KEY)
  } catch {
    // Ignore storage clear issues
  }
  clearAuthPreviewSession()
  clearSessionId()
  clearCustomMockScans()
  resetChatStateOnSignOut()
  resetGamificationStateOnSignOut()
}

function saveStoredUser(user: AuthUser, token: string, remember: boolean): void {
  memoryStoredUser = user
  setMemoryAuthToken(token)
  setActiveChatUserId(user.id)
  setActiveGamificationUserId(user.id)
  try {
    const local = getSafeLocalStorage()
    const session = getSafeSessionStorage()
    const targetStorage = remember ? local : session
    const otherStorage = remember ? session : local
    otherStorage?.removeItem(AUTH_STORAGE_KEY)
    otherStorage?.removeItem(AUTH_TOKEN_KEY)
    targetStorage?.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
    targetStorage?.setItem(AUTH_TOKEN_KEY, token)
  } catch {
    // Ignore quota issues
  }
  saveAuthPreviewSession({
    id: user.id,
    name: user.name,
    email: user.email,
    mode: 'signin',
    createdAt: user.createdAt || new Date().toISOString(),
  })
  notifyChatSessionChange()
}

function deriveNameFromEmail(email: string): string {
  const local = email.split('@')[0] || 'Security Analyst'
  const cleaned = local.replace(/[._-]+/g, ' ').trim()
  if (!cleaned) return 'Security Analyst'
  return cleaned
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
