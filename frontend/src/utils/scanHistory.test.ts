import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import ScanHistoryPage from '../pages/ScanHistoryPage'
import type { ApiResponse, ScanResponse } from '../services/api'
import {
  DEFAULT_SCAN_FILTERS,
  filterScans,
  hasActiveScanFilters,
  paginateItems,
  resolveScanHistoryState,
  sortScansByField,
} from './scanHistory'
import { saveSessionId, type SessionStorageLike } from './session'

function makeScan(
  overrides: Partial<ScanResponse> & Pick<ScanResponse, 'id'>
): ScanResponse {
  return {
    user_id: null,
    target_type: 'url',
    target_content: 'https://example.com',
    overall_risk_score: 10,
    verdict: 'safe',
    risk_level: 'low',
    summary: { en: 'Safe', ur: 'محفوظ' },
    recommendations: { en: [], ur: [] },
    agent_findings: {},
    created_at: '2026-11-10T10:00:00Z',
    updated_at: '2026-11-10T10:00:00Z',
    ...overrides,
  }
}

const SAMPLE_DATASET: ScanResponse[] = [
  makeScan({
    id: 'scan-1',
    target_type: 'url',
    target_content: 'https://google.com',
    overall_risk_score: 5,
    verdict: 'safe',
    risk_level: 'low',
    created_at: '2026-11-09T08:00:00Z',
  }),
  makeScan({
    id: 'scan-2',
    target_type: 'message',
    target_content: 'Your parcel fee is pending, confirm tracking link now.',
    overall_risk_score: 62,
    verdict: 'suspicious',
    risk_level: 'medium',
    created_at: '2026-11-10T12:00:00Z',
  }),
  makeScan({
    id: 'scan-3',
    target_type: 'url',
    target_content: 'https://chase-security-update.xyz/login',
    overall_risk_score: 94,
    verdict: 'malicious',
    risk_level: 'critical',
    created_at: '2026-11-11T09:00:00Z',
  }),
  makeScan({
    id: 'scan-4',
    target_type: 'message',
    target_content: 'URGENT: Verify bank PIN immediately or account closes.',
    overall_risk_score: 82,
    verdict: 'malicious',
    risk_level: 'high',
    created_at: '2026-11-10T18:00:00Z',
  }),
]

describe('scanHistory utilities', () => {
  it('filters scans by search query across URLs and message content', () => {
    const urlMatches = filterScans(SAMPLE_DATASET, {
      ...DEFAULT_SCAN_FILTERS,
      searchQuery: 'chase-security',
    })
    expect(urlMatches.map((s) => s.id)).toEqual(['scan-3'])

    const msgMatches = filterScans(SAMPLE_DATASET, {
      ...DEFAULT_SCAN_FILTERS,
      searchQuery: 'BANK PIN',
    })
    expect(msgMatches.map((s) => s.id)).toEqual(['scan-4'])
  })

  it('filters scans by verdict, risk level, and target type', () => {
    expect(
      filterScans(SAMPLE_DATASET, {
        ...DEFAULT_SCAN_FILTERS,
        verdict: 'malicious',
      }).map((s) => s.id)
    ).toEqual(['scan-3', 'scan-4'])

    expect(
      filterScans(SAMPLE_DATASET, {
        ...DEFAULT_SCAN_FILTERS,
        riskLevel: 'critical',
      }).map((s) => s.id)
    ).toEqual(['scan-3'])

    expect(
      filterScans(SAMPLE_DATASET, {
        ...DEFAULT_SCAN_FILTERS,
        targetType: 'message',
      }).map((s) => s.id)
    ).toEqual(['scan-2', 'scan-4'])

    const emailDataset = [
      ...SAMPLE_DATASET,
      makeScan({
        id: 'scan-5',
        target_type: 'email',
        target_content: 'Subject: Wire transfer verification needed',
      }),
    ]
    expect(
      filterScans(emailDataset, {
        ...DEFAULT_SCAN_FILTERS,
        targetType: 'email',
      }).map((s) => s.id)
    ).toEqual(['scan-5'])
  })

  it('combines search and multiple filters and detects empty filtered results', () => {
    const combined = filterScans(SAMPLE_DATASET, {
      searchQuery: 'urgent',
      verdict: 'malicious',
      riskLevel: 'high',
      targetType: 'message',
    })
    expect(combined.map((s) => s.id)).toEqual(['scan-4'])

    const emptyFiltered = filterScans(SAMPLE_DATASET, {
      ...DEFAULT_SCAN_FILTERS,
      verdict: 'safe',
      targetType: 'message',
    })
    expect(emptyFiltered).toEqual([])
    expect(hasActiveScanFilters(DEFAULT_SCAN_FILTERS)).toBe(false)
    expect(
      hasActiveScanFilters({ ...DEFAULT_SCAN_FILTERS, verdict: 'safe' })
    ).toBe(true)
  })

  it('sorts scans by date and risk score in ascending and descending order', () => {
    const byDateDesc = sortScansByField(SAMPLE_DATASET, 'date', 'desc')
    expect(byDateDesc.map((s) => s.id)).toEqual([
      'scan-3',
      'scan-4',
      'scan-2',
      'scan-1',
    ])

    const byDateAsc = sortScansByField(SAMPLE_DATASET, 'date', 'asc')
    expect(byDateAsc.map((s) => s.id)).toEqual([
      'scan-1',
      'scan-2',
      'scan-4',
      'scan-3',
    ])

    const byRiskDesc = sortScansByField(SAMPLE_DATASET, 'risk_score', 'desc')
    expect(byRiskDesc.map((s) => s.id)).toEqual([
      'scan-3',
      'scan-4',
      'scan-2',
      'scan-1',
    ])

    const byRiskAsc = sortScansByField(SAMPLE_DATASET, 'risk_score', 'asc')
    expect(byRiskAsc.map((s) => s.id)).toEqual([
      'scan-1',
      'scan-2',
      'scan-4',
      'scan-3',
    ])

    const withInvalidDate = [
      makeScan({ id: 'invalid', created_at: 'not-a-date' }),
      ...SAMPLE_DATASET,
    ]
    const sortedWithInvalid = sortScansByField(withInvalidDate, 'date', 'desc')
    expect(sortedWithInvalid[sortedWithInvalid.length - 1].id).toBe('invalid')
  })

  it('paginates scan items accurately and clamps out-of-range page numbers', () => {
    const page1 = paginateItems(SAMPLE_DATASET, 1, 2)
    expect(page1.items.map((s) => s.id)).toEqual(['scan-1', 'scan-2'])
    expect(page1.currentPage).toBe(1)
    expect(page1.totalPages).toBe(2)
    expect(page1.startIndex).toBe(1)
    expect(page1.endIndex).toBe(2)

    const page2 = paginateItems(SAMPLE_DATASET, 2, 2)
    expect(page2.items.map((s) => s.id)).toEqual(['scan-3', 'scan-4'])
    expect(page2.startIndex).toBe(3)
    expect(page2.endIndex).toBe(4)

    const clampedHigh = paginateItems(SAMPLE_DATASET, 99, 2)
    expect(clampedHigh.currentPage).toBe(2)

    const emptyPage = paginateItems([], 1, 10)
    expect(emptyPage.items).toEqual([])
    expect(emptyPage.totalPages).toBe(1)
    expect(emptyPage.startIndex).toBe(0)
    expect(emptyPage.endIndex).toBe(0)
  })

  describe('resolveScanHistoryState and ScanHistoryPage guest 401 handling', () => {
    function createSessionStorage(): SessionStorageLike {
      const store = new Map<string, string>()
      return {
        getItem: (key) => store.get(key) ?? null,
        setItem: (key, value) => {
          store.set(key, value)
        },
        removeItem: (key) => {
          store.delete(key)
        },
      }
    }

    it('renders clean empty history state instead of an error alert for a first-time guest 401 missing X-Session-ID', () => {
      const emptyStorage = createSessionStorage()
      const resolved = resolveScanHistoryState(
        {
          ok: false,
          status: 401,
          data: null,
          error:
            'Authentication or X-Session-ID header required to access scan history',
        },
        emptyStorage
      )

      expect(resolved).toEqual({
        scans: [],
        errorMessage: '',
      })

      const html = renderToStaticMarkup(
        createElement(ScanHistoryPage, {
          onNavigate: vi.fn(),
          initialState: resolved,
        })
      )

      expect(html).toContain('0 Total Scans')
      expect(html).toContain('No scans recorded yet')
      expect(html).toContain('Run Your First Scan')
      expect(html).not.toContain('role="alert"')
      expect(html).not.toContain('Could not load scan history')
      expect(html).not.toContain('Scans: Unavailable')
    })

    it('preserves genuine authentication and API error alerts on /scans', () => {
      const emptyStorage = createSessionStorage()
      const storageWithSession = createSessionStorage()
      saveSessionId('sess-existing-guest-001', storageWithSession)

      const errorCases: Array<{
        label: string
        response: ApiResponse<ScanResponse[]>
        storage: SessionStorageLike
        expectedMessage: string
      }> = [
        {
          label: 'expired Bearer token 401 without session ID',
          response: {
            ok: false,
            status: 401,
            data: null,
            error: 'Token has expired',
          },
          storage: emptyStorage,
          expectedMessage: 'Token has expired',
        },
        {
          label: 'registered user UUID collision 401',
          response: {
            ok: false,
            status: 401,
            data: null,
            error:
              'Authentication required to access registered user scan history',
          },
          storage: emptyStorage,
          expectedMessage:
            'Authentication required to access registered user scan history',
        },
        {
          label: '401 when X-Session-ID was already saved',
          response: {
            ok: false,
            status: 401,
            data: null,
            error:
              'Authentication or X-Session-ID header required to access scan history',
          },
          storage: storageWithSession,
          expectedMessage:
            'Authentication or X-Session-ID header required to access scan history',
        },
        {
          label: 'inactive account 403',
          response: {
            ok: false,
            status: 403,
            data: null,
            error: 'User account is inactive',
          },
          storage: emptyStorage,
          expectedMessage: 'User account is inactive',
        },
        {
          label: 'backend 503 outage',
          response: {
            ok: false,
            status: 503,
            data: null,
            error: 'Service temporarily unavailable',
          },
          storage: emptyStorage,
          expectedMessage: 'Service temporarily unavailable',
        },
      ]

      for (const testCase of errorCases) {
        const resolved = resolveScanHistoryState(
          testCase.response,
          testCase.storage
        )
        expect(resolved, testCase.label).toEqual({
          scans: [],
          errorMessage: testCase.expectedMessage,
        })

        const html = renderToStaticMarkup(
          createElement(ScanHistoryPage, {
            onNavigate: vi.fn(),
            initialState: resolved,
          })
        )
        expect(html, testCase.label).toContain('role="alert"')
        expect(html, testCase.label).toContain('Could not load scan history')
        expect(html, testCase.label).toContain(testCase.expectedMessage)
        expect(html, testCase.label).toContain('Scans: Unavailable')
        expect(html, testCase.label).not.toContain('No scans recorded yet')
      }
    })

    it('resolves and renders recorded scan history items on 200 OK', () => {
      const resolved = resolveScanHistoryState({
        ok: true,
        status: 200,
        data: SAMPLE_DATASET.slice(0, 2),
        error: null,
      })

      expect(resolved.errorMessage).toBe('')
      expect(resolved.scans).toHaveLength(2)

      const html = renderToStaticMarkup(
        createElement(ScanHistoryPage, {
          onNavigate: vi.fn(),
          initialState: resolved,
        })
      )
      expect(html).toContain('2 Total Scans')
      expect(html).toContain('https://google.com')
      expect(html).not.toContain('role="alert"')
    })
  })
})
