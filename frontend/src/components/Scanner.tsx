import { useState } from 'react'
import {
  isValidScanResponse,
  submitScan,
  type ScanResponse,
} from '../services/api'
import {
  detectScannerTargetType,
  ILLUSTRATIVE_SAMPLE_REPORT,
  MAX_SCAN_CONTENT_CHARS,
  resolveScanSubmission,
  SCAN_CHANNEL_OPTIONS,
  SCAN_MODE_OPTIONS,
  SCAN_PIPELINE_STAGES,
  SCANNER_SAMPLES,
  type ScanChannel,
  type ScannerInputMode,
} from '../utils/scannerConfig'
import { playScanCompletionChime } from '../utils/soundEffects'
import {
  LANGUAGE_PREFERENCE_OPTIONS,
  loadLanguagePreference,
  type LanguageView,
} from '../utils/userPreferences'
import SampleReportPreview from './SampleReportPreview'
import ScanResultCard from './ScanResultCard'

export default function Scanner() {
  const [inputText, setInputText] = useState('')
  const [scanMode, setScanMode] = useState<ScannerInputMode>('auto')
  const [channel, setChannel] = useState<ScanChannel>('web-scanner')
  const [senderHint, setSenderHint] = useState('')
  const [languageView, setLanguageView] = useState<LanguageView>(() =>
    loadLanguagePreference()
  )
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [showSamplePreview, setShowSamplePreview] = useState(false)

  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null)
  const [activeRequestMode, setActiveRequestMode] =
    useState<ScannerInputMode>('auto')

  const detected = detectScannerTargetType(inputText, scanMode)
  const activeModeMeta =
    SCAN_MODE_OPTIONS.find((item) => item.id === scanMode) ?? SCAN_MODE_OPTIONS[0]

  const hasCustomConfig =
    channel !== 'web-scanner' || senderHint.trim().length > 0

  const applySample = (sample: (typeof SCANNER_SAMPLES)[number]) => {
    setInputText(sample.content)
    setScanMode(sample.mode)
    setChannel(sample.channel)
    setSenderHint(sample.senderHint)
    setMessage('')
    setIsError(false)
    setScanResult(null)
  }

  const handleClear = () => {
    setInputText('')
    setMessage('')
    setIsError(false)
    setScanResult(null)
  }

  const handleAnalyze = async () => {
    if (isAnalyzing) return

    const prepared = resolveScanSubmission(inputText, {
      mode: scanMode,
      channel,
      senderHint,
      languageView,
    })

    if (!prepared.ok) {
      setIsError(true)
      setMessage(prepared.error)
      setScanResult(null)
      return
    }

    setMessage('')
    setIsError(false)
    setScanResult(null)
    setShowSamplePreview(false)
    setActiveRequestMode(scanMode)
    setIsAnalyzing(true)

    try {
      const response = await submitScan(prepared.request)

      if (!response.ok) {
        setIsError(true)
        setMessage(
          response.error || 'Unable to complete threat analysis. Please try again.'
        )
        return
      }

      if (!isValidScanResponse(response.data)) {
        setIsError(true)
        setMessage('Received an incomplete or unexpected response from the backend server.')
        return
      }

      setScanResult(response.data)
      playScanCompletionChime(response.data.verdict)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <section
      id="scan"
      className="relative px-4 sm:px-6 md:px-10 py-14 md:py-20 bg-gradient-to-b from-siftrix-pearl via-[#F4EFE5] to-siftrix-beige border-b border-siftrix-border"
    >
      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="text-center max-w-2xl mx-auto">
          <p className="inline-flex items-center gap-2 rounded-full border border-siftrix-gold/50 bg-siftrix-white shadow-2xs px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-siftrix-graphite mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-siftrix-gold" aria-hidden="true" />
            Threat Command Console
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-siftrix-charcoal tracking-tight">
            Check Before You{' '}
            <span className="font-editorial italic font-bold siftrix-gold-text-on-light pr-1">
              Click
            </span>
          </h2>
          <p className="text-siftrix-muted-dark mt-3 text-sm sm:text-base">
            Analyze suspicious links, chat messages, or emails with SIFTRIX&apos;s
            multi-agent security orchestrator.
          </p>
        </div>

        <div className="relative mt-9">
          <div className="relative overflow-hidden siftrix-scanner-surface p-4 sm:p-7 md:p-8 rounded-2xl">
            {/* Refined Champagne-Gold Top Trim */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-siftrix-charcoal via-siftrix-gold to-siftrix-charcoal"
            />

            {/* Animated Scanning Sweep Beam (Only while real request is in flight) */}
            {isAnalyzing ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-4 top-0 h-16 animate-siftrix-scan bg-gradient-to-b from-transparent via-siftrix-champagne/22 to-transparent z-20"
              >
                <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-siftrix-champagne to-transparent" />
              </div>
            ) : null}

            {/* Mode Tabs + Config / Sample Actions on Pearl Surface */}
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 mb-5 border-b border-siftrix-border">
              <div>
                <div
                  role="group"
                  aria-label="Scan target mode"
                  className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-siftrix-border bg-siftrix-pearl p-1"
                >
                  {SCAN_MODE_OPTIONS.map((option) => {
                    const isActive = scanMode === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={isAnalyzing}
                        aria-pressed={isActive}
                        onClick={() => {
                          setScanMode(option.id)
                          if (message) {
                            setMessage('')
                            setIsError(false)
                          }
                        }}
                        className={`rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold ${
                          isActive
                            ? 'bg-siftrix-charcoal text-siftrix-champagne border border-siftrix-gold/45 shadow-2xs'
                            : 'text-siftrix-muted-dark hover:text-siftrix-charcoal hover:bg-white/90'
                        }`}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-1.5 text-xs text-siftrix-muted-dark">
                  {activeModeMeta.hint}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isAnalyzing}
                  aria-expanded={isConfigOpen}
                  aria-controls="scanner-advanced-drawer"
                  onClick={() => setIsConfigOpen((prev) => !prev)}
                  className={`siftrix-command-pill inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold ${
                    isConfigOpen || hasCustomConfig
                      ? 'border-siftrix-gold bg-[#FAF4E7] text-siftrix-charcoal'
                      : ''
                  }`}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="h-3.5 w-3.5 text-siftrix-charcoal"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 6h12M4 10h12M4 14h12" />
                    <circle cx="8" cy="6" r="1.5" fill="#C5A15D" stroke="#C5A15D" />
                    <circle cx="13" cy="10" r="1.5" fill="#C5A15D" stroke="#C5A15D" />
                    <circle cx="7" cy="14" r="1.5" fill="#C5A15D" stroke="#C5A15D" />
                  </svg>
                  <span>Advanced Config</span>
                  {hasCustomConfig ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-siftrix-gold" aria-hidden="true" />
                  ) : null}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className={`h-3.5 w-3.5 transition-transform ${
                      isConfigOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 8l4 4 4-4" />
                  </svg>
                </button>

                <button
                  type="button"
                  aria-expanded={showSamplePreview}
                  aria-controls="scanner-sample-preview"
                  onClick={() => setShowSamplePreview((prev) => !prev)}
                  className={`siftrix-command-pill inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold ${
                    showSamplePreview
                      ? 'border-siftrix-gold bg-[#FAF4E7] text-siftrix-charcoal'
                      : ''
                  }`}
                >
                  <span>{showSamplePreview ? 'Hide Sample Report' : 'Preview Sample Report'}</span>
                </button>
              </div>
            </div>

            {/* Advanced Scan Configuration Drawer */}
            {isConfigOpen ? (
              <div
                id="scanner-advanced-drawer"
                className="relative z-10 mb-5 rounded-xl border border-siftrix-border bg-siftrix-pearl p-4 sm:p-5 text-left"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-siftrix-border">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-siftrix-charcoal">
                      Advanced Scan Configuration
                    </h3>
                    <p className="text-xs text-siftrix-muted-dark mt-0.5">
                      Optional metadata attached to your scan request and report display preference.
                    </p>
                  </div>
                  {hasCustomConfig ? (
                    <button
                      type="button"
                      disabled={isAnalyzing}
                      onClick={() => {
                        setChannel('web-scanner')
                        setSenderHint('')
                      }}
                      className="text-xs font-medium text-siftrix-graphite hover:text-siftrix-charcoal underline decoration-siftrix-gold self-start sm:self-auto cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold rounded"
                    >
                      Reset metadata
                    </button>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Source Channel */}
                  <div>
                    <label
                      htmlFor="scanner-channel-select"
                      className="block text-xs font-semibold text-siftrix-graphite mb-1.5"
                    >
                      Source Channel
                    </label>
                    <select
                      id="scanner-channel-select"
                      disabled={isAnalyzing}
                      value={channel}
                      onChange={(e) => setChannel(e.target.value as ScanChannel)}
                      className="w-full rounded-lg border border-siftrix-border bg-white px-3 py-2 text-xs sm:text-sm text-siftrix-graphite outline-none focus:border-siftrix-gold focus:ring-1 focus:ring-siftrix-gold disabled:opacity-60"
                    >
                      {SCAN_CHANNEL_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Optional Sender Hint */}
                  <div>
                    <label
                      htmlFor="scanner-sender-hint"
                      className="block text-xs font-semibold text-siftrix-graphite mb-1.5"
                    >
                      Sender Context <span className="font-normal text-siftrix-muted-dark">(optional)</span>
                    </label>
                    <input
                      id="scanner-sender-hint"
                      type="text"
                      maxLength={255}
                      disabled={isAnalyzing}
                      value={senderHint}
                      onChange={(e) => setSenderHint(e.target.value)}
                      placeholder="e.g., support@domain.xyz or +92..."
                      className="w-full rounded-lg border border-siftrix-border bg-white px-3 py-2 text-xs sm:text-sm text-siftrix-graphite placeholder:text-siftrix-muted outline-none focus:border-siftrix-gold focus:ring-1 focus:ring-siftrix-gold disabled:opacity-60"
                    />
                  </div>

                  {/* Result Language Display Override */}
                  <div>
                    <span className="block text-xs font-semibold text-siftrix-graphite mb-1.5">
                      Report Language View
                    </span>
                    <div
                      role="group"
                      aria-label="Report language preference"
                      className="grid grid-cols-3 gap-1 rounded-lg border border-siftrix-border bg-white p-1"
                    >
                      {LANGUAGE_PREFERENCE_OPTIONS.map((opt) => {
                        const isSelected = languageView === opt.value
                        const shortLabel =
                          opt.value === 'all'
                            ? 'Both'
                            : opt.value === 'en'
                            ? 'EN'
                            : 'اردو'
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => setLanguageView(opt.value)}
                            className={`rounded-md px-2 py-1 text-xs font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-gold ${
                              isSelected
                                ? 'bg-siftrix-charcoal text-siftrix-champagne'
                                : 'text-siftrix-muted-dark hover:text-siftrix-graphite hover:bg-siftrix-pearl'
                            }`}
                          >
                            {shortLabel}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Deep Charcoal Precision Input Terminal Well */}
            <div className="relative z-10 siftrix-card-charcoal rounded-2xl p-4 sm:p-5">
              {/* Quick Samples & Active Target Indicator */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 text-xs md:text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[#C7C0B5] font-medium">Try a sample:</span>
                  {SCANNER_SAMPLES.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      disabled={isAnalyzing}
                      aria-label={sample.ariaLabel}
                      onClick={() => applySample(sample)}
                      className="px-2.5 py-1 rounded-lg bg-[#1B1B20] text-siftrix-pearl border border-siftrix-charcoal-border hover:border-siftrix-champagne/80 hover:text-siftrix-champagne disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-champagne transition-colors cursor-pointer text-xs font-medium"
                    >
                      {sample.label}
                    </button>
                  ))}
                  {inputText ? (
                    <button
                      type="button"
                      disabled={isAnalyzing}
                      aria-label="Clear input text"
                      onClick={handleClear}
                      className="text-xs text-[#BFB8AC] hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded transition-colors cursor-pointer ml-1"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>

                <div aria-live="polite" aria-atomic="true">
                  {detected ? (
                    <span className="font-semibold px-2.5 py-1 rounded-lg bg-[#1B1B20] text-siftrix-pearl border border-siftrix-gold/50 inline-block text-xs">
                      {scanMode === 'auto' ? 'Detected Target: ' : 'Selected Target: '}
                      <span className="text-siftrix-champagne">
                        {detected.displayLabel}
                      </span>
                    </span>
                  ) : (
                    <span className="text-[#AEA79B] text-xs">
                      Detected Target: None
                    </span>
                  )}
                </div>
              </div>

              {/* Charcoal Textarea Console */}
              <textarea
                id="scanner-input"
                aria-label="Suspicious message, email, or URL input"
                aria-describedby={message ? 'scanner-status' : undefined}
                disabled={isAnalyzing}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value)
                  if (message) {
                    setMessage('')
                    setIsError(false)
                  }
                }}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault()
                    if (!isAnalyzing) {
                      void handleAnalyze()
                    }
                  }
                }}
                placeholder={activeModeMeta.placeholder}
                className={`w-full h-40 sm:h-44 bg-[#1B1B20] text-siftrix-pearl placeholder:text-[#968F84] border rounded-xl p-4 outline-none focus:bg-[#17171B] focus:border-siftrix-champagne focus:ring-1 focus:ring-siftrix-champagne/65 disabled:opacity-65 disabled:text-[#A9A297] resize-none transition-colors ${
                  isAnalyzing
                    ? 'border-siftrix-champagne'
                    : 'border-siftrix-charcoal-border'
                }`}
              />

              <div className="flex flex-wrap justify-between items-center gap-2 text-xs text-[#C2BBB0] mt-2 px-0.5">
                <span>
                  Press{' '}
                  <kbd className="font-mono bg-[#18181C] text-siftrix-champagne px-1.5 py-0.5 rounded border border-siftrix-charcoal-border text-[10px]">
                    Ctrl
                  </kbd>{' '}
                  +{' '}
                  <kbd className="font-mono bg-[#18181C] text-siftrix-champagne px-1.5 py-0.5 rounded border border-siftrix-charcoal-border text-[10px]">
                    Enter
                  </kbd>{' '}
                  to analyze
                </span>
                <span className="siftrix-tabular">
                  {inputText.length.toLocaleString()} / {MAX_SCAN_CONTENT_CHARS.toLocaleString()} characters
                </span>
              </div>
            </div>

            {/* Honest Animated Multi-Agent Orchestration Stages (Only while real request is in flight) */}
            {isAnalyzing ? (
              <div
                role="status"
                aria-live="polite"
                className="relative z-10 mt-5 rounded-xl border border-siftrix-gold/40 bg-siftrix-pearl p-4 text-left"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-siftrix-border">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-siftrix-charcoal">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full bg-siftrix-gold animate-siftrix-pulse-slow"
                    />
                    <span>Live Backend Analysis Requested ({activeRequestMode.toUpperCase()})</span>
                  </div>
                  <span className="text-[11px] font-medium text-siftrix-muted-dark">
                    Awaiting POST /api/scan response
                  </span>
                </div>

                <ol className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {SCAN_PIPELINE_STAGES.map((stage) => {
                    const isDispatched = stage.id === 'validate'
                    const isOrchestrating = stage.id === 'agents'
                    return (
                      <li
                        key={stage.id}
                        className={`rounded-xl border p-3 ${
                          isDispatched
                            ? 'border-emerald-200 bg-emerald-50'
                            : isOrchestrating
                            ? 'border-siftrix-champagne bg-siftrix-charcoal text-siftrix-white shadow-xs'
                            : 'border-siftrix-border bg-white/90'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span
                            className={`text-[11px] font-bold tracking-wider siftrix-tabular ${
                              isOrchestrating ? 'text-siftrix-champagne' : 'text-siftrix-muted-dark'
                            }`}
                          >
                            STAGE {stage.step}
                          </span>
                          <span
                            className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                              isDispatched
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : isOrchestrating
                                ? 'bg-siftrix-champagne text-siftrix-charcoal animate-siftrix-pulse-slow'
                                : 'bg-siftrix-sand text-siftrix-graphite border border-siftrix-border'
                            }`}
                          >
                            {isDispatched
                              ? 'Completed'
                              : isOrchestrating
                              ? 'In Progress'
                              : 'Pending'}
                          </span>
                        </div>
                        <p
                          className={`text-xs font-semibold ${
                            isOrchestrating ? 'text-siftrix-white' : 'text-siftrix-graphite'
                          }`}
                        >
                          {stage.title}
                        </p>
                        <p
                          className={`text-[11px] mt-1 leading-relaxed ${
                            isOrchestrating ? 'text-[#C8C1B6]' : 'text-siftrix-muted-dark'
                          }`}
                        >
                          {stage.detail}
                        </p>
                      </li>
                    )
                  })}
                </ol>
              </div>
            ) : null}

            {/* Validation / Backend Error Banner */}
            {message ? (
              <div
                id="scanner-status"
                role={isError ? 'alert' : 'status'}
                aria-live="polite"
                className={`relative z-10 mt-4 text-sm font-medium rounded-xl px-4 py-3 text-left ${
                  isError
                    ? 'bg-red-50 border border-red-200 text-red-800'
                    : 'bg-siftrix-pearl border border-siftrix-border text-siftrix-graphite'
                }`}
              >
                {message}
              </div>
            ) : null}

            {/* Rich Champagne Gold Primary CTA */}
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={() => void handleAnalyze()}
              aria-busy={isAnalyzing}
              aria-label={isAnalyzing ? 'Analyzing threat patterns' : 'Analyze input with AI'}
              className="relative z-10 w-full mt-5 siftrix-btn-gold disabled:opacity-75 disabled:cursor-not-allowed py-3.5 rounded-xl cursor-pointer flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:ring-siftrix-charcoal"
            >
              {isAnalyzing ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-siftrix-charcoal"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  <span>Analyzing Threat Patterns...</span>
                </>
              ) : (
                'Analyze with AI'
              )}
            </button>
          </div>
        </div>

        {/* Live Screen-Reader Status Announcement for Completed Scan */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {scanResult
            ? `Threat analysis complete. Verdict: ${scanResult.verdict}. Risk score: ${Math.round(
                scanResult.overall_risk_score
              )} out of 100. Risk level: ${scanResult.risk_level}.`
            : ''}
        </div>

        {/* Real Backend Scan Results */}
        {scanResult ? (
          <ScanResultCard
            key={`${scanResult.id}-${languageView}`}
            result={scanResult}
            defaultLanguageView={languageView}
          />
        ) : null}

        {/* Upgraded Illustrative Static Sample Report Preview */}
        {showSamplePreview ? (
          <SampleReportPreview
            report={ILLUSTRATIVE_SAMPLE_REPORT}
            languageView={languageView}
            onLanguageViewChange={setLanguageView}
            onClose={() => setShowSamplePreview(false)}
          />
        ) : null}
      </div>
    </section>
  )
}
