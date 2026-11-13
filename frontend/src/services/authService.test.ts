import { describe, it, expect, beforeEach } from 'vitest'
import {
  evaluatePasswordStrength,
  getActiveUser,
  logoutUser,
  mockLogin,
  mockSignup,
  validateLoginCredentials,
  validateSignupPayload,
} from './authService'

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
})
