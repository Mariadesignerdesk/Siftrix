export const INTRO_SEEN_STORAGE_KEY = 'siftrix.intro.seen'

export interface SessionStorageSubset {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

function getDefaultSessionStorage(): SessionStorageSubset | null {
  try {
    if (
      typeof window !== 'undefined' &&
      typeof window.sessionStorage !== 'undefined'
    ) {
      return window.sessionStorage
    }
  } catch {
    return null
  }
  return null
}

/**
 * Checks whether the current browser environment prefers reduced motion.
 */
export function prefersReducedMotion(): boolean {
  try {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/**
 * Determines whether the brief cinematic intro reveal should appear on initial load.
 * Always skips in SSR/test server renders, returning visits within the same session,
 * direct sub-route opens, or when prefers-reduced-motion is enabled.
 */
export function shouldShowCinematicIntro(
  isHomeRoute: boolean,
  storage: SessionStorageSubset | null = getDefaultSessionStorage(),
  reducedMotion = prefersReducedMotion()
): boolean {
  if (typeof window === 'undefined' || !isHomeRoute || reducedMotion) {
    return false
  }

  if (!storage) {
    return false
  }

  try {
    return storage.getItem(INTRO_SEEN_STORAGE_KEY) !== '1'
  } catch {
    return false
  }
}

/**
 * Records that the visitor has already viewed or skipped the opening brand reveal
 * so returning navigation within the session opens immediately without delay.
 */
export function markCinematicIntroSeen(
  storage: SessionStorageSubset | null = getDefaultSessionStorage()
): boolean {
  if (!storage) {
    return false
  }

  try {
    storage.setItem(INTRO_SEEN_STORAGE_KEY, '1')
    return true
  } catch {
    return false
  }
}
