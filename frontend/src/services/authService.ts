import { apiGet, apiPost } from './apiClient'
import {
  clearAuthPreviewSession,
  loadAuthPreviewSession,
  type AuthPreviewSession,
} from '../utils/authPreview'
import {
  AUTHORIZATION_HEADER,
  AUTH_TOKEN_STORAGE_KEY,
  clearSessionId,
  getGuestSessionHeaders,
  hasSavedAuthToken,
  loadAuthToken,
  setMemoryAuthToken,
} from '../utils/session'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'analyst' | 'admin' | 'guest'
  avatarUrl?: string
  organization?: string
  createdAt: string
}

export interface BackendUserResponse {
  id: string
  email: string
  full_name: string
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface BackendTokenResponse {
  access_token: string
  token_type: string
  user: BackendUserResponse
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
export const AUTH_TOKEN_KEY = AUTH_TOKEN_STORAGE_KEY

let memoryStoredUser: AuthUser | null = null

function getSafeLocalStorage(): Storage | null {
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

function getSafeSessionStorage(): Storage | null {
  try {
    if (
      typeof window !== 'undefined' &&
      typeof window.sessionStorage !== 'undefined'
    ) {
      return window.sessionStorage
    }
    if (typeof globalThis !== 'undefined' && 'sessionStorage' in globalThis) {
      return globalThis.sessionStorage ?? null
    }
  } catch {
    return null
  }
  return null
}

function isValidBackendUserResponse(
  data: unknown
): data is BackendUserResponse {
  if (!data || typeof data !== 'object') {
    return false
  }
  const candidate = data as Partial<BackendUserResponse>
  return (
    typeof candidate.id === 'string' &&
    candidate.id.trim().length > 0 &&
    typeof candidate.email === 'string' &&
    candidate.email.trim().length > 0 &&
    typeof candidate.full_name === 'string' &&
    typeof candidate.is_active === 'boolean' &&
    typeof candidate.created_at === 'string'
  )
}

function isValidBackendTokenResponse(
  data: unknown
): data is BackendTokenResponse {
  if (!data || typeof data !== 'object') {
    return false
  }
  const candidate = data as Partial<BackendTokenResponse>
  return (
    typeof candidate.access_token === 'string' &&
    candidate.access_token.trim().length > 0 &&
    isValidBackendUserResponse(candidate.user) &&
    candidate.user.is_active === true
  )
}

function isValidStoredAuthUser(data: unknown): data is AuthUser {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false
  }
  const candidate = data as Partial<AuthUser>
  return (
    typeof candidate.id === 'string' &&
    candidate.id.trim().length > 0 &&
    typeof candidate.name === 'string' &&
    candidate.name.trim().length > 0 &&
    typeof candidate.email === 'string' &&
    candidate.email.trim().length > 0 &&
    (candidate.role === 'analyst' ||
      candidate.role === 'admin' ||
      candidate.role === 'guest') &&
    typeof candidate.createdAt === 'string'
  )
}

function parseStoredAuthUser(raw: string | null): AuthUser | null {
  if (!raw) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    return isValidStoredAuthUser(parsed) ? parsed : null
  } catch {
    return null
  }
}

function extractJwtSubject(token: string): string | null {
  const parts = token.split('.')
  if (parts.length !== 3 || !parts[1]) {
    return null
  }
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    if (typeof atob !== 'undefined') {
      const json = atob(padded)
      const payload: unknown = JSON.parse(json)
      if (payload && typeof payload === 'object' && 'sub' in payload) {
        const sub = (payload as { sub?: unknown }).sub
        if (typeof sub === 'string' && sub.trim()) {
          return sub.trim()
        }
      }
    }
  } catch {
    return null
  }
  return null
}

function doesTokenMatchUser(token: string, user: AuthUser): boolean {
  const sub = extractJwtSubject(token)
  if (sub && sub !== user.id) {
    return false
  }
  return true
}

function mapBackendUserToAuthUser(
  backendUser: BackendUserResponse,
  organization?: string
): AuthUser {
  const cleanedName = backendUser.full_name.trim()
  return {
    id: backendUser.id.trim(),
    name: cleanedName || deriveNameFromEmail(backendUser.email),
    email: backendUser.email.trim().toLowerCase(),
    role: 'analyst',
    organization: organization?.trim() || 'SIFTRIX Cyber Defense',
    createdAt: backendUser.created_at || new Date().toISOString(),
  }
}

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

/**
 * Authenticates a user against POST /api/auth/login, forwarding any guest
 * X-Session-ID header so the backend can migrate guest scans before clearing it.
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

  if (!res.ok || !isValidBackendTokenResponse(res.data)) {
    return {
      success: false,
      error: res.error || 'Invalid email or password.',
      mode: 'api',
    }
  }

  const user = mapBackendUserToAuthUser(res.data.user)
  const token = res.data.access_token.trim()

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
 * Registers a new user account via POST /api/auth/register, forwarding any guest
 * X-Session-ID header so the backend can migrate guest scans before clearing it.
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

  if (!res.ok || !isValidBackendTokenResponse(res.data)) {
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
  const token = res.data.access_token.trim()

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
 * Retrieves the active JWT access token from storage or memory fallback.
 */
export function getAuthToken(): string | null {
  return loadAuthToken()
}

/**
 * Returns whether a valid active auth token is persisted in localStorage (rememberMe=true).
 */
export function isRememberedSession(): boolean {
  const local = getSafeLocalStorage()
  if (!local) {
    return false
  }
  return hasSavedAuthToken(local)
}

function hasStoredAuthUserRecord(): boolean {
  const local = getSafeLocalStorage()
  if (local) {
    try {
      if (local.getItem(AUTH_STORAGE_KEY) !== null) {
        return true
      }
    } catch {
      // Ignore localStorage read issues
    }
  }

  const session = getSafeSessionStorage()
  if (session) {
    try {
      if (session.getItem(AUTH_STORAGE_KEY) !== null) {
        return true
      }
    } catch {
      // Ignore sessionStorage read issues
    }
  }

  return memoryStoredUser !== null
}

/**
 * Validates the stored JWT against GET /api/auth/me and restores the authenticated user.
 * - Verifies after the request resolves that the active JWT still matches the captured token
 *   so stale in-flight responses never overwrite or log out a newer session.
 * - Cleans up auth state via logoutUser() only on confirmed auth/account rejection (401, 403, or is_active === false).
 * - Preserves existing stored JWT/user on transient network/timeout/rate-limit/5xx errors or malformed 200 payloads.
 * - Leaves pure unauthenticated guest sessions intact when no JWT exists.
 */
export async function verifyCurrentSession(): Promise<AuthUser | null> {
  const token = getAuthToken()
  if (!token) {
    if (hasStoredAuthUserRecord() || loadAuthPreviewSession() !== null) {
      logoutUser()
    }
    return null
  }

  const existing = getActiveUser()

  const res = await apiGet<BackendUserResponse>('/api/auth/me', {
    headers: {
      [AUTHORIZATION_HEADER]: `Bearer ${token}`,
    },
  })

  if (getAuthToken() !== token) {
    return getActiveUser()
  }

  if (res.status === 401 || res.status === 403) {
    logoutUser()
    return null
  }

  if (!res.ok) {
    return getActiveUser() ?? existing
  }

  if (!isValidBackendUserResponse(res.data)) {
    return getActiveUser() ?? existing
  }

  if (!res.data.is_active) {
    logoutUser()
    return null
  }

  const currentExisting = getActiveUser() ?? existing
  const verifiedUser = mapBackendUserToAuthUser(
    res.data,
    currentExisting?.organization || 'SIFTRIX Cyber Defense'
  )
  if (!doesTokenMatchUser(token, verifiedUser)) {
    logoutUser()
    return null
  }
  saveStoredUser(verifiedUser, token, isRememberedSession())
  return verifiedUser
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
 * Requires a valid active auth token in localStorage, sessionStorage, or memory fallback,
 * and accepts only the user record from that exact tier matching the token's subject.
 * Returns null whenever no valid token exists so stale or orphaned user records
 * are never treated as authenticated.
 */
export function getActiveUser(): AuthUser | null {
  const local = getSafeLocalStorage()
  const localToken = local ? loadAuthToken(local) : null
  if (localToken) {
    if (!local) {
      return null
    }
    try {
      const fromLocal = parseStoredAuthUser(local.getItem(AUTH_STORAGE_KEY))
      return fromLocal && doesTokenMatchUser(localToken, fromLocal)
        ? fromLocal
        : null
    } catch {
      return null
    }
  }

  const session = getSafeSessionStorage()
  const sessionToken = session ? loadAuthToken(session) : null
  if (sessionToken) {
    if (!session) {
      return null
    }
    try {
      const fromSession = parseStoredAuthUser(session.getItem(AUTH_STORAGE_KEY))
      return fromSession && doesTokenMatchUser(sessionToken, fromSession)
        ? fromSession
        : null
    } catch {
      return null
    }
  }

  const memoryToken = loadAuthToken()
  if (memoryToken) {
    return memoryStoredUser && doesTokenMatchUser(memoryToken, memoryStoredUser)
      ? memoryStoredUser
      : null
  }

  return null
}

/**
 * Derives a verified UI session summary only when both a valid normalized JWT
 * and a synchronized stored AuthUser exist. Never trusts orphaned preview records.
 */
export function getAuthenticatedSession(
  preferredMode: AuthPreviewSession['mode'] = 'signin'
): AuthPreviewSession | null {
  const token = getAuthToken()
  const user = getActiveUser()
  if (!token || !user || !doesTokenMatchUser(token, user)) {
    return null
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    mode: preferredMode === 'signup' ? 'signup' : 'signin',
    createdAt: user.createdAt,
  }
}

export interface StorageEventLike {
  key: string | null
  newValue?: string | null
  storageArea?: Storage | null
}

/**
 * Synchronizes cross-tab `window` storage events for authentication keys.
 * - Ignores unrelated storage keys and non-localStorage storage areas.
 * - Preserves independent sessionStorage sessions and in-memory fallback sessions
 *   (which only exist when browser storage persistence failed and never lived in localStorage).
 */
export function syncCrossTabAuthStorageEvent(
  event: StorageEventLike
): boolean {
  const local = getSafeLocalStorage()
  if (event.storageArea && local && event.storageArea !== local) {
    return false
  }

  if (
    event.key !== null &&
    event.key !== AUTH_STORAGE_KEY &&
    event.key !== AUTH_TOKEN_KEY
  ) {
    return false
  }

  return true
}

/**
 * Dispatches an event when authentication state changes (login, signup, logout)
 * to allow client components and notification stores to re-scope cleanly.
 */
export function emitAuthChange(): void {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('siftrix:auth-change'))
    }
  } catch {
    // Ignore in non-browser or test environments
  }
}

/**
 * Centralized logout that clears active auth user/token state across localStorage,
 * sessionStorage, in-memory fallback, guest session ID, and UI preview session state,
 * then notifies listeners.
 */
export function logoutUser(): void {
  memoryStoredUser = null
  setMemoryAuthToken(null)

  const local = getSafeLocalStorage()
  if (local) {
    try {
      local.removeItem(AUTH_STORAGE_KEY)
      local.removeItem(AUTH_TOKEN_KEY)
    } catch {
      // Ignore localStorage clear issues
    }
  }

  const session = getSafeSessionStorage()
  if (session) {
    try {
      session.removeItem(AUTH_STORAGE_KEY)
      session.removeItem(AUTH_TOKEN_KEY)
    } catch {
      // Ignore sessionStorage clear issues
    }
  }

  clearAuthPreviewSession()
  clearSessionId()
  emitAuthChange()
}

function saveStoredUser(user: AuthUser, token: string, remember: boolean): void {
  const local = getSafeLocalStorage()
  const session = getSafeSessionStorage()
  const primary = remember ? local : session
  const secondary = remember ? session : local

  if (secondary) {
    try {
      secondary.removeItem(AUTH_STORAGE_KEY)
      secondary.removeItem(AUTH_TOKEN_KEY)
    } catch {
      // Ignore secondary storage clear issues
    }
  }

  const serializedUser = JSON.stringify(user)
  let persistedToPrimary = false

  if (primary) {
    try {
      primary.setItem(AUTH_STORAGE_KEY, serializedUser)
      primary.setItem(AUTH_TOKEN_KEY, token)
      persistedToPrimary =
        primary.getItem(AUTH_TOKEN_KEY) === token &&
        primary.getItem(AUTH_STORAGE_KEY) === serializedUser
    } catch {
      persistedToPrimary = false
      try {
        primary.removeItem(AUTH_STORAGE_KEY)
        primary.removeItem(AUTH_TOKEN_KEY)
      } catch {
        // Ignore partial primary cleanup issues
      }
    }
  }

  if (persistedToPrimary) {
    memoryStoredUser = null
    setMemoryAuthToken(null)
  } else {
    memoryStoredUser = user
    setMemoryAuthToken(token)
  }

  emitAuthChange()
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
