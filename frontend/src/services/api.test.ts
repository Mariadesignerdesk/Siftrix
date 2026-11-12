import { describe, it, expect, vi, afterEach } from 'vitest'
import { API_CONFIG } from './config'
import {
  HISTORY_PAGE_SIZE,
  submitScan,
  isValidScanResponse,
  checkBackendHealth,
  fetchScans,
  fetchScanById,
  normalizeScanListResponse,
} from './api'
import { SESSION_ID_HEADER, SESSION_ID_STORAGE_KEY, loadSessionId } from '../utils/session'

function createMemoryStorage(initial: Record<string, string> = {}) {
  const backing = new Map<string, string>(Object.entries(initial))
  return {
    backing,
    storage: {
      getItem: (key: string) => backing.get(key) ?? null,
      setItem: (key: string, value: string) => {
        backing.set(key, value)
      },
      removeItem: (key: string) => {
        backing.delete(key)
      },
    },
  }
}

describe('SIFTRIX API Client & Service', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('uses http://localhost:8000 as default base URL and a 30-second timeout', () => {
    expect(API_CONFIG.BASE_URL).toBe('http://localhost:8000')
    expect(API_CONFIG.TIMEOUT_MS).toBe(30000)
  })

  it('sends POST /api/scan payload and persists returned X-Session-ID header for subsequent requests', async () => {
    const { storage, backing } = createMemoryStorage()
    vi.stubGlobal('localStorage', storage)

    const assignedSessionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    const mockScanResponse = {
      id: '11111111-1111-4111-8111-111111111111',
      user_id: assignedSessionId,
      target_type: 'url',
      target_content: 'https://example.com',
      overall_risk_score: 12,
      verdict: 'safe',
      risk_level: 'low',
      summary: { en: 'Safe domain', ur: 'محفوظ ویب سائٹ' },
      recommendations: { en: ['No action needed.'], ur: ['کوئی کارروائی درکار نہیں۔'] },
      agent_findings: {
        message_intelligence: null,
        url_intelligence: { status: 'completed', ssl_valid: true },
        security_advisor: { status: 'completed' },
        raw_metadata: {},
      },
      created_at: '2026-11-11T12:00:00Z',
      updated_at: '2026-11-11T12:00:00Z',
    }

    const mockHistoryPage = {
      items: [
        {
          id: mockScanResponse.id,
          user_id: assignedSessionId,
          target_type: 'url',
          target_content: 'https://example.com',
          target_content_preview: 'https://example.com',
          overall_risk_score: 12,
          verdict: 'safe',
          risk_level: 'low',
          summary: { en: 'Safe domain', ur: 'محفوظ ویب سائٹ' },
          created_at: '2026-11-11T12:00:00Z',
          updated_at: '2026-11-11T12:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      page_size: HISTORY_PAGE_SIZE,
      total_pages: 1,
      has_next: false,
      has_prev: false,
    }

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockScanResponse), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            [SESSION_ID_HEADER]: assignedSessionId,
          },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockHistoryPage), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockScanResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockScanResponse), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            [SESSION_ID_HEADER]: assignedSessionId,
          },
        })
      )

    const result = await submitScan({
      target_type: 'url',
      content: 'https://example.com',
      metadata: { source: 'web-scanner' },
    })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [calledUrl, requestInit] = fetchSpy.mock.calls[0]
    expect(calledUrl).toBe('http://localhost:8000/api/scan')
    expect(requestInit?.method).toBe('POST')
    expect(JSON.parse(String(requestInit?.body))).toEqual({
      target_type: 'url',
      content: 'https://example.com',
      metadata: { source: 'web-scanner' },
    })
    expect((requestInit?.headers as Record<string, string>)?.[SESSION_ID_HEADER]).toBeUndefined()
    expect(result.ok).toBe(true)
    expect(result.data).toEqual(mockScanResponse)
    expect(backing.get(SESSION_ID_STORAGE_KEY)).toBe(assignedSessionId)

    // Subsequent GET /api/history includes saved X-Session-ID automatically
    const historyResult = await fetchScans()
    expect(historyResult.ok).toBe(true)
    expect(historyResult.data).toHaveLength(1)
    const [historyUrl, historyInit] = fetchSpy.mock.calls[1]
    expect(historyUrl).toBe(
      `http://localhost:8000/api/history?page=1&page_size=${HISTORY_PAGE_SIZE}`
    )
    expect(historyInit?.method).toBe('GET')
    expect((historyInit?.headers as Record<string, string>)?.[SESSION_ID_HEADER]).toBe(
      assignedSessionId
    )

    // Subsequent GET /api/history/{scan_id} includes saved X-Session-ID automatically
    const detailResult = await fetchScanById(mockScanResponse.id)
    expect(detailResult.ok).toBe(true)
    const [detailUrl, detailInit] = fetchSpy.mock.calls[2]
    expect(detailUrl).toBe(
      `http://localhost:8000/api/history/${mockScanResponse.id}`
    )
    expect((detailInit?.headers as Record<string, string>)?.[SESSION_ID_HEADER]).toBe(
      assignedSessionId
    )

    // Subsequent POST /api/scan reuses saved X-Session-ID so scans stay in one session
    await submitScan({
      target_type: 'message',
      content: 'Verify your account now',
    })
    const [secondScanUrl, secondScanInit] = fetchSpy.mock.calls[3]
    expect(secondScanUrl).toBe('http://localhost:8000/api/scan')
    expect((secondScanInit?.headers as Record<string, string>)?.[SESSION_ID_HEADER]).toBe(
      assignedSessionId
    )
  })

  it('handles missing X-Session-ID header cleanly on scan, history, and detail requests', async () => {
    const { storage } = createMemoryStorage()
    vi.stubGlobal('localStorage', storage)

    const mockScan = {
      id: '11111111-1111-4111-8111-111111111112',
      user_id: null,
      target_type: 'message',
      target_content: 'Hello world',
      overall_risk_score: 5,
      verdict: 'safe',
      risk_level: 'low',
      summary: { en: 'Safe message', ur: 'محفوظ پیغام' },
      recommendations: { en: [], ur: [] },
      agent_findings: {},
      created_at: '2026-11-11T12:00:00Z',
      updated_at: '2026-11-11T12:00:00Z',
    }

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockScan), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            detail: 'Authentication or X-Session-ID header required to access scan history',
          }),
          {
            status: 401,
            statusText: 'Unauthorized',
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            detail: 'Authentication or X-Session-ID header required to access scan history',
          }),
          {
            status: 401,
            statusText: 'Unauthorized',
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )

    const scanRes = await submitScan({
      target_type: 'message',
      content: 'Hello world',
    })
    expect(scanRes.ok).toBe(true)
    expect(loadSessionId(storage)).toBeNull()

    const listRes = await fetchScans()
    expect(listRes.ok).toBe(false)
    expect(listRes.status).toBe(401)
    expect(
      (fetchSpy.mock.calls[1][1]?.headers as Record<string, string>)?.[SESSION_ID_HEADER]
    ).toBeUndefined()

    const detailRes = await fetchScanById(mockScan.id)
    expect(detailRes.ok).toBe(false)
    expect(detailRes.status).toBe(401)
    expect(
      (fetchSpy.mock.calls[2][1]?.headers as Record<string, string>)?.[SESSION_ID_HEADER]
    ).toBeUndefined()
  })

  it('clears a corrupt stored X-Session-ID when backend rejects it with HTTP 400', async () => {
    const { storage, backing } = createMemoryStorage({
      [SESSION_ID_STORAGE_KEY]: 'not-a-valid-uuid',
    })
    vi.stubGlobal('localStorage', storage)

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          detail: 'Invalid X-Session-ID header: must be a valid canonical UUIDv4',
        }),
        {
          status: 400,
          statusText: 'Bad Request',
          headers: { 'Content-Type': 'application/json' },
        }
      )
    )

    const res = await fetchScans()
    expect(res.ok).toBe(false)
    expect(res.status).toBe(400)
    expect(backing.has(SESSION_ID_STORAGE_KEY)).toBe(false)
  })

  it('parses FastAPI 422 validation detail arrays into readable messages', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: [
            {
              loc: ['body', 'content'],
              msg: 'String should have at least 1 character',
              type: 'string_too_short',
            },
          ],
        }),
        {
          status: 422,
          statusText: 'Unprocessable Entity',
          headers: { 'Content-Type': 'application/json' },
        }
      )
    )

    const result = await submitScan({
      target_type: 'message',
      content: '',
    })

    expect(result.ok).toBe(false)
    expect(result.status).toBe(422)
    expect(result.data).toBeNull()
    expect(result.error).toContain('content: String should have at least 1 character')
  })

  it('handles network connection errors without inventing scan results', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))

    const result = await submitScan({
      target_type: 'message',
      content: 'Urgent message',
    })

    expect(result.ok).toBe(false)
    expect(result.status).toBe(0)
    expect(result.data).toBeNull()
    expect(result.error).toContain('Unable to reach the SIFTRIX backend')
  })

  it('handles request timeouts cleanly', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new DOMException('The operation was aborted.', 'AbortError')
    )

    const result = await submitScan({
      target_type: 'url',
      content: 'https://example.com',
    })

    expect(result.ok).toBe(false)
    expect(result.status).toBe(408)
    expect(result.data).toBeNull()
    expect(result.error).toContain('timed out after 30 seconds')
  })

  it('queries GET /api/health via checkBackendHealth', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const result = await checkBackendHealth()

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8000/api/health',
      expect.objectContaining({ method: 'GET' })
    )
    expect(result.ok).toBe(true)
    expect(result.data).toEqual({ status: 'ok' })
  })

  it('validates ScanResponse structure via isValidScanResponse', () => {
    expect(
      isValidScanResponse({
        id: 'abc',
        overall_risk_score: 50,
        verdict: 'suspicious',
        risk_level: 'medium',
      })
    ).toBe(true)

    expect(isValidScanResponse(null)).toBe(false)
    expect(isValidScanResponse([])).toBe(false)
    expect(isValidScanResponse({})).toBe(false)
    expect(
      isValidScanResponse({
        id: 'abc',
        overall_risk_score: Number.NaN,
        verdict: 'safe',
        risk_level: 'low',
      })
    ).toBe(false)
  })

  it('extracts structured object detail messages on HTTP errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: { message: 'Scan provider temporarily unavailable' },
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' },
        }
      )
    )

    const result = await submitScan({
      target_type: 'url',
      content: 'https://example.com',
    })

    expect(result.ok).toBe(false)
    expect(result.status).toBe(503)
    expect(result.error).toBe('Scan provider temporarily unavailable')
  })

  it('normalizes GET /api/history paginated envelopes, arrays, and wrapper objects cleanly', () => {
    const historyItem = {
      id: '11111111-1111-4111-8111-111111111111',
      user_id: null,
      target_type: 'url',
      target_content: 'https://example.com',
      target_content_preview: 'https://example.com',
      overall_risk_score: 10,
      verdict: 'safe',
      risk_level: 'low',
      summary: { en: 'Safe', ur: 'محفوظ' },
      created_at: '2026-11-11T12:00:00Z',
      updated_at: '2026-11-11T12:00:00Z',
    }

    expect(normalizeScanListResponse([])).toEqual([])
    expect(normalizeScanListResponse([historyItem])).toHaveLength(1)
    expect(normalizeScanListResponse({ items: [historyItem], total: 1, has_next: false })).toHaveLength(1)
    expect(normalizeScanListResponse({ scans: [historyItem] })).toHaveLength(1)
    expect(normalizeScanListResponse({ unexpected: true })).toBeNull()
  })

  it('fetches complete paginated scan history across multiple pages (>10 records) and deduplicates', async () => {
    const makeItem = (index: number) => ({
      id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      user_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      target_type: index % 2 === 0 ? 'url' : 'message',
      target_content: `https://sample-${index}.example.test`,
      overall_risk_score: index % 100,
      verdict: 'safe',
      risk_level: 'low',
      summary: { en: `Item ${index}`, ur: `نمونہ ${index}` },
      created_at: '2026-11-11T12:00:00Z',
      updated_at: '2026-11-11T12:00:00Z',
    })

    const page1Items = Array.from({ length: 10 }, (_, idx) => makeItem(idx + 1))
    // Include one overlapping record on page 2 to verify deduplication across page boundaries
    const page2Items = [makeItem(10), makeItem(11), makeItem(12), makeItem(13), makeItem(14)]

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: page1Items,
            total: 14,
            page: 1,
            page_size: 10,
            total_pages: 2,
            has_next: true,
            has_prev: false,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: page2Items,
            total: 14,
            page: 2,
            page_size: 10,
            total_pages: 2,
            has_next: false,
            has_prev: true,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )

    const result = await fetchScans()
    expect(result.ok).toBe(true)
    expect(result.data).toHaveLength(14)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      `http://localhost:8000/api/history?page=1&page_size=${HISTORY_PAGE_SIZE}`,
      expect.objectContaining({ method: 'GET' })
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      `http://localhost:8000/api/history?page=2&page_size=${HISTORY_PAGE_SIZE}`,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('guards against infinite empty pagination loops and surfaces mid-pagination failures', async () => {
    const firstItem = {
      id: '22222222-2222-4222-8222-222222222222',
      user_id: null,
      target_type: 'message',
      target_content: 'Urgent verify bank',
      overall_risk_score: 85,
      verdict: 'malicious',
      risk_level: 'high',
      summary: { en: 'Phishing detected', ur: 'فشنگ کی نشاندہی' },
      created_at: '2026-11-11T12:00:00Z',
      updated_at: '2026-11-11T12:00:00Z',
    }

    // Empty page claiming has_next: true stops cleanly after 1 call
    const emptyLoopSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [],
          total: 0,
          page: 1,
          page_size: 100,
          total_pages: 99,
          has_next: true,
          has_prev: false,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )
    const emptyResult = await fetchScans()
    expect(emptyResult.ok).toBe(true)
    expect(emptyResult.data).toEqual([])
    expect(emptyLoopSpy).toHaveBeenCalledTimes(1)

    vi.restoreAllMocks()

    // Page 2 failure surfaces error instead of returning truncated data
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [firstItem],
            total: 2,
            page: 1,
            page_size: 1,
            total_pages: 2,
            has_next: true,
            has_prev: false,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'Database connection lost' }), {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' },
        })
      )

    const partialFail = await fetchScans()
    expect(partialFail.ok).toBe(false)
    expect(partialFail.status).toBe(503)
    expect(partialFail.data).toBeNull()
    expect(partialFail.error).toBe('Database connection lost')
  })

  it('distinguishes 404 not-found, server failure, malformed 200 payload, and retry success in fetchScanById', async () => {
    const validRecord = {
      id: '33333333-3333-4333-8333-333333333333',
      user_id: null,
      target_type: 'url',
      target_content: 'https://phish-example.test/login',
      overall_risk_score: 88,
      verdict: 'malicious',
      risk_level: 'high',
      summary: { en: 'Phishing risk detected', ur: 'فشنگ کا خطرہ' },
      recommendations: { en: ['Avoid entering credentials.'], ur: ['معلومات درج نہ کریں۔'] },
      agent_findings: {},
      created_at: '2026-11-11T12:30:00Z',
      updated_at: '2026-11-11T12:30:00Z',
    }

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'Scan record not found' }), {
          status: 404,
          statusText: 'Not Found',
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ unexpected: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'Database temporarily busy' }), {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(validRecord), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

    const notFound = await fetchScanById(validRecord.id)
    expect(notFound.ok).toBe(false)
    expect(notFound.status).toBe(404)
    expect(notFound.error).toBe('Scan record not found')

    const malformed = await fetchScanById(validRecord.id)
    expect(malformed.ok).toBe(false)
    expect(malformed.status).toBe(200)
    expect(malformed.error).toContain('unexpected scan detail format')

    const transientFail = await fetchScanById(validRecord.id)
    expect(transientFail.ok).toBe(false)
    expect(transientFail.status).toBe(503)

    const retrySuccess = await fetchScanById(validRecord.id)
    expect(retrySuccess.ok).toBe(true)
    expect(retrySuccess.data).toEqual(validRecord)
  })
})
