import { useState } from 'react'
import { looksLikeUrl, isValidUrl } from '../utils/urlValidator'
import {
  submitScan,
  isValidScanResponse,
  type ScanResponse,
  type ScanTargetType,
} from '../services/api'
import ScanResultCard from './ScanResultCard'

export default function Scanner() {
  const [inputText, setInputText] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null)

  // Detect input type in real time
  const detectedType = inputText.trim()
    ? looksLikeUrl(inputText)
      ? 'URL'
      : 'Message'
    : null

  const applySample = (sampleText: string) => {
    setInputText(sampleText)
    setMessage('')
    setIsError(false)
    setScanResult(null)
  }

  const handleAnalyze = async () => {
    if (isAnalyzing) return

    const trimmed = inputText.trim()

    // 1. Empty or spaces check
    if (!trimmed) {
      setIsError(true)
      setMessage('Please enter a message or URL first.')
      setScanResult(null)
      return
    }

    // 2. URL validation
    const isUrl = looksLikeUrl(trimmed)
    if (isUrl && !isValidUrl(trimmed)) {
      setIsError(true)
      setMessage('Invalid URL format. Please enter a valid URL (e.g., https://example.com).')
      setScanResult(null)
      return
    }

    const targetType: ScanTargetType = isUrl ? 'url' : 'message'

    setIsError(false)
    setMessage('')
    setScanResult(null)
    setIsAnalyzing(true)

    try {
      const response = await submitScan({
        target_type: targetType,
        content: trimmed,
        metadata: { source: 'web-scanner' },
      })

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
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <section id="scan" className="relative px-6 md:px-10 py-12 md:py-16 overflow-hidden">
      {/* Subtle Ambient Purple Glow Behind Glass Card */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] max-w-full h-72 rounded-full bg-siftrix-royal/35 blur-3xl pointer-events-none"
      />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-siftrix-soft">
          Check Before You Click
        </h2>

        <p className="text-siftrix-lavender mt-3">
          Paste a suspicious message or URL and let SIFTRIX
          analyze potential online threats.
        </p>

        <div className="relative mt-8">
          {/* Subtle Purple Edge Lighting Aura */}
          <div
            aria-hidden="true"
            className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-siftrix-electric/45 via-siftrix-royal/55 to-siftrix-lavender/35 blur-sm opacity-75 pointer-events-none"
          />

          <div className="relative overflow-hidden siftrix-glass-scanner p-5 md:p-8 rounded-2xl">
            {/* Top Specular Edge Line */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-siftrix-electric to-transparent"
            />

            {/* Animated Scanning Sweep Beam */}
            {isAnalyzing ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-4 top-0 h-16 animate-siftrix-scan bg-gradient-to-b from-transparent via-siftrix-electric/25 to-transparent"
              >
                <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-siftrix-electric to-transparent shadow-[0_0_16px_#8B6DFF]" />
              </div>
            ) : null}

            {/* Quick Samples & Detected Input Type Indicator */}
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 text-xs md:text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-siftrix-lavender font-medium">Try a sample:</span>
                <button
                  type="button"
                  disabled={isAnalyzing}
                  aria-label="Load sample phishing URL"
                  onClick={() => applySample('https://chase-security-update.xyz/login')}
                  className="px-2.5 py-1 rounded-md bg-siftrix-navy/75 text-siftrix-soft border border-siftrix-lavender/35 hover:border-siftrix-electric hover:text-siftrix-lavender disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric transition-colors cursor-pointer text-xs font-medium"
                >
                  Sample URL
                </button>
                <button
                  type="button"
                  disabled={isAnalyzing}
                  aria-label="Load sample urgent message"
                  onClick={() =>
                    applySample(
                      'URGENT: Your bank account has been suspended due to suspicious activity. Please verify your credentials immediately to restore access.'
                    )
                  }
                  className="px-2.5 py-1 rounded-md bg-siftrix-navy/75 text-siftrix-soft border border-siftrix-lavender/35 hover:border-siftrix-electric hover:text-siftrix-lavender disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric transition-colors cursor-pointer text-xs font-medium"
                >
                  Sample Message
                </button>
                {inputText && (
                  <button
                    type="button"
                    disabled={isAnalyzing}
                    aria-label="Clear input text"
                    onClick={() => applySample('')}
                    className="text-xs text-siftrix-lavender/80 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded transition-colors cursor-pointer ml-1"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div aria-live="polite" aria-atomic="true">
                {detectedType ? (
                  <span className="font-semibold px-2.5 py-1 rounded-md bg-siftrix-royal/85 text-siftrix-soft border border-siftrix-electric/60 inline-block shadow-[0_0_12px_rgba(139,109,255,0.25)]">
                    Detected Type: <span className="underline decoration-siftrix-lavender">{detectedType}</span>
                  </span>
                ) : (
                  <span className="text-siftrix-lavender/75 text-xs">
                    Detected Type: None
                  </span>
                )}
              </div>
            </div>

            <div className="relative z-10">
              <textarea
                id="scanner-input"
                aria-label="Suspicious message or URL input"
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
                placeholder="Paste your suspicious message or URL here..."
                className={`w-full h-40 bg-siftrix-navy/80 text-siftrix-soft placeholder:text-siftrix-lavender/55 border rounded-xl p-4 outline-none focus:border-siftrix-electric focus:ring-1 focus:ring-siftrix-electric disabled:bg-siftrix-navy/55 disabled:text-siftrix-lavender/65 resize-none transition-colors ${
                  isAnalyzing
                    ? 'border-siftrix-electric shadow-[0_0_20px_rgba(139,109,255,0.3)]'
                    : 'border-siftrix-lavender/30'
                }`}
              />
              {inputText && (
                <div className="flex justify-between items-center text-xs text-siftrix-lavender/80 mt-1 px-1">
                  <span>
                    Press{' '}
                    <kbd className="font-mono bg-siftrix-royal/80 text-siftrix-soft px-1 py-0.5 rounded border border-siftrix-lavender/35 text-[10px]">
                      Ctrl
                    </kbd>{' '}
                    +{' '}
                    <kbd className="font-mono bg-siftrix-royal/80 text-siftrix-soft px-1 py-0.5 rounded border border-siftrix-lavender/35 text-[10px]">
                      Enter
                    </kbd>{' '}
                    to analyze
                  </span>
                  <span>{inputText.length} characters</span>
                </div>
              )}
            </div>

            {message && (
              <div
                id="scanner-status"
                role={isError ? 'alert' : 'status'}
                aria-live="polite"
                className={`relative z-10 mt-4 text-sm font-medium rounded-xl px-4 py-3 ${
                  isError
                    ? 'bg-red-950/80 border border-red-400/60 text-red-100'
                    : 'bg-siftrix-royal/75 border border-siftrix-electric/50 text-siftrix-soft'
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="button"
              disabled={isAnalyzing}
              onClick={() => void handleAnalyze()}
              aria-busy={isAnalyzing}
              aria-label={isAnalyzing ? 'Analyzing threat patterns' : 'Analyze input with AI'}
              className="relative z-10 w-full mt-5 siftrix-btn-primary disabled:opacity-75 disabled:cursor-not-allowed py-3 rounded-xl cursor-pointer flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-siftrix-navy focus-visible:ring-siftrix-electric"
            >
              {isAnalyzing ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-siftrix-navy"
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
        {scanResult ? <ScanResultCard key={scanResult.id} result={scanResult} /> : null}
      </div>
    </section>
  )
}
