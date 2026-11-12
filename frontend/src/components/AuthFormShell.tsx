import type { ReactNode } from 'react'
import {
  clearAuthPreviewSession,
  type AuthPreviewSession,
} from '../utils/authPreview'
import { handleSpaLinkClick, type NavigateFn } from '../utils/router'
import BrandMark from './BrandMark'

interface AuthFormShellProps {
  badgeLabel: string
  title: string
  subtitle: string
  previewNotice: string
  authSession: AuthPreviewSession | null
  onSignOut?: () => void
  onNavigate: NavigateFn
  children: ReactNode
}

export default function AuthFormShell({
  badgeLabel,
  title,
  subtitle,
  previewNotice,
  authSession,
  onSignOut,
  onNavigate,
  children,
}: AuthFormShellProps) {
  const handlePreviewSignOut = () => {
    clearAuthPreviewSession()
    onSignOut?.()
  }

  return (
    <section
      aria-label={title}
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-12 lg:py-14 space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <a
          href="/"
          onClick={(e) => handleSpaLinkClick(e, onNavigate, '/')}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-siftrix-graphite hover:text-siftrix-charcoal transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold rounded-lg px-2 py-1"
        >
          <span aria-hidden="true">←</span>
          <span>Back to SIFTRIX Home</span>
        </a>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-siftrix-gold/50 bg-siftrix-pearl px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-siftrix-antique-ink">
          <span className="h-1.5 w-1.5 rounded-full bg-siftrix-gold" aria-hidden="true" />
          Frontend UI Preview · Backend Auth Pending
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Executive Brand Context Panel */}
        <aside className="min-w-0 lg:col-span-5 siftrix-card-charcoal relative overflow-hidden rounded-2xl p-5 sm:p-7 flex flex-col justify-between space-y-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-siftrix-champagne/80 to-transparent"
          />

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2.5">
              <BrandMark className="h-9 w-9 shrink-0" />
              <div>
                <p className="text-lg font-bold text-siftrix-white tracking-tight">
                  SIFTRIX
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-siftrix-champagne">
                  Intelligence · Protection · Confidence
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-siftrix-champagne">
                {badgeLabel}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-siftrix-white tracking-tight leading-tight">
                {title}
              </h1>
              <p className="text-sm text-[#C8C1B6] leading-relaxed">
                {subtitle}
              </p>
            </div>

            <ul className="space-y-2.5 pt-2 text-xs text-siftrix-pearl">
              <li className="flex items-start gap-2">
                <span className="text-siftrix-champagne font-bold">✓</span>
                <span>Access Threat Scanner, Dashboard &amp; History workflows</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-siftrix-champagne font-bold">✓</span>
                <span>Bilingual English &amp; Urdu (اردو) threat advisories</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-siftrix-champagne font-bold">✓</span>
                <span>Multi-agent URL, Message &amp; Security Advisor pipeline</span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl bg-[#1B1B20] border border-siftrix-charcoal-border p-4 text-xs text-[#BEB7AC] leading-relaxed">
            <p className="font-semibold text-siftrix-champagne mb-1">
              Authentication Integration Status
            </p>
            <p>{previewNotice}</p>
          </div>
        </aside>

        {/* Right Form / Preview Session Card */}
        <div className="min-w-0 lg:col-span-7 siftrix-card rounded-2xl p-5 sm:p-7 md:p-8 flex flex-col justify-center">
          {authSession ? (
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-siftrix-gold/55 bg-[#FAF4E7] px-3 py-1 text-xs font-semibold text-siftrix-charcoal">
                <span className="h-2 w-2 rounded-full bg-siftrix-gold" aria-hidden="true" />
                <span>UI Preview Session Active</span>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-siftrix-charcoal">
                  Welcome, {authSession.name}
                </h2>
                <p className="text-sm text-siftrix-muted-dark leading-relaxed">
                  You submitted the frontend {authSession.mode === 'signup' ? 'registration' : 'sign-in'} preview with{' '}
                  <span className="font-mono text-siftrix-charcoal break-all">
                    {authSession.email}
                  </span>
                  . No backend account token was created; threat scans continue to run via your browser session ID.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('/dashboard')}
                  className="siftrix-btn-gold py-2.5 px-4 rounded-xl text-sm font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-charcoal"
                >
                  Open Security Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/', 'scan')}
                  className="siftrix-btn-secondary py-2.5 px-4 rounded-xl text-sm font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold"
                >
                  Open Threat Scanner
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/settings')}
                  className="siftrix-btn-light-neutral py-2.5 px-4 rounded-xl text-sm font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold"
                >
                  Profile &amp; Settings
                </button>
                <button
                  type="button"
                  onClick={handlePreviewSignOut}
                  className="py-2.5 px-4 rounded-xl border border-red-300 bg-red-50 text-red-800 hover:bg-red-100 text-sm font-semibold cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  Sign Out (Clear Preview)
                </button>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </section>
  )
}
