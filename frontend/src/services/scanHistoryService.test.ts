import { describe, it, expect } from 'vitest'
import {
  addMockScan,
  getMockScanById,
  getMockScanHistory,
  REALISTIC_MOCK_SCANS,
  searchAndFilterMockScans,
} from './scanHistoryService'

describe('scanHistoryService', () => {
  it('contains at least 20 realistic mock scans across all risk levels', () => {
    expect(REALISTIC_MOCK_SCANS.length).toBeGreaterThanOrEqual(20)

    const riskLevels = new Set(REALISTIC_MOCK_SCANS.map((s) => s.risk_level))
    expect(riskLevels.has('low')).toBe(true)
    expect(riskLevels.has('medium')).toBe(true)
    expect(riskLevels.has('high')).toBe(true)
    expect(riskLevels.has('critical')).toBe(true)

    const targetTypes = new Set(REALISTIC_MOCK_SCANS.map((s) => s.target_type))
    expect(targetTypes.has('url')).toBe(true)
    expect(targetTypes.has('message')).toBe(true)
    expect(targetTypes.has('email')).toBe(true)
  })

  it('retrieves scan by specific ID', () => {
    const scan = getMockScanById('sfx_mock_001_url_phish')
    expect(scan).toBeDefined()
    expect(scan?.target_type).toBe('url')
    expect(scan?.overall_risk_score).toBe(94)
    expect(scan?.verdict).toBe('malicious')
  })

  it('searches by keyword accurately', () => {
    const results = searchAndFilterMockScans('chase')
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0].target_content).toContain('chase')
  })

  it('filters by target type and risk level', () => {
    const urls = searchAndFilterMockScans('', 'url', 'low')
    expect(urls.every((s) => s.target_type === 'url' && s.risk_level === 'low')).toBe(true)
  })

  it('allows prepending new custom mock scans', () => {
    const customScan = {
      ...REALISTIC_MOCK_SCANS[0],
      id: 'custom_unit_test_scan',
      target_content: 'https://test-example-custom.io',
    }
    addMockScan(customScan)

    const retrieved = getMockScanById('custom_unit_test_scan')
    expect(retrieved).toBeDefined()
    expect(retrieved?.id).toBe('custom_unit_test_scan')
    expect(getMockScanHistory()[0].id).toBe('custom_unit_test_scan')
  })
})
