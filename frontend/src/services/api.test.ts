import { describe, it, expect, vi, afterEach } from 'vitest'
import { API_CONFIG } from './config'
import {
  submitScan,
  isValidScanResponse,
  checkBackendHealth,
  fetchScans,
  fetchScanById,
  normalizeScanListResponse,
} from './api'

describe('SIFTRIX API Client & Service', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses http://localhost:8000 as default base URL and a 30-second timeout', () => {
    expect(API_CONFIG.BASE_URL).toBe('http://localhost:8000')
    expect(API_CONFIG.TIMEOUT_MS).toBe(30000)
  })

  it('sends the verified POST /api/scan payload format', async () => {
    const mockScanResponse = {
      id: '11111111-1111-1111-1111-111111111111',
      user_id: null,
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

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockScanResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
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
    expect(result.ok).toBe(true)
    expect(result.data).toEqual(mockScanResponse)
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

  it('normalizes GET /api/scans arrays and wrapper objects cleanly', () => {
    const validItem = {
      id: '11111111-1111-1111-1111-111111111111',
      user_id: null,
      target_type: 'url',
      target_content: 'https://example.com',
      overall_risk_score: 10,
      verdict: 'safe',
      risk_level: 'low',
      summary: { en: 'Safe', ur: 'محفوظ' },
      recommendations: { en: [], ur: [] },
      agent_findings: {},
      created_at: '2026-11-11T12:00:00Z',
      updated_at: '2026-11-11T12:00:00Z',
    }

    expect(normalizeScanListResponse([])).toEqual([])
    expect(normalizeScanListResponse([validItem])).toHaveLength(1)
    expect(normalizeScanListResponse({ items: [validItem] })).toHaveLength(1)
    expect(normalizeScanListResponse({ scans: [validItem] })).toHaveLength(1)
    expect(normalizeScanListResponse({ unexpected: true })).toBeNull()
  })

  it('fetches GET /api/scans and GET /api/scans/{scan_id} via service helpers', async () => {
    const mockItem = {
      id: '22222222-2222-2222-2222-222222222222',
      user_id: null,
      target_type: 'message',
      target_content: 'Urgent verify bank',
      overall_risk_score: 85,
      verdict: 'malicious',
      risk_level: 'high',
      summary: { en: 'Phishing detected', ur: 'فشنگ کی نشاندہی' },
      recommendations: { en: ['Do not reply'], ur: ['جواب نہ دیں'] },
      agent_findings: {},
      created_at: '2026-11-11T12:00:00Z',
      updated_at: '2026-11-11T12:00:00Z',
    }

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify([mockItem]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockItem), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

    const listResult = await fetchScans()
    expect(listResult.ok).toBe(true)
    expect(listResult.data).toEqual([mockItem])
    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8000/api/scans',
      expect.objectContaining({ method: 'GET' })
    )

    const detailResult = await fetchScanById(mockItem.id)
    expect(detailResult.ok).toBe(true)
    expect(detailResult.data).toEqual(mockItem)
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      `http://localhost:8000/api/scans/${mockItem.id}`,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('distinguishes 404 not-found, server failure, malformed 200 payload, and retry success in fetchScanById', async () => {
    const validRecord = {
      id: '33333333-3333-3333-3333-333333333333',
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
        new Response(JSON.stringify({ detail: 'Scan not found' }), {
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
    expect(notFound.error).toBe('Scan not found')

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
