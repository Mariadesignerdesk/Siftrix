import { describe, it, expect, beforeEach } from 'vitest'
import {
  applyTheme,
  getStoredThemePreference,
  initializeTheme,
  resolveIsDark,
  setThemePreference,
  toggleTheme,
} from './themeService'

describe('themeService', () => {
  beforeEach(() => {
    // Reset stored theme
    setThemePreference('light')
  })

  it('defaults to light theme when initialized', () => {
    expect(getStoredThemePreference()).toBe('light')
    expect(resolveIsDark('light')).toBe(false)
  })

  it('stores and retrieves theme preference correctly', () => {
    setThemePreference('dark')
    expect(getStoredThemePreference()).toBe('dark')

    setThemePreference('light')
    expect(getStoredThemePreference()).toBe('light')
  })

  it('resolves dark correctly for dark and light modes', () => {
    expect(resolveIsDark('dark')).toBe(true)
    expect(resolveIsDark('light')).toBe(false)
  })

  it('toggles theme between light and dark', () => {
    setThemePreference('light')
    const next = toggleTheme()
    expect(next).toBe('dark')
    expect(getStoredThemePreference()).toBe('dark')

    const backToLight = toggleTheme()
    expect(backToLight).toBe('light')
    expect(getStoredThemePreference()).toBe('light')
  })

  it('applies theme classes without throwing', () => {
    const isDark = applyTheme('dark')
    expect(isDark).toBe(true)

    const isLight = applyTheme('light')
    expect(isLight).toBe(false)
  })

  it('initializes theme listener without throwing', () => {
    const cleanup = initializeTheme()
    expect(typeof cleanup).toBe('function')
    cleanup()
  })
})
