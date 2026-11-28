import type { ScanVerdict } from '../services/api'
import { clampRiskScore } from '../utils/scanPresentation'

interface RiskGaugeRingProps {
  score: number
  verdict: ScanVerdict | string | undefined
  label?: string
  ariaLabel?: string
  compact?: boolean
}

/**
 * Circular Deep Charcoal + Metallic Gold Risk Score dial preserving semantic
 * Safe / Suspicious / Malicious stroke hues across sample and live scan reports.
 */
export default function RiskGaugeRing({
  score,
  verdict,
  label = 'Risk Score',
  ariaLabel = 'Overall risk score',
  compact = false,
}: RiskGaugeRingProps) {
  const clamped = clampRiskScore(score)
  const radius = 41
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - clamped / 100)

  const strokeColor =
    verdict === 'safe'
      ? '#10B981'
      : verdict === 'suspicious'
        ? '#F59E0B'
        : verdict === 'malicious'
          ? '#EF4444'
          : '#D8B56D'

  const numberTone =
    verdict === 'safe'
      ? 'text-emerald-400'
      : verdict === 'suspicious'
        ? 'text-amber-300'
        : verdict === 'malicious'
          ? 'text-red-400'
          : 'text-siftrix-champagne'

  return (
    <div
      className={`siftrix-card-charcoal relative flex flex-col items-center justify-center rounded-2xl shrink-0 ${
        compact ? 'px-4 py-3.5 min-w-[9.5rem]' : 'px-5 py-4 min-w-[11rem]'
      }`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-siftrix-champagne/65 to-transparent"
      />

      <div
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`relative flex items-center justify-center ${
          compact ? 'h-22 w-22' : 'h-26 w-26'
        }`}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r={radius + 5}
            fill="none"
            stroke="#C5A15D"
            strokeOpacity="0.22"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#3B3A42"
            strokeWidth="7.5"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="7.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-bold tracking-tight siftrix-tabular ${numberTone} ${
              compact ? 'text-xl' : 'text-2xl'
            }`}
          >
            {clamped}
          </span>
          <span className="text-[10.5px] font-medium text-[#ACA69E]">/ 100</span>
        </div>
      </div>

      <span className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-siftrix-champagne">
        {label}
      </span>
    </div>
  )
}
