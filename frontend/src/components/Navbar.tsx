import type { MouseEvent } from 'react'
import type { AppPath, AppRoute, NavigateFn } from '../utils/router'

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

  return (
    <nav
      aria-label="Main Navigation"
      className="sticky top-0 z-30 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 px-6 lg:px-10 py-3.5 md:py-5 bg-siftrix-navy/90 backdrop-blur-md border-b border-siftrix-royal/60 shadow-[0_6px_28px_rgba(23,21,46,0.55)]"
    >
      {/* Logo */}
      <a
        href="/"
        onClick={(e) => handleLinkClick(e, '/')}
        className="text-2xl font-bold text-siftrix-lavender hover:text-siftrix-soft drop-shadow-[0_0_12px_rgba(139,109,255,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric rounded px-1 transition-colors"
        aria-label="SIFTRIX Home"
      >
        SIFTRIX
      </a>

      {/* Navigation Links */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5 md:gap-4 lg:gap-6 xl:gap-8 text-siftrix-soft text-sm md:text-base">
        <a
          href="/#home"
          onClick={(e) => handleLinkClick(e, '/', 'home')}
          aria-current={currentPage === 'home' ? 'page' : undefined}
          className={`hover:text-siftrix-lavender focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric rounded px-1 transition-colors whitespace-nowrap ${
            currentPage === 'home'
              ? 'text-siftrix-lavender font-semibold border-b-2 border-siftrix-electric'
              : ''
          }`}
          aria-label="Navigate to Home section"
        >
          Home
        </a>
        <a
          href="/dashboard"
          onClick={(e) => handleLinkClick(e, '/dashboard')}
          aria-current={currentPage === 'dashboard' ? 'page' : undefined}
          className={`hover:text-siftrix-lavender focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric rounded px-1 transition-colors whitespace-nowrap ${
            currentPage === 'dashboard'
              ? 'text-siftrix-lavender font-semibold border-b-2 border-siftrix-electric'
              : ''
          }`}
          aria-label="Navigate to Security Dashboard page"
        >
          Dashboard
        </a>
        <a
          href="/scans"
          onClick={(e) => handleLinkClick(e, '/scans')}
          aria-current={isHistoryActive ? 'page' : undefined}
          className={`hover:text-siftrix-lavender focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric rounded px-1 transition-colors whitespace-nowrap ${
            isHistoryActive
              ? 'text-siftrix-lavender font-semibold border-b-2 border-siftrix-electric'
              : ''
          }`}
          aria-label="Navigate to Scan History page"
        >
          Scan History
        </a>
        <a
          href="/#features"
          onClick={(e) => handleLinkClick(e, '/', 'features')}
          className="hover:text-siftrix-lavender focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric rounded px-1 transition-colors whitespace-nowrap"
          aria-label="Navigate to Features section"
        >
          Features
        </a>
        <a
          href="/#about"
          onClick={(e) => handleLinkClick(e, '/', 'about')}
          className="hover:text-siftrix-lavender focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric rounded px-1 transition-colors whitespace-nowrap"
          aria-label="Navigate to About section"
        >
          About
        </a>
        <a
          href="/settings"
          onClick={(e) => handleLinkClick(e, '/settings')}
          aria-current={currentPage === 'settings' ? 'page' : undefined}
          className={`hover:text-siftrix-lavender focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric rounded px-1 transition-colors whitespace-nowrap ${
            currentPage === 'settings'
              ? 'text-siftrix-lavender font-semibold border-b-2 border-siftrix-electric'
              : ''
          }`}
          aria-label="Navigate to Profile and Settings page"
        >
          Settings
        </a>
      </div>

      {/* Button */}
      <button
        type="button"
        onClick={() => onNavigate('/', 'scan')}
        className="siftrix-btn-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-siftrix-navy focus-visible:ring-siftrix-electric px-5 py-2 rounded-lg text-sm md:text-base cursor-pointer whitespace-nowrap"
        aria-label="Get started by scrolling to the threat scanner"
      >
        Get Started
      </button>
    </nav>
  )
}
