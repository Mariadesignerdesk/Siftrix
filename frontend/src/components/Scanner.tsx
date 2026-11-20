import { useState } from 'react'
import {
  isValidScanResponse,
  submitScan,
  type ScanResponse,
} from '../services/api'
import { addXp, type UserGamificationProfile } from '../services/gamificationService'
import { addNotification } from '../services/notificationService'
import XpPopup from './gamification/XpPopup'
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

const SCANNER_AMBIENT_PARTICLES = [
  // Left Gutter Cluster (x: 40 - 280)
  { cx: 60, cy: 160, r: 1.8, opacity: 0.70, delay: '0s', dur: '5.2s' },
  { cx: 110, cy: 260, r: 2.2, opacity: 0.80, delay: '1.2s', dur: '4.8s' },
  { cx: 80, cy: 380, r: 1.6, opacity: 0.65, delay: '2.5s', dur: '6.0s' },
  { cx: 150, cy: 450, r: 2.4, opacity: 0.85, delay: '0.6s', dur: '5.5s' },
  { cx: 50, cy: 540, r: 1.5, opacity: 0.60, delay: '3.1s', dur: '6.4s' },
  { cx: 120, cy: 620, r: 2.0, opacity: 0.75, delay: '1.8s', dur: '5.0s' },
  { cx: 180, cy: 700, r: 1.7, opacity: 0.70, delay: '2.2s', dur: '5.8s' },
  { cx: 90, cy: 780, r: 2.2, opacity: 0.80, delay: '0.9s', dur: '4.6s' },
  { cx: 220, cy: 320, r: 1.4, opacity: 0.60, delay: '1.5s', dur: '6.2s' },
  { cx: 240, cy: 580, r: 1.8, opacity: 0.70, delay: '2.8s', dur: '5.3s' },

  // Right Gutter Cluster (x: 1160 - 1400)
  { cx: 1380, cy: 160, r: 1.8, opacity: 0.70, delay: '0.4s', dur: '5.4s' },
  { cx: 1330, cy: 260, r: 2.2, opacity: 0.80, delay: '1.6s', dur: '4.9s' },
  { cx: 1360, cy: 380, r: 1.6, opacity: 0.65, delay: '2.1s', dur: '6.1s' },
  { cx: 1290, cy: 450, r: 2.4, opacity: 0.85, delay: '0.8s', dur: '5.3s' },
  { cx: 1390, cy: 540, r: 1.5, opacity: 0.60, delay: '3.4s', dur: '6.5s' },
  { cx: 1320, cy: 620, r: 2.0, opacity: 0.75, delay: '1.4s', dur: '5.1s' },
  { cx: 1260, cy: 700, r: 1.7, opacity: 0.70, delay: '2.6s', dur: '5.7s' },
  { cx: 1350, cy: 780, r: 2.2, opacity: 0.80, delay: '0.7s', dur: '4.7s' },
  { cx: 1220, cy: 320, r: 1.4, opacity: 0.60, delay: '1.9s', dur: '6.3s' },
  { cx: 1200, cy: 580, r: 1.8, opacity: 0.70, delay: '3.0s', dur: '5.2s' },

  // Header Zone (y: 60 - 150)
  { cx: 340, cy: 100, r: 2.0, opacity: 0.75, delay: '1.1s', dur: '5.0s' },
  { cx: 480, cy: 70, r: 1.5, opacity: 0.60, delay: '2.4s', dur: '6.2s' },
  { cx: 720, cy: 50, r: 2.5, opacity: 0.85, delay: '0.3s', dur: '4.4s' },
  { cx: 960, cy: 70, r: 1.5, opacity: 0.60, delay: '1.7s', dur: '6.0s' },
  { cx: 1100, cy: 100, r: 2.0, opacity: 0.75, delay: '2.9s', dur: '5.1s' },

  // Footer / Perimeter Zone (y: 780 - 870)
  { cx: 380, cy: 840, r: 1.6, opacity: 0.65, delay: '1.3s', dur: '5.6s' },
  { cx: 560, cy: 860, r: 2.0, opacity: 0.75, delay: '2.7s', dur: '4.8s' },
  { cx: 720, cy: 850, r: 2.4, opacity: 0.80, delay: '0.5s', dur: '5.0s' },
  { cx: 880, cy: 860, r: 2.0, opacity: 0.75, delay: '2.0s', dur: '5.2s' },
  { cx: 1060, cy: 840, r: 1.6, opacity: 0.65, delay: '3.3s', dur: '5.7s' },
] as const

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
  const [xpPopup, setXpPopup] = useState<{
    amount: number
    profile: UserGamificationProfile
    leveledUp: boolean
  } | null>(null)

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
          response.error || 'Scan submission failed. Please ensure the backend server is reachable.'
        )
        setScanResult(null)
        return
      }

      if (!isValidScanResponse(response.data)) {
        setIsError(true)
        setMessage('Received an incomplete or unexpected response from the backend server.')
        setScanResult(null)
        return
      }

      const finalResult = response.data

      setScanResult(finalResult)
      playScanCompletionChime(finalResult.verdict)

      // Award Gamification XP
      const xpAmount = finalResult.verdict === 'malicious' ? 100 : 50
      const xpRes = addXp(xpAmount)
      setXpPopup({
        amount: xpAmount,
        profile: xpRes.profile,
        leveledUp: xpRes.leveledUp,
      })

      // Add to in-app notification center
      addNotification({
        title:
          finalResult.verdict === 'malicious'
            ? 'Malicious Threat Isolated'
            : 'Threat Investigation Completed',
        message: `Analyzed ${finalResult.target_type} (${finalResult.verdict.toUpperCase()}). +${xpAmount} XP awarded.`,
        type: finalResult.verdict === 'malicious' ? 'threat' : 'system',
        link: `/scans/${finalResult.id}`,
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <section
      id="scan"
      className="relative px-4 sm:px-6 md:px-10 py-14 md:py-20 bg-gradient-to-b from-[#FAF7F2] via-[#F5EFE6] to-[#EFE7D8] dark:from-[#FAF7F2] dark:via-[#F5EFE6] dark:to-[#EFE7D8] border-b border-[#D7CFC2] dark:border-[#D7CFC2] overflow-hidden"
      style={{ backgroundColor: '#FAF7F2' }}
    >
      {/* ============================================================== */}
      {/* SIFTRIX SCANNER AMBIENT IVORY + CHAMPAGNE-GOLD BACKGROUND       */}
      {/* Renders identical soft ivory + gold atmosphere in Light & Dark */}
      {/* ============================================================== */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
      >
        {/* Layer 1: Soft Ivory-White Base */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FAF7F2] via-[#F5EFE6] to-[#EFE7D8] dark:from-[#FAF7F2] dark:via-[#F5EFE6] dark:to-[#EFE7D8]" />

        {/* Layer 2: Soft Golden Ambient Glow & Radial Illumination */}
        {/* Prominent Left-Side Luminous Champagne-Gold Aura (Requested visual anchor) */}
        <div
          className="absolute -top-12 -left-20 w-[52rem] h-[56rem] opacity-90 pointer-events-none select-none"
          style={{
            background:
              'radial-gradient(circle 520px at 35% 45%, rgba(216, 181, 109, 0.42) 0%, rgba(232, 204, 142, 0.25) 38%, rgba(197, 161, 93, 0.10) 65%, transparent 80%)',
          }}
        />
        <div
          className="absolute top-1/4 -left-12 w-[36rem] h-[36rem] opacity-80 pointer-events-none select-none"
          style={{
            background:
              'radial-gradient(circle 320px at 30% 50%, rgba(246, 230, 188, 0.55) 0%, rgba(216, 181, 109, 0.32) 45%, transparent 70%)',
          }}
        />

        {/* Right Flank Ambient Warmth */}
        <div
          className="absolute top-1/6 -right-20 w-[46rem] h-[50rem] opacity-80 pointer-events-none select-none"
          style={{
            background:
              'radial-gradient(circle 460px at 68% 50%, rgba(216, 181, 109, 0.32) 0%, rgba(232, 204, 142, 0.18) 40%, rgba(197, 161, 93, 0.07) 65%, transparent 80%)',
          }}
        />

        {/* Center Backlight Radiance Behind Console */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60rem] h-[56rem] opacity-80 pointer-events-none select-none"
          style={{
            background:
              'radial-gradient(ellipse 65% 55% at 50% 50%, rgba(216, 181, 109, 0.28) 0%, rgba(232, 204, 142, 0.12) 50%, transparent 75%)',
          }}
        />

        {/* Top Header Ambient Golden Illumination */}
        <div
          className="absolute inset-x-0 -top-12 h-96 opacity-75 pointer-events-none select-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(216, 181, 109, 0.25) 0%, rgba(232, 204, 142, 0.10) 45%, transparent 80%)',
          }}
        />

        {/* Layer 3: Delicate Cyber Drafting Grid */}
        <div className="absolute inset-0 siftrix-charcoal-grid opacity-15" />

        {/* Layer 4: Elegant Champagne-Gold Flowing Curves, Concentric Hairlines & Glowing Particles */}
        <svg
          viewBox="0 0 1440 900"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full opacity-90"
        >
          <defs>
            {/* Rich Champagne-Gold Gradients */}
            <linearGradient id="scannerGoldGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#C5A15D" stopOpacity="0.15" />
              <stop offset="20%" stopColor="#D8B56D" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#F6E6BC" stopOpacity="1" />
              <stop offset="80%" stopColor="#D8B56D" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#C5A15D" stopOpacity="0.15" />
            </linearGradient>

            <linearGradient id="scannerGoldGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FAF6EF" stopOpacity="0.95" />
              <stop offset="35%" stopColor="#D8B56D" stopOpacity="0.85" />
              <stop offset="70%" stopColor="#C5A15D" stopOpacity="0.80" />
              <stop offset="100%" stopColor="#A77B32" stopOpacity="0.15" />
            </linearGradient>

            <linearGradient id="scannerGutterGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F6E6BC" stopOpacity="0.9" />
              <stop offset="45%" stopColor="#D8B56D" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#A77B32" stopOpacity="0.2" />
            </linearGradient>

            {/* Soft Glow Filter for Trails and Particles */}
            <filter id="scannerSoftGlow" x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur stdDeviation="3.0" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ============================================================== */}
          {/* LEFT GUTTER: LAYERED CURVED HAIRLINE STREAMLINES & NODES       */}
          {/* Visible in the empty left margin outside the console card      */}
          {/* ============================================================== */}
          <g opacity="0.90">
            {/* Concentric Nested Hairline Streamline Cascade */}
            <path
              d="M -30 140 C 110 170, 250 320, 210 480 C 170 640, 290 780, 510 830"
              stroke="url(#scannerGoldGrad1)"
              strokeWidth="2.0"
              fill="none"
            />
            <path
              d="M -30 175 C 130 205, 270 345, 230 505 C 190 660, 310 800, 540 850"
              stroke="rgba(216, 181, 109, 0.78)"
              strokeWidth="1.4"
              fill="none"
            />
            <path
              d="M -30 210 C 150 240, 290 370, 250 530 C 210 680, 330 820, 570 870"
              stroke="rgba(216, 181, 109, 0.65)"
              strokeWidth="1.2"
              fill="none"
            />
            <path
              d="M -30 245 C 170 275, 310 395, 270 555 C 230 700, 350 840, 600 890"
              stroke="rgba(216, 181, 109, 0.52)"
              strokeWidth="1.0"
              fill="none"
            />
            <path
              d="M -30 280 C 190 310, 330 420, 290 580 C 250 720, 370 860, 630 910"
              stroke="rgba(216, 181, 109, 0.40)"
              strokeWidth="0.9"
              fill="none"
            />

            {/* Sweeping Lateral Boundary Curves */}
            <path
              d="M 20 60 Q 280 140 290 440 T 140 820"
              stroke="url(#scannerGoldGrad2)"
              strokeWidth="1.8"
              fill="none"
            />
            <path
              d="M 0 100 Q 240 170 250 460 T 100 850"
              stroke="rgba(216, 181, 109, 0.60)"
              strokeWidth="1.2"
              fill="none"
            />

            {/* Left Defense Telemetry Orbital Node in Left Gutter */}
            <g transform="translate(140, 460)">
              <circle r="3.5" fill="#D8B56D" />
              <circle r="7" stroke="rgba(216, 181, 109, 0.60)" strokeWidth="1" fill="none" />
              <circle r="26" stroke="rgba(216, 181, 109, 0.40)" strokeWidth="1" strokeDasharray="3 4" fill="none" />
              <circle r="52" stroke="rgba(216, 181, 109, 0.25)" strokeWidth="0.8" strokeDasharray="5 7" fill="none" />
            </g>
          </g>

          {/* ============================================================== */}
          {/* RIGHT GUTTER: LAYERED CURVED HAIRLINE STREAMLINES & NODES      */}
          {/* Visible in the empty right margin outside the console card     */}
          {/* ============================================================== */}
          <g opacity="0.90">
            {/* Concentric Nested Hairline Streamline Cascade */}
            <path
              d="M 1470 140 C 1330 170, 1190 320, 1230 480 C 1270 640, 1150 780, 930 830"
              stroke="url(#scannerGoldGrad1)"
              strokeWidth="2.0"
              fill="none"
            />
            <path
              d="M 1470 175 C 1310 205, 1170 345, 1210 505 C 1250 660, 1130 800, 900 850"
              stroke="rgba(216, 181, 109, 0.78)"
              strokeWidth="1.4"
              fill="none"
            />
            <path
              d="M 1470 210 C 1290 240, 1150 370, 1190 530 C 1230 680, 1110 820, 870 870"
              stroke="rgba(216, 181, 109, 0.65)"
              strokeWidth="1.2"
              fill="none"
            />
            <path
              d="M 1470 245 C 1270 275, 1130 395, 1170 555 C 1210 700, 1090 840, 840 890"
              stroke="rgba(216, 181, 109, 0.52)"
              strokeWidth="1.0"
              fill="none"
            />
            <path
              d="M 1470 280 C 1250 310, 1110 420, 1150 580 C 1190 720, 1070 860, 810 910"
              stroke="rgba(216, 181, 109, 0.40)"
              strokeWidth="0.9"
              fill="none"
            />

            {/* Sweeping Lateral Boundary Curves */}
            <path
              d="M 1420 60 Q 1160 140 1150 440 T 1300 820"
              stroke="url(#scannerGoldGrad2)"
              strokeWidth="1.8"
              fill="none"
            />
            <path
              d="M 1440 100 Q 1200 170 1190 460 T 1340 850"
              stroke="rgba(216, 181, 109, 0.60)"
              strokeWidth="1.2"
              fill="none"
            />

            {/* Right Defense Telemetry Orbital Node in Right Gutter */}
            <g transform="translate(1300, 480)">
              <circle r="3.5" fill="#D8B56D" />
              <circle r="7" stroke="rgba(216, 181, 109, 0.60)" strokeWidth="1" fill="none" />
              <circle r="26" stroke="rgba(216, 181, 109, 0.40)" strokeWidth="1" strokeDasharray="3 4" fill="none" />
              <circle r="52" stroke="rgba(216, 181, 109, 0.25)" strokeWidth="0.8" strokeDasharray="5 7" fill="none" />
            </g>
          </g>

          {/* ============================================================== */}
          {/* GRAND CONTINUOUS FLOWING HORIZON RIBBONS                       */}
          {/* Solid continuous golden curves framing header and console      */}
          {/* ============================================================== */}
          <g filter="url(#scannerSoftGlow)">
            {/* Upper Horizon Ribbon across header */}
            <path
              d="M -30 135 Q 380 45 720 105 T 1470 135"
              stroke="url(#scannerGoldGrad1)"
              strokeWidth="2.2"
              fill="none"
            />
            <path
              d="M -30 165 Q 380 75 720 135 T 1470 165"
              stroke="rgba(216, 181, 109, 0.68)"
              strokeWidth="1.3"
              fill="none"
            />

            {/* Mid Sweeping Wave Weaving Behind Console */}
            <path
              d="M -30 330 Q 280 170 540 280 T 960 280 T 1470 330"
              stroke="url(#scannerGoldGrad1)"
              strokeWidth="2.4"
              fill="none"
            />
            <path
              d="M -30 360 Q 280 200 540 310 T 960 310 T 1470 360"
              stroke="rgba(216, 181, 109, 0.62)"
              strokeWidth="1.3"
              fill="none"
            />

            {/* Lower Telemetry Arc framing Console bottom */}
            <path
              d="M -30 725 Q 420 825 720 765 T 1470 725"
              stroke="url(#scannerGoldGrad1)"
              strokeWidth="2.2"
              fill="none"
            />
            <path
              d="M -30 755 Q 420 855 720 795 T 1470 755"
              stroke="rgba(216, 181, 109, 0.58)"
              strokeWidth="1.3"
              fill="none"
            />
          </g>

          {/* Dynamic Luminous Flowing Shimmer Beams (Gliding over continuous curves) */}
          <g filter="url(#scannerSoftGlow)">
            <path
              d="M -30 135 Q 380 45 720 105 T 1470 135"
              stroke="#FAF6EF"
              strokeWidth="2.8"
              fill="none"
              strokeDasharray="140 450"
              className="animate-siftrix-trail-flow"
              opacity="0.95"
            />
            <path
              d="M -30 330 Q 280 170 540 280 T 960 280 T 1470 330"
              stroke="#FAF6EF"
              strokeWidth="3.0"
              fill="none"
              strokeDasharray="160 520"
              className="animate-siftrix-trail-flow"
              style={{ animationDelay: '-3.5s' }}
              opacity="0.95"
            />
            <path
              d="M -30 725 Q 420 825 720 765 T 1470 725"
              stroke="#FAF6EF"
              strokeWidth="2.8"
              fill="none"
              strokeDasharray="140 450"
              className="animate-siftrix-trail-flow"
              style={{ animationDelay: '-1.8s' }}
              opacity="0.95"
            />
            <path
              d="M -30 140 C 110 170, 250 320, 210 480 C 170 640, 290 780, 510 830"
              stroke="#FAF6EF"
              strokeWidth="2.4"
              fill="none"
              strokeDasharray="120 400"
              className="animate-siftrix-trail-flow"
              style={{ animationDelay: '-2.4s' }}
              opacity="0.90"
            />
            <path
              d="M 1470 140 C 1330 170, 1190 320, 1230 480 C 1270 640, 1150 780, 930 830"
              stroke="#FAF6EF"
              strokeWidth="2.4"
              fill="none"
              strokeDasharray="120 400"
              className="animate-siftrix-trail-flow"
              style={{ animationDelay: '-4.6s' }}
              opacity="0.90"
            />
          </g>

          {/* Subtle Golden Glowing Floating Particles (Distributed across gutters & perimeter) */}
          <g>
            {SCANNER_AMBIENT_PARTICLES.map((p, idx) => (
              <circle
                key={idx}
                cx={p.cx}
                cy={p.cy}
                r={p.r}
                fill="#D8B56D"
                opacity={p.opacity}
                className="animate-siftrix-particle-drift"
                style={{
                  animationDelay: p.delay,
                  animationDuration: p.dur,
                }}
              />
            ))}
          </g>
        </svg>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="text-center max-w-2xl mx-auto">
          <p className="inline-flex items-center gap-2 rounded-full border border-siftrix-gold/50 bg-[#FFFFFF] shadow-2xs px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#302E2B] mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-siftrix-gold" aria-hidden="true" />
            Threat Command Console
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#25252A] dark:text-[#25252A] tracking-tight">
            Check Before You{' '}
            <span className="font-editorial italic font-bold siftrix-gold-text-on-light pr-1">
              Click
            </span>
          </h2>
          <p className="text-[#58544E] dark:text-[#58544E] mt-3 text-sm sm:text-base">
            Analyze suspicious links, chat messages, or emails with SIFTRIX&apos;s
            multi-agent security orchestrator.
          </p>
        </div>

        <div className="relative mt-9">
          <div className="relative overflow-hidden siftrix-scanner-surface bg-[#E8D5B5] dark:bg-transparent p-4 sm:p-7 md:p-8 rounded-2xl">
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
                            ? 'bg-siftrix-charcoal text-siftrix-pearl border border-siftrix-gold/45 shadow-2xs dark:bg-siftrix-sand dark:text-siftrix-champagne dark:border-siftrix-gold'
                            : 'text-siftrix-muted-dark hover:text-siftrix-charcoal hover:bg-siftrix-white/90'
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
                      ? 'border-siftrix-gold bg-[#FAF4E7] text-siftrix-charcoal dark:bg-siftrix-sand dark:text-siftrix-champagne'
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
                      ? 'border-siftrix-gold bg-[#FAF4E7] dark:bg-siftrix-sand text-siftrix-charcoal dark:text-siftrix-champagne'
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
                      className="w-full rounded-lg border border-siftrix-border bg-siftrix-white px-3 py-2 text-xs sm:text-sm text-siftrix-graphite outline-none focus:border-siftrix-gold focus:ring-1 focus:ring-siftrix-gold disabled:opacity-60"
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
                      className="w-full rounded-lg border border-siftrix-border dark:border-siftrix-charcoal-border bg-siftrix-white dark:bg-[#1E1E26] px-3 py-2 text-xs sm:text-sm text-siftrix-graphite dark:text-[#FAF6EF] placeholder:text-siftrix-muted dark:placeholder:text-[#8E887E] caret-siftrix-champagne outline-none focus:border-siftrix-gold focus:ring-1 focus:ring-siftrix-gold disabled:opacity-60"
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
                      className="grid grid-cols-3 gap-1 rounded-lg border border-siftrix-border bg-siftrix-pearl p-1"
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
                                ? 'bg-siftrix-charcoal text-siftrix-champagne dark:bg-siftrix-sand'
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
                      className="px-2.5 py-1 rounded-lg bg-[#1B1B20] text-siftrix-pearl dark:text-[#FAF6EF] border border-siftrix-charcoal-border hover:border-siftrix-champagne/80 hover:text-siftrix-champagne disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-champagne transition-colors cursor-pointer text-xs font-medium"
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
                    <span className="font-semibold px-2.5 py-1 rounded-lg bg-[#1B1B20] text-siftrix-pearl dark:text-[#FAF6EF] border border-siftrix-gold/50 inline-block text-xs">
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
                className={`w-full h-40 sm:h-44 bg-[#1B1B20] text-[#FAF6EF] dark:text-[#FAF6EF] caret-siftrix-champagne selection:bg-siftrix-gold/30 selection:text-[#FAF6EF] placeholder:text-[#968F84] dark:placeholder:text-[#9E978C] border rounded-xl p-4 outline-none focus:bg-[#17171B] focus:border-siftrix-champagne focus:ring-1 focus:ring-siftrix-champagne/65 disabled:opacity-65 disabled:text-[#A9A297] resize-none transition-colors ${
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
                            ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40'
                            : isOrchestrating
                            ? 'border-siftrix-champagne bg-siftrix-charcoal text-siftrix-white shadow-xs dark:bg-siftrix-sand dark:text-siftrix-champagne'
                            : 'border-siftrix-border bg-siftrix-white/90'
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
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
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
                    ? 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-300'
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
        {/* Gamification XP Earned Toast */}
        {xpPopup && (
          <XpPopup
            xpEarned={xpPopup.amount}
            profile={xpPopup.profile}
            leveledUp={xpPopup.leveledUp}
            onClose={() => setXpPopup(null)}
          />
        )}
      </div>
    </section>
  )
}
