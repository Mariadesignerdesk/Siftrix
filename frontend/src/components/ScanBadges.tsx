import type { ScanRiskLevel, ScanTargetType, ScanVerdict } from '../services/api'
import { getRiskLevelStyle, getVerdictStyle } from '../utils/scanPresentation'

export function VerdictBadge({
  verdict,
  withPrefix = true,
}: {
  verdict: ScanVerdict | string | undefined
  withPrefix?: boolean
}) {
  const style = getVerdictStyle(verdict)
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${style.badge}`}
    >
      {withPrefix ? `Verdict: ${style.label}` : style.label}
    </span>
  )
}

export function RiskLevelBadge({
  riskLevel,
  withPrefix = true,
}: {
  riskLevel: ScanRiskLevel | string | undefined
  withPrefix?: boolean
}) {
  const style = getRiskLevelStyle(riskLevel)
  const label = riskLevel || 'Unknown'
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border ${style}`}
    >
      {withPrefix ? `Risk Level: ${label}` : label}
    </span>
  )
}

export function TargetTypeBadge({
  targetType,
}: {
  targetType: ScanTargetType | string | undefined
}) {
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-siftrix-royal text-siftrix-soft border border-siftrix-electric/45 uppercase">
      {targetType || 'unknown'}
    </span>
  )
}
