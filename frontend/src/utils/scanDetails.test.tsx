import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { fetchScanById, type ScanResponse } from '../services/api'
import {
  getInitialScanDetailsState,
  getScanDetailsErrorTitle,
  resolveScanDetailsState,
  type ScanDetailsViewState,
} from './scanDetails'
import ScanDetailsPage, { ScanDetailsContent } from '../pages/ScanDetailsPage'

const SAMPLE_SCAN: ScanResponse = {
  id: '44444444-4444-4444-4444-444444444444',
  user_id: null,
  target_type: 'url',
  target_content: 'https://login-security-verify.example/auth/session',
  overall_risk_score: 92,
  verdict: 'malicious',
  risk_level: 'critical',
  summary: {
    en: 'The submitted URL mimics a trusted login portal and triggers high-risk phishing indicators.',
    ur: 'یہ لنک ایک جعلی لاگ ان صفحے کی نقل کرتا ہے اور شدید فشنگ خطرے کی علامات دکھاتا ہے۔',
  },
  recommendations: {
    en: ['Do not enter account credentials on this link.', 'Block the domain at your email gateway.'],
    ur: ['اس لنک پر اپنے اکاؤنٹ کی معلومات درج نہ کریں۔'],
  },
  agent_findings: {
    url_intelligence: {
      status: 'completed',
      domain_age_days: 3,
      suspicious_keywords: ['login', 'verify'],
    },
    message_intelligence: {
      status: 'skipped',
      message: 'Target is a URL without accompanying message text.',
    },
    security_advisor: {
      status: 'completed',
      priority_action: 'Block immediately',
    },
    raw_metadata: {
      scan_pipeline: 'multi-agent-v1',
      tls_issuer: 'Unknown',
    },
  },
  created_at: '2026-11-11T10:15:00Z',
  updated_at: '2026-11-11T10:15:05Z',
}

describe('scanDetails helpers and ScanDetailsPage rendering', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('distinguishes initial loading, 404 not-found, network/server errors, and valid scan payloads', () => {
    expect(getInitialScanDetailsState('   ')).toMatchObject({
      status: 'not_found',
    })
    expect(getInitialScanDetailsState(` ${SAMPLE_SCAN.id} `)).toEqual({
      scanId: SAMPLE_SCAN.id,
      status: 'loading',
    })

    const ready = resolveScanDetailsState(
      { ok: true, status: 200, data: SAMPLE_SCAN, error: null },
      SAMPLE_SCAN.id
    )
    expect(ready).toEqual({
      scanId: SAMPLE_SCAN.id,
      status: 'ready',
      scan: SAMPLE_SCAN,
    })

    const notFound = resolveScanDetailsState(
      { ok: false, status: 404, data: null, error: 'Scan record not found' },
      SAMPLE_SCAN.id
    )
    expect(notFound).toEqual({
      scanId: SAMPLE_SCAN.id,
      status: 'not_found',
      message: 'Scan record not found',
      statusCode: 404,
    })

    const offlineError = resolveScanDetailsState(
      { ok: false, status: 0, data: null, error: 'Unable to reach backend' },
      SAMPLE_SCAN.id
    )
    expect(offlineError).toEqual({
      scanId: SAMPLE_SCAN.id,
      status: 'error',
      title: 'Unable to reach the backend server',
      message: 'Unable to reach backend',
      statusCode: 0,
    })

    const serverError = resolveScanDetailsState(
      { ok: false, status: 500, data: null, error: 'Internal Server Error' },
      SAMPLE_SCAN.id
    )
    expect(serverError.status).toBe('error')
    expect(getScanDetailsErrorTitle(408)).toBe('Scan details request timed out')
    expect(getScanDetailsErrorTitle(422)).toBe('Invalid scan identifier format')
  })

  it('supports retrying a failed fetchScanById call and resolving to ready state', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(SAMPLE_SCAN), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

    const firstAttempt = resolveScanDetailsState(
      await fetchScanById(SAMPLE_SCAN.id),
      SAMPLE_SCAN.id
    )
    expect(firstAttempt.status).toBe('error')

    const retryAttempt = resolveScanDetailsState(
      await fetchScanById(SAMPLE_SCAN.id),
      SAMPLE_SCAN.id
    )
    expect(retryAttempt).toEqual({
      scanId: SAMPLE_SCAN.id,
      status: 'ready',
      scan: SAMPLE_SCAN,
    })
  })

  it('renders loading skeleton state initially and not-found immediately for blank route scan IDs', () => {
    const navigate = vi.fn()

    const loadingHtml = renderToStaticMarkup(
      <ScanDetailsPage scanId={SAMPLE_SCAN.id} onNavigate={navigate} />
    )
    expect(loadingHtml).toContain('Scan Details')
    expect(loadingHtml).toContain('Complete security analysis of the selected scan.')
    expect(loadingHtml).toContain('aria-busy="true"')
    expect(loadingHtml).toContain('href="/scans"')
    expect(loadingHtml).toContain('href="/dashboard"')

    const blankIdHtml = renderToStaticMarkup(
      <ScanDetailsPage scanId="   " onNavigate={navigate} />
    )
    expect(blankIdHtml).toContain('Scan Not Found')
    expect(blankIdHtml).toContain('No scan identifier was provided in the route.')
  })

  it('renders full Scan Overview and reused ScanResultCard sections cleanly in ready state', () => {
    const navigate = vi.fn()
    const readyState: ScanDetailsViewState = {
      scanId: SAMPLE_SCAN.id,
      status: 'ready',
      scan: SAMPLE_SCAN,
    }

    const html = renderToStaticMarkup(
      <ScanDetailsContent
        scanId={SAMPLE_SCAN.id}
        viewState={readyState}
        onRetry={vi.fn()}
        onRefresh={vi.fn()}
        onNavigate={navigate}
      />
    )

    expect(html).toContain('Scan Overview')
    expect(html).toContain(SAMPLE_SCAN.id)
    expect(html).toContain(SAMPLE_SCAN.target_content)
    expect(html).toContain('Verdict: Malicious')
    expect(html).toContain('Risk Level: critical')
    expect(html).toContain('92')
    expect(html).toContain(SAMPLE_SCAN.summary.en ?? '')
    expect(html).toContain(SAMPLE_SCAN.summary.ur ?? '')
    expect(html).toContain('Do not enter account credentials on this link.')
    expect(html).toContain('URL Intelligence')
    expect(html).toContain('Message Intelligence')
    expect(html).toContain('Security Advisor')
    expect(html).toContain('Raw Metadata')
    expect(html).toContain('multi-agent-v1')
  })

  it('handles missing agent data gracefully without fabricating findings and distinguishes error vs not-found UI', () => {
    const navigate = vi.fn()

    const partialScan: ScanResponse = {
      ...SAMPLE_SCAN,
      summary: { en: 'Partial summary only.' },
      recommendations: {},
      agent_findings: {
        url_intelligence: { error: 'WHOIS lookup timed out' },
        message_intelligence: null,
        security_advisor: {},
        raw_metadata: {},
      },
    }

    const partialHtml = renderToStaticMarkup(
      <ScanDetailsContent
        scanId={partialScan.id}
        viewState={{ scanId: partialScan.id, status: 'ready', scan: partialScan }}
        onRetry={vi.fn()}
        onRefresh={vi.fn()}
        onNavigate={navigate}
      />
    )
    expect(partialHtml).toContain('Partial Analysis Notice')
    expect(partialHtml).toContain('WHOIS lookup timed out')
    expect(partialHtml).toContain('Agent Metadata: No raw metadata returned for this scan.')

    const errorHtml = renderToStaticMarkup(
      <ScanDetailsContent
        scanId={SAMPLE_SCAN.id}
        viewState={{
          scanId: SAMPLE_SCAN.id,
          status: 'error',
          title: 'Backend server error',
          message: 'Service temporarily unavailable',
          statusCode: 503,
        }}
        onRetry={vi.fn()}
        onRefresh={vi.fn()}
        onNavigate={navigate}
      />
    )
    expect(errorHtml).toContain('role="alert"')
    expect(errorHtml).toContain('HTTP 503')
    expect(errorHtml).toContain('Backend server error')
    expect(errorHtml).toContain('Service temporarily unavailable')
    expect(errorHtml).toContain('>Retry<')
    expect(errorHtml).not.toContain('Scan Not Found')

    const notFoundHtml = renderToStaticMarkup(
      <ScanDetailsContent
        scanId={SAMPLE_SCAN.id}
        viewState={{
          scanId: SAMPLE_SCAN.id,
          status: 'not_found',
          message: 'Scan record not found',
          statusCode: 404,
        }}
        onRetry={vi.fn()}
        onRefresh={vi.fn()}
        onNavigate={navigate}
      />
    )
    expect(notFoundHtml).toContain('Scan Not Found')
    expect(notFoundHtml).toContain('Scan record not found')
    expect(notFoundHtml).toContain('Back to History')
    expect(notFoundHtml).not.toContain('role="alert"')
  })
})
