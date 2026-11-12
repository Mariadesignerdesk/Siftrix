import { useState, type FormEvent } from 'react'
import AuthFormShell from '../components/AuthFormShell'
import {
  derivePreviewNameFromEmail,
  saveAuthPreviewSession,
  validateSignInInput,
  type AuthPreviewSession,
} from '../utils/authPreview'
import { handleSpaLinkClick, type NavigateFn } from '../utils/router'

interface LoginPageProps {
  authSession?: AuthPreviewSession | null
  onAuthChange?: (session: AuthPreviewSession | null) => void
  onNavigate: NavigateFn
}

export default function LoginPage({
  authSession = null,
  onAuthChange,
  onNavigate,
}: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotNote, setShowForgotNote] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const check = validateSignInInput(email, password)
    if (!check.ok || !check.normalizedEmail) {
      setErrorMessage(check.error || 'Please check your sign-in details.')
      return
    }

    const previewSession: AuthPreviewSession = {
      name: derivePreviewNameFromEmail(check.normalizedEmail),
      email: check.normalizedEmail,
      mode: 'signin',
      createdAt: new Date().toISOString(),
    }

    saveAuthPreviewSession(previewSession)
    setErrorMessage('')
    onAuthChange?.(previewSession)
  }

  return (
    <AuthFormShell
      badgeLabel="Account Access"
      title="Sign In to SIFTRIX"
      subtitle="Access your cybersecurity workspace layout, display preferences, and multi-agent threat triage."
      previewNotice="This sign-in screen validates inputs locally as a UI preview. Live user authentication and token verification will activate once backend auth endpoints are integrated."
      authSession={authSession}
      onSignOut={() => onAuthChange?.(null)}
      onNavigate={onNavigate}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-1 pb-2 border-b border-siftrix-border">
          <h2 className="text-xl font-bold text-siftrix-charcoal">
            Sign In
          </h2>
          <p className="text-xs sm:text-sm text-siftrix-muted-dark">
            Enter your email and password to preview the signed-in workspace navigation.
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="login-email"
            className="block text-xs font-semibold uppercase tracking-[0.1em] text-siftrix-antique-ink"
          >
            Email Address
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (errorMessage) setErrorMessage('')
            }}
            placeholder="analyst@example.com"
            className="w-full rounded-xl border border-siftrix-border bg-siftrix-pearl px-3.5 py-2.5 text-sm text-siftrix-charcoal placeholder:text-siftrix-muted outline-none focus:bg-white focus:border-siftrix-gold focus:ring-1 focus:ring-siftrix-gold"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold uppercase tracking-[0.1em] text-siftrix-antique-ink"
            >
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowForgotNote((prev) => !prev)}
              className="text-xs font-medium text-siftrix-antique-ink hover:text-siftrix-charcoal underline decoration-siftrix-gold/70 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold rounded"
            >
              Forgot password?
            </button>
          </div>

          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errorMessage) setErrorMessage('')
              }}
              placeholder="Minimum 8 characters"
              className="w-full rounded-xl border border-siftrix-border bg-siftrix-pearl pl-3.5 pr-16 py-2.5 text-sm text-siftrix-charcoal placeholder:text-siftrix-muted outline-none focus:bg-white focus:border-siftrix-gold focus:ring-1 focus:ring-siftrix-gold"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-siftrix-graphite hover:bg-siftrix-sand/70 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {showForgotNote ? (
          <p
            role="status"
            className="rounded-xl border border-siftrix-border bg-siftrix-pearl px-3.5 py-2.5 text-xs text-siftrix-graphite leading-relaxed"
          >
            Password recovery requires backend authentication integration, which is pending backend setup.
          </p>
        ) : null}

        {errorMessage ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-red-800"
          >
            {errorMessage}
          </div>
        ) : null}

        <button
          type="submit"
          className="w-full siftrix-btn-gold py-3 px-5 rounded-xl text-sm font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-siftrix-charcoal"
        >
          Sign In (UI Preview)
        </button>

        <div className="pt-3 border-t border-siftrix-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm text-siftrix-muted-dark">
          <span>New to SIFTRIX?</span>
          <a
            href="/signup"
            onClick={(e) => handleSpaLinkClick(e, onNavigate, '/signup')}
            className="inline-flex items-center self-start sm:self-auto w-fit py-1 font-semibold text-siftrix-antique-ink hover:text-siftrix-charcoal underline decoration-siftrix-gold rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold"
          >
            Create an Account →
          </a>
        </div>
      </form>
    </AuthFormShell>
  )
}
