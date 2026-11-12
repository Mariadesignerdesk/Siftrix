import type { NavigateFn } from '../utils/router'

interface CommandCenterPreviewProps {
  onNavigate: NavigateFn
}

const BLUEPRINT_POINTS = [
  { label: 'Scan 01', x: 30, y: 128, score: 14, color: '#10B981' },
  { label: 'Scan 02', x: 105, y: 112, score: 22, color: '#10B981' },
  { label: 'Scan 03', x: 180, y: 74, score: 58, color: '#F59E0B' },
  { label: 'Scan 04', x: 255, y: 118, score: 18, color: '#10B981' },
  { label: 'Scan 05', x: 330, y: 38, score: 86, color: '#EF4444' },
  { label: 'Scan 06', x: 405, y: 56, score: 69, color: '#F59E0B' },
  { label: 'Scan 07', x: 480, y: 130, score: 11, color: '#10B981' },
] as const

const BLUEPRINT_VERDICTS = [
  {
    label: 'Safe',
    percent: '57%',
    barClass: 'bg-emerald-500',
    textClass: 'text-emerald-300',
    width: '57%',
  },
  {
    label: 'Suspicious',
    percent: '29%',
    barClass: 'bg-amber-400',
    textClass: 'text-amber-300',
    width: '29%',
  },
  {
    label: 'Malicious',
    percent: '14%',
    barClass: 'bg-red-500',
    textClass: 'text-red-300',
    width: '14%',
  },
] as const

/**
 * Editorial preview showcasing the SIFTRIX Security Dashboard architecture
 * inside a Deep Charcoal glass viewport with Champagne Gold charts and honest
 * sample-blueprint framing, linking cleanly to the live /dashboard view.
 */
export default function CommandCenterPreview({
  onNavigate,
}: CommandCenterPreviewProps) {
  const polylinePoints = BLUEPRINT_POINTS.map((p) => `${p.x},${p.y}`).join(' ')
  const areaPath = `M ${BLUEPRINT_POINTS[0].x} 152 L ${BLUEPRINT_POINTS.map(
    (p) => `${p.x} ${p.y}`
  ).join(' L ')} L ${BLUEPRINT_POINTS[BLUEPRINT_POINTS.length - 1].x} 152 Z`

  return (
    <section
      id="command-center"
      aria-label="Command Center Preview"
      className="relative overflow-hidden bg-siftrix-charcoal text-siftrix-pearl px-5 sm:px-6 md:px-10 py-18 md:py-22 border-b border-siftrix-charcoal-border"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 siftrix-charcoal-grid opacity-55"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-siftrix-gold/12 blur-3xl"
      />

      <div className="relative z-10 max-w-7xl mx-auto space-y-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-siftrix-gold/45 bg-[#1D1D22] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-siftrix-champagne mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-siftrix-champagne" aria-hidden="true" />
              Command Center Preview
            </span>

            <h2 className="text-3xl sm:text-4xl font-bold text-siftrix-white tracking-tight">
              Visibility Across{' '}
              <span className="font-editorial italic font-bold siftrix-gold-text pr-1">
                Every Verdict
              </span>
            </h2>

            <p className="text-[#CBC4B9] mt-3 text-base sm:text-lg leading-relaxed">
              Review scan statistics, verdict breakdowns, risk trajectories, and backend
              health from the live SIFTRIX Security Dashboard and Audit History.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('/scans')}
              className="siftrix-btn-charcoal-outline px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-champagne"
            >
              View Scan History
            </button>

            <button
              type="button"
              onClick={() => onNavigate('/dashboard')}
              className="siftrix-btn-gold px-6 py-2.5 rounded-xl text-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-siftrix-charcoal focus-visible:ring-siftrix-champagne"
            >
              Open Live Dashboard →
            </button>
          </div>
        </div>

        {/* Executive Command Preview Panel (Explicitly Labeled Blueprint Architecture) */}
        <div className="siftrix-card-charcoal relative overflow-hidden rounded-2xl p-5 sm:p-7">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-siftrix-champagne/70 to-transparent"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-siftrix-charcoal-border">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full border border-siftrix-gold/50 bg-[#1B1B20] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-siftrix-champagne">
                Sample Layout Preview
              </span>
              <span className="text-xs text-[#BEB7AC]">
                Illustrative metrics showcase · Live data connects in Dashboard
              </span>
            </div>

            <span className="font-mono text-[11px] text-siftrix-champagne/90">
              Endpoints: GET /api/history · GET /api/health
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Gold-Accented Risk Trajectory Chart */}
            <div className="min-w-0 lg:col-span-7 siftrix-panel-charcoal-inset rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-siftrix-white">
                    Risk Index Trajectory (Blueprint Example)
                  </h3>
                  <p className="text-xs text-[#ACA69E] mt-0.5">
                    0–100 AI threat severity plotted across scanned targets
                  </p>
                </div>
                <span className="rounded-md bg-[#1B1B20] border border-siftrix-gold/40 px-2.5 py-1 text-[11px] font-semibold text-siftrix-champagne">
                  Multi-Agent Scoring
                </span>
              </div>

              <svg
                viewBox="0 0 510 165"
                aria-label="Illustrative risk score trajectory blueprint chart"
                className="w-full h-auto min-h-[9.5rem]"
              >
                <defs>
                  <linearGradient id="cmd-preview-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D8B56D" stopOpacity="0.34" />
                    <stop offset="100%" stopColor="#D8B56D" stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {[32, 72, 112, 152].map((y) => (
                  <line
                    key={y}
                    x1="20"
                    y1={y}
                    x2="495"
                    y2={y}
                    stroke="#3D3C44"
                    strokeDasharray="3 4"
                    strokeWidth="1"
                  />
                ))}

                <path d={areaPath} fill="url(#cmd-preview-area)" />
                <polyline
                  fill="none"
                  stroke="#D8B56D"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={polylinePoints}
                />

                {BLUEPRINT_POINTS.map((point) => (
                  <g key={point.label}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="5"
                      fill="#1D1D22"
                      stroke={point.color}
                      strokeWidth="2.25"
                    />
                    <text
                      x={point.x}
                      y={point.y - 10}
                      textAnchor="middle"
                      fill="#E5DED2"
                      fontSize="9.5"
                      fontFamily="monospace"
                    >
                      {point.score}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            {/* Semantic Verdict Distribution + 3 Agent Orchestration Summary */}
            <div className="min-w-0 lg:col-span-5 flex flex-col justify-between gap-4">
              <div className="siftrix-panel-charcoal-inset rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-siftrix-white">
                    Verdict Distribution
                  </h3>
                  <span className="text-[11px] text-[#ACA69E]">Semantic Signal Key</span>
                </div>

                <div className="h-3 w-full rounded-full bg-[#1B1B20] border border-siftrix-charcoal-border overflow-hidden flex">
                  {BLUEPRINT_VERDICTS.map((item) => (
                    <div
                      key={item.label}
                      className={`${item.barClass} h-full`}
                      style={{ width: item.width }}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {BLUEPRINT_VERDICTS.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl bg-[#1B1B20] border border-siftrix-charcoal-border px-3 py-2"
                    >
                      <p className="text-[11px] text-[#BFB8AC]">{item.label}</p>
                      <p className={`text-sm font-bold siftrix-tabular mt-0.5 ${item.textClass}`}>
                        {item.percent}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="siftrix-panel-charcoal-inset rounded-2xl p-5 space-y-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-siftrix-champagne">
                  Live Session Intelligence
                </p>
                <p className="text-xs sm:text-sm text-[#D5CEC2] leading-relaxed">
                  Your scans persist automatically per browser <code className="font-mono text-siftrix-champagne">X-Session-ID</code> and appear live in the Security Dashboard and Scan History pages.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
