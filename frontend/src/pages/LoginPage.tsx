import { useState, type FormEvent } from 'react'
import AuthFormShell from '../components/AuthFormShell'
import {
  evaluatePasswordStrength,
  mockLogin,
  type AuthUser,
} from '../services/authService'
import {
  saveAuthPreviewSession,
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
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotNote, setShowForgotNote] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const passwordStrength = evaluatePasswordStrength(password)

  const handleFillDemo = () => {
    setEmail('analyst.sarah@siftrix.cyber')
    setPassword('CyberGuard#2026')
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    setIsLoading(true)

    try {
      const response = await mockLogin({
        email,
        password,
        rememberMe,
      })

      if (!response.success || !response.user) {
        setErrorMessage(response.error || 'Authentication failed. Please check credentials.')
        return
      }

      const user: AuthUser = response.user
      const previewSession: AuthPreviewSession = {
        name: user.name,
        email: user.email,
        mode: 'signin',
        createdAt: user.createdAt,
      }

      saveAuthPreviewSession(previewSession)
      setSuccessMessage(`Welcome back, ${user.name}! Redirecting to Security Dashboard...`)
      onAuthChange?.(previewSession)

      setTimeout(() => {
        onNavigate('/dashboard')
      }, 750)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthFormShell
      badgeLabel="Account Access"
      title="Sign In to SIFTRIX"
      subtitle="Access your cybersecurity workspace layout, display preferences, and multi-agent threat triage."
      previewNotice="This sign-in screen validates inputs and simulates full analyst onboarding locally. Real backend JWT/session verification will activate once backend authentication endpoints are connected."
      authSession={authSession}
      onSignOut={() => onAuthChange?.(null)}
      onNavigate={onNavigate}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-siftrix-border">
          <div>
            <h2 className="text-xl font-bold text-siftrix-charcoal">
              Sign In
            </h2>
            <p className="text-xs sm:text-sm text-siftrix-muted-dark">
              Enter your analyst credentials to access the security command center.
            </p>
          </div>
          <button
            type="button"
            onClick={handleFillDemo}
            disabled={isLoading}
            className="self-start sm:self-auto px-2.5 py-1 rounded-lg border border-siftrix-gold/50 bg-[#FAF4E7] text-xs font-semibold text-siftrix-charcoal hover:bg-siftrix-gold/20 transition-colors cursor-pointer"
          >
            ⚡ Demo Analyst
          </button>
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
            disabled={isLoading}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (errorMessage) setErrorMessage('')
            }}
            placeholder="analyst@siftrix.cyber"
            className="w-full rounded-xl border border-siftrix-border bg-siftrix-pearl px-3.5 py-2.5 text-sm text-siftrix-charcoal placeholder:text-siftrix-muted outline-none focus:bg-white focus:border-siftrix-gold focus:ring-1 focus:ring-siftrix-gold disabled:opacity-60"
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
              disabled={isLoading}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errorMessage) setErrorMessage('')
              }}
              placeholder="Minimum 8 characters"
              className="w-full rounded-xl border border-siftrix-border bg-siftrix-pearl pl-3.5 pr-16 py-2.5 text-sm text-siftrix-charcoal placeholder:text-siftrix-muted outline-none focus:bg-white focus:border-siftrix-gold focus:ring-1 focus:ring-siftrix-gold disabled:opacity-60"
            />
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-siftrix-graphite hover:bg-siftrix-sand/70 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          {password ? (
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 h-1.5 bg-siftrix-sand/70 rounded-full overflow-hidden flex gap-0.5">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-full flex-1 ${
                      step <= passwordStrength.score
                        ? passwordStrength.colorClass
                        : 'bg-transparent'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[11px] font-medium text-siftrix-muted-dark">
                {passwordStrength.label}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between text-xs text-siftrix-graphite">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded accent-[#C5A15D] cursor-pointer"
            />
            <span>Remember this device for 30 days</span>
          </label>
        </div>

        {showForgotNote ? (
          <p
            role="status"
            className="rounded-xl border border-siftrix-border bg-siftrix-pearl px-3.5 py-2.5 text-xs text-siftrix-graphite leading-relaxed"
          >
            Password recovery is simulated for demonstration. Use the &quot;⚡ Demo Analyst&quot; button above to log in instantly. Real password reset tokens require backend email delivery.
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

        {successMessage ? (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-emerald-800 flex items-center gap-2"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-ping" />
            <span>{successMessage}</span>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full siftrix-btn-gold py-3 px-5 rounded-xl text-sm font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-siftrix-charcoal disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-siftrix-charcoal"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              <span>Verifying Analyst Credentials...</span>
            </>
          ) : (
            <span>Sign In to Command Center</span>
          )}
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
