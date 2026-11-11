import { useCallback, useEffect, useRef, useState } from 'react'
import { checkBackendHealth } from '../services/api'
import { API_CONFIG } from '../services/config'
import { formatTimestamp } from '../utils/scanPresentation'
import { handleSpaLinkClick, type NavigateFn } from '../utils/router'
import {
  resolveBackendHealthState,
  type BackendDiagnosticState,
} from '../utils/settingsDiagnostics'
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
}

interface SettingsContentProps {
  languagePreference: LanguageView
  preferenceNotice: { text: string; isWarning: boolean } | null
  isConfirmingReset: boolean
  diagnosticState: BackendDiagnosticState
  onSelectLanguage: (value: LanguageView) => void
  onRequestReset: () => void
  onCancelReset: () => void
  onConfirmReset: () => void
  onCheckAgain: () => void
  onNavigate: NavigateFn
}

/**
 * Pure presentation body for Profile & Settings covering display preferences,
 * genuine app config metadata, backend diagnostics, profile status, and reset confirmation.
 */
export function SettingsContent({
  languagePreference,
  preferenceNotice,
  isConfirmingReset,
  diagnosticState,
  onSelectLanguage,
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
      className="px-6 md:px-10 py-10 md:py-14 max-w-6xl mx-auto space-y-6"
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-siftrix-lavender">
            Preferences & Diagnostics
          </p>
          <h2 className="text-3xl font-bold text-siftrix-soft mt-1">
            Profile & Settings
          </h2>
          <p className="text-siftrix-lavender/90 text-sm md:text-base mt-1">
            Manage analysis display preferences, review frontend configuration, and inspect backend diagnostics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/scans"
            onClick={(e) => handleSpaLinkClick(e, onNavigate, '/scans')}
            className="px-4 py-2 rounded-lg siftrix-btn-dark-secondary text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric"
          >
            Scan History
          </a>

          <a
            href="/dashboard"
            onClick={(e) => handleSpaLinkClick(e, onNavigate, '/dashboard')}
            className="siftrix-btn-primary px-5 py-2 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-siftrix-navy focus-visible:ring-siftrix-electric"
          >
            Back to Dashboard
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Primary Column: Display Preferences & Reset */}
        <div className="lg:col-span-7 space-y-6">
          {/* Display Preferences Card */}
          <article
            aria-label="Display Preferences"
            className="siftrix-card-3d p-6 md:p-8 rounded-2xl space-y-5"
          >
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-siftrix-navy">
                Display Preferences
              </h3>
              <p className="text-sm text-siftrix-royal">
                Choose the default language view used when opening scan results in the threat scanner and scan details pages.
              </p>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-wide text-siftrix-royal mb-2">
                Default Analysis Language View
              </legend>

              {LANGUAGE_PREFERENCE_OPTIONS.map((option) => {
                const isSelected = languagePreference === option.value
                return (
                  <label
                    key={option.value}
                    htmlFor={`lang-pref-${option.value}`}
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-siftrix-electric/20 border-siftrix-electric shadow-[0_0_16px_rgba(139,109,255,0.22)]'
                        : 'siftrix-panel-inset hover:border-siftrix-electric'
                    }`}
                  >
                    <input
                      id={`lang-pref-${option.value}`}
                      type="radio"
                      name="language-preference"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => onSelectLanguage(option.value)}
                      className="mt-1 h-4 w-4 accent-siftrix-electric cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric"
                    />
                    <div className="space-y-0.5 min-w-0">
                      <span className="block text-sm font-bold text-siftrix-navy">
                        {option.label}
                      </span>
                      <span className="block text-xs text-siftrix-royal leading-relaxed">
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
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {preferenceNotice.text}
                </p>
              ) : (
                <p className="text-xs text-siftrix-royal">
                  Preferences are saved locally in this browser and persist across page refreshes.
                </p>
              )}
            </div>
          </article>

          {/* Reset Preferences Card */}
          <article
            aria-label="Reset Preferences"
            className="siftrix-card-3d p-6 md:p-8 rounded-2xl space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-siftrix-navy">
                  Reset Preferences
                </h3>
                <p className="text-sm text-siftrix-royal">
                  Restore the default display preference ({defaultOptionLabel}) without clearing unrelated browser storage or scan history.
                </p>
              </div>

              {!isConfirmingReset ? (
                <button
                  type="button"
                  onClick={onRequestReset}
                  className="px-4 py-2 rounded-lg siftrix-btn-light-neutral text-sm font-semibold shrink-0 self-start sm:self-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric"
                >
                  Reset Preferences
                </button>
              ) : null}
            </div>

            {isConfirmingReset ? (
              <div
                role="region"
                aria-label="Confirm preference reset"
                className="p-4 rounded-xl bg-siftrix-lavender/30 border border-amber-300 space-y-3"
              >
                <p className="text-sm font-medium text-siftrix-navy">
                  Reset display language preference back to {defaultOptionLabel}?
                </p>
                <p className="text-xs text-siftrix-royal">
                  This updates the SIFTRIX display preference in localStorage immediately and leaves all other browser data untouched.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={onConfirmReset}
                    className="siftrix-btn-primary px-4 py-2 rounded-lg text-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-siftrix-electric"
                  >
                    Confirm Reset
                  </button>
                  <button
                    type="button"
                    onClick={onCancelReset}
                    className="px-4 py-2 rounded-lg siftrix-btn-light-neutral text-xs font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </article>
        </div>

        {/* Right / Secondary Column: Diagnostics, App Info, Account Profile */}
        <div className="lg:col-span-5 space-y-6">
          {/* Backend Diagnostics Card */}
          <article
            aria-label="Backend Diagnostics"
            className="siftrix-card-3d p-6 md:p-8 rounded-2xl space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-siftrix-navy">
                  Backend Diagnostics
                </h3>
                <p className="text-xs text-siftrix-royal mt-0.5 break-words">
                  Live health check against <code className="font-mono">GET /api/health</code>
                </p>
              </div>

              <span
                role="status"
                aria-live="polite"
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shrink-0 self-start ${
                  diagnosticState.status === 'connected'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : diagnosticState.status === 'disconnected'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-siftrix-royal/15 text-siftrix-navy border-siftrix-lavender'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`w-2 h-2 rounded-full ${
                    diagnosticState.status === 'connected'
                      ? 'bg-emerald-600'
                      : diagnosticState.status === 'disconnected'
                        ? 'bg-red-600'
                        : 'bg-siftrix-electric animate-pulse'
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
              <div className="p-4 rounded-xl siftrix-panel-inset text-sm text-siftrix-royal">
                Checking connectivity to the configured backend server...
              </div>
            ) : null}

            {diagnosticState.status === 'connected' ? (
              <div className="p-4 rounded-xl bg-emerald-50/90 border border-emerald-200 space-y-1 text-sm text-emerald-900">
                <p className="font-semibold">Backend health endpoint responded successfully.</p>
                {diagnosticState.backendReportedStatus ? (
                  <p className="text-xs text-emerald-800">
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
                className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-1.5 text-sm text-red-900"
              >
                <p className="font-semibold">
                  Backend server could not be reached or reported an error.
                </p>
                {diagnosticState.errorMessage ? (
                  <p className="text-xs text-red-800 break-words">
                    {diagnosticState.errorMessage}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <p className="text-xs text-siftrix-royal">
                Last checked:{' '}
                <span className="font-medium text-siftrix-navy">
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
                className="px-4 py-2 rounded-lg border border-siftrix-royal text-siftrix-navy hover:bg-siftrix-royal hover:text-siftrix-soft disabled:opacity-60 disabled:cursor-not-allowed text-xs font-semibold cursor-pointer transition-colors self-start sm:self-center focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric"
              >
                {isCheckingHealth ? 'Checking...' : 'Check Again'}
              </button>
            </div>
          </article>

          {/* Application Information Card */}
          <article
            aria-label="Application Information"
            className="siftrix-card-3d p-6 md:p-8 rounded-2xl space-y-4"
          >
            <h3 className="text-lg font-bold text-siftrix-navy">
              Application Information
            </h3>

            <dl className="space-y-3">
              <div className="p-3.5 rounded-xl siftrix-panel-inset flex flex-col gap-1">
                <dt className="text-xs font-semibold uppercase tracking-wide text-siftrix-royal">
                  Application Name
                </dt>
                <dd className="text-sm font-bold text-siftrix-navy">SIFTRIX</dd>
              </div>

              <div className="p-3.5 rounded-xl siftrix-panel-inset flex flex-col gap-1">
                <dt className="text-xs font-semibold uppercase tracking-wide text-siftrix-royal">
                  API Base URL
                </dt>
                <dd className="font-mono text-xs text-siftrix-navy break-all">
                  {API_CONFIG.BASE_URL}
                </dd>
              </div>

              <div className="p-3.5 rounded-xl siftrix-panel-inset flex flex-col gap-1">
                <dt className="text-xs font-semibold uppercase tracking-wide text-siftrix-royal">
                  API Timeout
                </dt>
                <dd className="text-sm font-medium text-siftrix-navy">
                  {timeoutSeconds} seconds ({API_CONFIG.TIMEOUT_MS} ms)
                </dd>
              </div>
            </dl>
          </article>

          {/* Account Profile Card (honest informational state) */}
          <article
            aria-label="Account Profile"
            className="siftrix-card-3d p-6 md:p-8 rounded-2xl space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-siftrix-navy">
                Account Profile
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-siftrix-royal/15 text-siftrix-navy border border-siftrix-lavender whitespace-nowrap shrink-0">
                Not Configured
              </span>
            </div>

            <p className="text-sm text-siftrix-royal leading-relaxed">
              Account authentication and user profile management are not currently configured. SIFTRIX scans and history operate without a signed-in account, and display preferences on this page are stored only in your local browser.
            </p>
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
export default function SettingsPage({ onNavigate }: SettingsPageProps) {
  const [languagePreference, setLanguagePreference] = useState<LanguageView>(
    () => loadLanguagePreference()
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
      preferenceNotice={preferenceNotice}
      isConfirmingReset={isConfirmingReset}
      diagnosticState={diagnosticState}
      onSelectLanguage={handleSelectLanguage}
      onRequestReset={() => setIsConfirmingReset(true)}
      onCancelReset={() => setIsConfirmingReset(false)}
      onConfirmReset={handleConfirmReset}
      onCheckAgain={handleCheckAgain}
      onNavigate={onNavigate}
    />
  )
}
