import type { MouseEvent } from 'react'
import { handleSpaLinkClick, type AppPath, type NavigateFn } from '../utils/router'
import BrandMark from './BrandMark'

interface FooterProps {
  onNavigate?: NavigateFn
}

const PLATFORM_LINKS: ReadonlyArray<{
  label: string
  href: string
  path: AppPath
  sectionId?: string
}> = [
  { label: 'Home', href: '/#home', path: '/', sectionId: 'home' },
  { label: 'AI Capabilities', href: '/#features', path: '/', sectionId: 'features' },
  { label: 'Threat Scanner', href: '/#scan', path: '/', sectionId: 'scan' },
  { label: 'How It Works', href: '/#how-it-works', path: '/', sectionId: 'how-it-works' },
  { label: 'About SIFTRIX', href: '/#about', path: '/', sectionId: 'about' },
]

const WORKSPACE_LINKS: ReadonlyArray<{
  label: string
  href: string
  path: AppPath
  sectionId?: string
}> = [
  { label: 'Security Dashboard', href: '/dashboard', path: '/dashboard' },
  { label: 'Command Preview', href: '/#command-center', path: '/', sectionId: 'command-center' },
  { label: 'Scan History', href: '/scans', path: '/scans' },
  { label: 'Profile & Settings', href: '/settings', path: '/settings' },
  { label: 'Sign In', href: '/login', path: '/login' },
  { label: 'Create Account', href: '/signup', path: '/signup' },
]

export default function Footer({ onNavigate }: FooterProps) {
  const onAnchorClick = (
    event: MouseEvent<HTMLAnchorElement>,
    path: AppPath,
    sectionId?: string
  ) => {
    if (!onNavigate) return
    handleSpaLinkClick(event, onNavigate, path, sectionId)
  }

  return (
    <footer
      role="contentinfo"
      className="relative bg-siftrix-charcoal border-t border-siftrix-charcoal-border text-siftrix-beige px-5 sm:px-6 md:px-10 pt-14 pb-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-siftrix-gold/70 to-transparent"
      />

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-10 border-b border-siftrix-charcoal-border">
          {/* Brand Summary */}
          <div className="md:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-3">
              <BrandMark className="h-9 w-9 shrink-0" />
              <div>
                <h2 className="text-xl font-bold text-siftrix-white tracking-tight">
                  SIFTRIX
                </h2>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-siftrix-champagne">
                  Intelligence. Protection. Confidence.
                </p>
              </div>
            </div>

            <p className="text-sm text-[#C8C1B6] leading-relaxed max-w-sm">
              AI-Powered Cybersecurity for Everyone. Inspect suspicious URLs, SMS
              lures, and phishing emails with clear bilingual guidance.
            </p>
          </div>

          {/* Platform Navigation */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-siftrix-champagne">
              Platform
            </h3>
            <ul className="space-y-2 text-sm">
              {PLATFORM_LINKS.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    onClick={(e) => onAnchorClick(e, item.path, item.sectionId)}
                    className="text-[#CFC9BF] hover:text-siftrix-champagne transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Command Center Navigation */}
          <div className="md:col-span-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-siftrix-champagne">
              Command Center
            </h3>
            <ul className="space-y-2 text-sm">
              {WORKSPACE_LINKS.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    onClick={(e) => onAnchorClick(e, item.path, item.sectionId)}
                    className="text-[#CFC9BF] hover:text-siftrix-champagne transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#AAA398]">
          <p>Intelligence Behind Every Scan.</p>
          <p>© 2026 SIFTRIX. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
