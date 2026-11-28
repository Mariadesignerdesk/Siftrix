import { useEffect, useState, type MouseEvent } from 'react'
import { logoutUser } from '../services/authService'
import type { AuthPreviewSession } from '../utils/authPreview'
import type { AppPath, AppRoute, NavigateFn } from '../utils/router'
import { getStoredThemePreference, toggleTheme } from '../services/themeService'
import BrandMark from './BrandMark'
import NotificationBell from './notifications/NotificationBell'

interface NavbarProps {
  currentPage: AppRoute['page']
  onNavigate: NavigateFn
  authSession?: AuthPreviewSession | null
  onSignOut?: () => void
}

const NAV_ITEMS: ReadonlyArray<{
  label: string
  href: string
  path: AppPath
  sectionId?: string
  ariaLabel: string
  isActive: (page: AppRoute['page']) => boolean
}> = [
  {
    label: 'Home',
    href: '/#home',
    path: '/',
    sectionId: 'home',
    ariaLabel: 'Navigate to Home',
    isActive: (page) => page === 'home',
  },
  {
    label: 'Scanner',
    href: '/scanner',
    path: '/scanner',
    ariaLabel: 'Navigate to Dedicated Threat Scanner page',
    isActive: (page) => page === 'scanner',
  },
  {
    label: 'Dashboard',
    href: '/dashboard',
    path: '/dashboard',
    ariaLabel: 'Navigate to Security Dashboard page',
    isActive: (page) => page === 'dashboard',
  },
  {
    label: 'Scan History',
    href: '/scans',
    path: '/scans',
    ariaLabel: 'Navigate to Scan History page',
    isActive: (page) => page === 'history' || page === 'scan-details',
  },
  {
    label: 'Rewards & Leaderboard',
    href: '/rewards',
    path: '/rewards',
    ariaLabel: 'Navigate to Rewards and Leaderboard',
    isActive: (page) => page === 'rewards' || page === 'leaderboard',
  },
  {
    label: 'About Us',
    href: '/#about',
    path: '/',
    sectionId: 'about',
    ariaLabel: 'Navigate to About Us section',
    isActive: () => false,
  },
  {
    label: 'Settings',
    href: '/settings',
    path: '/settings',
    ariaLabel: 'Navigate to Profile and Settings page',
    isActive: (page) => page === 'settings',
  },
]

export default function Navbar({
  currentPage,
  onNavigate,
  authSession = null,
  onSignOut,
}: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [currentTheme, setCurrentTheme] = useState(() => getStoredThemePreference())
  const isRealAuthSession = Boolean(authSession?.id?.trim())

  const handleToggleTheme = () => {
    const next = toggleTheme()
    setCurrentTheme(next)
  }

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMobileMenuOpen])

  const handleLinkClick = (
    event: MouseEvent<HTMLAnchorElement>,
    path: AppPath,
    sectionId?: string
  ) => {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return
    }
    event.preventDefault()
    setIsMobileMenuOpen(false)
    onNavigate(path, sectionId)
  }

  const handleSignOutClick = () => {
    logoutUser()
    setIsMobileMenuOpen(false)
    onSignOut?.()
  }

  const linkClassName = (isActive: boolean) =>
    `rounded-lg px-1 md:px-1 lg:px-2 xl:px-2.5 2xl:px-3 py-1 lg:py-1.5 text-[10.5px] lg:text-xs xl:text-[13px] 2xl:text-sm font-medium transition-all whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold ${
      isActive
        ? 'bg-siftrix-charcoal text-siftrix-pearl border border-siftrix-gold/45 shadow-2xs dark:bg-siftrix-sand dark:text-siftrix-champagne dark:border-siftrix-gold'
        : 'text-siftrix-muted-dark border border-transparent hover:text-siftrix-charcoal hover:bg-siftrix-white/85 hover:border-siftrix-border'
    }`

  const mobileLinkClassName = (isActive: boolean) =>
    `flex items-center justify-between rounded-xl px-4 py-2.5 min-h-[44px] text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold ${
      isActive
        ? 'bg-siftrix-charcoal text-siftrix-pearl border border-siftrix-gold/45 shadow-2xs dark:bg-siftrix-sand dark:text-siftrix-champagne dark:border-siftrix-gold'
        : 'bg-siftrix-white/85 dark:bg-[#23222A] text-siftrix-graphite dark:text-[#E2DDD3] border border-siftrix-border dark:border-siftrix-charcoal-border hover:border-siftrix-gold/65 hover:text-siftrix-charcoal dark:hover:text-[#FAF6EF]'
    }`

  return (
    <header className="sticky top-0 z-30 border-b border-siftrix-border/90 bg-siftrix-pearl/95 backdrop-blur-md shadow-[0_2px_14px_rgba(37,37,42,0.06)]">
      {/* Subtle Top Champagne Hairline */}
      <div
        aria-hidden="true"
        className="h-[2px] w-full bg-gradient-to-r from-transparent via-siftrix-gold/65 to-transparent"
      />

      <nav
        aria-label="Main Navigation"
        className="w-full max-w-[1440px] mx-auto flex items-center justify-between gap-1 sm:gap-1.5 md:gap-1.5 lg:gap-2.5 xl:gap-3 px-2 sm:px-3 md:px-2 lg:px-6 xl:px-8 py-2 lg:py-2.5"
      >
        {/* Brand Wordmark + Precision Gold Emblem */}
        <a
          href="/"
          onClick={(e) => handleLinkClick(e, '/')}
          className="inline-flex items-center gap-1.5 shrink-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold rounded-xl px-1 py-0.5 transition-colors"
          aria-label="SIFTRIX Home"
        >
          <BrandMark className="h-7 w-7 sm:h-7.5 sm:w-7.5 lg:h-8 lg:w-8 shrink-0 shadow-2xs transition-transform duration-300 group-hover:scale-105" />
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-base sm:text-lg lg:text-xl 2xl:text-2xl font-bold tracking-tight text-siftrix-charcoal">
              SIFTRIX
            </span>
            <span className="hidden 2xl:inline-flex items-center rounded-full border border-siftrix-gold/45 bg-siftrix-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-siftrix-graphite shadow-2xs">
              <span
                className="mr-1 h-1.5 w-1.5 rounded-full bg-siftrix-gold"
                aria-hidden="true"
              />
              AI Command
            </span>
          </div>
        </a>

        {/* Desktop & Tablet Center Navigation Links */}
        <div className="hidden md:flex items-center justify-center gap-0.5 lg:gap-1 2xl:gap-1.5 rounded-xl border border-siftrix-border/80 bg-siftrix-beige/85 p-0.5 lg:p-1 shrink-0">
          {NAV_ITEMS.map((item) => {
            const active = item.isActive(currentPage)
            return (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleLinkClick(e, item.path, item.sectionId)}
                aria-current={active ? 'page' : undefined}
                className={linkClassName(active)}
                aria-label={item.ariaLabel}
              >
                {item.label}
              </a>
            )
          })}
        </div>

        {/* Desktop & Tablet Auth + Utilities */}
        <div className="hidden md:flex items-center gap-1 lg:gap-1.5 xl:gap-2 shrink-0">
          {/* Real-Time Notification Bell */}
          <NotificationBell onNavigate={onNavigate} />

          {/* Theme Toggle (Dark / Light) */}
          <button
            type="button"
            onClick={handleToggleTheme}
            aria-label={`Switch theme (currently ${currentTheme})`}
            title={`Current theme: ${currentTheme}. Click to toggle.`}
            className="h-8 w-8 lg:h-9 lg:w-9 xl:h-10 xl:w-10 rounded-xl border border-siftrix-border bg-siftrix-white text-siftrix-charcoal hover:border-siftrix-gold hover:bg-siftrix-pearl flex items-center justify-center transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold shadow-2xs text-xs sm:text-sm"
          >
            {currentTheme === 'dark' ? '☀️' : '🌙'}
          </button>

          {authSession ? (
            <>
              <a
                href="/settings"
                onClick={(e) => handleLinkClick(e, '/settings')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-siftrix-gold/45 bg-siftrix-beige px-2 xl:px-2.5 py-1 md:py-1 lg:py-1.5 text-xs font-semibold text-siftrix-charcoal max-w-[6.5rem] lg:max-w-[7.5rem] xl:max-w-[9rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold"
                title={
                  isRealAuthSession
                    ? `Signed in as ${authSession.email}`
                    : `UI Preview: ${authSession.email}`
                }
              >
                <span className="h-1.5 w-1.5 rounded-full bg-siftrix-gold shrink-0" aria-hidden="true" />
                <span className="truncate">{authSession.name}</span>
              </a>
              <button
                type="button"
                onClick={handleSignOutClick}
                className="rounded-xl border border-siftrix-border bg-siftrix-white px-2 lg:px-2.5 xl:px-3 py-1 md:py-1 lg:py-1.5 text-xs xl:text-sm font-medium text-siftrix-graphite hover:border-siftrix-gold hover:text-siftrix-charcoal transition-colors whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <a
                href="/login"
                onClick={(e) => handleLinkClick(e, '/login')}
                aria-current={currentPage === 'login' ? 'page' : undefined}
                className={`rounded-xl px-2 lg:px-2.5 xl:px-3 py-1 md:py-1 lg:py-1.5 text-xs xl:text-sm font-semibold whitespace-nowrap transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold ${
                  currentPage === 'login'
                    ? 'bg-siftrix-charcoal text-siftrix-champagne border border-siftrix-gold/55 shadow-2xs dark:bg-siftrix-sand dark:border-siftrix-gold'
                    : 'text-siftrix-muted-dark border border-siftrix-border/80 bg-siftrix-white hover:text-siftrix-charcoal hover:border-siftrix-gold'
                }`}
                aria-label="Sign in to SIFTRIX"
              >
                Sign In
              </a>
              <a
                href="/signup"
                onClick={(e) => handleLinkClick(e, '/signup')}
                aria-current={currentPage === 'signup' ? 'page' : undefined}
                className={`hidden lg:inline-flex rounded-xl px-2 lg:px-2.5 xl:px-3.5 py-1 md:py-1 lg:py-1.5 text-xs xl:text-sm font-semibold whitespace-nowrap transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold ${
                  currentPage === 'signup'
                    ? 'bg-siftrix-charcoal text-siftrix-champagne border border-siftrix-gold/55 shadow-2xs dark:bg-siftrix-sand dark:border-siftrix-gold'
                    : 'siftrix-btn-secondary'
                }`}
                aria-label="Create a SIFTRIX account"
              >
                Sign Up
              </a>
            </>
          )}
        </div>

        {/* Mobile Phones Only Header Controls (Hamburger Menu Trigger) */}
        <div className="flex md:hidden items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile Notification Bell */}
          <NotificationBell onNavigate={onNavigate} />

          {/* Mobile Theme Toggle */}
          <button
            type="button"
            onClick={handleToggleTheme}
            aria-label={`Switch theme (currently ${currentTheme})`}
            title={`Current theme: ${currentTheme}. Click to toggle.`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-siftrix-border bg-siftrix-white text-siftrix-charcoal hover:border-siftrix-gold hover:bg-siftrix-pearl transition-colors cursor-pointer text-xs sm:text-sm"
          >
            {currentTheme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* Hamburger Menu Toggle (☰) */}
          <button
            type="button"
            aria-expanded={isMobileMenuOpen}
            aria-controls="siftrix-mobile-menu"
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            title={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-siftrix-border bg-siftrix-white text-siftrix-charcoal hover:border-siftrix-gold hover:bg-siftrix-beige transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold"
          >
            {isMobileMenuOpen ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12" />
                <path d="M18 6l-12 12" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Collapsible Mobile Hamburger Drawer - Visible Only on Mobile Phones When Open */}
      {isMobileMenuOpen ? (
        <div
          id="siftrix-mobile-menu"
          className="md:hidden border-t border-siftrix-border bg-siftrix-pearl/98 dark:bg-[#18181F]/98 backdrop-blur-lg px-4 sm:px-6 py-4 shadow-[0_14px_30px_-14px_rgba(37,37,42,0.22)] max-h-[calc(100dvh-4.25rem)] overflow-y-auto"
        >
          <div className="max-w-md mx-auto space-y-3">
            <div className="grid grid-cols-1 gap-2">
              {NAV_ITEMS.map((item) => {
                const active = item.isActive(currentPage)
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={(e) => handleLinkClick(e, item.path, item.sectionId)}
                    aria-current={active ? 'page' : undefined}
                    className={mobileLinkClassName(active)}
                    aria-label={item.ariaLabel}
                  >
                    <span>{item.label}</span>
                    <span
                      aria-hidden="true"
                      className={active ? 'text-siftrix-champagne font-bold' : 'text-siftrix-antique-ink'}
                    >
                      →
                    </span>
                  </a>
                )
              })}
            </div>

            <div className="pt-3 border-t border-siftrix-border dark:border-siftrix-charcoal-border space-y-2.5">
              {authSession ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-siftrix-gold/45 bg-siftrix-beige dark:bg-[#23222A] px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-siftrix-antique-ink dark:text-siftrix-champagne/80">
                      {isRealAuthSession ? 'Authenticated Account' : 'UI Preview Session'}
                    </p>
                    <p className="text-sm font-bold text-siftrix-charcoal dark:text-[#FAF6EF] truncate">
                      {authSession.name}
                    </p>
                    <p className="text-xs font-mono text-siftrix-muted-dark dark:text-[#A7A29A] truncate">
                      {authSession.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOutClick}
                    className="rounded-xl border border-red-300 dark:border-red-800/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2 text-xs font-semibold text-red-800 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 cursor-pointer shrink-0 self-start sm:self-center"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href="/login"
                    onClick={(e) => handleLinkClick(e, '/login')}
                    aria-current={currentPage === 'login' ? 'page' : undefined}
                    className="flex items-center justify-center min-h-[44px] rounded-xl siftrix-btn-charcoal px-4 py-2.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold"
                  >
                    Sign In
                  </a>
                  <a
                    href="/signup"
                    onClick={(e) => handleLinkClick(e, '/signup')}
                    aria-current={currentPage === 'signup' ? 'page' : undefined}
                    className="flex items-center justify-center min-h-[44px] rounded-xl siftrix-btn-secondary px-4 py-2.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold"
                  >
                    Sign Up
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  )
}
