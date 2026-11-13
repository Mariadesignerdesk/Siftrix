import { describe, it, expect } from 'vitest'
import {
  getAllRiskScenarios,
  getRecommendationsForRisk,
} from './recommendationService'

describe('recommendationService', () => {
  it('provides comprehensive recommendations for all 4 risk tiers', () => {
    const all = getAllRiskScenarios()
    expect(all.low).toBeDefined()
    expect(all.medium).toBeDefined()
    expect(all.high).toBeDefined()
    expect(all.critical).toBeDefined()
  })

  it('delivers actionable checklists for low risk', () => {
    const low = getRecommendationsForRisk('low')
    expect(low.riskLevel).toBe('low')
    expect(low.checklist.length).toBeGreaterThanOrEqual(3)
    expect(low.incidentSteps.length).toBeGreaterThan(0)
    expect(low.technicalSafeguards.length).toBeGreaterThan(0)
    expect(low.advisoryQuote).toBeDefined()
  })

  it('delivers immediate containment protocol for critical risk', () => {
    const crit = getRecommendationsForRisk('critical')
    expect(crit.riskLevel).toBe('critical')
    expect(crit.title).toContain('Critical')
    expect(crit.checklist.some((c) => c.priority === 'immediate')).toBe(true)
    expect(crit.threatSummary).toContain('CRITICAL')
  })

  it('falls back gracefully to medium on invalid risk level', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fallback = getRecommendationsForRisk('unknown_risk' as any)
    expect(fallback.riskLevel).toBe('medium')
  })
})
