export type LanguageView = 'all' | 'en' | 'ur'

export const LANGUAGE_PREFERENCE_STORAGE_KEY = 'siftrix.preferences.language'
export const DEFAULT_LANGUAGE_PREFERENCE: LanguageView = 'all'

export interface LanguagePreferenceOption {
  value: LanguageView
  label: string
  description: string
}

export const LANGUAGE_PREFERENCE_OPTIONS: ReadonlyArray<LanguagePreferenceOption> = [
  {
    value: 'all',
    label: 'Both English & Urdu',
    description:
      'Display threat summaries and recommendations side-by-side in English and Urdu.',
  },
  {
    value: 'en',
    label: 'English only',
    description:
      'Default to English summaries and recommendations (you can still switch per scan).',
  },
  {
    value: 'ur',
    label: 'Urdu only',
    description:
      'Default to Urdu right-to-left summaries and recommendations (you can still switch per scan).',
  },
]

export interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

function getDefaultStorage(): StorageLike | null {
  try {
    if (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined'
    ) {
      return window.localStorage
    }
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      return globalThis.localStorage ?? null
    }
  } catch {
    return null
  }
  return null
}

/**
 * Type guard verifying a stored value is one of the supported LanguageView options.
 */
export function isValidLanguagePreference(value: unknown): value is LanguageView {
  return value === 'all' || value === 'en' || value === 'ur'
}

/**
 * Reads the persisted language display preference from localStorage.
 * Falls back safely to DEFAULT_LANGUAGE_PREFERENCE when storage is unavailable or invalid.
 */
export function loadLanguagePreference(
  storage: StorageLike | null = getDefaultStorage()
): LanguageView {
  if (!storage) {
    return DEFAULT_LANGUAGE_PREFERENCE
  }

  try {
    const raw = storage.getItem(LANGUAGE_PREFERENCE_STORAGE_KEY)
    return isValidLanguagePreference(raw) ? raw : DEFAULT_LANGUAGE_PREFERENCE
  } catch {
    return DEFAULT_LANGUAGE_PREFERENCE
  }
}

/**
 * Persists a validated language preference under SIFTRIX's preference key.
 * Returns true if storage succeeded, false if storage is unavailable or threw.
 */
export function saveLanguagePreference(
  preference: LanguageView,
  storage: StorageLike | null = getDefaultStorage()
): boolean {
  const safeValue = isValidLanguagePreference(preference)
    ? preference
    : DEFAULT_LANGUAGE_PREFERENCE

  if (!storage) {
    return false
  }

  try {
    storage.setItem(LANGUAGE_PREFERENCE_STORAGE_KEY, safeValue)
    return true
  } catch {
    return false
  }
}

/**
 * Restores the default language preference ('all') without modifying unrelated storage keys.
 */
export function resetLanguagePreference(
  storage: StorageLike | null = getDefaultStorage()
): { value: LanguageView; persisted: boolean } {
  const persisted = saveLanguagePreference(DEFAULT_LANGUAGE_PREFERENCE, storage)
  return {
    value: DEFAULT_LANGUAGE_PREFERENCE,
    persisted,
  }
}
