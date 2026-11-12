import type { ScanVerdict } from '../services/api'
import type { StorageLike } from './userPreferences'

export type SoundPreference = 'off' | 'on'

export const SOUND_PREFERENCE_STORAGE_KEY = 'siftrix.preferences.sound'
export const DEFAULT_SOUND_PREFERENCE: SoundPreference = 'off'

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
 * Type guard verifying a stored value is a supported SoundPreference option.
 */
export function isValidSoundPreference(value: unknown): value is SoundPreference {
  return value === 'off' || value === 'on'
}

/**
 * Reads the persisted opt-in audio cue preference from localStorage.
 * Defaults safely to 'off' (opt-in only, restrained behavior).
 */
export function loadSoundPreference(
  storage: StorageLike | null = getDefaultStorage()
): SoundPreference {
  if (!storage) {
    return DEFAULT_SOUND_PREFERENCE
  }

  try {
    const raw = storage.getItem(SOUND_PREFERENCE_STORAGE_KEY)
    return isValidSoundPreference(raw) ? raw : DEFAULT_SOUND_PREFERENCE
  } catch {
    return DEFAULT_SOUND_PREFERENCE
  }
}

/**
 * Persists the user's sound feedback preference without touching unrelated keys.
 */
export function saveSoundPreference(
  preference: SoundPreference,
  storage: StorageLike | null = getDefaultStorage()
): boolean {
  const safeValue = isValidSoundPreference(preference)
    ? preference
    : DEFAULT_SOUND_PREFERENCE

  if (!storage) {
    return false
  }

  try {
    storage.setItem(SOUND_PREFERENCE_STORAGE_KEY, safeValue)
    return true
  } catch {
    return false
  }
}

/**
 * Plays a brief, low-volume two-note Web Audio tone only when sound cues are
 * explicitly enabled by the user and AudioContext is available. Never plays
 * background music or routine UI click/hover sounds.
 */
export function playScanCompletionChime(
  verdict: ScanVerdict | string | undefined,
  storage: StorageLike | null = getDefaultStorage()
): void {
  if (loadSoundPreference(storage) !== 'on') {
    return
  }

  if (typeof window === 'undefined') {
    return
  }

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext

  if (!AudioCtx) {
    return
  }

  try {
    const ctx = new AudioCtx()
    const now = ctx.currentTime
    const notes =
      verdict === 'malicious' || verdict === 'suspicious'
        ? [440, 349.23]
        : [523.25, 659.25]

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = now + idx * 0.09
      const end = start + 0.16

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)

      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.035, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, end)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(start)
      osc.stop(end)
    })

    setTimeout(() => {
      void ctx.close().catch(() => {})
    }, 450)
  } catch {
    // Gracefully ignore browser audio policy blocks or unsupported environments
  }
}
