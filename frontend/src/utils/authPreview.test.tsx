import { isValidElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AuthFormShell from '../components/AuthFormShell'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import LoginPage from '../pages/LoginPage'
import { SettingsContent } from '../pages/SettingsPage'
import SignupPage from '../pages/SignupPage'
import {
  AUTH_STORAGE_KEY,
  AUTH_TOKEN_KEY,
  getActiveUser,
  logoutUser,
  mockLogin,
} from '../services/authService'
import {
  AUTH_PREVIEW_STORAGE_KEY,
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
    expect(signedInHtml).toContain('UI Preview: maimoona@example.com')

    const realAuthNavHtml = renderToStaticMarkup(
      <Navbar
        currentPage="dashboard"
        onNavigate={onNavigate}
        authSession={{
          id: 'usr_real_123',
          name: 'Maimoona Ibrahimi',
          email: 'maimoona@example.com',
          mode: 'signin',
          createdAt: '2026-11-12T15:00:00Z',
        }}
      />
    )
    expect(realAuthNavHtml).toContain('Maimoona Ibrahimi')
    expect(realAuthNavHtml).toContain('Signed in as maimoona@example.com')
    expect(realAuthNavHtml).not.toContain('UI Preview')
  })

  it('shows accurate JWT session messaging when authSession.id exists and preserves pre-redirect login/signup success banners', () => {
    const onNavigate = vi.fn()
    const realAuthSession = {
      id: 'usr_jwt_789',
      name: 'Sarah Analyst',
      email: 'sarah@siftrix.cyber',
      mode: 'signin' as const,
      createdAt: '2026-11-28T10:00:00Z',
    }

    // 1. Visiting AuthFormShell when already authenticated (no active form success banner)
    const activeAuthShellHtml = renderToStaticMarkup(
      <AuthFormShell
        badgeLabel="Account Access"
        title="Sign In to SIFTRIX"
        subtitle="Subtitle"
        previewNotice="Notice"
        authSession={realAuthSession}
        onNavigate={onNavigate}
      >
        <form>
          <p>Sign In Form</p>
        </form>
      </AuthFormShell>
    )
    expect(activeAuthShellHtml).toContain('Authenticated JWT Session')
    expect(activeAuthShellHtml).toContain('Authenticated Session Active')
    expect(activeAuthShellHtml).toContain('active JWT bearer session')
    expect(activeAuthShellHtml).toContain('>Sign Out<')
    expect(activeAuthShellHtml).not.toContain('UI Preview Session Active')
    expect(activeAuthShellHtml).not.toContain('No backend account token')
    expect(activeAuthShellHtml).not.toContain('Clear Preview')
    expect(activeAuthShellHtml).not.toContain('Sign In Form')

    // 2. Immediately after successful login/signup before redirect (div[role="status"] present in children)
    const preRedirectSuccessHtml = renderToStaticMarkup(
      <AuthFormShell
        badgeLabel="Account Access"
        title="Sign In to SIFTRIX"
        subtitle="Subtitle"
        previewNotice="Notice"
        authSession={realAuthSession}
        onNavigate={onNavigate}
      >
        <form>
          <div role="status">
            <span>Welcome back, Sarah Analyst! Redirecting to Security Dashboard...</span>
          </div>
        </form>
      </AuthFormShell>
    )
    expect(preRedirectSuccessHtml).toContain(
      'Welcome back, Sarah Analyst! Redirecting to Security Dashboard...'
    )
    expect(preRedirectSuccessHtml).toContain('Authenticated JWT Session')
    expect(preRedirectSuccessHtml).not.toContain('UI Preview')
    expect(preRedirectSuccessHtml).not.toContain('No backend account token')
    expect(preRedirectSuccessHtml).not.toContain('Authenticated Session Active')

    // 3. SettingsContent with real authenticated JWT session
    const realSettingsHtml = renderToStaticMarkup(
      <SettingsContent
        languagePreference="all"
        preferenceNotice={null}
        isConfirmingReset={false}
        diagnosticState={{ status: 'connected' }}
        authSession={realAuthSession}
        onSelectLanguage={vi.fn()}
        onRequestReset={vi.fn()}
        onCancelReset={vi.fn()}
        onConfirmReset={vi.fn()}
        onCheckAgain={vi.fn()}
        onNavigate={onNavigate}
      />
    )
    expect(realSettingsHtml).toContain('Authenticated')
    expect(realSettingsHtml).toContain('active JWT bearer session')
    expect(realSettingsHtml).toContain('>Sign Out<')
    expect(realSettingsHtml).not.toContain('UI Preview')
    expect(realSettingsHtml).not.toContain('Clear Preview')
    expect(realSettingsHtml).not.toContain('pending integration')
  })

  it('renders LoginPage without unregistered demo autofill, SignupPage registration fields, Footer auth links, and Settings Account Profile controls', () => {
    const onNavigate = vi.fn()
    const loginHtml = renderToStaticMarkup(<LoginPage onNavigate={onNavigate} />)
    expect(loginHtml).toContain('Sign In to SIFTRIX')
    expect(loginHtml).toContain('JWT-authenticated access')
    expect(loginHtml).toContain('Remember this device for 30 days')
    expect(loginHtml).toContain('Create an Account')
    expect(loginHtml).not.toContain('Demo Analyst')

    const signupHtml = renderToStaticMarkup(<SignupPage onNavigate={onNavigate} />)
    expect(signupHtml).toContain('Create Your SIFTRIX Account')
    expect(signupHtml).toContain('Confirm Password')
    expect(signupHtml).toContain('Sign In Instead')
    expect(signupHtml).toContain('optional · local note')

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

  describe('UI Sign Out handlers invoke centralized logoutUser cleanup', () => {
    const hadWindow = 'window' in globalThis
    const originalWindow = globalThis.window
    const hadLocalStorage = 'localStorage' in globalThis
    const originalLocalStorage = globalThis.localStorage

    afterEach(() => {
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

    function createFullStorageMock(): Storage {
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

    function extractText(node: ReactNode): string {
      if (typeof node === 'string' || typeof node === 'number') {
        return String(node)
      }
      if (Array.isArray(node)) {
        return node.map(extractText).join('')
      }
      if (isValidElement<{ children?: ReactNode }>(node)) {
        return extractText(node.props.children)
      }
      return ''
    }

    function findButtonOnClick(
      node: ReactNode,
      buttonLabel: string
    ): (() => void) | null {
      if (Array.isArray(node)) {
        for (const child of node) {
          const found = findButtonOnClick(child, buttonLabel)
          if (found) return found
        }
        return null
      }
      if (
        isValidElement<{ children?: ReactNode; onClick?: () => void }>(node)
      ) {
        if (
          node.type === 'button' &&
          typeof node.props.onClick === 'function' &&
          extractText(node.props.children).includes(buttonLabel)
        ) {
          return node.props.onClick
        }
        return findButtonOnClick(node.props.children, buttonLabel)
      }
      return null
    }

    it('clears auth storage, token, memory user, and preview session when Sign Out is clicked in AuthFormShell and SettingsContent', async () => {
      const localMock = createFullStorageMock()
      const sessionMock = createFullStorageMock()
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

      let authEvents = 0
      window.addEventListener('siftrix:auth-change', () => {
        authEvents += 1
      })

      // 1. Verify AuthFormShell Sign Out handler
      const loginA = await mockLogin({
        email: 'sarah@siftrix.cyber',
        password: 'Password123!',
        rememberMe: true,
      })
      expect(loginA.success).toBe(true)
      const previewA = {
        name: 'Sarah',
        email: 'sarah@siftrix.cyber',
        mode: 'signin' as const,
        createdAt: '2026-11-28T00:00:00Z',
      }
      saveAuthPreviewSession(previewA)
      authEvents = 0

      const onShellSignOut = vi.fn()
      const shellTree = AuthFormShell({
        badgeLabel: 'Account Access',
        title: 'Sign In to SIFTRIX',
        subtitle: 'Subtitle',
        previewNotice: 'Notice',
        authSession: previewA,
        onSignOut: onShellSignOut,
        onNavigate: vi.fn(),
        children: null,
      })
      const shellSignOutClick = findButtonOnClick(
        shellTree,
        'Sign Out (Clear Preview)'
      )
      expect(shellSignOutClick).toBeTypeOf('function')
      shellSignOutClick!()

      expect(onShellSignOut).toHaveBeenCalledTimes(1)
      expect(authEvents).toBe(1)
      expect(localMock.getItem(AUTH_STORAGE_KEY)).toBeNull()
      expect(localMock.getItem(AUTH_TOKEN_KEY)).toBeNull()
      expect(sessionMock.getItem(AUTH_PREVIEW_STORAGE_KEY)).toBeNull()
      expect(getActiveUser()).toBeNull()

      // 2. Verify SettingsContent Sign Out handler
      const loginB = await mockLogin({
        email: 'tariq@siftrix.cyber',
        password: 'Password123!',
        rememberMe: false,
      })
      expect(loginB.success).toBe(true)
      const previewB = {
        name: 'Tariq',
        email: 'tariq@siftrix.cyber',
        mode: 'signup' as const,
        createdAt: '2026-11-28T00:05:00Z',
      }
      saveAuthPreviewSession(previewB)
      authEvents = 0

      const onSettingsSignOut = vi.fn()
      const settingsTree = SettingsContent({
        languagePreference: 'all',
        preferenceNotice: null,
        isConfirmingReset: false,
        diagnosticState: { status: 'connected' },
        authSession: previewB,
        onSignOut: onSettingsSignOut,
        onSelectLanguage: vi.fn(),
        onRequestReset: vi.fn(),
        onCancelReset: vi.fn(),
        onConfirmReset: vi.fn(),
        onCheckAgain: vi.fn(),
        onNavigate: vi.fn(),
      })
      const settingsSignOutClick = findButtonOnClick(
        settingsTree,
        'Sign Out (Clear Preview)'
      )
      expect(settingsSignOutClick).toBeTypeOf('function')
      settingsSignOutClick!()

      expect(onSettingsSignOut).toHaveBeenCalledTimes(1)
      expect(authEvents).toBe(1)
      expect(sessionMock.getItem(AUTH_STORAGE_KEY)).toBeNull()
      expect(sessionMock.getItem(AUTH_TOKEN_KEY)).toBeNull()
      expect(sessionMock.getItem(AUTH_PREVIEW_STORAGE_KEY)).toBeNull()
      expect(getActiveUser()).toBeNull()

      // 3. Verify real authenticated session (with id) Sign Out button label and cleanup
      const loginC = await mockLogin({
        email: 'amina@siftrix.cyber',
        password: 'Password123!',
        rememberMe: true,
      })
      expect(loginC.success).toBe(true)
      const realSessionC = {
        id: loginC.user!.id,
        name: loginC.user!.name,
        email: loginC.user!.email,
        mode: 'signin' as const,
        createdAt: loginC.user!.createdAt,
      }
      authEvents = 0

      const onRealSignOut = vi.fn()
      const realShellTree = AuthFormShell({
        badgeLabel: 'Account Access',
        title: 'Sign In to SIFTRIX',
        subtitle: 'Subtitle',
        previewNotice: 'Notice',
        authSession: realSessionC,
        onSignOut: onRealSignOut,
        onNavigate: vi.fn(),
        children: null,
      })
      expect(findButtonOnClick(realShellTree, 'Clear Preview')).toBeNull()
      const realSignOutClick = findButtonOnClick(realShellTree, 'Sign Out')
      expect(realSignOutClick).toBeTypeOf('function')
      realSignOutClick!()

      expect(onRealSignOut).toHaveBeenCalledTimes(1)
      expect(authEvents).toBe(1)
      expect(localMock.getItem(AUTH_STORAGE_KEY)).toBeNull()
      expect(localMock.getItem(AUTH_TOKEN_KEY)).toBeNull()
      expect(getActiveUser()).toBeNull()
    })
  })
})
