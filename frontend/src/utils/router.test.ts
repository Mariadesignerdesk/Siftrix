import { describe, it, expect, vi } from 'vitest'
import {
  getLandingSectionIdFromHash,
  handleSpaLinkClick,
  parseRoutePath,
} from './router'
import { clampRiskScore, formatFieldLabel } from './scanPresentation'

describe('router and scan presentation utilities', () => {
  it('parses landing, dashboard, scan history, and scan details paths accurately', () => {
    expect(parseRoutePath('/')).toEqual({ page: 'home' })
    expect(parseRoutePath('')).toEqual({ page: 'home' })
    expect(parseRoutePath('/dashboard')).toEqual({ page: 'dashboard' })
    expect(parseRoutePath('/dashboard/')).toEqual({ page: 'dashboard' })
    expect(parseRoutePath('/scans')).toEqual({ page: 'history' })
    expect(parseRoutePath('/scans/')).toEqual({ page: 'history' })
    expect(parseRoutePath('/settings')).toEqual({ page: 'settings' })
    expect(parseRoutePath('/settings/')).toEqual({ page: 'settings' })
    expect(parseRoutePath('/scans/abc-123')).toEqual({
      page: 'scan-details',
      scanId: 'abc-123',
    })
    expect(
      parseRoutePath('/scans/11111111-1111-1111-1111-111111111111')
    ).toEqual({
      page: 'scan-details',
      scanId: '11111111-1111-1111-1111-111111111111',
    })
    expect(parseRoutePath('/scans/scan%2042/')).toEqual({
      page: 'scan-details',
      scanId: 'scan 42',
    })
    expect(parseRoutePath('/scans/nested/extra')).toEqual({ page: 'home' })
    expect(parseRoutePath('/unknown-route')).toEqual({ page: 'home' })
  })

  it('extracts valid landing section IDs from URL hashes for history scroll restoration', () => {
    expect(getLandingSectionIdFromHash('#features')).toBe('features')
    expect(getLandingSectionIdFromHash('#about')).toBe('about')
    expect(getLandingSectionIdFromHash('#scan')).toBe('scan')
    expect(getLandingSectionIdFromHash('#home')).toBe('home')
    expect(getLandingSectionIdFromHash('features')).toBe('features')
    expect(getLandingSectionIdFromHash('')).toBeNull()
    expect(getLandingSectionIdFromHash('#unknown')).toBeNull()
  })

  it('handles internal SPA anchor clicks while preserving modifier clicks', () => {
    const onNavigate = vi.fn()
    const preventDefault = vi.fn()

    handleSpaLinkClick(
      {
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        button: 0,
        preventDefault,
      },
      onNavigate,
      '/scans'
    )
    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(onNavigate).toHaveBeenCalledWith('/scans', undefined)

    preventDefault.mockClear()
    onNavigate.mockClear()

    handleSpaLinkClick(
      {
        metaKey: false,
        ctrlKey: true,
        shiftKey: false,
        altKey: false,
        button: 0,
        preventDefault,
      },
      onNavigate,
      '/dashboard'
    )
    expect(preventDefault).not.toHaveBeenCalled()
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('clamps risk scores within 0-100', () => {
    expect(clampRiskScore(-5)).toBe(0)
    expect(clampRiskScore(42.6)).toBe(43)
    expect(clampRiskScore(120)).toBe(100)
    expect(clampRiskScore(Number.NaN)).toBe(0)
  })

  it('formats snake_case keys cleanly into labels', () => {
    expect(formatFieldLabel('url_intelligence')).toBe('Url Intelligence')
    expect(formatFieldLabel('domain-age_days')).toBe('Domain Age Days')
  })
})
