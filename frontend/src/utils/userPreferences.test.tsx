import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { checkBackendHealth, type ScanResponse } from '../services/api'
import { API_CONFIG } from '../services/config'
import Navbar from '../components/Navbar'
import ScanResultCard from '../components/ScanResultCard'
import SettingsPage, { SettingsContent } from '../pages/SettingsPage'
import {
  DEFAULT_LANGUAGE_PREFERENCE,
  LANGUAGE_PREFERENCE_STORAGE_KEY,
  isValidLanguagePreference,
  loadLanguagePreference,
  resetLanguagePreference,
  saveLanguagePreference,
  type StorageLike,
} from './userPreferences'
import { resolveBackendHealthState } from './settingsDiagnostics'

function createMemoryStorage(initial: Record<string, string> = {}): {
  storage: StorageLike
  backing: Map<string, string>
} {
  const backing = new Map<string, string>(Object.entries(initial))
  return {
    backing,
    storage: {
      getItem: (key: string) => backing.get(key) ?? null,
      setItem: (key: string, value: string) => {
        backing.set(key, value)
      },
    },
  }
}

const SAMPLE_SCAN_FOR_CARD: ScanResponse = {
  id: '55555555-5555-5555-5555-555555555555',
  user_id: null,
  target_type: 'message',
  target_content: 'Please confirm your account details.',
  overall_risk_score: 65,
  verdict: 'suspicious',
  risk_level: 'medium',
  summary: {
    en: 'English summary marker for preference check.',
    ur: 'ترجیح چیک کرنے کے لیے اردو خلاصہ۔',
  },
  recommendations: {
    en: ['Verify sender domain carefully.'],
    ur: ['بھیجنے والے کی تصدیق کریں۔'],
  },
  agent_findings: {},
  created_at: '2026-11-11T12:00:00Z',
  updated_at: '2026-11-11T12:00:00Z',
}

describe('userPreferences, backend diagnostics, and SettingsPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('persists and restores valid language preferences and rejects invalid stored values', () => {
    const { storage, backing } = createMemoryStorage({
      unrelated_key: 'keep-me',
    })

    expect(loadLanguagePreference(storage)).toBe(DEFAULT_LANGUAGE_PREFERENCE)
    expect(isValidLanguagePreference('all')).toBe(true)
    expect(isValidLanguagePreference('en')).toBe(true)
    expect(isValidLanguagePreference('ur')).toBe(true)
    expect(isValidLanguagePreference('fr')).toBe(false)
    expect(isValidLanguagePreference(null)).toBe(false)

    expect(saveLanguagePreference('en', storage)).toBe(true)
    expect(backing.get(LANGUAGE_PREFERENCE_STORAGE_KEY)).toBe('en')
    expect(loadLanguagePreference(storage)).toBe('en')

    expect(saveLanguagePreference('ur', storage)).toBe(true)
    expect(loadLanguagePreference(storage)).toBe('ur')

    // Invalid value persisted externally should safely fall back to 'all'
    backing.set(LANGUAGE_PREFERENCE_STORAGE_KEY, 'corrupted-locale')
    expect(loadLanguagePreference(storage)).toBe('all')
    expect(backing.get('unrelated_key')).toBe('keep-me')
  })

  it('handles storage errors cleanly without throwing', () => {
    const brokenStorage: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }

    expect(loadLanguagePreference(brokenStorage)).toBe('all')
    expect(saveLanguagePreference('en', brokenStorage)).toBe(false)
    expect(resetLanguagePreference(brokenStorage)).toEqual({
      value: 'all',
      persisted: false,
    })
  })

  it('resets display preference back to default without touching unrelated storage entries', () => {
    const { storage, backing } = createMemoryStorage({
      [LANGUAGE_PREFERENCE_STORAGE_KEY]: 'ur',
      unrelated_app_setting: 'preserve-value',
      cached_history_note: 'preserve-too',
    })

    const resetResult = resetLanguagePreference(storage)
    expect(resetResult).toEqual({ value: 'all', persisted: true })
    expect(backing.get(LANGUAGE_PREFERENCE_STORAGE_KEY)).toBe('all')
    expect(loadLanguagePreference(storage)).toBe('all')
    expect(backing.get('unrelated_app_setting')).toBe('preserve-value')
    expect(backing.get('cached_history_note')).toBe('preserve-too')
  })

  it('applies persisted language preference as default in ScanResultCard while retaining fallback safety', () => {
    const { storage } = createMemoryStorage({
      [LANGUAGE_PREFERENCE_STORAGE_KEY]: 'en',
    })
    vi.stubGlobal('localStorage', storage)

    const enHtml = renderToStaticMarkup(
      <ScanResultCard result={SAMPLE_SCAN_FOR_CARD} />
    )
    expect(enHtml).toContain('English summary marker for preference check.')
    expect(enHtml).not.toContain('ترجیح چیک کرنے کے لیے اردو خلاصہ۔')
    expect(enHtml).toContain('Both')
    expect(enHtml).toContain('English')
    expect(enHtml).toContain('اردو')

    // When stored value becomes invalid, ScanResultCard defaults safely to 'all'
    const { storage: invalidStorage } = createMemoryStorage({
      [LANGUAGE_PREFERENCE_STORAGE_KEY]: 'invalid-value',
    })
    vi.stubGlobal('localStorage', invalidStorage)

    const allHtml = renderToStaticMarkup(
      <ScanResultCard result={SAMPLE_SCAN_FOR_CARD} />
    )
    expect(allHtml).toContain('English summary marker for preference check.')
    expect(allHtml).toContain('ترجیح چیک کرنے کے لیے اردو خلاصہ۔')
  })

  it('resolves connected and disconnected backend diagnostics honestly from checkBackendHealth', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const okDiag = resolveBackendHealthState(
      await checkBackendHealth(),
      '2026-11-11T13:18:00Z'
    )
    expect(okDiag).toEqual({
      status: 'connected',
      backendReportedStatus: 'ok',
      statusCode: 200,
      lastCheckedAt: '2026-11-11T13:18:00Z',
    })

    const failDiag = resolveBackendHealthState(
      await checkBackendHealth(),
      '2026-11-11T13:19:00Z'
    )
    expect(failDiag.status).toBe('disconnected')
    expect(failDiag.statusCode).toBe(0)
    expect(failDiag.errorMessage).toContain('Unable to reach the SIFTRIX backend')
    expect(failDiag.lastCheckedAt).toBe('2026-11-11T13:19:00Z')
  })

  it('renders SettingsPage, Navbar active state, app config, honest profile state, diagnostics, and reset confirmation', () => {
    const navigate = vi.fn()

    const navHtml = renderToStaticMarkup(
      <Navbar currentPage="settings" onNavigate={navigate} />
    )
    expect(navHtml).toContain('href="/settings"')
    expect(navHtml).toContain('aria-current="page"')
    expect(navHtml).toContain('Settings')

    const initialHtml = renderToStaticMarkup(
      <SettingsPage onNavigate={navigate} />
    )
    expect(initialHtml).toContain('Profile &amp; Settings')
    expect(initialHtml).toContain('href="/dashboard"')
    expect(initialHtml).toContain('Both English &amp; Urdu')
    expect(initialHtml).toContain('English only')
    expect(initialHtml).toContain('Urdu only')
    expect(initialHtml).toContain(API_CONFIG.BASE_URL)
    expect(initialHtml).toContain(`${API_CONFIG.TIMEOUT_MS} ms`)
    expect(initialHtml).toContain('Checking...')
    expect(initialHtml).toContain('Account Profile')
    expect(initialHtml).toContain('Not Configured')

    const connectedConfirmHtml = renderToStaticMarkup(
      <SettingsContent
        languagePreference="ur"
        preferenceNotice={{ text: 'Saved default display preference: Urdu only.', isWarning: false }}
        isConfirmingReset={true}
        diagnosticState={{
          status: 'connected',
          backendReportedStatus: 'healthy',
          statusCode: 200,
          lastCheckedAt: '2026-11-11T13:20:00Z',
        }}
        onSelectLanguage={vi.fn()}
        onRequestReset={vi.fn()}
        onCancelReset={vi.fn()}
        onConfirmReset={vi.fn()}
        onCheckAgain={vi.fn()}
        onNavigate={navigate}
      />
    )
    expect(connectedConfirmHtml).toContain('Connected')
    expect(connectedConfirmHtml).toContain('healthy')
    expect(connectedConfirmHtml).toContain('Check Again')
    expect(connectedConfirmHtml).toContain('Confirm Reset')
    expect(connectedConfirmHtml).toContain('Cancel')

    const disconnectedHtml = renderToStaticMarkup(
      <SettingsContent
        languagePreference="all"
        preferenceNotice={null}
        isConfirmingReset={false}
        diagnosticState={{
          status: 'disconnected',
          errorMessage: 'Connection refused',
          statusCode: 0,
          lastCheckedAt: '2026-11-11T13:21:00Z',
        }}
        onSelectLanguage={vi.fn()}
        onRequestReset={vi.fn()}
        onCancelReset={vi.fn()}
        onConfirmReset={vi.fn()}
        onCheckAgain={vi.fn()}
        onNavigate={navigate}
      />
    )
    expect(disconnectedHtml).toContain('Disconnected / Unavailable')
    expect(disconnectedHtml).toContain('Connection refused')
    expect(disconnectedHtml).not.toContain('>Connected<')
  })
})
