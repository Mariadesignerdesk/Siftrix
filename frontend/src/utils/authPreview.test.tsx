import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import LoginPage from '../pages/LoginPage'
import { SettingsContent } from '../pages/SettingsPage'
import SignupPage from '../pages/SignupPage'
import {
  clearAuthPreviewSession,
  derivePreviewNameFromEmail,
  loadAuthPreviewSession,
  saveAuthPreviewSession,
  validateSignInInput,
  validateSignUpInput,
  type SessionStorageLike,
} from './authPreview'

function createMemorySessionStorage(): SessionStorageLike {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    },
  }
}

describe('authPreview utilities, Auth pages, and responsive Navbar', () => {
  it('validates sign-in and sign-up inputs accurately on the client', () => {
    expect(validateSignInInput('', 'password123').ok).toBe(false)
    expect(validateSignInInput('not-an-email', 'password123').ok).toBe(false)
    expect(validateSignInInput('analyst@example.com', 'short').ok).toBe(false)
    expect(validateSignInInput('Analyst@Example.COM', 'securepass123')).toEqual({
      ok: true,
      normalizedEmail: 'analyst@example.com',
    })

    expect(
      validateSignUpInput('A', 'a@example.com', 'securepass123', 'securepass123').ok
    ).toBe(false)
    expect(
      validateSignUpInput('Maimoona', 'a@example.com', 'securepass123', 'different').ok
    ).toBe(false)
    expect(
      validateSignUpInput(' Maimoona ', 'User@Example.com', 'securepass123', 'securepass123')
    ).toEqual({
      ok: true,
      normalizedName: 'Maimoona',
      normalizedEmail: 'user@example.com',
    })
  })

  it('persists and clears frontend UI preview sessions in sessionStorage safely', () => {
    const storage = createMemorySessionStorage()
    expect(loadAuthPreviewSession(storage)).toBeNull()

    const session = {
      name: derivePreviewNameFromEmail('siftrix.user@example.com'),
      email: 'siftrix.user@example.com',
      mode: 'signin' as const,
      createdAt: '2026-11-12T15:00:00Z',
    }
    saveAuthPreviewSession(session, storage)
    expect(loadAuthPreviewSession(storage)).toEqual(session)

    clearAuthPreviewSession(storage)
    expect(loadAuthPreviewSession(storage)).toBeNull()
  })

  it('renders Sign In, Sign Up, and hamburger menu trigger in Navbar when signed out, and Sign Out only when preview session is active', () => {
    const onNavigate = vi.fn()
    const signedOutHtml = renderToStaticMarkup(
      <Navbar currentPage="home" onNavigate={onNavigate} authSession={null} />
    )
    expect(signedOutHtml).toContain('Sign In')
    expect(signedOutHtml).toContain('Sign Up')
    expect(signedOutHtml).toContain('Open navigation menu')
    expect(signedOutHtml).not.toContain('Sign Out')

    const signedInHtml = renderToStaticMarkup(
      <Navbar
        currentPage="dashboard"
        onNavigate={onNavigate}
        authSession={{
          name: 'Maimoona Ibrahimi',
          email: 'maimoona@example.com',
          mode: 'signup',
          createdAt: '2026-11-12T15:00:00Z',
        }}
      />
    )
    expect(signedInHtml).toContain('Maimoona Ibrahimi')
    expect(signedInHtml).toContain('Sign Out')
  })

  it('renders honest UI preview LoginPage, SignupPage, Footer auth links, and Settings Account Profile controls', () => {
    const onNavigate = vi.fn()
    const loginHtml = renderToStaticMarkup(<LoginPage onNavigate={onNavigate} />)
    expect(loginHtml).toContain('Sign In to SIFTRIX')
    expect(loginHtml).toContain('Frontend UI Preview')
    expect(loginHtml).toContain('Create an Account')

    const signupHtml = renderToStaticMarkup(<SignupPage onNavigate={onNavigate} />)
    expect(signupHtml).toContain('Create Your SIFTRIX Account')
    expect(signupHtml).toContain('Confirm Password')
    expect(signupHtml).toContain('Sign In Instead')

    const footerHtml = renderToStaticMarkup(<Footer onNavigate={onNavigate} />)
    expect(footerHtml).toContain('/login')
    expect(footerHtml).toContain('/signup')

    const settingsHtml = renderToStaticMarkup(
      <SettingsContent
        languagePreference="all"
        preferenceNotice={null}
        isConfirmingReset={false}
        diagnosticState={{ status: 'checking' }}
        authSession={null}
        onSelectLanguage={vi.fn()}
        onRequestReset={vi.fn()}
        onCancelReset={vi.fn()}
        onConfirmReset={vi.fn()}
        onCheckAgain={vi.fn()}
        onNavigate={onNavigate}
      />
    )
    expect(settingsHtml).toContain('/login')
    expect(settingsHtml).toContain('/signup')
    expect(settingsHtml).not.toContain('Sign Out (Clear Preview)')
  })
})
