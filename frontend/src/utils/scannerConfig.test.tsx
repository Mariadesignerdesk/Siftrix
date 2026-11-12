import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import About from '../components/About'
import CommandCenterPreview from '../components/CommandCenterPreview'
import Features from '../components/Features'
import Footer from '../components/Footer'
import Hero from '../components/Hero'
import HowItWorks from '../components/HowItWorks'
import Navbar from '../components/Navbar'
import SampleReportPreview from '../components/SampleReportPreview'
import Scanner from '../components/Scanner'
import ScanResultCard from '../components/ScanResultCard'
import DashboardPage from '../pages/DashboardPage'
import ScanHistoryPage from '../pages/ScanHistoryPage'
import { isValidScanResponse } from '../services/api'
import {
  INTRO_SEEN_STORAGE_KEY,
  markCinematicIntroSeen,
  shouldShowCinematicIntro,
} from './introReveal'
import {
  detectScannerTargetType,
  ILLUSTRATIVE_SAMPLE_REPORT,
  MAX_SCAN_CONTENT_CHARS,
  normalizeUrlForBackend,
  resolveScanSubmission,
  SCAN_MODE_OPTIONS,
  SCAN_PIPELINE_STAGES,
} from './scannerConfig'

describe('Phase 1 scannerConfig utilities and AI Cyber Command Center components', () => {
  it('detects URLs vs text automatically and respects explicit URL, Message, and Email modes', () => {
    expect(detectScannerTargetType('', 'auto')).toBeNull()
    expect(detectScannerTargetType('https://phish-test.example/login', 'auto')).toEqual({
      targetType: 'url',
      displayLabel: 'URL',
    })
    expect(detectScannerTargetType('Please verify your OTP right now', 'auto')).toEqual({
      targetType: 'message',
      displayLabel: 'Message',
    })
    expect(detectScannerTargetType('Subject: Invoice attached', 'email')).toEqual({
      targetType: 'email',
      displayLabel: 'Email',
    })
    expect(detectScannerTargetType('plain text note', 'url')).toEqual({
      targetType: 'url',
      displayLabel: 'URL',
    })
    expect(detectScannerTargetType('https://example.com', 'message')).toEqual({
      targetType: 'message',
      displayLabel: 'Message',
    })
  })

  it('normalizes bare domains to https:// to match backend SSRF scheme requirements', () => {
    expect(normalizeUrlForBackend('example.com/verify')).toBe('https://example.com/verify')
    expect(normalizeUrlForBackend('https://already-secure.example/path')).toBe(
      'https://already-secure.example/path'
    )
    expect(normalizeUrlForBackend('http://legacy.example/login')).toBe(
      'http://legacy.example/login'
    )
    expect(normalizeUrlForBackend('ftp://files.example.com')).toBe('ftp://files.example.com')
  })

  it('validates inputs, enforces 50k limit, rejects invalid URLs, and builds honest UnifiedScanRequest metadata', () => {
    const emptyRes = resolveScanSubmission('   ', {
      mode: 'auto',
      channel: 'web-scanner',
      senderHint: '',
      languageView: 'all',
    })
    expect(emptyRes.ok).toBe(false)

    const tooLongRes = resolveScanSubmission('a'.repeat(MAX_SCAN_CONTENT_CHARS + 1), {
      mode: 'message',
      channel: 'sms',
      senderHint: '',
      languageView: 'all',
    })
    expect(tooLongRes.ok).toBe(false)

    const invalidUrlRes = resolveScanSubmission('ftp://bad-scheme.example', {
      mode: 'url',
      channel: 'web-scanner',
      senderHint: '',
      languageView: 'all',
    })
    expect(invalidUrlRes.ok).toBe(false)

    const localhostUrlRes = resolveScanSubmission('http://localhost:8080/admin', {
      mode: 'url',
      channel: 'web-scanner',
      senderHint: '',
      languageView: 'all',
    })
    expect(localhostUrlRes.ok).toBe(false)

    const bareUrlRes = resolveScanSubmission('chase-update.example/login', {
      mode: 'auto',
      channel: 'whatsapp',
      senderHint: '  ',
      languageView: 'en',
    })
    expect(bareUrlRes).toEqual({
      ok: true,
      effectiveTargetLabel: 'URL',
      request: {
        target_type: 'url',
        content: 'https://chase-update.example/login',
        metadata: {
          source: 'web-scanner',
          selection_mode: 'auto',
          channel: 'whatsapp',
        },
      },
    })

    const emailRes = resolveScanSubmission('Subject: Verify identity\nClick link', {
      mode: 'email',
      channel: 'email',
      senderHint: 'alert@spoofed-bank.xyz',
      languageView: 'ur',
    })
    expect(emailRes).toEqual({
      ok: true,
      effectiveTargetLabel: 'Email',
      request: {
        target_type: 'email',
        content: 'Subject: Verify identity\nClick link',
        metadata: {
          source: 'web-scanner',
          selection_mode: 'email',
          channel: 'email',
          sender_hint: 'alert@spoofed-bank.xyz',
        },
      },
    })
  })

  it('ships a valid bilingual illustrative sample fixture and honest 3-stage pipeline metadata', () => {
    expect(isValidScanResponse(ILLUSTRATIVE_SAMPLE_REPORT)).toBe(true)
    expect(SCAN_MODE_OPTIONS.map((opt) => opt.id)).toEqual([
      'auto',
      'url',
      'message',
      'email',
    ])
    expect(SCAN_PIPELINE_STAGES).toHaveLength(3)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders open floating Hero without enclosing dark container and keeps three real AI agent nodes', () => {
    const heroHtml = renderToStaticMarkup(<Hero />)
    expect(heroHtml).toContain('URL Intelligence')
    expect(heroHtml).toContain('Message Intelligence')
    expect(heroHtml).toContain('Security Advisor')
    expect(heroHtml).toContain('Start Scanning')
    expect(heroHtml).toContain('Explore Features')
    expect(heroHtml).toContain('Security shield illustration')
    expect(heroHtml).toContain('Intelligence. Protection. Confidence.')
    expect(heroHtml).not.toContain('3-Agent AI Command Mesh')
    expect(heroHtml).not.toContain('siftrix-card-charcoal')
  })

  it('renders Scanner with Auto-Detect, URL, Message, Email modes, drawer toggle, and sample report button', () => {
    const scannerHtml = renderToStaticMarkup(<Scanner />)
    expect(scannerHtml).toContain('Auto-Detect')
    expect(scannerHtml).toContain('>URL<')
    expect(scannerHtml).toContain('>Message<')
    expect(scannerHtml).toContain('>Email<')
    expect(scannerHtml).toContain('Sample URL')
    expect(scannerHtml).toContain('Sample Message')
    expect(scannerHtml).toContain('Sample Email')
    expect(scannerHtml).toContain('Advanced Config')
    expect(scannerHtml).toContain('Preview Sample Report')
    expect(scannerHtml).toContain('Analyze with AI')
    // Illustrative preview should start collapsed and no fake live result renders initially
    expect(scannerHtml).not.toContain('Illustrative Sample Format — Static Example')
  })

  it('renders polished Navbar cleanly with active route markers and Get Started CTA', () => {
    const navHtml = renderToStaticMarkup(
      <Navbar currentPage="home" onNavigate={vi.fn()} />
    )
    expect(navHtml).toContain('SIFTRIX')
    expect(navHtml).toContain('AI Command')
    expect(navHtml).toContain('Scan History')
    expect(navHtml).toContain('Get Started')
    expect(navHtml).toContain('aria-current="page"')
  })

  it('honors defaultLanguageView override on ScanResultCard without breaking defaults', () => {
    const urOnlyHtml = renderToStaticMarkup(
      <ScanResultCard result={ILLUSTRATIVE_SAMPLE_REPORT} defaultLanguageView="ur" />
    )
    expect(urOnlyHtml).toContain('مثالی نمونہ:')
    expect(urOnlyHtml).not.toContain('Illustrative format example:')
  })

  it('renders upgraded SampleReportPreview with risk visualization, verdict, 3 agent modules, and illustrative disclaimer', () => {
    const html = renderToStaticMarkup(
      <SampleReportPreview
        report={ILLUSTRATIVE_SAMPLE_REPORT}
        languageView="all"
        onLanguageViewChange={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(html).toContain('Illustrative Sample Report')
    expect(html).toContain('Multi-Agent Threat Intelligence Report')
    expect(html).toContain('aria-valuenow="84"')
    expect(html).toContain('Verdict: Malicious')
    expect(html).toContain('URL Intelligence')
    expect(html).toContain('Message Intelligence')
    expect(html).toContain('Security Advisor')
    expect(html).toContain('Illustrative format example:')
    expect(html).toContain('مثالی نمونہ:')
    expect(html).toContain('Close Preview')
  })

  it('renders dark and light landing sections, navigation footer, and sub-page shells cleanly', () => {
    const nav = vi.fn()
    const featuresHtml = renderToStaticMarkup(<Features />)
    expect(featuresHtml).toContain('Why Choose')
    expect(featuresHtml).toContain('AI Detection')
    expect(featuresHtml).toContain('Threat Analysis')

    const howHtml = renderToStaticMarkup(<HowItWorks onNavigate={nav} />)
    expect(howHtml).toContain('How SIFTRIX')
    expect(howHtml).toContain('Paste Link or Message')
    expect(howHtml).toContain('Multi-Agent Analysis')
    expect(howHtml).toContain('Score &amp; Bilingual Guidance')

    const previewHtml = renderToStaticMarkup(<CommandCenterPreview onNavigate={nav} />)
    expect(previewHtml).toContain('Command Center Preview')
    expect(previewHtml).toContain('Sample Layout Preview')
    expect(previewHtml).toContain('Open Live Dashboard')

    const aboutHtml = renderToStaticMarkup(<About />)
    expect(aboutHtml).toContain('About')
    expect(aboutHtml).toContain('Intelligence. Protection. Confidence.')

    const footerHtml = renderToStaticMarkup(<Footer onNavigate={nav} />)
    expect(footerHtml).toContain('SIFTRIX')
    expect(footerHtml).toContain('Security Dashboard')
    expect(footerHtml).toContain('Scan History')

    const dashHtml = renderToStaticMarkup(<DashboardPage onNavigate={nav} />)
    expect(dashHtml).toContain('Security Dashboard')
    expect(dashHtml).toContain('Checking API...')

    const historyHtml = renderToStaticMarkup(<ScanHistoryPage onNavigate={nav} />)
    expect(historyHtml).toContain('Scan History')
    expect(historyHtml).toContain('value="email"')
  })

  it('gates cinematic intro reveal cleanly across SSR, reduced-motion, non-home routes, and returning visits', () => {
    const store = new Map<string, string>()
    const mockStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
    }

    // Without window (SSR / server environment) it never blocks rendering
    expect(shouldShowCinematicIntro(true, mockStorage, false)).toBe(false)

    vi.stubGlobal('window', {})
    expect(shouldShowCinematicIntro(false, mockStorage, false)).toBe(false)
    expect(shouldShowCinematicIntro(true, mockStorage, true)).toBe(false)
    expect(shouldShowCinematicIntro(true, mockStorage, false)).toBe(true)

    expect(markCinematicIntroSeen(mockStorage)).toBe(true)
    expect(store.get(INTRO_SEEN_STORAGE_KEY)).toBe('1')
    expect(shouldShowCinematicIntro(true, mockStorage, false)).toBe(false)
  })
})
