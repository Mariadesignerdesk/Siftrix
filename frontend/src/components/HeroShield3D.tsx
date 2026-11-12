import { useId, useState } from 'react'

interface HeroAgentNode {
  id: 'url_intelligence' | 'message_intelligence' | 'security_advisor'
  title: string
  shortRole: string
  detail: string
  desktopPositionClass: string
}

const HERO_AGENT_NODES: ReadonlyArray<HeroAgentNode> = [
  {
    id: 'url_intelligence',
    title: 'URL Intelligence',
    shortRole: 'Link & Domain Checks',
    detail:
      'Inspects URL schemes, SSRF boundaries, suspicious TLDs, and VirusTotal reputation signals.',
    desktopPositionClass: 'sm:top-1 sm:left-0',
  },
  {
    id: 'message_intelligence',
    title: 'Message Intelligence',
    shortRole: 'Scam & Lure Detection',
    detail:
      'Detects social-engineering urgency, credential traps, and prompt-injection manipulation.',
    desktopPositionClass: 'sm:top-1 sm:right-0',
  },
  {
    id: 'security_advisor',
    title: 'Security Advisor',
    shortRole: 'Bilingual Guidance',
    detail:
      'Synthesizes agent evidence into unified risk scoring and English + Urdu (اردو) guidance.',
    desktopPositionClass: 'sm:bottom-2 sm:left-1/2 sm:-translate-x-1/2',
  },
]

function AgentNodeIcon({
  id,
  isSelected,
}: {
  id: HeroAgentNode['id']
  isSelected: boolean
}) {
  const iconToneClass = isSelected ? 'text-[#1F1E22]' : 'text-siftrix-champagne'
  if (id === 'url_intelligence') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className={`h-4 w-4 ${iconToneClass}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8.5 11.5l3-3" />
        <path d="M7 14l-1.5 1.5a2.8 2.8 0 01-4-4L3 10a2.8 2.8 0 014 0" />
        <path d="M13 6l1.5-1.5a2.8 2.8 0 014 4L17 10a2.8 2.8 0 01-4 0" />
      </svg>
    )
  }

  if (id === 'message_intelligence') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className={`h-4 w-4 ${iconToneClass}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3.5 5.5A2 2 0 015.5 3.5h9a2 2 0 012 2v6.5a2 2 0 01-2 2H8l-4 3v-3a1.5 1.5 0 01-.5-1V5.5z" />
        <path d="M7 8h6M7 10.7h4" />
      </svg>
    )
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={`h-4 w-4 ${iconToneClass}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 2.5l6 2.5v4.5c0 3.9-2.5 7.2-6 8.5-3.5-1.3-6-4.6-6-8.5V5l6-2.5z" />
      <path d="M7.8 10.2l1.6 1.6 3.1-3.3" />
    </svg>
  )
}

/**
 * Open floating 3D brushed-silver and champagne-gold security shield suspended
 * directly above the Warm Beige / Pearl hero backdrop without an enclosing dark box.
 * Preserves all three interactive SIFTRIX AI agent nodes and subtle orbital motion.
 */
export default function HeroShield3D() {
  const uid = useId()
  const [selectedAgentId, setSelectedAgentId] =
    useState<HeroAgentNode['id']>('url_intelligence')

  const activeNode =
    HERO_AGENT_NODES.find((node) => node.id === selectedAgentId) ?? HERO_AGENT_NODES[0]

  const rimId = `hero-shield-rim-${uid}`
  const baseId = `hero-shield-base-${uid}`
  const leftFacetId = `hero-shield-left-${uid}`
  const rightFacetId = `hero-shield-right-${uid}`
  const glossId = `hero-shield-gloss-${uid}`
  const auraId = `hero-shield-aura-${uid}`
  const clipId = `hero-shield-clip-${uid}`

  return (
    <div className="relative w-full max-w-[36rem] flex flex-col items-center">
      {/* Open Orbital Constellation Stage */}
      <div className="relative w-full flex flex-col items-center sm:min-h-[26.5rem] sm:justify-center">
        {/* Radial Golden Studio Illumination Directly Behind Shield */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 sm:h-88 sm:w-88 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(216, 181, 109, 0.36) 0%, rgba(197, 161, 93, 0.16) 42%, rgba(240, 235, 226, 0) 72%)',
          }}
        />

        {/* Delicate Architectural Concentric Compass Ring (Desktop/Tablet Open Backdrop) */}
        <svg
          aria-hidden="true"
          viewBox="0 0 440 400"
          className="hidden sm:block pointer-events-none absolute inset-0 m-auto h-full w-full max-w-[30rem] opacity-90"
        >
          <circle
            cx="220"
            cy="192"
            r="164"
            fill="none"
            stroke="#C5A15D"
            strokeOpacity="0.22"
            strokeWidth="1"
          />
          <circle
            cx="220"
            cy="192"
            r="134"
            fill="none"
            stroke="#A77B32"
            strokeOpacity="0.24"
            strokeWidth="1"
            strokeDasharray="3 6"
          />
          {/* Subtle Orthogonal Technical Reticle Hairlines */}
          <line x1="36" y1="192" x2="72" y2="192" stroke="#C5A15D" strokeOpacity="0.34" strokeWidth="1" />
          <line x1="368" y1="192" x2="404" y2="192" stroke="#C5A15D" strokeOpacity="0.34" strokeWidth="1" />
          <line x1="220" y1="22" x2="220" y2="48" stroke="#C5A15D" strokeOpacity="0.3" strokeWidth="1" />
        </svg>

        {/* Delicate Gold Node Connector Traces (Desktop/Tablet) */}
        <svg
          aria-hidden="true"
          viewBox="0 0 540 390"
          className="pointer-events-none hidden sm:block absolute inset-0 h-full w-full"
        >
          {/* URL Intelligence -> Shield Left Shoulder */}
          <path
            d="M 118 66 C 148 112, 182 138, 222 154"
            fill="none"
            stroke={selectedAgentId === 'url_intelligence' ? '#A77B32' : '#C5A15D'}
            strokeOpacity={selectedAgentId === 'url_intelligence' ? '0.92' : '0.45'}
            strokeWidth={selectedAgentId === 'url_intelligence' ? '2' : '1.25'}
            strokeDasharray={selectedAgentId === 'url_intelligence' ? undefined : '4 4'}
          />
          <circle
            cx="222"
            cy="154"
            r={selectedAgentId === 'url_intelligence' ? '3.5' : '2.25'}
            fill={selectedAgentId === 'url_intelligence' ? '#D8B56D' : '#C5A15D'}
            stroke="#25252A"
            strokeWidth="1"
          />

          {/* Message Intelligence -> Shield Right Shoulder */}
          <path
            d="M 422 66 C 392 112, 358 138, 318 154"
            fill="none"
            stroke={selectedAgentId === 'message_intelligence' ? '#A77B32' : '#C5A15D'}
            strokeOpacity={selectedAgentId === 'message_intelligence' ? '0.92' : '0.45'}
            strokeWidth={selectedAgentId === 'message_intelligence' ? '2' : '1.25'}
            strokeDasharray={selectedAgentId === 'message_intelligence' ? undefined : '4 4'}
          />
          <circle
            cx="318"
            cy="154"
            r={selectedAgentId === 'message_intelligence' ? '3.5' : '2.25'}
            fill={selectedAgentId === 'message_intelligence' ? '#D8B56D' : '#C5A15D'}
            stroke="#25252A"
            strokeWidth="1"
          />

          {/* Security Advisor -> Shield Lower Apex */}
          <path
            d="M 270 326 L 270 282"
            fill="none"
            stroke={selectedAgentId === 'security_advisor' ? '#A77B32' : '#C5A15D'}
            strokeOpacity={selectedAgentId === 'security_advisor' ? '0.92' : '0.45'}
            strokeWidth={selectedAgentId === 'security_advisor' ? '2' : '1.25'}
            strokeDasharray={selectedAgentId === 'security_advisor' ? undefined : '4 4'}
          />
          <circle
            cx="270"
            cy="282"
            r={selectedAgentId === 'security_advisor' ? '3.5' : '2.25'}
            fill={selectedAgentId === 'security_advisor' ? '#D8B56D' : '#C5A15D'}
            stroke="#25252A"
            strokeWidth="1"
          />
        </svg>

        {/* Central Open Floating 3D Silver & Champagne-Gold Cybersecurity Shield */}
        <div
          className="relative w-48 h-54 sm:w-56 sm:h-62 md:w-60 md:h-66 my-3 sm:mt-10 sm:mb-14 shrink-0 flex items-center justify-center perspective-[1000px] group"
          role="img"
          aria-label="Security shield illustration"
        >
          {/* Floating Ground Reflection Shadow on Warm Studio Surface */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-3 inset-x-10 h-6 rounded-full bg-[#7A5E2B]/25 blur-lg"
          />

          {/* Outer Precision Radar Ring */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute w-54 h-54 sm:w-64 sm:h-64 rounded-full border border-dashed border-siftrix-antique/35 animate-siftrix-radar"
          />

          {/* Primary Tilted 3D Champagne Orbital Defense Ring */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute w-52 h-52 sm:w-68 sm:h-68 rounded-full border-[1.25px] border-siftrix-gold/55 animate-siftrix-orbit"
          >
            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-siftrix-champagne shadow-[0_0_10px_rgba(216,181,109,0.9)]" />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-siftrix-antique" />
          </div>

          {/* Secondary Counter-Orbital Ring */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full border border-siftrix-champagne/40 animate-siftrix-orbit-reverse"
          >
            <span className="absolute top-1/2 -right-1 -translate-y-1/2 h-2 w-2 rounded-full bg-siftrix-white border border-siftrix-antique" />
          </div>

          {/* Floating 3D Metallic Shield Stack */}
          <div className="relative w-40 h-46 sm:w-44 sm:h-50 md:w-48 md:h-54 animate-siftrix-float">
            <div className="relative w-full h-full transition-transform duration-500 ease-out group-hover:[transform:rotateY(-8deg)_rotateX(5deg)_scale(1.03)] motion-reduce:group-hover:transform-none">
              {/* Back 3D Deep Charcoal & Antique Bronze Extrusion */}
              <svg
                viewBox="0 0 220 250"
                aria-hidden="true"
                className="absolute inset-0 w-full h-full translate-x-2.5 translate-y-3 opacity-90"
              >
                <path
                  d="M110 12 L202 46 V116 C202 174 162 218 110 238 C58 218 18 174 18 116 V46 Z"
                  fill="#25252A"
                  stroke="#A77B32"
                  strokeWidth="2"
                />
              </svg>

              {/* Primary Brushed Silver & Champagne-Gold 3D Shield */}
              <svg
                viewBox="0 0 220 250"
                aria-hidden="true"
                className="relative w-full h-full drop-shadow-[0_22px_30px_rgba(37,37,42,0.28)]"
              >
                <defs>
                  <linearGradient id={rimId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FAF3DF" />
                    <stop offset="32%" stopColor="#D8B56D" />
                    <stop offset="68%" stopColor="#C5A15D" />
                    <stop offset="100%" stopColor="#8F6722" />
                  </linearGradient>

                  <linearGradient id={baseId} x1="14%" y1="6%" x2="86%" y2="94%">
                    <stop offset="0%" stopColor="#F8F5EF" />
                    <stop offset="46%" stopColor="#D4CEC4" />
                    <stop offset="100%" stopColor="#948E84" />
                  </linearGradient>

                  <linearGradient id={leftFacetId} x1="0%" y1="0%" x2="100%" y2="85%">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.82" />
                    <stop offset="60%" stopColor="#F7F3EC" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#D8B56D" stopOpacity="0.18" />
                  </linearGradient>

                  <linearGradient id={rightFacetId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3B3A42" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="#25252A" stopOpacity="0.48" />
                  </linearGradient>

                  <linearGradient id={glossId} x1="0%" y1="0%" x2="80%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.82" />
                    <stop offset="48%" stopColor="#F7F3EC" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#D8B56D" stopOpacity="0" />
                  </linearGradient>

                  <radialGradient id={auraId} cx="50%" cy="46%" r="50%">
                    <stop offset="0%" stopColor="#D8B56D" stopOpacity="0.34" />
                    <stop offset="62%" stopColor="#C5A15D" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#25252A" stopOpacity="0" />
                  </radialGradient>

                  <clipPath id={clipId}>
                    <path d="M110 18 L196 50 V116 C196 170 158 212 110 231 C62 212 24 170 24 116 V50 Z" />
                  </clipPath>
                </defs>

                {/* Chamfered Champagne Gold Armor Rim */}
                <path
                  d="M110 12 L202 46 V116 C202 174 162 218 110 238 C58 218 18 174 18 116 V46 Z"
                  fill={`url(#${baseId})`}
                  stroke={`url(#${rimId})`}
                  strokeWidth="4.5"
                />

                {/* Brushed Platinum-Silver & Warm Champagne Facets */}
                <g clipPath={`url(#${clipId})`}>
                  <path
                    d="M110 18 L24 50 V116 C24 170 62 212 110 231 Z"
                    fill={`url(#${leftFacetId})`}
                  />
                  <path
                    d="M110 18 L196 50 V116 C196 170 158 212 110 231 Z"
                    fill={`url(#${rightFacetId})`}
                  />

                  {/* Subtle Engraved Gold & Graphite Circuitry Traces */}
                  <path
                    d="M110 34 V74 M60 72 L86 92 M160 72 L134 92 M54 134 L82 134 M166 134 L138 134 M110 162 V210"
                    stroke="#585249"
                    strokeOpacity="0.65"
                    strokeWidth="1.45"
                    strokeLinecap="round"
                  />
                  <circle cx="60" cy="72" r="2.5" fill="#A77B32" />
                  <circle cx="160" cy="72" r="2.5" fill="#A77B32" />
                  <circle cx="54" cy="134" r="2.75" fill="#C5A15D" />
                  <circle cx="166" cy="134" r="2.75" fill="#C5A15D" />

                  <circle cx="110" cy="120" r="68" fill={`url(#${auraId})`} />

                  <polygon
                    points="14,32 142,14 96,124 14,96"
                    fill={`url(#${glossId})`}
                  />
                </g>

                {/* Inner Gold Inlay Bevel */}
                <path
                  d="M110 28 L184 56 V115 C184 162 152 199 110 216 C68 199 36 162 36 115 V56 Z"
                  fill="none"
                  stroke={`url(#${rimId})`}
                  strokeOpacity="0.82"
                  strokeWidth="1.4"
                />

                {/* Central Obsidian Core Framed in Luminous Champagne Gold */}
                <polygon
                  points="110,77 145,97 145,137 110,157 75,137 75,97"
                  fill="#25252A"
                  stroke={`url(#${rimId})`}
                  strokeWidth="2.8"
                />
                <polygon
                  points="110,85 137,101 137,133 110,149 83,133 83,101"
                  fill="#1B1B20"
                  stroke="#C5A15D"
                  strokeOpacity="0.65"
                  strokeWidth="1"
                />

                {/* Crisp Pearl Verified Shield Mark */}
                <path
                  d="M95 118 L106 129 L128 105"
                  fill="none"
                  stroke="#F7F3EC"
                  strokeWidth="4.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Three Floating Compact Charcoal Glass AI Agent Cards */}
        <div className="grid grid-cols-1 gap-2.5 w-full mt-2 sm:mt-0">
          {HERO_AGENT_NODES.map((node) => {
            const isSelected = node.id === selectedAgentId
            return (
              <button
                key={node.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedAgentId(node.id)}
                className={`siftrix-glass-charcoal sm:absolute ${node.desktopPositionClass} sm:w-[12.75rem] md:w-[13.5rem] text-left rounded-xl px-3.5 py-2.5 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-siftrix-champagne ${
                  isSelected
                    ? 'border-siftrix-champagne ring-1 ring-siftrix-champagne/45 shadow-[0_16px_34px_-12px_rgba(25,25,30,0.55),0_0_22px_rgba(216,181,109,0.22)] -translate-y-0.5'
                    : 'hover:border-siftrix-champagne/75 hover:-translate-y-0.5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-gradient-to-br from-[#EBD49E] via-[#D8B56D] to-[#A77B32] border-[#F5E5BD]'
                        : 'bg-[#1D1D22] border-siftrix-gold/40'
                    }`}
                  >
                    <AgentNodeIcon id={node.id} isSelected={isSelected} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <p className="text-xs font-semibold text-siftrix-white leading-snug">
                        {node.title}
                      </p>
                      {isSelected ? (
                        <span
                          aria-hidden="true"
                          className="h-2 w-2 shrink-0 rounded-full bg-siftrix-champagne animate-siftrix-pulse-slow"
                        />
                      ) : null}
                    </div>
                    <p className="text-[11px] text-[#CFC7B9] leading-snug mt-0.5">
                      {node.shortRole}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Compact Floating Active Agent Readout Pill (No Box Enclosure) */}
      <div className="siftrix-glass-charcoal mt-4 w-full max-w-[30rem] rounded-2xl px-4 py-3 text-left">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-siftrix-champagne">
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-siftrix-champagne" aria-hidden="true" />
            <span>Active Node: {activeNode.title}</span>
          </span>
          <span className="text-[#BDB5A7] font-medium normal-case tracking-normal">
            Live Multi-Agent Pipeline
          </span>
        </div>
        <p className="mt-1 text-xs text-[#E4DDD1] leading-relaxed">
          {activeNode.detail}
        </p>
      </div>
    </div>
  )
}
