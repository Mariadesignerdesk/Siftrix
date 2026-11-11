import { useState, type ReactNode } from 'react'
import type { AgentFindings, ScanResponse } from '../services/api'
import {
  clampRiskScore,
  formatFieldLabel,
  formatTimestamp,
  getVerdictStyle,
} from '../utils/scanPresentation'
import {
  loadLanguagePreference,
  type LanguageView,
} from '../utils/userPreferences'
import { RiskLevelBadge, TargetTypeBadge, VerdictBadge } from './ScanBadges'

interface ScanResultCardProps {
  result: ScanResponse
  showOverview?: boolean
  defaultOpenMetadata?: boolean
}

const CORE_AGENTS: ReadonlyArray<{
  key: keyof Pick<
    AgentFindings,
    'url_intelligence' | 'message_intelligence' | 'security_advisor'
  >
  title: string
}> = [
  { key: 'url_intelligence', title: 'URL Intelligence' },
  { key: 'message_intelligence', title: 'Message Intelligence' },
  { key: 'security_advisor', title: 'Security Advisor' },
]

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function getAgentStatus(value: unknown): {
  label: string
  tone: 'ok' | 'warn' | 'muted'
  detail?: string
} {
  if (value === null || value === undefined) {
    return { label: 'No Data', tone: 'muted', detail: 'Module did not return findings for this scan.' }
  }

  if (isPlainRecord(value)) {
    const entries = Object.entries(value)
    if (entries.length === 0) {
      return { label: 'Empty', tone: 'muted', detail: 'No indicators recorded by this module.' }
    }

    const rawError = value.error
    if (typeof rawError === 'string' && rawError.trim()) {
      return { label: 'Provider Incomplete', tone: 'warn', detail: rawError }
    }
    if (rawError === true) {
      return { label: 'Provider Incomplete', tone: 'warn', detail: 'This analysis module encountered an error.' }
    }

    const rawStatus = typeof value.status === 'string' ? value.status.toLowerCase() : ''
    if (['error', 'failed', 'unavailable', 'timeout', 'partial', 'degraded'].includes(rawStatus)) {
      return {
        label: formatFieldLabel(rawStatus),
        tone: 'warn',
        detail: typeof value.message === 'string' ? value.message : undefined,
      }
    }
    if (['skipped', 'not_applicable', 'disabled'].includes(rawStatus)) {
      return {
        label: formatFieldLabel(rawStatus),
        tone: 'muted',
        detail: typeof value.message === 'string' ? value.message : undefined,
      }
    }
  }

  return { label: 'Completed', tone: 'ok' }
}

function detectIncompleteProviders(result: ScanResponse): string[] {
  const notices: string[] = []

  const hasEnSummary = typeof result.summary?.en === 'string' && result.summary.en.trim().length > 0
  const hasUrSummary = typeof result.summary?.ur === 'string' && result.summary.ur.trim().length > 0

  if (!hasEnSummary && !hasUrSummary) {
    notices.push('Summary text was not provided by the analysis backend.')
  } else if (!hasEnSummary) {
    notices.push('English summary is missing from this response.')
  } else if (!hasUrSummary) {
    notices.push('Urdu summary is missing from this response.')
  }

  const enRecs = Array.isArray(result.recommendations?.en)
    ? result.recommendations.en.filter((item) => typeof item === 'string' && item.trim())
    : []
  const urRecs = Array.isArray(result.recommendations?.ur)
    ? result.recommendations.ur.filter((item) => typeof item === 'string' && item.trim())
    : []

  if (!result.recommendations || typeof result.recommendations !== 'object') {
    notices.push('Recommendations were not returned by the analysis backend.')
  } else if (enRecs.length > 0 && urRecs.length === 0) {
    notices.push('Urdu recommendations are missing from this response.')
  } else if (urRecs.length > 0 && enRecs.length === 0) {
    notices.push('English recommendations are missing from this response.')
  }

  const findings = result.agent_findings
  if (!isPlainRecord(findings)) {
    notices.push('Detailed agent findings were not included in the response.')
    return notices
  }

  let populatedModules = 0
  for (const agent of CORE_AGENTS) {
    const moduleData = findings[agent.key]
    const status = getAgentStatus(moduleData)
    if (status.tone === 'warn') {
      notices.push(`${agent.title}: ${status.detail || status.label}`)
    }
    if (moduleData !== null && moduleData !== undefined && (!isPlainRecord(moduleData) || Object.keys(moduleData).length > 0)) {
      populatedModules += 1
    }
  }

  if (populatedModules === 0) {
    notices.push('No detailed module findings were returned by the AI agents.')
  }

  return notices
}

function renderValue(value: unknown, depth = 0): ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-siftrix-royal/75 italic">None</span>
  }

  if (typeof value === 'boolean') {
    return (
      <span
        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
          value
            ? 'bg-siftrix-electric/25 text-siftrix-navy border border-siftrix-electric/50'
            : 'bg-siftrix-royal/10 text-siftrix-royal'
        }`}
      >
        {value ? 'Yes' : 'No'}
      </span>
    )
  }

  if (typeof value === 'number') {
    return <span className="font-mono text-siftrix-navy">{value}</span>
  }

  if (typeof value === 'string') {
    return <span className="text-siftrix-navy break-words">{value || '—'}</span>
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-siftrix-royal/75 italic">None</span>
    }

    const allPrimitives = value.every(
      (item) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
    )

    if (allPrimitives) {
      return (
        <ul className="list-disc list-inside space-y-1 text-siftrix-navy">
          {value.map((item, idx) => (
            <li key={idx} className="break-words">
              {String(item)}
            </li>
          ))}
        </ul>
      )
    }

    if (depth >= 2) {
      return (
        <pre className="text-xs bg-siftrix-navy text-siftrix-soft p-2 rounded border border-siftrix-royal overflow-x-auto">
          {JSON.stringify(value, null, 2)}
        </pre>
      )
    }

    return (
      <div className="space-y-2 mt-1">
        {value.map((item, idx) => (
          <div key={idx} className="bg-siftrix-soft p-2.5 rounded-lg border border-siftrix-lavender text-xs">
            {renderValue(item, depth + 1)}
          </div>
        ))}
      </div>
    )
  }

  if (isPlainRecord(value)) {
    const entries = Object.entries(value)
    if (entries.length === 0) {
      return <span className="text-siftrix-royal/75 italic">Empty</span>
    }

    if (depth >= 2) {
      return (
        <pre className="text-xs bg-siftrix-navy text-siftrix-soft p-2 rounded border border-siftrix-royal overflow-x-auto">
          {JSON.stringify(value, null, 2)}
        </pre>
      )
    }

    return (
      <dl className="space-y-1.5">
        {entries.map(([subKey, subVal]) => (
          <div key={subKey} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
            <dt className="text-xs font-semibold text-siftrix-royal shrink-0 sm:min-w-28">
              {formatFieldLabel(subKey)}:
            </dt>
            <dd className="text-xs text-siftrix-navy min-w-0 flex-1">
              {renderValue(subVal, depth + 1)}
            </dd>
          </div>
        ))}
      </dl>
    )
  }

  return <span className="text-siftrix-navy">{String(value)}</span>
}

export default function ScanResultCard({
  result,
  showOverview = true,
  defaultOpenMetadata = false,
}: ScanResultCardProps) {
  const [languageView, setLanguageView] = useState<LanguageView>(() =>
    loadLanguagePreference()
  )

  const clampedScore = clampRiskScore(result.overall_risk_score)
  const verdictStyle = getVerdictStyle(result.verdict)

  const enSummary = result.summary?.en?.trim() || ''
  const urSummary = result.summary?.ur?.trim() || ''
  const enRecommendations = Array.isArray(result.recommendations?.en)
    ? result.recommendations.en.filter((item) => typeof item === 'string' && item.trim())
    : []
  const urRecommendations = Array.isArray(result.recommendations?.ur)
    ? result.recommendations.ur.filter((item) => typeof item === 'string' && item.trim())
    : []

  const incompleteNotices = detectIncompleteProviders(result)
  const findingsRecord = isPlainRecord(result.agent_findings) ? result.agent_findings : {}
  const extraAgentKeys = Object.keys(findingsRecord).filter(
    (key) =>
      key !== 'url_intelligence' &&
      key !== 'message_intelligence' &&
      key !== 'security_advisor' &&
      key !== 'raw_metadata'
  )

  const agentPanels = [
    ...CORE_AGENTS.map((agent) => ({
      key: agent.key,
      title: agent.title,
      data: findingsRecord[agent.key],
    })),
    ...extraAgentKeys.map((key) => ({
      key,
      title: formatFieldLabel(key),
      data: findingsRecord[key],
    })),
  ]

  const hasRawMetadata =
    findingsRecord.raw_metadata !== null &&
    findingsRecord.raw_metadata !== undefined &&
    (!isPlainRecord(findingsRecord.raw_metadata) ||
      Object.keys(findingsRecord.raw_metadata).length > 0)

  return (
    <div
      role="region"
      aria-label="Threat analysis results"
      className={`siftrix-card-3d p-5 md:p-8 rounded-2xl text-left space-y-6 ${
        showOverview ? 'mt-6' : ''
      }`}
    >
      {showOverview ? (
        <>
          {/* Header: Verdict, Risk Level, Score */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-siftrix-lavender/80">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <VerdictBadge verdict={result.verdict} />
                <RiskLevelBadge riskLevel={result.risk_level} />
                <TargetTypeBadge targetType={result.target_type} />
              </div>

              <p className="text-xs text-siftrix-royal">
                Analyzed on {formatTimestamp(result.created_at)}
                {result.id ? (
                  <span className="ml-2 font-mono text-[11px] text-siftrix-royal/85">
                    ID: {result.id.slice(0, 8)}
                  </span>
                ) : null}
              </p>
            </div>

            <div className="siftrix-panel-inset px-4 py-3 rounded-xl min-w-44">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-semibold text-siftrix-royal uppercase">Risk Score</span>
                <span className="text-2xl font-bold text-siftrix-navy">
                  {clampedScore}
                  <span className="text-sm font-normal text-siftrix-royal">/100</span>
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Overall risk score"
                aria-valuenow={clampedScore}
                aria-valuemin={0}
                aria-valuemax={100}
                className="w-full h-2 bg-siftrix-navy/15 rounded-full overflow-hidden mt-2"
              >
                <div
                  className={`h-full rounded-full transition-all duration-300 ${verdictStyle.bar}`}
                  style={{ width: `${clampedScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Analyzed Target Preview */}
          {result.target_content ? (
            <div className="siftrix-panel-inset px-4 py-3 rounded-xl">
              <span className="text-xs font-semibold text-siftrix-royal uppercase block mb-1">
                Scanned Content
              </span>
              <p
                className={`text-sm text-siftrix-navy line-clamp-3 ${
                  result.target_type === 'url' ? 'break-all' : 'break-words'
                }`}
              >
                {result.target_content}
              </p>
            </div>
          ) : null}
        </>
      ) : null}

      {/* Incomplete Provider Results Notice */}
      {incompleteNotices.length > 0 ? (
        <div
          role="status"
          className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded-xl text-xs space-y-1"
        >
          <p className="font-semibold">Partial Analysis Notice</p>
          <ul className="list-disc list-inside space-y-0.5 text-amber-800">
            {incompleteNotices.map((notice, index) => (
              <li key={index}>{notice}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Bilingual Summary & Recommendations Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-siftrix-navy">
            Analysis Summary & Recommendations
          </h3>
          <div
            role="group"
            aria-label="Result language view"
            className="inline-flex rounded-lg siftrix-panel-inset p-1 self-start"
          >
            {(
              [
                { id: 'all', label: 'Both' },
                { id: 'en', label: 'English' },
                { id: 'ur', label: 'اردو' },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setLanguageView(option.id)}
                aria-pressed={languageView === option.id}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric ${
                  languageView === option.id
                    ? 'bg-siftrix-electric text-siftrix-navy shadow-[0_0_12px_rgba(139,109,255,0.35)]'
                    : 'text-siftrix-royal hover:text-siftrix-navy'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div
          className={`grid gap-4 ${
            languageView === 'all' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {languageView === 'all' || languageView === 'en' ? (
            <div lang="en" dir="ltr" className="p-4 rounded-xl siftrix-panel-inset">
              <h4 className="text-xs font-bold uppercase tracking-wide text-siftrix-royal mb-2">
                Summary (English)
              </h4>
              {enSummary ? (
                <p className="text-sm text-siftrix-navy leading-relaxed">{enSummary}</p>
              ) : (
                <p className="text-sm text-siftrix-royal/85 italic">
                  English summary was not returned by the analysis provider.
                </p>
              )}
            </div>
          ) : null}

          {languageView === 'all' || languageView === 'ur' ? (
            <div
              lang="ur"
              dir="rtl"
              className="p-4 rounded-xl siftrix-panel-inset text-right"
            >
              <h4 className="text-xs font-bold text-siftrix-royal mb-2">
                خلاصہ (اردو)
              </h4>
              {urSummary ? (
                <p className="text-sm text-siftrix-navy leading-relaxed">{urSummary}</p>
              ) : (
                <p className="text-sm text-siftrix-royal/85 italic">
                  تجزیاتی خلاصہ اس وقت دستیاب نہیں ہے۔
                </p>
              )}
            </div>
          ) : null}
        </div>

        {/* Recommendations */}
        <div
          className={`grid gap-4 ${
            languageView === 'all' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {languageView === 'all' || languageView === 'en' ? (
            <div lang="en" dir="ltr" className="p-4 rounded-xl border border-siftrix-lavender bg-white/55">
              <h4 className="text-xs font-bold uppercase tracking-wide text-siftrix-navy mb-2.5">
                Recommendations (English)
              </h4>
              {enRecommendations.length > 0 ? (
                <ul className="space-y-2 text-sm text-siftrix-navy">
                  {enRecommendations.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-siftrix-royal font-bold mt-0.5 shrink-0">✓</span>
                      <span className="break-words min-w-0 flex-1">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-siftrix-royal/85 italic">
                  No specific recommendations provided.
                </p>
              )}
            </div>
          ) : null}

          {languageView === 'all' || languageView === 'ur' ? (
            <div
              lang="ur"
              dir="rtl"
              className="p-4 rounded-xl border border-siftrix-lavender bg-white/55 text-right"
            >
              <h4 className="text-xs font-bold text-siftrix-navy mb-2.5">
                تجاویز (اردو)
              </h4>
              {urRecommendations.length > 0 ? (
                <ul className="space-y-2 text-sm text-siftrix-navy">
                  {urRecommendations.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-siftrix-royal font-bold mt-0.5 shrink-0">✓</span>
                      <span className="break-words min-w-0 flex-1">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-siftrix-royal/85 italic">
                  کوئی مخصوص تجاویز فراہم نہیں کی گئیں۔
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Agent Findings */}
      <div className="space-y-3 pt-2 border-t border-siftrix-lavender/80">
        <h3 className="text-lg font-bold text-siftrix-navy">Agent Findings</h3>

        <div className="grid grid-cols-1 gap-3">
          {agentPanels.map((panel) => {
            const status = getAgentStatus(panel.data)
            const statusBadgeClass =
              status.tone === 'ok'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : status.tone === 'warn'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-siftrix-royal/12 text-siftrix-royal border-siftrix-lavender'
            const hasExtraFields =
              isPlainRecord(panel.data) &&
              Object.keys(panel.data).some(
                (key) => key !== 'status' && key !== 'error' && key !== 'message'
              )

            return (
              <div
                key={panel.key}
                className="p-4 rounded-xl siftrix-panel-inset space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-siftrix-navy break-words min-w-0">{panel.title}</h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap shrink-0 ${statusBadgeClass}`}
                  >
                    {status.label}
                  </span>
                </div>

                {status.tone !== 'ok' && status.detail ? (
                  <p
                    className={`text-xs italic ${
                      status.tone === 'warn' ? 'text-amber-800' : 'text-siftrix-royal'
                    }`}
                  >
                    {status.detail}
                  </p>
                ) : null}

                {status.tone === 'ok' || hasExtraFields ? (
                  <div className="text-xs text-siftrix-navy">{renderValue(panel.data)}</div>
                ) : null}
              </div>
            )
          })}
        </div>

        {/* Raw Metadata Disclosure */}
        {hasRawMetadata ? (
          <details
            open={defaultOpenMetadata ? true : undefined}
            className="rounded-xl siftrix-panel-inset p-3"
          >
            <summary className="text-xs font-semibold text-siftrix-royal cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-electric rounded">
              Raw Metadata
            </summary>
            <pre className="mt-3 text-xs text-siftrix-soft bg-siftrix-navy p-3 rounded-lg border border-siftrix-royal overflow-x-auto max-h-64">
              {JSON.stringify(findingsRecord.raw_metadata, null, 2)}
            </pre>
          </details>
        ) : !showOverview ? (
          <div className="rounded-xl siftrix-panel-inset p-3 text-xs text-siftrix-royal/85 italic">
            Agent Metadata: No raw metadata returned for this scan.
          </div>
        ) : null}
      </div>
    </div>
  )
}
