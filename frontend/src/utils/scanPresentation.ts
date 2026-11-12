import type { ScanRiskLevel, ScanVerdict } from '../services/api'

export const VERDICT_STYLES: Record<
  ScanVerdict,
  { badge: string; bar: string; label: string }
> = {
  safe: {
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    bar: 'bg-emerald-600',
    label: 'Safe',
  },
  suspicious: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    bar: 'bg-amber-500',
    label: 'Suspicious',
  },
  malicious: {
    badge: 'bg-red-50 text-red-700 border-red-200',
    bar: 'bg-red-600',
    label: 'Malicious',
  },
}

export const RISK_LEVEL_STYLES: Record<ScanRiskLevel, string> = {
  low: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  medium: 'bg-amber-50 text-amber-800 border-amber-200',
  high: 'bg-red-50 text-red-700 border-red-200',
  critical: 'bg-red-100 text-red-900 border-red-300',
}

export function formatFieldLabel(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function formatTimestamp(isoString: string | undefined): string {
  if (!isoString) return 'Timestamp unavailable'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return isoString
  return date.toLocaleString()
}

export function clampRiskScore(score: number): number {
  if (typeof score !== 'number' || Number.isNaN(score)) return 0
  return Math.min(100, Math.max(0, Math.round(score)))
}

export function getVerdictStyle(verdict: ScanVerdict | string | undefined) {
  if (verdict && verdict in VERDICT_STYLES) {
    return VERDICT_STYLES[verdict as ScanVerdict]
  }
  return {
    badge: 'bg-siftrix-sand text-siftrix-graphite border-siftrix-border',
    bar: 'bg-siftrix-muted',
    label: formatFieldLabel(String(verdict || 'Unknown')),
  }
}

export function getRiskLevelStyle(riskLevel: ScanRiskLevel | string | undefined): string {
  if (riskLevel && riskLevel in RISK_LEVEL_STYLES) {
    return RISK_LEVEL_STYLES[riskLevel as ScanRiskLevel]
  }
  return 'bg-siftrix-sand text-siftrix-graphite border-siftrix-border'
}
