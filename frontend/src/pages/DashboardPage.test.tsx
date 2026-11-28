import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import DashboardPage, { DashboardContent } from './DashboardPage'
import { resolveDashboardData } from '../utils/dashboardUtils'
import {
  SESSION_ID_STORAGE_KEY,
  isMissingSessionUnauthorized,
  type SessionStorageLike,
} from '../utils/session'
import type { ApiResponse, ScanResponse } from '../services/api'
import { REALISTIC_MOCK_SCANS } from '../services/scanHistoryService'

function createSessionStorageMock(initialSessionId?: string): SessionStorageLike {
  const store = new Map<string, string>()
  if (initialSessionId !== undefined) {
    store.set(SESSION_ID_STORAGE_KEY, initialSessionId)
  }
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  }
}

const REAL_USER_SCAN: ScanResponse = {
  id: 'usr_real_scan_001',
  user_id: 'usr_actual_analyst',
  target_type: 'url',
  target_content: 'https://actual-verified-site.example/portal',
  target_content_preview: 'actual-verified-site.example/portal',
  overall_risk_score: 12,
  verdict: 'safe',
  risk_level: 'low',
  summary: {
    en: 'Real user scan result: Legitimate domain verified.',
    ur: 'اصلی صارف کا اسکین: محفوظ ویب سائٹ۔',
  },
  recommendations: {
    en: ['Domain is safe to browse.'],
    ur: ['ویب سائٹ محفوظ ہے۔'],
  },
  agent_findings: {
    url_intelligence: {
      status: 'completed',
      domain_age_days: 1200,
    },
    message_intelligence: null,
    security_advisor: {
      status: 'completed',
    },
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const HEALTH_ONLINE: ApiResponse<{ status?: string }> = {
  ok: true,
  status: 200,
  data: { status: 'healthy' },
  error: null,
}

const HEALTH_OFFLINE: ApiResponse<{ status?: string }> = {
  ok: false,
  status: 503,
  data: null,
  error: 'Connection refused',
}

describe('DashboardPage - Demo Preview and Real Data Isolation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('resolveDashboardData', () => {
    it('activates Demo Preview when backend returns zero scans', () => {
      const scansRes: ApiResponse<ScanResponse[]> = {
        ok: true,
        data: [],
        status: 200,
        error: null,
      }

      const resolved = resolveDashboardData(scansRes, HEALTH_ONLINE)

      expect(resolved.isDemoPreview).toBe(true)
      expect(resolved.demoPreviewReason).toBe('empty_history')
      expect(resolved.errorMessage).toBe('')
      expect(resolved.healthState).toBe('online')
      expect(resolved.scans.length).toBeGreaterThan(0)
      expect(resolved.scans[0].id).toBe(REALISTIC_MOCK_SCANS[0].id)
    })

    it('shows ONLY real user scans and hides demo preview when real scans exist', () => {
      const scansRes: ApiResponse<ScanResponse[]> = {
        ok: true,
        data: [REAL_USER_SCAN],
        status: 200,
        error: null,
      }

      const resolved = resolveDashboardData(scansRes, HEALTH_ONLINE)

      expect(resolved.isDemoPreview).toBe(false)
      expect(resolved.demoPreviewReason).toBe('none')
      expect(resolved.errorMessage).toBe('')
      expect(resolved.healthState).toBe('online')
      expect(resolved.scans).toHaveLength(1)
      expect(resolved.scans[0].id).toBe('usr_real_scan_001')
      expect(resolved.scans[0].target_content).toBe('https://actual-verified-site.example/portal')
    })

    it('identifies demo data and displays offline error notice when backend is offline', () => {
      const scansRes: ApiResponse<ScanResponse[]> = {
        ok: false,
        data: null,
        status: 503,
        error: 'Network connection refused',
      }

      const resolved = resolveDashboardData(scansRes, HEALTH_OFFLINE)

      expect(resolved.isDemoPreview).toBe(true)
      expect(resolved.demoPreviewReason).toBe('api_failure')
      expect(resolved.healthState).toBe('offline')
      expect(resolved.errorMessage).toContain('FastAPI backend offline')
      expect(resolved.scans.length).toBeGreaterThan(0)
    })

    it('transitions cleanly from demo preview to real user telemetry after first scan', () => {
      // Step 1: Initial visit with zero scans
      const initialScansRes: ApiResponse<ScanResponse[]> = {
        ok: true,
        data: [],
        status: 200,
        error: null,
      }
      const initialResolved = resolveDashboardData(initialScansRes, HEALTH_ONLINE)
      expect(initialResolved.isDemoPreview).toBe(true)

      // Step 2: First real scan completed by user
      const postScanRes: ApiResponse<ScanResponse[]> = {
        ok: true,
        data: [REAL_USER_SCAN],
        status: 200,
        error: null,
      }
      const postScanResolved = resolveDashboardData(postScanRes, HEALTH_ONLINE)

      expect(postScanResolved.isDemoPreview).toBe(false)
      expect(postScanResolved.scans).toHaveLength(1)
      expect(postScanResolved.scans[0].id).toBe(REAL_USER_SCAN.id)

      // Verify zero mock scans are mixed into real scan array
      const hasMock = postScanResolved.scans.some((s) => s.id.startsWith('sfx_mock_'))
      expect(hasMock).toBe(false)
    })

    it('treats 401 with no saved session and missing X-Session-ID detail as clean Demo Preview', () => {
      const emptyStorage = createSessionStorageMock()
      const scansRes: ApiResponse<ScanResponse[]> = {
        ok: false,
        data: null,
        status: 401,
        error: 'Authentication or X-Session-ID header required to access scan history',
      }

      expect(
        isMissingSessionUnauthorized(scansRes.status, emptyStorage, scansRes.error)
      ).toBe(true)

      const resolved = resolveDashboardData(scansRes, HEALTH_ONLINE, emptyStorage)

      expect(resolved.isDemoPreview).toBe(true)
      expect(resolved.demoPreviewReason).toBe('missing_session')
      expect(resolved.errorMessage).toBe('')
      expect(resolved.healthState).toBe('online')
      expect(resolved.scans.length).toBeGreaterThan(0)
    })

    it('surfaces unrelated 401 authorization errors even when no X-Session-ID is saved', () => {
      const emptyStorage = createSessionStorageMock()
      const expiredTokenRes: ApiResponse<ScanResponse[]> = {
        ok: false,
        data: null,
        status: 401,
        error: 'Token has expired',
      }

      expect(
        isMissingSessionUnauthorized(
          expiredTokenRes.status,
          emptyStorage,
          expiredTokenRes.error
        )
      ).toBe(false)

      const resolved = resolveDashboardData(expiredTokenRes, HEALTH_ONLINE, emptyStorage)

      expect(resolved.isDemoPreview).toBe(true)
      expect(resolved.demoPreviewReason).toBe('api_failure')
      expect(resolved.healthState).toBe('online')
      expect(resolved.errorMessage).toBe('Token has expired')

      // Null or empty 401 error messages also fall back to the error state instead of silent Demo Preview
      expect(isMissingSessionUnauthorized(401, emptyStorage, undefined)).toBe(false)
      expect(isMissingSessionUnauthorized(401, emptyStorage, null)).toBe(false)
      expect(isMissingSessionUnauthorized(403, emptyStorage, 'X-Session-ID')).toBe(false)

      const nullErrorResolved = resolveDashboardData(
        { ok: false, data: null, status: 401, error: null },
        HEALTH_ONLINE,
        emptyStorage
      )
      expect(nullErrorResolved.demoPreviewReason).toBe('api_failure')
      expect(nullErrorResolved.errorMessage).toBe('Could not load backend scan data.')
    })

    it('surfaces an error on 401 when a saved X-Session-ID already exists', () => {
      const populatedStorage = createSessionStorageMock(
        '11111111-1111-4111-8111-111111111111'
      )
      const scansRes: ApiResponse<ScanResponse[]> = {
        ok: false,
        data: null,
        status: 401,
        error: 'Authentication required to access registered user scan history',
      }

      expect(
        isMissingSessionUnauthorized(scansRes.status, populatedStorage, scansRes.error)
      ).toBe(false)

      const resolved = resolveDashboardData(scansRes, HEALTH_ONLINE, populatedStorage)

      expect(resolved.isDemoPreview).toBe(true)
      expect(resolved.demoPreviewReason).toBe('api_failure')
      expect(resolved.healthState).toBe('online')
      expect(resolved.errorMessage).toBe(
        'Authentication required to access registered user scan history'
      )
    })

    it('surfaces an error on HTTP 403 Forbidden responses', () => {
      const emptyStorage = createSessionStorageMock()
      const forbiddenRes: ApiResponse<ScanResponse[]> = {
        ok: false,
        data: null,
        status: 403,
        error: 'User account is inactive',
      }

      const resolved = resolveDashboardData(forbiddenRes, HEALTH_ONLINE, emptyStorage)

      expect(resolved.isDemoPreview).toBe(true)
      expect(resolved.demoPreviewReason).toBe('api_failure')
      expect(resolved.healthState).toBe('online')
      expect(resolved.errorMessage).toBe('User account is inactive')
    })

    it('surfaces history API failure message while health endpoint is online', () => {
      const emptyStorage = createSessionStorageMock()
      const historyErrorRes: ApiResponse<ScanResponse[]> = {
        ok: false,
        data: null,
        status: 503,
        error: 'Database connection lost',
      }

      const resolved = resolveDashboardData(historyErrorRes, HEALTH_ONLINE, emptyStorage)

      expect(resolved.isDemoPreview).toBe(true)
      expect(resolved.demoPreviewReason).toBe('api_failure')
      expect(resolved.healthState).toBe('online')
      expect(resolved.errorMessage).toBe('Database connection lost')
    })
  })

  describe('DashboardContent presentation', () => {
    it('renders the champagne-gold demo banner, sample badges, and graphs in Demo Preview mode', () => {
      const html = renderToStaticMarkup(
        <DashboardContent
          scans={REALISTIC_MOCK_SCANS}
          isLoading={false}
          hasError={false}
          errorMessage=""
          healthState="online"
          isDemoPreview={true}
          onNavigate={vi.fn()}
          onRefresh={vi.fn()}
        />
      )

      // Banner requirements
      expect(html).toContain('DEMO PREVIEW — These are illustrative sample analytics, not your actual scan history.')
      expect(html).toContain('Run Your First Scan')
      expect(html).toContain('0 recorded scans found')

      // KPI card sample tags
      expect(html).toContain('Sample')
      expect(html).toContain('sample analyses (Demo)')

      // Graph & analytics visibility and labels
      expect(html).toContain('Recent Risk Trajectory')
      expect(html).toContain('Sample Data')
      expect(html).toContain('Sample Avg Risk:')
      expect(html).toContain('Verdict Distribution')
      expect(html).toContain('Sample Preview')

      // Recent scans sample badge and notice
      expect(html).toContain('Sample Data Feed')
      expect(html).toContain('Showing simulated threat intelligence fixtures.')
    })

    it('hides all demo banners and sample badges when real scans exist', () => {
      const html = renderToStaticMarkup(
        <DashboardContent
          scans={[REAL_USER_SCAN]}
          isLoading={false}
          hasError={false}
          errorMessage=""
          healthState="online"
          isDemoPreview={false}
          onNavigate={vi.fn()}
          onRefresh={vi.fn()}
        />
      )

      // Must NOT contain any demo preview banner or sample labels
      expect(html).not.toContain('DEMO PREVIEW — These are illustrative sample analytics')
      expect(html).not.toContain('0 recorded scans found')
      expect(html).not.toContain('Sample Data Feed')
      expect(html).not.toContain('Sample Avg Risk:')
      expect(html).not.toContain('Showing simulated threat intelligence fixtures')

      // Must display authentic user data
      expect(html).toContain('actual-verified-site.example/portal')
      expect(html).toContain('1 recorded analysis')
      expect(html).toContain('100% of total scans')
    })

    it('renders aligned Y-axis labels, drop-stems, scan markers and informative subtitle for 2 scans', () => {
      const secondScan: ScanResponse = {
        ...REAL_USER_SCAN,
        id: 'usr_real_scan_002',
        target_content: 'https://actual-verified-site.example/checkout',
        overall_risk_score: 10,
        verdict: 'suspicious',
        created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      }

      const firstScan: ScanResponse = {
        ...REAL_USER_SCAN,
        id: 'usr_real_scan_001',
        overall_risk_score: 10,
        verdict: 'suspicious',
        created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      }

      const html = renderToStaticMarkup(
        <DashboardContent
          scans={[secondScan, firstScan]}
          isLoading={false}
          hasError={false}
          errorMessage=""
          healthState="online"
          isDemoPreview={false}
          onNavigate={vi.fn()}
          onRefresh={vi.fn()}
        />
      )

      // 1. Clearly visible Y-axis labels: 100, 75, 50, 25, 0
      expect(html).toContain('>100<')
      expect(html).toContain('>75<')
      expect(html).toContain('>50<')
      expect(html).toContain('>25<')
      expect(html).toContain('>0<')

      // 2. Helpful subtitle for fewer than 3 scans
      expect(html).toContain(
        'Showing 2 recorded scans. Risk trends will become clearer as more targets are analyzed.'
      )

      // 3. Subtle vertical dashed drop-stems from scan points to baseline
      expect(html).toContain('stroke-dasharray="2 3"')

      // 4. Scan identifiers beneath points
      expect(html).toContain('Scan #1')
      expect(html).toContain('Scan #2')

      // 5. Preserved real scores and verdicts
      expect(html).toContain('Avg Risk: 10/100')
      expect(html).toContain('>10<')
    })

    it('keeps the global error alert visible and uses accurate failure copy (not zero-scans copy) on API or offline failure', () => {
      const failedResolved = resolveDashboardData(
        {
          ok: false,
          data: null,
          status: 503,
          error: 'Database connection lost',
        },
        HEALTH_ONLINE,
        createSessionStorageMock()
      )

      const html = renderToStaticMarkup(
        <DashboardContent
          scans={failedResolved.scans}
          isLoading={false}
          hasError={Boolean(failedResolved.errorMessage)}
          errorMessage={failedResolved.errorMessage}
          healthState={failedResolved.healthState}
          isDemoPreview={failedResolved.isDemoPreview}
          demoPreviewReason={failedResolved.demoPreviewReason}
          onNavigate={vi.fn()}
          onRefresh={vi.fn()}
        />
      )

      expect(html).toContain('role="alert"')
      expect(html).toContain('Could not load backend scan data')
      expect(html).toContain('Database connection lost')
      expect(html).toContain('Retry Connection')
      expect(html).toContain('Backend Online')
      expect(html).toContain(
        'DEMO PREVIEW — Sample analytics are being displayed because actual scan history could not be loaded.'
      )
      expect(html).not.toContain('0 recorded scans found')
      expect(html).not.toContain('You have not performed any scans yet')

      // Backend offline also avoids false zero-scans claims
      const offlineResolved = resolveDashboardData(
        {
          ok: false,
          data: null,
          status: 0,
          error: 'Unable to reach backend',
        },
        HEALTH_OFFLINE,
        createSessionStorageMock()
      )
      const offlineHtml = renderToStaticMarkup(
        <DashboardContent
          scans={offlineResolved.scans}
          isLoading={false}
          hasError={Boolean(offlineResolved.errorMessage)}
          errorMessage={offlineResolved.errorMessage}
          healthState={offlineResolved.healthState}
          isDemoPreview={offlineResolved.isDemoPreview}
          demoPreviewReason={offlineResolved.demoPreviewReason}
          onNavigate={vi.fn()}
          onRefresh={vi.fn()}
        />
      )
      expect(offlineHtml).toContain('role="alert"')
      expect(offlineHtml).toContain('Backend Offline')
      expect(offlineHtml).toContain('actual scan history could not be loaded')
      expect(offlineHtml).not.toContain('0 recorded scans found')
      expect(offlineHtml).not.toContain('You have not performed any scans yet')
    })

    it('renders neutral preview wording without claiming zero scans on initial missing-session 401', () => {
      const missingSessionResolved = resolveDashboardData(
        {
          ok: false,
          data: null,
          status: 401,
          error: 'Authentication or X-Session-ID header required to access scan history',
        },
        HEALTH_ONLINE,
        createSessionStorageMock()
      )

      const html = renderToStaticMarkup(
        <DashboardContent
          scans={missingSessionResolved.scans}
          isLoading={false}
          hasError={Boolean(missingSessionResolved.errorMessage)}
          errorMessage={missingSessionResolved.errorMessage}
          healthState={missingSessionResolved.healthState}
          isDemoPreview={missingSessionResolved.isDemoPreview}
          demoPreviewReason={missingSessionResolved.demoPreviewReason}
          onNavigate={vi.fn()}
          onRefresh={vi.fn()}
        />
      )

      expect(html).toContain(
        'Illustrative preview — sample data, not your actual scan history.'
      )
      expect(html).not.toContain('role="alert"')
      expect(html).not.toContain('0 recorded scans found')
      expect(html).not.toContain('You have not performed any scans yet')
    })

    it('renders initial loading state of DashboardPage safely without crashing', () => {
      const nav = vi.fn()
      const html = renderToStaticMarkup(<DashboardPage onNavigate={nav} />)

      expect(html).toContain('Security Dashboard')
      expect(html).toContain('Checking API...')
      expect(html).toContain('AI Cybersecurity Command Center')
    })
  })
})
