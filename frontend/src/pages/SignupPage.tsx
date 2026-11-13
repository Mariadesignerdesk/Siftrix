import { useState, type FormEvent } from 'react'
import AuthFormShell from '../components/AuthFormShell'
import {
  evaluatePasswordStrength,
  mockSignup,
  type AuthUser,
} from '../services/authService'
import {
  saveAuthPreviewSession,
  type AuthPreviewSession,
} from '../utils/authPreview'
import { handleSpaLinkClick, type NavigateFn } from '../utils/router'

interface SignupPageProps {
  authSession?: AuthPreviewSession | null
  onAuthChange?: (session: AuthPreviewSession | null) => void
  onNavigate: NavigateFn
}

export default function SignupPage({
  authSession = null,
  onAuthChange,
  onNavigate,
}: SignupPageProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [organization, setOrganization] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const passwordStrength = evaluatePasswordStrength(password)

  const handleFillDemo = () => {
    setFullName('Tariq Mansoor')
    setEmail('tariq.mansoor@defense.cyber')
    setOrganization('National SOC Analyst Group')
    setPassword('CyberGuard#2026')
    setConfirmPassword('CyberGuard#2026')
    setAgreeToTerms(true)
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    setIsLoading(true)

    try {
      const response = await mockSignup({
        fullName,
        email,
        organization,
        password,
        confirmPassword,
        agreeToTerms,
      })

      if (!response.success || !response.user) {
        setErrorMessage(
          response.error || 'Registration failed. Please check details.'
        )
        return
      }

      const user: AuthUser = response.user
      const previewSession: AuthPreviewSession = {
        name: user.name,
        email: user.email,
        mode: 'signup',
        createdAt: user.createdAt,
      }

      saveAuthPreviewSession(previewSession)
      setSuccessMessage(`Account created successfully for ${user.name}! Welcome to SIFTRIX.`)
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
      badgeLabel="New Workspace Registration"
      title="Create Your SIFTRIX Account"
      subtitle="Preview the upcoming SIFTRIX analyst registration experience with clean form validation and responsive layout."
      previewNotice="Account creation is currently a frontend-only demo preview stored in temporary browser storage until backend authentication endpoints are connected."
      authSession={authSession}
      onSignOut={() => onAuthChange?.(null)}
      onNavigate={onNavigate}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-siftrix-border">
          <div>
            <h2 className="text-xl font-bold text-siftrix-charcoal">
              Sign Up
            </h2>
            <p className="text-xs sm:text-sm text-siftrix-muted-dark">
              Register a new analyst account to unlock personalized threat telemetry.
            </p>
          </div>
          <button
            type="button"
            onClick={handleFillDemo}
            disabled={isLoading}
            className="self-start sm:self-auto px-2.5 py-1 rounded-lg border border-siftrix-gold/50 bg-[#FAF4E7] text-xs font-semibold text-siftrix-charcoal hover:bg-siftrix-gold/20 transition-colors cursor-pointer"
          >
            ⚡ Demo Data
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label
              htmlFor="signup-name"
              className="block text-xs font-semibold uppercase tracking-[0.1em] text-siftrix-antique-ink"
            >
              Full Name
            </label>
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              disabled={isLoading}
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value)
                if (errorMessage) setErrorMessage('')
              }}
              placeholder="e.g. Maimoona Ibrahimi"
              className="w-full rounded-xl border border-siftrix-border bg-siftrix-pearl px-3.5 py-2.5 text-sm text-siftrix-charcoal placeholder:text-siftrix-muted outline-none focus:bg-white focus:border-siftrix-gold focus:ring-1 focus:ring-siftrix-gold disabled:opacity-60"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="signup-org"
              className="block text-xs font-semibold uppercase tracking-[0.1em] text-siftrix-antique-ink"
            >
              Organization <span className="font-normal text-siftrix-muted">(optional)</span>
            </label>
            <input
              id="signup-org"
              type="text"
              disabled={isLoading}
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="e.g. Cyber Security SOC"
              className="w-full rounded-xl border border-siftrix-border bg-siftrix-pearl px-3.5 py-2.5 text-sm text-siftrix-charcoal placeholder:text-siftrix-muted outline-none focus:bg-white focus:border-siftrix-gold focus:ring-1 focus:ring-siftrix-gold disabled:opacity-60"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="signup-email"
            className="block text-xs font-semibold uppercase tracking-[0.1em] text-siftrix-antique-ink"
          >
            Email Address
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            disabled={isLoading}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (errorMessage) setErrorMessage('')
            }}
            placeholder="analyst@domain.com"
            className="w-full rounded-xl border border-siftrix-border bg-siftrix-pearl px-3.5 py-2.5 text-sm text-siftrix-charcoal placeholder:text-siftrix-muted outline-none focus:bg-white focus:border-siftrix-gold focus:ring-1 focus:ring-siftrix-gold disabled:opacity-60"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label
              htmlFor="signup-password"
              className="block text-xs font-semibold uppercase tracking-[0.1em] text-siftrix-antique-ink"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                disabled={isLoading}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errorMessage) setErrorMessage('')
                }}
                placeholder="Min. 8 chars"
                className="w-full rounded-xl border border-siftrix-border bg-siftrix-pearl pl-3.5 pr-14 py-2.5 text-sm text-siftrix-charcoal placeholder:text-siftrix-muted outline-none focus:bg-white focus:border-siftrix-gold focus:ring-1 focus:ring-siftrix-gold disabled:opacity-60"
              />
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-siftrix-graphite hover:bg-siftrix-sand/70 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="signup-confirm-password"
              className="block text-xs font-semibold uppercase tracking-[0.1em] text-siftrix-antique-ink"
            >
              Confirm Password
            </label>
            <input
              id="signup-confirm-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              disabled={isLoading}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                if (errorMessage) setErrorMessage('')
              }}
              placeholder="Re-enter password"
              className="w-full rounded-xl border border-siftrix-border bg-siftrix-pearl px-3.5 py-2.5 text-sm text-siftrix-charcoal placeholder:text-siftrix-muted outline-none focus:bg-white focus:border-siftrix-gold focus:ring-1 focus:ring-siftrix-gold disabled:opacity-60"
            />
          </div>
        </div>

        {password ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-siftrix-muted-dark">Password Strength:</span>
              <span className="font-semibold text-siftrix-graphite">{passwordStrength.label}</span>
            </div>
            <div className="w-full h-1.5 bg-siftrix-sand/70 rounded-full overflow-hidden flex gap-0.5">
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
            {passwordStrength.feedback.length > 0 ? (
              <p className="text-[11px] text-amber-800">
                Tip: {passwordStrength.feedback.join(' · ')}
              </p>
            ) : null}
          </div>
        ) : null}

        <label className="flex items-start gap-2 text-xs text-siftrix-graphite cursor-pointer select-none pt-1">
          <input
            type="checkbox"
            checked={agreeToTerms}
            disabled={isLoading}
            onChange={(e) => setAgreeToTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded accent-[#C5A15D] cursor-pointer"
          />
          <span className="leading-relaxed">
            I agree to the <span className="underline decoration-siftrix-gold font-medium">SIFTRIX Ethical Scanning Terms</span> and consent to client-side threat metadata analysis.
          </span>
        </label>

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
              <span>Creating Analyst Account...</span>
            </>
          ) : (
            <span>Create SIFTRIX Account</span>
          )}
        </button>

        <div className="pt-3 border-t border-siftrix-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm text-siftrix-muted-dark">
          <span>Already registered?</span>
          <a
            href="/login"
            onClick={(e) => handleSpaLinkClick(e, onNavigate, '/login')}
            className="inline-flex items-center self-start sm:self-auto w-fit py-1 font-semibold text-siftrix-antique-ink hover:text-siftrix-charcoal underline decoration-siftrix-gold rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold"
          >
            Sign In Instead →
          </a>
        </div>
      </form>
    </AuthFormShell>
  )
}
