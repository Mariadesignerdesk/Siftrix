import { useCallback, useEffect, useRef, useState } from 'react'

export type AppRoute =
  | { page: 'home' }
  | { page: 'dashboard' }
  | { page: 'history' }
  | { page: 'scan-details'; scanId: string }
  | { page: 'settings' }
  | { page: 'login' }
  | { page: 'signup' }

export type AppPath =
  | '/'
  | '/dashboard'
  | '/scans'
  | `/scans/${string}`
  | '/settings'
  | '/login'
  | '/signup'

export type NavigateFn = (path: AppPath, sectionId?: string) => void

export interface LinkClickEvent {
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  button: number
  preventDefault: () => void
}

/**
 * Handles anchor clicks for internal SPA routes while allowing modifier/middle clicks
 * to open in a new tab using standard browser behavior.
 */
export function handleSpaLinkClick(
  event: LinkClickEvent,
  onNavigate: NavigateFn,
  path: AppPath,
  sectionId?: string
): void {
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

function safeDecodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

/**
 * Parses a browser pathname into a typed AppRoute.
 * Normalizes trailing slashes and safely falls back to the landing page.
 */
export function parseRoutePath(pathname: string): AppRoute {
  const normalized = pathname.replace(/\/+$/, '') || '/'

  if (normalized === '/dashboard') {
    return { page: 'dashboard' }
  }

  if (normalized === '/scans') {
    return { page: 'history' }
  }

  if (normalized === '/settings') {
    return { page: 'settings' }
  }

  if (normalized === '/login') {
    return { page: 'login' }
  }

  if (normalized === '/signup') {
    return { page: 'signup' }
  }

  if (normalized.startsWith('/scans/')) {
    const rawId = normalized.slice('/scans/'.length)
    if (rawId && !rawId.includes('/')) {
      return { page: 'scan-details', scanId: safeDecodeSegment(rawId) }
    }
  }

  return { page: 'home' }
}

const LANDING_SECTION_IDS = new Set([
  'home',
  'scan',
  'features',
  'how-it-works',
  'command-center',
  'about',
])

/**
 * Extracts a known landing page section ID from a URL hash string.
 */
export function getLandingSectionIdFromHash(hash: string): string | null {
  if (!hash) {
    return null
  }
  const clean = hash.startsWith('#') ? hash.slice(1) : hash
  return LANDING_SECTION_IDS.has(clean) ? clean : null
}

function scrollToSectionAfterRender(sectionId: string): () => void {
  let frameTwo = 0
  const frameOne = window.requestAnimationFrame(() => {
    frameTwo = window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
    })
  })

  return () => {
    window.cancelAnimationFrame(frameOne)
    window.cancelAnimationFrame(frameTwo)
  }
}

/**
 * Lightweight History-API router hook enabling multi-page SPA navigation
 * and cross-page section scrolling without adding external router dependencies.
 */
export function useAppRouter(): { route: AppRoute; navigate: NavigateFn } {
  const [route, setRoute] = useState<AppRoute>(() =>
    parseRoutePath(window.location.pathname)
  )
  const cancelPendingScrollRef = useRef<(() => void) | null>(null)

  const scheduleSectionScroll = useCallback((sectionId: string) => {
    cancelPendingScrollRef.current?.()
    cancelPendingScrollRef.current = scrollToSectionAfterRender(sectionId)
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      const nextRoute = parseRoutePath(window.location.pathname)
      setRoute(nextRoute)

      if (nextRoute.page === 'home') {
        const sectionId = getLandingSectionIdFromHash(window.location.hash)
        if (sectionId) {
          scheduleSectionScroll(sectionId)
          return
        }
      }

      cancelPendingScrollRef.current?.()
      cancelPendingScrollRef.current = null
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      cancelPendingScrollRef.current?.()
      cancelPendingScrollRef.current = null
    }
  }, [scheduleSectionScroll])

  const navigate = useCallback<NavigateFn>(
    (path, sectionId) => {
      const targetUrl = sectionId ? `${path}#${sectionId}` : path
      const nextRoute = parseRoutePath(path)

      if (window.location.pathname + window.location.hash !== targetUrl) {
        window.history.pushState(null, '', targetUrl)
      }

      setRoute(nextRoute)

      if (sectionId) {
        // Wait for React to commit the target page before scrolling to the section
        scheduleSectionScroll(sectionId)
      } else {
        cancelPendingScrollRef.current?.()
        cancelPendingScrollRef.current = null
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    },
    [scheduleSectionScroll]
  )

  return { route, navigate }
}
