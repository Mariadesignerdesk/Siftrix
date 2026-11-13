export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'analyst' | 'admin' | 'guest'
  avatarUrl?: string
  organization?: string
  createdAt: string
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
    const raw =
      typeof window !== 'undefined'
        ? localStorage.getItem(AUTH_STORAGE_KEY) ||
          sessionStorage.getItem(AUTH_STORAGE_KEY)
        : null
    if (!raw) return memoryStoredUser
    return JSON.parse(raw) as AuthUser
  } catch {
    return memoryStoredUser
  }
}

/**
 * Clears the active user session across storage providers.
 */
export function logoutUser(): void {
  memoryStoredUser = null
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      localStorage.removeItem(AUTH_TOKEN_KEY)
      sessionStorage.removeItem(AUTH_STORAGE_KEY)
      sessionStorage.removeItem(AUTH_TOKEN_KEY)
    }
  } catch {
    // Ignore storage clear issues
  }
}

function saveStoredUser(user: AuthUser, token: string, remember: boolean): void {
  memoryStoredUser = user
  try {
    if (typeof window !== 'undefined') {
      const storage = remember ? localStorage : sessionStorage
      storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
      storage.setItem(AUTH_TOKEN_KEY, token)
    }
  } catch {
    // Ignore quota issues
  }
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
