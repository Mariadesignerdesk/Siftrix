import type { MouseEvent } from 'react'
import type { AppPath, AppRoute, NavigateFn } from '../utils/router'
import BrandMark from './BrandMark'

interface NavbarProps {
  currentPage: AppRoute['page']
  onNavigate: NavigateFn
}

export default function Navbar({ currentPage, onNavigate }: NavbarProps) {
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
    onNavigate(path, sectionId)
  }

  const isHistoryActive =
    currentPage === 'history' || currentPage === 'scan-details'

  const linkClassName = (isActive: boolean) =>
    `rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold ${
      isActive
        ? 'bg-siftrix-charcoal text-siftrix-champagne border border-siftrix-gold/45 shadow-2xs'
        : 'text-siftrix-muted-dark border border-transparent hover:text-siftrix-charcoal hover:bg-white/85 hover:border-siftrix-border'
    }`

  return (
    <header className="sticky top-0 z-30 border-b border-siftrix-border/90 bg-siftrix-pearl/92 backdrop-blur-md shadow-[0_2px_14px_rgba(37,37,42,0.06)]">
      {/* Subtle Top Champagne Hairline */}
      <div
        aria-hidden="true"
        className="h-[2px] w-full bg-gradient-to-r from-transparent via-siftrix-gold/65 to-transparent"
      />

      <nav
        aria-label="Main Navigation"
        className="max-w-7xl mx-auto flex flex-wrap lg:flex-nowrap items-center justify-between gap-y-2.5 gap-x-3 px-4 sm:px-6 lg:px-10 py-2.5 lg:py-3"
      >
        {/* Brand Wordmark + Precision Gold Emblem */}
        <a
          href="/"
          onClick={(e) => handleLinkClick(e, '/')}
          className="order-1 inline-flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold rounded-xl px-1.5 py-0.5 transition-colors"
          aria-label="SIFTRIX Home"
        >
          <BrandMark className="h-8.5 w-8.5 shrink-0 shadow-2xs transition-transform duration-300 group-hover:scale-105" />
          <div className="flex items-center gap-2.5">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-siftrix-charcoal">
              SIFTRIX
            </span>
            <span className="hidden xl:inline-flex items-center rounded-full border border-siftrix-gold/45 bg-siftrix-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-siftrix-graphite shadow-2xs">
              <span
                className="mr-1.5 h-1.5 w-1.5 rounded-full bg-siftrix-gold"
                aria-hidden="true"
              />
              AI Command
            </span>
          </div>
        </a>

        {/* Navigation Links */}
        <div className="order-3 w-full lg:order-2 lg:w-auto flex flex-wrap items-center justify-center gap-1 lg:gap-1.5 rounded-xl border border-siftrix-border/80 bg-siftrix-beige/85 p-1">
          <a
            href="/#home"
            onClick={(e) => handleLinkClick(e, '/', 'home')}
            aria-current={currentPage === 'home' ? 'page' : undefined}
            className={linkClassName(currentPage === 'home')}
            aria-label="Navigate to Home section"
          >
            Home
          </a>
          <a
            href="/dashboard"
            onClick={(e) => handleLinkClick(e, '/dashboard')}
            aria-current={currentPage === 'dashboard' ? 'page' : undefined}
            className={linkClassName(currentPage === 'dashboard')}
            aria-label="Navigate to Security Dashboard page"
          >
            Dashboard
          </a>
          <a
            href="/scans"
            onClick={(e) => handleLinkClick(e, '/scans')}
            aria-current={isHistoryActive ? 'page' : undefined}
            className={linkClassName(isHistoryActive)}
            aria-label="Navigate to Scan History page"
          >
            Scan History
          </a>
          <a
            href="/#features"
            onClick={(e) => handleLinkClick(e, '/', 'features')}
            className={linkClassName(false)}
            aria-label="Navigate to Features section"
          >
            Features
          </a>
          <a
            href="/#about"
            onClick={(e) => handleLinkClick(e, '/', 'about')}
            className={linkClassName(false)}
            aria-label="Navigate to About section"
          >
            About
          </a>
          <a
            href="/settings"
            onClick={(e) => handleLinkClick(e, '/settings')}
            aria-current={currentPage === 'settings' ? 'page' : undefined}
            className={linkClassName(currentPage === 'settings')}
            aria-label="Navigate to Profile and Settings page"
          >
            Settings
          </a>
        </div>

        {/* Primary Navigation Action */}
        <button
          type="button"
          onClick={() => onNavigate('/', 'scan')}
          className="order-2 lg:order-3 siftrix-btn-gold inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-siftrix-pearl focus-visible:ring-siftrix-charcoal px-4 sm:px-5 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
          aria-label="Get started by scrolling to the threat analysis tool"
        >
          <span>Get Started</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="h-4 w-4 text-siftrix-charcoal"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 10h11" />
            <path d="M11 5l5 5-5 5" />
          </svg>
        </button>
      </nav>
    </header>
  )
}
