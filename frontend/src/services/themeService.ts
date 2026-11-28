export type ThemeMode = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'siftrix_theme_mode'

let memoryTheme: ThemeMode = 'light'

function getSafeStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage
    }
  } catch {
    // fallback to memory
  }
  return null
}

/**
 * Reads stored theme preference from localStorage or defaults to 'light'.
 */
export function getStoredThemePreference(): ThemeMode {
  const storage = getSafeStorage()
  if (!storage) return memoryTheme

  try {
    const stored = storage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
  } catch {
    // fallback if localStorage is unavailable
  }
  return 'light'
}

/**
 * Resolves whether dark mode is currently active given the preference and system settings.
 */
export function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return false
}

/**
 * Applies the given theme mode to the HTML root element.
 */
export function applyTheme(mode: ThemeMode): boolean {
  const isDark = resolveIsDark(mode)

  if (typeof document !== 'undefined' && document.documentElement) {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
      root.setAttribute('data-theme', 'dark')
    } else {
      root.classList.remove('dark')
      root.setAttribute('data-theme', 'light')
    }
  }

  return isDark
}

/**
 * Saves theme preference and applies it to the DOM.
 */
export function setThemePreference(mode: ThemeMode): boolean {
  memoryTheme = mode
  const storage = getSafeStorage()
  if (storage) {
    try {
      storage.setItem(THEME_STORAGE_KEY, mode)
    } catch {
      // ignore storage failure
    }
  }
  return applyTheme(mode)
}

/**
 * Initializes theme on app startup, including system color scheme listener.
 */
export function initializeTheme(): () => void {
  const currentMode = getStoredThemePreference()
  applyTheme(currentMode)

  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {}
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleChange = () => {
    if (getStoredThemePreference() === 'system') {
      applyTheme('system')
    }
  }

  mediaQuery.addEventListener('change', handleChange)
  return () => {
    mediaQuery.removeEventListener('change', handleChange)
  }
}

/**
 * Quick toggle between light and dark modes.
 */
export function toggleTheme(): ThemeMode {
  const current = getStoredThemePreference()
  const next: ThemeMode = resolveIsDark(current) ? 'light' : 'dark'
  setThemePreference(next)
  return next
}
