import { useState } from 'react'
import type { ScanRiskLevel, ScanTargetType } from '../../services/api'
import {
  getRecommendationsForRisk,
  type ActionChecklistItem,
} from '../../services/recommendationService'

interface PersonalizedRecommendationBoxProps {
  riskLevel: ScanRiskLevel
  targetType?: ScanTargetType
  className?: string
}

export default function PersonalizedRecommendationBox({
  riskLevel,
  targetType,
  className = '',
}: PersonalizedRecommendationBoxProps) {
  const plan = getRecommendationsForRisk(riskLevel, targetType)
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({})

  const toggleCheck = (id: string) => {
    setCompletedMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const completedCount = plan.checklist.filter((item) => completedMap[item.id]).length
  const progressPercent = Math.round((completedCount / plan.checklist.length) * 100)

  const priorityBadge = (priority: ActionChecklistItem['priority']) => {
    if (priority === 'immediate') {
      return (
        <span className="rounded-full bg-red-500/15 border border-red-500/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
          Immediate
        </span>
      )
    }
    if (priority === 'high') {
      return (
        <span className="rounded-full bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
          High
        </span>
      )
    }
    return (
      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
        Standard
      </span>
    )
  }

  return (
    <div
      className={`rounded-2xl border border-siftrix-gold/35 bg-siftrix-charcoal p-5 sm:p-6 text-siftrix-beige shadow-xl space-y-5 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-siftrix-charcoal-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-siftrix-gold animate-pulse" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-siftrix-champagne">
              Personalized Cyber Defense Protocol
            </p>
          </div>
          <h3 className="text-xl font-bold text-siftrix-white mt-1">
            {plan.title}
          </h3>
          <p className="text-xs text-[#C8C1B6] mt-0.5">
            {plan.subtitle}
          </p>
        </div>

        {/* Progress tracker */}
        <div className="rounded-xl border border-siftrix-gold/30 bg-[#1D1C22] p-3 text-right shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A59F94]">
            Action Checklist
          </p>
          <div className="flex items-baseline justify-end gap-1.5 mt-0.5">
            <span className="text-lg font-bold text-siftrix-champagne">
              {completedCount}
            </span>
            <span className="text-xs text-[#8E887E]">/ {plan.checklist.length} Done</span>
          </div>
          <div className="mt-1.5 h-1.5 w-24 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-siftrix-gold to-siftrix-champagne transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Advisory Quote */}
      <div className="rounded-xl border border-siftrix-gold/25 bg-[#2B2A32]/60 p-3.5 italic text-xs text-siftrix-champagne/90 flex items-start gap-2.5">
        <span className="text-base font-serif text-siftrix-gold select-none">“</span>
        <span>{plan.advisoryQuote}</span>
      </div>

      {/* Interactive Action Checklist */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-siftrix-champagne">
          Required Containment & Defense Steps:
        </h4>
        <div className="space-y-2.5">
          {plan.checklist.map((item) => {
            const isDone = Boolean(completedMap[item.id])
            return (
              <label
                key={item.id}
                className={`flex items-start gap-3 rounded-xl border p-3.5 transition-all cursor-pointer ${
                  isDone
                    ? 'border-emerald-500/40 bg-emerald-950/20 text-[#A3D9B1]'
                    : 'border-siftrix-charcoal-border bg-[#1E1D24] text-siftrix-beige hover:border-siftrix-gold/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => toggleCheck(item.id)}
                  className="mt-1 h-4 w-4 rounded border-siftrix-gold/50 text-siftrix-gold focus:ring-siftrix-gold/40 cursor-pointer"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`text-sm font-semibold ${
                        isDone ? 'line-through text-emerald-300' : 'text-siftrix-white'
                      }`}
                    >
                      {item.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#A59F94]">{item.timeEstimate}</span>
                      {priorityBadge(item.priority)}
                    </div>
                  </div>
                  <p className="text-xs text-[#B6AEA2] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* Technical Safeguards and Incident Guidelines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="rounded-xl border border-siftrix-charcoal-border bg-[#1D1C22] p-3.5 space-y-2">
          <h5 className="text-[11px] font-bold uppercase tracking-wider text-siftrix-champagne">
            Emergency Incident Steps
          </h5>
          <ul className="space-y-1.5 text-xs text-[#B8B1A5]">
            {plan.incidentSteps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-siftrix-gold font-bold">›</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-siftrix-charcoal-border bg-[#1D1C22] p-3.5 space-y-2">
          <h5 className="text-[11px] font-bold uppercase tracking-wider text-siftrix-champagne">
            Technical Perimeter Safeguards
          </h5>
          <ul className="space-y-1.5 text-xs text-[#B8B1A5]">
            {plan.technicalSafeguards.map((guard, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-siftrix-gold font-bold">✓</span>
                <span>{guard}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
