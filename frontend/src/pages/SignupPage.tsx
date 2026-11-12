import { useState, type FormEvent } from 'react'
import AuthFormShell from '../components/AuthFormShell'
import {
  saveAuthPreviewSession,
  validateSignUpInput,
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
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const check = validateSignUpInput(fullName, email, password, confirmPassword)
    if (!check.ok || !check.normalizedEmail || !check.normalizedName) {
      setErrorMessage(
        check.error || 'Please check your registration details.'
      )
      return
    }

    const previewSession: AuthPreviewSession = {
      name: check.normalizedName,
      email: check.normalizedEmail,
      mode: 'signup',
      createdAt: new Date().toISOString(),
    }

    saveAuthPreviewSession(previewSession)
    setErrorMessage('')
    onAuthChange?.(previewSession)
  }

  return (
    <AuthFormShell
      badgeLabel="New Workspace Registration"
      title="Create Your SIFTRIX Account"
      subtitle="Preview the upcoming SIFTRIX analyst registration experience with clean form validation and responsive layout."
      previewNotice="Account creation is currently a frontend-only UI preview stored only in temporary browser sessionStorage until backend authentication endpoints are added."
      authSession={authSession}
      onSignOut={() => onAuthChange?.(null)}
      onNavigate={onNavigate}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-1 pb-2 border-b border-siftrix-border">
          <h2 className="text-xl font-bold text-siftrix-charcoal">
            Sign Up
          </h2>
          <p className="text-xs sm:text-sm text-siftrix-muted-dark">
            Fill in your details below to preview account onboarding.
          </p>
        </div>

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
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value)
              if (errorMessage) setErrorMessage('')
            }}
            placeholder="Maimoona Ibrahimi"
            className="w-full rounded-xl border border-siftrix-border bg-siftrix-pearl px-3.5 py-2.5 text-sm text-siftrix-charcoal placeholder:text-siftrix-muted outline-none focus:bg-white focus:border-siftrix-gold focus:ring-1 focus:ring-siftrix-gold"
          />
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
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (errorMessage) setErrorMessage('')
            }}
            placeholder="analyst@example.com"
            className="w-full rounded-xl border border-siftrix-border bg-siftrix-pearl px-3.5 py-2.5 text-sm text-siftrix-charcoal placeholder:text-siftrix-muted outline-none focus:bg-white focus:border-siftrix-gold focus:ring-1 focus:ring-siftrix-gold"
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
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errorMessage) setErrorMessage('')
                }}
                placeholder="Min. 8 chars"
                className="w-full rounded-xl border border-siftrix-border bg-siftrix-pearl pl-3.5 pr-14 py-2.5 text-sm text-siftrix-charcoal placeholder:text-siftrix-muted outline-none focus:bg-white focus:border-siftrix-gold focus:ring-1 focus:ring-siftrix-gold"
              />
              <button
                type="button"
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
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                if (errorMessage) setErrorMessage('')
              }}
              placeholder="Re-enter password"
              className="w-full rounded-xl border border-siftrix-border bg-siftrix-pearl px-3.5 py-2.5 text-sm text-siftrix-charcoal placeholder:text-siftrix-muted outline-none focus:bg-white focus:border-siftrix-gold focus:ring-1 focus:ring-siftrix-gold"
            />
          </div>
        </div>

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
          Sign Up (UI Preview)
        </button>

        <div className="pt-3 border-t border-siftrix-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm text-siftrix-muted-dark">
          <span>Already have an account?</span>
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
