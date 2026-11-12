export type AuthPreviewMode = 'signin' | 'signup'

export interface AuthPreviewSession {
  name: string
  email: string
  mode: AuthPreviewMode
  createdAt: string
}

export const AUTH_PREVIEW_STORAGE_KEY = 'siftrix_auth_preview_v1'

export interface AuthValidationResult {
  ok: boolean
  error?: string
  normalizedEmail?: string
  normalizedName?: string
}

const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Validates sign-in inputs strictly on the client for UI preview workflows.
 */
export function validateSignInInput(
  email: string,
  password: string
): AuthValidationResult {
  const trimmedEmail = email.trim()
  if (!trimmedEmail) {
    return { ok: false, error: 'Please enter your email address.' }
  }
  if (!SIMPLE_EMAIL_REGEX.test(trimmedEmail)) {
    return { ok: false, error: 'Please enter a valid email address.' }
  }
  if (!password) {
    return { ok: false, error: 'Please enter your password.' }
  }
  if (password.length < 8) {
    return {
      ok: false,
      error: 'Password must be at least 8 characters long.',
    }
  }
  return {
    ok: true,
    normalizedEmail: trimmedEmail.toLowerCase(),
  }
}

/**
 * Validates sign-up inputs strictly on the client for UI preview workflows.
 */
export function validateSignUpInput(
  fullName: string,
  email: string,
  password: string,
  confirmPassword: string
): AuthValidationResult {
  const trimmedName = fullName.trim()
  if (trimmedName.length < 2) {
    return {
      ok: false,
      error: 'Please enter your full name (at least 2 characters).',
    }
  }

  const baseCheck = validateSignInInput(email, password)
  if (!baseCheck.ok) {
    return baseCheck
  }

  if (password !== confirmPassword) {
    return {
      ok: false,
      error: 'Passwords do not match. Please re-enter both password fields.',
    }
  }

  return {
    ok: true,
    normalizedName: trimmedName,
    normalizedEmail: baseCheck.normalizedEmail,
  }
}

export interface SessionStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function getSafeSessionStorage(
  storage?: SessionStorageLike | null
): SessionStorageLike | null {
  if (storage !== undefined) {
    return storage
  }
  try {
    return typeof window !== 'undefined' && window.sessionStorage
      ? window.sessionStorage
      : null
  } catch {
    return null
  }
}

/**
 * Loads the frontend-only UI preview session from sessionStorage.
 * Does not represent authenticated backend identity.
 */
export function loadAuthPreviewSession(
  storage?: SessionStorageLike | null
): AuthPreviewSession | null {
  const target = getSafeSessionStorage(storage)
  if (!target) {
    return null
  }
  try {
    const raw = target.getItem(AUTH_PREVIEW_STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as Partial<AuthPreviewSession> | null
    if (
      parsed &&
      typeof parsed.name === 'string' &&
      typeof parsed.email === 'string' &&
      (parsed.mode === 'signin' || parsed.mode === 'signup') &&
      typeof parsed.createdAt === 'string'
    ) {
      return {
        name: parsed.name,
        email: parsed.email,
        mode: parsed.mode,
        createdAt: parsed.createdAt,
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Persists a frontend-only UI preview session in sessionStorage.
 */
export function saveAuthPreviewSession(
  session: AuthPreviewSession,
  storage?: SessionStorageLike | null
): void {
  const target = getSafeSessionStorage(storage)
  if (!target) {
    return
  }
  try {
    target.setItem(AUTH_PREVIEW_STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Ignore storage quota or privacy-mode errors cleanly
  }
}

/**
 * Clears the frontend-only UI preview session from sessionStorage.
 */
export function clearAuthPreviewSession(
  storage?: SessionStorageLike | null
): void {
  const target = getSafeSessionStorage(storage)
  if (!target) {
    return
  }
  try {
    target.removeItem(AUTH_PREVIEW_STORAGE_KEY)
  } catch {
    // Ignore storage errors cleanly
  }
}

/**
 * Derives a clean fallback display name from an email local-part for UI previews.
 */
export function derivePreviewNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] || 'Analyst'
  const cleaned = localPart.replace(/[._-]+/g, ' ').trim()
  if (!cleaned) {
    return 'SIFTRIX Analyst'
  }
  return cleaned
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
