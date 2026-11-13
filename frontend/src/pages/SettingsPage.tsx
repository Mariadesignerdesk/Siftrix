import { useCallback, useEffect, useRef, useState } from 'react'
import { checkBackendHealth } from '../services/api'
import { API_CONFIG } from '../services/config'
import {
  getStoredThemePreference,
  setThemePreference,
  type ThemeMode,
} from '../services/themeService'
import {
  clearAuthPreviewSession,
  type AuthPreviewSession,
} from '../utils/authPreview'
import { formatTimestamp } from '../utils/scanPresentation'
import { handleSpaLinkClick, type NavigateFn } from '../utils/router'
import {
  resolveBackendHealthState,
  type BackendDiagnosticState,
} from '../utils/settingsDiagnostics'
import {
  loadSoundPreference,
  saveSoundPreference,
  type SoundPreference,
} from '../utils/soundEffects'
import {
  DEFAULT_LANGUAGE_PREFERENCE,
  LANGUAGE_PREFERENCE_OPTIONS,
  loadLanguagePreference,
  resetLanguagePreference,
  saveLanguagePreference,
  type LanguageView,
} from '../utils/userPreferences'

interface SettingsPageProps {
  onNavigate: NavigateFn
  authSession?: AuthPreviewSession | null
  onSignOut?: () => void
}

interface SettingsContentProps {
  languagePreference: LanguageView
  soundPreference?: SoundPreference
  themeMode?: ThemeMode
  onSelectTheme?: (mode: ThemeMode) => void
  preferenceNotice: { text: string; isWarning: boolean } | null
  isConfirmingReset: boolean
  diagnosticState: BackendDiagnosticState
  authSession?: AuthPreviewSession | null
  onSignOut?: () => void
  onSelectLanguage: (value: LanguageView) => void
  onToggleSound?: () => void
  onRequestReset: () => void
  onCancelReset: () => void
  onConfirmReset: () => void
  onCheckAgain: () => void
  onNavigate: NavigateFn
}

/**
 * Pure presentation body for Profile & Settings covering display preferences,
 * optional sound cues, genuine app config metadata, backend diagnostics,
 * honest profile state, and reset confirmation.
 */
export function SettingsContent({
  languagePreference,
  soundPreference = 'off',
  themeMode = 'light',
  onSelectTheme,
  preferenceNotice,
  isConfirmingReset,
  diagnosticState,
  authSession = null,
  onSignOut,
  onSelectLanguage,
  onToggleSound,
  onRequestReset,
  onCancelReset,
  onConfirmReset,
  onCheckAgain,
  onNavigate,
}: SettingsContentProps) {
  const isCheckingHealth = diagnosticState.status === 'checking'
  const timeoutSeconds = API_CONFIG.TIMEOUT_MS / 1000
  const defaultOptionLabel =
    LANGUAGE_PREFERENCE_OPTIONS.find(
      (option) => option.value === DEFAULT_LANGUAGE_PREFERENCE
    )?.label || 'Both English & Urdu'

  return (
    <section
      aria-label="Profile and Settings"
      className="px-4 sm:px-6 md:px-10 py-8 sm:py-10 md:py-14 max-w-7xl mx-auto space-y-6 animate-siftrix-enter"
    >
      {/* Strong Dark Settings Header */}
      <div className="siftrix-card-charcoal relative overflow-hidden rounded-2xl p-5 sm:p-6 md:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-siftrix-champagne/80 to-transparent"
        />

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-siftrix-champagne">
            Preferences & Diagnostics
          </p>
          <h2 className="text-3xl font-bold text-siftrix-white mt-1 tracking-tight">
            Profile & Settings
          </h2>
          <p className="text-[#C8C1B6] text-sm md:text-base mt-1">
            Manage analysis display preferences, review frontend configuration, and inspect backend diagnostics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/scans"
            onClick={(e) => handleSpaLinkClick(e, onNavigate, '/scans')}
            className="px-4 py-2 rounded-xl siftrix-btn-charcoal-outline text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-champagne"
          >
            Scan History
          </a>

          <a
            href="/dashboard"
            onClick={(e) => handleSpaLinkClick(e, onNavigate, '/dashboard')}
            className="siftrix-btn-gold px-5 py-2 rounded-xl text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-siftrix-charcoal focus-visible:ring-siftrix-champagne"
          >
            Back to Dashboard
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Primary Column: Display Preferences, Audio Cue, Reset */}
        <div className="min-w-0 lg:col-span-7 space-y-6">
          {/* Display Preferences Card */}
          <article
            aria-label="Display Preferences"
            className="siftrix-card p-6 md:p-8 rounded-2xl space-y-5"
          >
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-siftrix-charcoal">
                Display Preferences
              </h3>
              <p className="text-sm text-siftrix-muted-dark">
                Choose the default language view used when opening scan results in the threat scanner and scan details pages.
              </p>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-siftrix-antique-ink mb-2">
                Default Analysis Language View
              </legend>

              {LANGUAGE_PREFERENCE_OPTIONS.map((option) => {
                const isSelected = languagePreference === option.value
                return (
                  <label
                    key={option.value}
                    htmlFor={`lang-pref-${option.value}`}
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'siftrix-card-charcoal border-siftrix-gold ring-1 ring-siftrix-gold/35'
                        : 'siftrix-panel-inset hover:border-siftrix-gold/80'
                    }`}
                  >
                    <input
                      id={`lang-pref-${option.value}`}
                      type="radio"
                      name="language-preference"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => onSelectLanguage(option.value)}
                      className="mt-1 h-4 w-4 accent-[#C5A15D] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold"
                    />
                    <div className="space-y-0.5 min-w-0">
                      <span
                        className={`block text-sm font-bold ${
                          isSelected ? 'text-siftrix-champagne' : 'text-siftrix-charcoal'
                        }`}
                      >
                        {option.label}
                      </span>
                      <span
                        className={`block text-xs leading-relaxed ${
                          isSelected ? 'text-[#C8C1B6]' : 'text-siftrix-muted-dark'
                        }`}
                      >
                        {option.description}
                      </span>
                    </div>
                  </label>
                )
              })}
            </fieldset>

            <div className="min-h-6" aria-live="polite" aria-atomic="true">
              {preferenceNotice ? (
                <p
                  role="status"
                  className={`text-xs font-medium px-3 py-2 rounded-lg border ${
                    preferenceNotice.isWarning
                      ? 'bg-amber-50 text-amber-900 border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {preferenceNotice.text}
                </p>
              ) : (
                <p className="text-xs text-siftrix-muted-dark">
                  Preferences are saved locally in this browser and persist across page refreshes.
                </p>
              )}
            </div>
          </article>

          {/* Visual Theme Mode Card */}
          <article
            aria-label="Visual Theme Mode"
            className="siftrix-card p-6 md:p-8 rounded-2xl space-y-4"
          >
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-siftrix-charcoal">
                Visual Theme Mode
              </h3>
              <p className="text-sm text-siftrix-muted-dark">
                Switch between the signature Luxury Champagne Gold palette, Obsidian Dark mode, or match your device system settings.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(
                [
                  { id: 'light', label: '☀️ Champagne Light', desc: 'Warm cream & champagne gold' },
                  { id: 'dark', label: '🌙 Obsidian Dark', desc: 'High-contrast charcoal & gold' },
                  { id: 'system', label: '💻 System Match', desc: 'Follows OS appearance' },
                ] as const
              ).map((mode) => {
                const isActive = themeMode === mode.id
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => onSelectTheme?.(mode.id)}
                    aria-pressed={isActive}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold ${
                      isActive
                        ? 'border-siftrix-gold bg-siftrix-pearl font-bold text-siftrix-charcoal shadow-xs'
                        : 'border-siftrix-border bg-white text-siftrix-graphite hover:border-siftrix-gold/70'
                    }`}
                  >
                    <p className="text-sm font-semibold">{mode.label}</p>
                    <p className="text-xs text-siftrix-muted-dark mt-0.5">{mode.desc}</p>
                  </button>
                )
              })}
            </div>
          </article>

          {/* Optional Audio Feedback Card */}
          <article
            aria-label="Audio Feedback"
            className="siftrix-card p-6 md:p-8 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-siftrix-charcoal">
                Optional Audio Feedback
              </h3>
              <p className="text-sm text-siftrix-muted-dark">
                Play a restrained completion tone only when a threat scan finishes. Off by default with no background music or routine click sounds.
              </p>
            </div>

            <button
              type="button"
              aria-pressed={soundPreference === 'on'}
              onClick={() => onToggleSound?.()}
              className={`px-4 py-2 rounded-xl text-xs font-semibold shrink-0 self-start sm:self-center cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold ${
                soundPreference === 'on'
                  ? 'siftrix-btn-gold'
                  : 'siftrix-btn-light-neutral'
              }`}
            >
              {soundPreference === 'on' ? 'Completion Chime: On' : 'Completion Chime: Off'}
            </button>
          </article>

          {/* Reset Preferences Card */}
          <article
            aria-label="Reset Preferences"
            className="siftrix-card p-6 md:p-8 rounded-2xl space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-siftrix-charcoal">
                  Reset Preferences
                </h3>
                <p className="text-sm text-siftrix-muted-dark">
                  Restore the default display preference ({defaultOptionLabel}) without clearing unrelated browser storage or scan history.
                </p>
              </div>

              {!isConfirmingReset ? (
                <button
                  type="button"
                  onClick={onRequestReset}
                  className="px-4 py-2 rounded-xl siftrix-btn-light-neutral text-sm font-semibold shrink-0 self-start sm:self-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold"
                >
                  Reset Preferences
                </button>
              ) : null}
            </div>

            {isConfirmingReset ? (
              <div
                role="region"
                aria-label="Confirm preference reset"
                className="p-4 rounded-xl bg-[#FAF4E8] border border-siftrix-gold/65 space-y-3"
              >
                <p className="text-sm font-medium text-siftrix-charcoal">
                  Reset display language preference back to {defaultOptionLabel}?
                </p>
                <p className="text-xs text-siftrix-muted-dark">
                  This updates the SIFTRIX display preference in localStorage immediately and leaves all other browser data untouched.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={onConfirmReset}
                    className="siftrix-btn-charcoal px-4 py-2 rounded-xl text-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-siftrix-gold"
                  >
                    Confirm Reset
                  </button>
                  <button
                    type="button"
                    onClick={onCancelReset}
                    className="px-4 py-2 rounded-xl siftrix-btn-secondary text-xs font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </article>
        </div>

        {/* Right / Secondary Column: Diagnostics, App Info, Account Profile */}
        <div className="min-w-0 lg:col-span-5 space-y-6">
          {/* Backend Diagnostics Card (Deep Charcoal Panel) */}
          <article
            aria-label="Backend Diagnostics"
            className="siftrix-card-charcoal p-6 md:p-8 rounded-2xl space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-siftrix-white">
                  Backend Diagnostics
                </h3>
                <p className="text-xs text-[#C8C1B6] mt-0.5 break-words">
                  Live health check against <code className="font-mono text-siftrix-champagne">GET /api/health</code>
                </p>
              </div>

              <span
                role="status"
                aria-live="polite"
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shrink-0 self-start ${
                  diagnosticState.status === 'connected'
                    ? 'bg-emerald-950/75 text-emerald-300 border-emerald-500/45'
                    : diagnosticState.status === 'disconnected'
                      ? 'bg-red-950/75 text-red-300 border-red-500/45'
                      : 'bg-siftrix-charcoal-soft text-siftrix-beige border-[#494750]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`w-2 h-2 rounded-full ${
                    diagnosticState.status === 'connected'
                      ? 'bg-emerald-400'
                      : diagnosticState.status === 'disconnected'
                        ? 'bg-red-400'
                        : 'bg-[#ACA69E] animate-pulse'
                  }`}
                />
                {diagnosticState.status === 'connected'
                  ? 'Connected'
                  : diagnosticState.status === 'disconnected'
                    ? 'Disconnected / Unavailable'
                    : 'Checking...'}
              </span>
            </div>

            {diagnosticState.status === 'checking' ? (
              <div className="p-4 rounded-xl siftrix-panel-charcoal-inset text-sm text-[#C8C1B6]">
                Checking connectivity to the configured backend server...
              </div>
            ) : null}

            {diagnosticState.status === 'connected' ? (
              <div className="p-4 rounded-xl bg-emerald-950/55 border border-emerald-500/40 space-y-1 text-sm text-emerald-100">
                <p className="font-semibold">Backend health endpoint responded successfully.</p>
                {diagnosticState.backendReportedStatus ? (
                  <p className="text-xs text-emerald-200">
                    Reported status:{' '}
                    <code className="font-mono font-semibold">
                      {diagnosticState.backendReportedStatus}
                    </code>
                  </p>
                ) : null}
              </div>
            ) : null}

            {diagnosticState.status === 'disconnected' ? (
              <div
                role="alert"
                className="p-4 rounded-xl bg-red-950/55 border border-red-500/45 space-y-1.5 text-sm text-red-100"
              >
                <p className="font-semibold">
                  Backend server could not be reached or reported an error.
                </p>
                {diagnosticState.errorMessage ? (
                  <p className="text-xs text-red-200 break-words">
                    {diagnosticState.errorMessage}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <p className="text-xs text-[#ACA69E]">
                Last checked:{' '}
                <span className="font-medium text-siftrix-pearl">
                  {diagnosticState.lastCheckedAt
                    ? formatTimestamp(diagnosticState.lastCheckedAt)
                    : isCheckingHealth
                      ? 'Checking now...'
                      : 'Not checked yet'}
                </span>
              </p>

              <button
                type="button"
                disabled={isCheckingHealth}
                onClick={onCheckAgain}
                className="px-4 py-2 rounded-xl siftrix-btn-charcoal-outline disabled:opacity-60 disabled:cursor-not-allowed text-xs font-semibold cursor-pointer self-start sm:self-center focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-champagne"
              >
                {isCheckingHealth ? 'Checking...' : 'Check Again'}
              </button>
            </div>
          </article>

          {/* Application Information Card */}
          <article
            aria-label="Application Information"
            className="siftrix-card p-6 md:p-8 rounded-2xl space-y-4"
          >
            <h3 className="text-lg font-bold text-siftrix-charcoal">
              Application Information
            </h3>

            <dl className="space-y-3">
              <div className="p-3.5 rounded-xl siftrix-panel-inset flex flex-col gap-1">
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-siftrix-antique-ink">
                  Application Name
                </dt>
                <dd className="text-sm font-bold text-siftrix-charcoal">SIFTRIX</dd>
              </div>

              <div className="p-3.5 rounded-xl siftrix-panel-inset flex flex-col gap-1">
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-siftrix-antique-ink">
                  API Base URL
                </dt>
                <dd className="font-mono text-xs text-siftrix-charcoal break-all">
                  {API_CONFIG.BASE_URL}
                </dd>
              </div>

              <div className="p-3.5 rounded-xl siftrix-panel-inset flex flex-col gap-1">
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-siftrix-antique-ink">
                  API Timeout
                </dt>
                <dd className="text-sm font-medium text-siftrix-charcoal siftrix-tabular">
                  {timeoutSeconds} seconds ({API_CONFIG.TIMEOUT_MS} ms)
                </dd>
              </div>
            </dl>
          </article>

          {/* Account Profile Card (Sand Taupe Warm Contrast Panel) */}
          <article
            aria-label="Account Profile"
            className="bg-siftrix-sand/75 border border-siftrix-border p-5 sm:p-6 md:p-8 rounded-2xl space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-siftrix-charcoal">
                Account Profile
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-siftrix-charcoal text-siftrix-champagne border border-siftrix-charcoal-border whitespace-nowrap shrink-0">
                {authSession ? 'UI Preview' : 'Not Configured'}
              </span>
            </div>

            {authSession ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-siftrix-pearl border border-siftrix-border space-y-1">
                  <p className="text-sm font-bold text-siftrix-charcoal">
                    {authSession.name}
                  </p>
                  <p className="font-mono text-xs text-siftrix-muted-dark break-all">
                    {authSession.email}
                  </p>
                </div>
                <p className="text-xs sm:text-sm text-[#494641] leading-relaxed">
                  Showing a frontend-only authentication preview session. Real backend user accounts and tokens are pending integration.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    clearAuthPreviewSession()
                    onSignOut?.()
                  }}
                  className="px-4 py-2 rounded-xl border border-red-300 bg-red-50 text-red-800 hover:bg-red-100 text-xs font-semibold cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  Sign Out (Clear Preview)
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-[#494641] leading-relaxed">
                  Account authentication and user profile management are not currently configured. SIFTRIX scans and history operate without a signed-in account, and display preferences on this page are stored only in your local browser.
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <a
                    href="/login"
                    onClick={(e) => handleSpaLinkClick(e, onNavigate, '/login')}
                    className="siftrix-btn-charcoal px-4 py-2 rounded-xl text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold"
                  >
                    Sign In
                  </a>
                  <a
                    href="/signup"
                    onClick={(e) => handleSpaLinkClick(e, onNavigate, '/signup')}
                    className="siftrix-btn-secondary px-4 py-2 rounded-xl text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold"
                  >
                    Create Account
                  </a>
                </div>
              </div>
            )}
          </article>
        </div>
      </div>
    </section>
  )
}

/**
 * Profile & Settings page component managing persisted display preferences,
 * genuine frontend configuration display, and live backend health checks.
 */
export default function SettingsPage({
  onNavigate,
  authSession = null,
  onSignOut,
}: SettingsPageProps) {
  const [languagePreference, setLanguagePreference] = useState<LanguageView>(
    () => loadLanguagePreference()
  )
  const [soundPreference, setSoundPreference] = useState<SoundPreference>(
    () => loadSoundPreference()
  )
  const [themeMode, setThemeMode] = useState<ThemeMode>(() =>
    getStoredThemePreference()
  )
  const [preferenceNotice, setPreferenceNotice] = useState<{
    text: string
    isWarning: boolean
  } | null>(null)
  const [isConfirmingReset, setIsConfirmingReset] = useState(false)
  const [diagnosticState, setDiagnosticState] = useState<BackendDiagnosticState>(
    {
      status: 'checking',
    }
  )

  const checkSeqRef = useRef(0)

  const executeHealthCheck = useCallback(async (seq: number) => {
    const response = await checkBackendHealth()
    if (checkSeqRef.current !== seq) {
      return
    }
    setDiagnosticState(
      resolveBackendHealthState(response, new Date().toISOString())
    )
  }, [])

  useEffect(() => {
    const seq = checkSeqRef.current + 1
    checkSeqRef.current = seq
    void executeHealthCheck(seq)

    return () => {
      checkSeqRef.current += 1
    }
  }, [executeHealthCheck])

  const handleSelectLanguage = (nextPreference: LanguageView) => {
    setLanguagePreference(nextPreference)
    setIsConfirmingReset(false)

    const saved = saveLanguagePreference(nextPreference)
    const optionLabel =
      LANGUAGE_PREFERENCE_OPTIONS.find(
        (option) => option.value === nextPreference
      )?.label || nextPreference

    setPreferenceNotice(
      saved
        ? {
            text: `Saved default display preference: ${optionLabel}.`,
            isWarning: false,
          }
        : {
            text: `Applied ${optionLabel} for this session (browser storage is unavailable).`,
            isWarning: true,
          }
    )
  }

  const handleToggleSound = () => {
    const nextSound: SoundPreference = soundPreference === 'on' ? 'off' : 'on'
    setSoundPreference(nextSound)
    const saved = saveSoundPreference(nextSound)
    setPreferenceNotice(
      saved
        ? {
            text:
              nextSound === 'on'
                ? 'Enabled restrained completion chime for finished scans.'
                : 'Disabled completion audio chimes.',
            isWarning: false,
          }
        : {
            text: 'Updated audio cue for this session (browser storage is unavailable).',
            isWarning: true,
          }
    )
  }

  const handleSelectTheme = (nextTheme: ThemeMode) => {
    setThemeMode(nextTheme)
    setThemePreference(nextTheme)
    setPreferenceNotice({
      text: `Applied visual theme: ${nextTheme === 'light' ? 'Champagne Light' : nextTheme === 'dark' ? 'Obsidian Dark' : 'System Match'}.`,
      isWarning: false,
    })
  }

  const handleConfirmReset = () => {
    const { value, persisted } = resetLanguagePreference()
    setLanguagePreference(value)
    setIsConfirmingReset(false)

    setPreferenceNotice(
      persisted
        ? {
            text: 'Display preferences restored to Both English & Urdu.',
            isWarning: false,
          }
        : {
            text: 'Display preferences restored to Both English & Urdu for this session (browser storage is unavailable).',
            isWarning: true,
          }
    )
  }

  const handleCheckAgain = () => {
    if (diagnosticState.status === 'checking') {
      return
    }
    const seq = checkSeqRef.current + 1
    checkSeqRef.current = seq
    setDiagnosticState((prev) => ({
      status: 'checking',
      lastCheckedAt: prev.lastCheckedAt,
    }))
    void executeHealthCheck(seq)
  }

  return (
    <SettingsContent
      languagePreference={languagePreference}
      soundPreference={soundPreference}
      themeMode={themeMode}
      onSelectTheme={handleSelectTheme}
      preferenceNotice={preferenceNotice}
      isConfirmingReset={isConfirmingReset}
      diagnosticState={diagnosticState}
      authSession={authSession}
      onSignOut={onSignOut}
      onSelectLanguage={handleSelectLanguage}
      onToggleSound={handleToggleSound}
      onRequestReset={() => setIsConfirmingReset(true)}
      onCancelReset={() => setIsConfirmingReset(false)}
      onConfirmReset={handleConfirmReset}
      onCheckAgain={handleCheckAgain}
      onNavigate={onNavigate}
    />
  )
}
