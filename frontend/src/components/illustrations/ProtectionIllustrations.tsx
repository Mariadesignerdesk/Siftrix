import type { FC } from 'react'

export interface IllustrationProps {
  className?: string
}

/**
 * Illustration 1: Cybersecurity Analyst Examining a Suspicious Message
 * Features:
 * - Professional cybersecurity analyst with AR visor examining an incoming message.
 * - Floating suspicious message card with urgency warning and suspicious link.
 * - Precision inspection loupe with scanning reticle and teal analysis beams.
 * - Ivory, champagne gold, deep charcoal, and subtle teal accents.
 */
export const AnalystMessageInspectionSvg: FC<IllustrationProps> = ({ className = 'w-full h-full' }) => (
  <svg
    viewBox="0 0 360 180"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Cybersecurity analyst examining a suspicious message"
  >
    <defs>
      <linearGradient id="ami_gold_grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F6E6BC" />
        <stop offset="45%" stopColor="#D5B36B" />
        <stop offset="100%" stopColor="#A77B32" />
      </linearGradient>

      <linearGradient id="ami_teal_beam" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.85" />
        <stop offset="50%" stopColor="#2DD4BF" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#14B8A6" stopOpacity="0.05" />
      </linearGradient>

      <linearGradient id="ami_card_bg_light" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#FAF6EF" stopOpacity="0.98" />
      </linearGradient>

      <radialGradient id="ami_ambient_glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#D5B36B" stopOpacity="0.22" />
        <stop offset="60%" stopColor="#14B8A6" stopOpacity="0.08" />
        <stop offset="100%" stopColor="#D5B36B" stopOpacity="0" />
      </radialGradient>

      <filter id="ami_subtle_shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#18181D" floodOpacity="0.18" />
      </filter>
    </defs>

    {/* Ambient Backdrop Glow */}
    <ellipse cx="180" cy="90" rx="150" ry="75" fill="url(#ami_ambient_glow)" />

    {/* Subtle Background Circuit & Scanning Grid Lines */}
    <g opacity="0.4">
      <path d="M 30 145 H 330" stroke="#D5B36B" strokeWidth="0.75" strokeDasharray="3 4" />
      <path d="M 40 160 H 320" stroke="#D5B36B" strokeWidth="0.5" strokeDasharray="2 5" />
      <path d="M 105 35 V 145" stroke="#D5B36B" strokeWidth="0.75" strokeDasharray="4 6" opacity="0.3" />
      <path d="M 235 25 V 145" stroke="#D5B36B" strokeWidth="0.75" strokeDasharray="4 6" opacity="0.3" />
    </g>

    {/* LEFT SIDE: Professional Cybersecurity Analyst */}
    <g transform="translate(48, 40)">
      {/* Analyst Torso & Professional Coat */}
      <path
        d="M 12 110 C 12 85 24 74 46 72 C 68 74 80 85 80 110 Z"
        fill="#292A32"
        stroke="#D5B36B"
        strokeWidth="1.2"
      />
      {/* Ivory Collar Lapels */}
      <path d="M 34 73 L 46 94 L 58 73 Z" fill="#F2EBDD" />
      <path d="M 46 88 L 46 110" stroke="#D5B36B" strokeWidth="1" />

      {/* Analyst Neck */}
      <rect x="40" y="60" width="12" height="15" rx="3" fill="#E4D5C0" />

      {/* Analyst Head Profile & Modern Hairline */}
      <ellipse cx="46" cy="46" rx="17" ry="20" fill="#E8D9C5" />
      {/* Sleek Hair Contour */}
      <path
        d="M 28 46 C 27 30 36 20 54 20 C 66 20 68 28 65 37 C 59 34 50 33 42 38 C 36 42 32 46 28 46 Z"
        fill="#1B1C23"
        stroke="#D5B36B"
        strokeWidth="0.8"
      />

      {/* Analyst AR Cyber Visor / Smart Spectacles */}
      <path
        d="M 42 41 H 65 C 67 41 68 44 67 47 L 64 52 C 63 54 60 55 58 55 H 42 C 40 55 39 53 40 50 Z"
        fill="#14B8A6"
        fillOpacity="0.88"
        stroke="#D5B36B"
        strokeWidth="1.2"
      />
      <line x1="32" y1="45" x2="42" y2="45" stroke="#D5B36B" strokeWidth="1.2" />
      {/* Visor Specular Reflection */}
      <line x1="46" y1="44" x2="60" y2="44" stroke="#FAF6EF" strokeWidth="1" strokeLinecap="round" />

      {/* Communicator Headset with Status LED */}
      <path d="M 33 46 C 30 46 29 49 29 53 C 29 57 32 59 35 59" stroke="#D5B36B" strokeWidth="1.4" fill="none" />
      <circle cx="30" cy="51" r="2" fill="#D5B36B" />
      <path d="M 34 59 Q 38 68 48 68" stroke="#D5B36B" strokeWidth="1" fill="none" />
      <circle cx="48" cy="68" r="1.5" fill="#2DD4BF" />

      {/* Hand holding holographic controller / stylus */}
      <path
        d="M 76 96 C 82 92 88 94 92 98 L 98 102"
        stroke="#E8D9C5"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="99" cy="103" r="2.5" fill="#D5B36B" />
      {/* Light stream from stylus to inspection reticle */}
      <line x1="100" y1="102" x2="136" y2="92" stroke="#14B8A6" strokeWidth="1" strokeDasharray="3 3" opacity="0.8" />
    </g>

    {/* CENTER / RIGHT: Floating Holographic Suspicious Message Card */}
    <g transform="translate(155, 34)" filter="url(#ami_subtle_shadow)">
      {/* Card Outer Shell */}
      <rect
        x="0"
        y="0"
        width="170"
        height="98"
        rx="12"
        fill="#FFFFFF"
        stroke="#D5B36B"
        strokeWidth="1.2"
      />
      <rect
        x="2"
        y="2"
        width="166"
        height="94"
        rx="10"
        fill="#FDFBF7"
      />

      {/* Top Banner: Urgency Alert Indicator */}
      <rect x="0" y="0" width="170" height="24" rx="12" fill="#24252F" />
      <rect x="0" y="12" width="170" height="12" fill="#24252F" />
      <line x1="0" y1="24" x2="170" y2="24" stroke="#D5B36B" strokeWidth="0.8" />

      {/* Alert Icon & Header */}
      <circle cx="16" cy="12" r="6" fill="#F59E0B" />
      <text x="16" y="15" fill="#18181D" fontSize="8" fontWeight="bold" textAnchor="middle">!</text>
      <text x="28" y="15" fill="#FAF6EF" fontSize="8.5" fontWeight="600" letterSpacing="0.08em">SUSPICIOUS INTAKE</text>

      {/* SSRF & Scheme Verified Pill */}
      <rect x="116" y="6" width="46" height="12" rx="6" fill="#14B8A6" fillOpacity="0.2" stroke="#14B8A6" strokeWidth="0.75" />
      <text x="139" y="14.5" fill="#0D9488" fontSize="6.5" fontWeight="bold" textAnchor="middle" letterSpacing="0.05em">SSRF SAFE</text>

      {/* Message Content Preview Lines */}
      <g transform="translate(12, 33)">
        {/* Sender line */}
        <text x="0" y="8" fill="#77736D" fontSize="7.5" fontWeight="500">From: unknown-secure-alert@mail.biz</text>

        {/* Suspicious Urgent Text snippet */}
        <text x="0" y="20" fill="#25252A" fontSize="8" fontWeight="bold">Urgent: Account locked! Verify link:</text>

        {/* Suspicious URL Highlight Pill */}
        <rect x="0" y="26" width="146" height="17" rx="5" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="0.8" />
        <text x="6" y="37.5" fill="#92400E" fontSize="7.5" fontFamily="monospace" fontWeight="600">
          http://pay-verify.xyz?triage=ssrf
        </text>

        {/* Status flags */}
        <g transform="translate(0, 48)">
          <circle cx="4" cy="4" r="3" fill="#EF4444" />
          <text x="11" y="6.5" fill="#77736D" fontSize="6.8">Domain Mismatch Detected</text>

          <rect x="100" y="0" width="46" height="9" rx="4.5" fill="#292A32" />
          <text x="123" y="6.5" fill="#D5B36B" fontSize="6" fontWeight="bold" textAnchor="middle">INSPECTING</text>
        </g>
      </g>
    </g>

    {/* OVERLAY: Precision Inspection Loupe & Reticle */}
    <g transform="translate(195, 78)">
      {/* Loupe Beam cone */}
      <polygon points="0,0 48,-18 48,18" fill="url(#ami_teal_beam)" opacity="0.35" />

      {/* Loupe Glass Lens */}
      <circle cx="28" cy="0" r="22" fill="#14B8A6" fillOpacity="0.12" stroke="#D5B36B" strokeWidth="1.8" />
      <circle cx="28" cy="0" r="18" stroke="#2DD4BF" strokeWidth="0.8" strokeDasharray="3 3" />
      <circle cx="28" cy="0" r="5" stroke="#FAF6EF" strokeWidth="1" fill="#D5B36B" fillOpacity="0.4" />

      {/* Precision Crosshair Ticks */}
      <line x1="28" y1="-21" x2="28" y2="-14" stroke="#D5B36B" strokeWidth="1.5" />
      <line x1="28" y1="14" x2="28" y2="21" stroke="#D5B36B" strokeWidth="1.5" />
      <line x1="7" y1="0" x2="14" y2="0" stroke="#D5B36B" strokeWidth="1.5" />
      <line x1="42" y1="0" x2="49" y2="0" stroke="#D5B36B" strokeWidth="1.5" />

      {/* Loupe Metallic Handle */}
      <line x1="44" y1="15" x2="68" y2="38" stroke="#A77B32" strokeWidth="4.5" strokeLinecap="round" />
      <line x1="46" y1="17" x2="66" y2="36" stroke="#F6E6BC" strokeWidth="1.5" strokeLinecap="round" />
    </g>

    {/* Floating Data & Scheme Security Particles */}
    <g>
      <circle cx="150" cy="148" r="2.5" fill="#D5B36B" />
      <circle cx="295" cy="145" r="2" fill="#2DD4BF" />
      <circle cx="325" cy="40" r="1.8" fill="#D5B36B" />
      <rect x="25" y="138" width="56" height="15" rx="7.5" fill="#292A32" stroke="#D5B36B" strokeWidth="0.8" />
      <text x="53" y="148.5" fill="#FAF6EF" fontSize="6.5" fontWeight="600" textAnchor="middle" letterSpacing="0.08em">
        STEP 01 · INTAKE
      </text>
    </g>
  </svg>
)

/**
 * Illustration 2: Security Expert Detecting Phishing & Multi-Agent Threat Analysis
 * Features:
 * - Security expert analyst orchestrating twin AI agents (URL Intelligence & Message Intelligence).
 * - Multi-agent neural nodes with telemetry connections.
 * - Phishing lure hook cordoned off with threat bounding box.
 * - 0–100 risk score telemetry dial.
 * - Ivory, champagne gold, deep charcoal, and subtle teal accents.
 */
export const SecurityExpertDetectionSvg: FC<IllustrationProps> = ({ className = 'w-full h-full' }) => (
  <svg
    viewBox="0 0 360 180"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Security expert detecting phishing and multi-agent online threats"
  >
    <defs>
      <linearGradient id="sed_gold_linear" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F6E6BC" />
        <stop offset="50%" stopColor="#D5B36B" />
        <stop offset="100%" stopColor="#966D28" />
      </linearGradient>

      <linearGradient id="sed_radar_glow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#D5B36B" stopOpacity="0.05" />
      </linearGradient>

      <radialGradient id="sed_threat_orb" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#EF4444" stopOpacity="0.3" />
        <stop offset="70%" stopColor="#D5B36B" stopOpacity="0.1" />
        <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
      </radialGradient>

      <filter id="sed_card_shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#18181D" floodOpacity="0.16" />
      </filter>
    </defs>

    {/* Background Radar Rings */}
    <ellipse cx="180" cy="90" rx="140" ry="70" fill="url(#sed_radar_glow)" />
    <ellipse cx="180" cy="90" rx="130" ry="65" stroke="#D5B36B" strokeWidth="0.8" strokeDasharray="3 4" opacity="0.45" />
    <ellipse cx="180" cy="90" rx="85" ry="42" stroke="#2DD4BF" strokeWidth="0.8" strokeDasharray="2 4" opacity="0.4" />
    <ellipse cx="180" cy="90" rx="45" ry="22" stroke="#D5B36B" strokeWidth="0.6" opacity="0.35" />

    {/* Radar Sweep Arc */}
    <path
      d="M 180 90 L 290 60 A 130 65 0 0 0 240 38 Z"
      fill="url(#sed_radar_glow)"
      opacity="0.5"
    />

    {/* CENTER-LEFT: Security Expert Figure */}
    <g transform="translate(36, 38)">
      {/* Expert Base & Shoulders */}
      <path
        d="M 14 112 C 14 88 28 76 50 74 C 72 76 86 88 86 112 Z"
        fill="#24252F"
        stroke="#D5B36B"
        strokeWidth="1.2"
      />
      {/* Ivory Vest Inset */}
      <path d="M 38 75 L 50 96 L 62 75 Z" fill="#F2EBDD" />
      <path d="M 50 90 L 50 112" stroke="#D5B36B" strokeWidth="1" />

      {/* Expert Neck */}
      <rect x="44" y="62" width="12" height="14" rx="3" fill="#E4D5C0" />

      {/* Expert Head & Professional Upright Silhouette */}
      <ellipse cx="50" cy="46" rx="17" ry="20" fill="#E8D9C5" />
      {/* Haircut with cyber security aesthetic */}
      <path
        d="M 33 46 C 32 30 42 22 58 22 C 68 22 71 28 69 36 C 64 34 54 33 46 38 C 40 42 36 46 33 46 Z"
        fill="#18181D"
        stroke="#D5B36B"
        strokeWidth="0.8"
      />

      {/* Cyber Vision Monocle / HUD on right eye */}
      <circle cx="58" cy="46" r="6" fill="#14B8A6" fillOpacity="0.8" stroke="#D5B36B" strokeWidth="1.2" />
      <circle cx="58" cy="46" r="2.5" fill="#FAF6EF" />
      <line x1="42" y1="45" x2="52" y2="45" stroke="#D5B36B" strokeWidth="1" />

      {/* Holographic Console Command Gestures */}
      <path d="M 80 94 L 98 84" stroke="#E8D9C5" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="100" cy="83" r="3" fill="#D5B36B" />

      {/* Holographic HUD rays from hand */}
      <line x1="102" y1="81" x2="130" y2="60" stroke="#2DD4BF" strokeWidth="1" strokeDasharray="2 3" />
      <line x1="102" y1="84" x2="136" y2="92" stroke="#D5B36B" strokeWidth="1" strokeDasharray="2 3" />
    </g>

    {/* MULTI-AGENT TELEMETRY ORCHESTRATION: Agent α and Agent β */}
    {/* Agent α Node: URL Intelligence */}
    <g transform="translate(142, 28)" filter="url(#sed_card_shadow)">
      <rect x="0" y="0" width="84" height="42" rx="9" fill="#FFFFFF" stroke="#D5B36B" strokeWidth="1" />
      <rect x="2" y="2" width="80" height="38" rx="7" fill="#FDFBF7" />
      <circle cx="12" cy="14" r="5" fill="#14B8A6" />
      <text x="12" y="16.5" fill="#FAF6EF" fontSize="6.5" fontWeight="bold" textAnchor="middle">α</text>
      <text x="22" y="14.5" fill="#25252A" fontSize="7.5" fontWeight="bold">URL Intel</text>
      <text x="8" y="27" fill="#77736D" fontSize="6.5">Domain Triage: OK</text>
      <rect x="8" y="31" width="68" height="4" rx="2" fill="#E6DFD2" />
      <rect x="8" y="31" width="52" height="4" rx="2" fill="#D5B36B" />
    </g>

    {/* Agent β Node: Message Intelligence */}
    <g transform="translate(142, 80)" filter="url(#sed_card_shadow)">
      <rect x="0" y="0" width="84" height="42" rx="9" fill="#FFFFFF" stroke="#D5B36B" strokeWidth="1" />
      <rect x="2" y="2" width="80" height="38" rx="7" fill="#FDFBF7" />
      <circle cx="12" cy="14" r="5" fill="#F59E0B" />
      <text x="12" y="16.5" fill="#FAF6EF" fontSize="6.5" fontWeight="bold" textAnchor="middle">β</text>
      <text x="22" y="14.5" fill="#25252A" fontSize="7.5" fontWeight="bold">Msg Intel</text>
      <text x="8" y="27" fill="#EF4444" fontSize="6.5" fontWeight="600">Urgency Lure: 88%</text>
      <rect x="8" y="31" width="68" height="4" rx="2" fill="#E6DFD2" />
      <rect x="8" y="31" width="60" height="4" rx="2" fill="#EF4444" />
    </g>

    {/* Connecting Synaptic Telemetry Lines to Core Consensus */}
    <path d="M 226 49 L 255 70" stroke="#D5B36B" strokeWidth="1.2" strokeDasharray="3 3" />
    <path d="M 226 101 L 255 80" stroke="#D5B36B" strokeWidth="1.2" strokeDasharray="3 3" />

    {/* RIGHT: Intercepted Phishing Lure & Threat Gauge Consensus */}
    <g transform="translate(245, 34)" filter="url(#sed_card_shadow)">
      {/* Outer Console Card */}
      <rect x="0" y="0" width="98" height="96" rx="12" fill="#24252F" stroke="#D5B36B" strokeWidth="1.2" />
      <rect x="2" y="2" width="94" height="92" rx="10" fill="#1C1D24" />

      {/* Consensus Header */}
      <rect x="8" y="8" width="82" height="14" rx="7" fill="#2D2E3A" stroke="#D5B36B" strokeWidth="0.6" />
      <text x="49" y="18" fill="#D5B36B" fontSize="6.5" fontWeight="bold" textAnchor="middle" letterSpacing="0.08em">
        AI CONSENSUS
      </text>

      {/* Phishing Lure Trap Container */}
      <rect x="10" y="28" width="78" height="32" rx="6" fill="#121318" stroke="#EF4444" strokeWidth="0.8" strokeDasharray="3 2" />

      {/* Phishing Hook Icon */}
      <path
        d="M 28 34 C 28 42 22 46 22 50 C 22 53 25 55 28 55 C 31 55 33 52 33 49 L 33 45"
        stroke="#EF4444"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="28" cy="34" r="2" fill="#EF4444" />
      <text x="38" y="42" fill="#FAF6EF" fontSize="7" fontWeight="bold">PHISH TRAP</text>
      <text x="38" y="51" fill="#F87171" fontSize="6">Neutralized</text>

      {/* 0–100 Unified Severity Dial / Arc */}
      <g transform="translate(49, 78)">
        <path d="M -24 0 A 24 24 0 0 1 24 0" fill="none" stroke="#3A3B47" strokeWidth="4" strokeLinecap="round" />
        <path d="M -24 0 A 24 24 0 0 1 12 -21" fill="none" stroke="url(#sed_gold_linear)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="0" cy="0" r="3" fill="#FAF6EF" />
        <line x1="0" y1="0" x2="8" y2="-15" stroke="#FAF6EF" strokeWidth="1.5" strokeLinecap="round" />
        <text x="0" y="10" fill="#FAF6EF" fontSize="7.5" fontWeight="bold" textAnchor="middle">SCORE 78</text>
      </g>
    </g>

    {/* Section Indicator Badge */}
    <rect x="25" y="142" width="60" height="15" rx="7.5" fill="#24252F" stroke="#D5B36B" strokeWidth="0.8" />
    <text x="55" y="152.5" fill="#FAF6EF" fontSize="6.5" fontWeight="600" textAnchor="middle" letterSpacing="0.08em">
      STEP 02 · INSPECT
    </text>
  </svg>
)

/**
 * Illustration 3: Person Protected by a Digital Shield & Safe Browsing
 * Features:
 * - Confident user browsing safely with modern tech device.
 * - Radiant digital cybersecurity shield with gold bevels and center security seal.
 * - Bilingual protection tag (EN · اردو) & Verified 0-Risk badge.
 * - Intercepted threats safely bouncing off shield aura.
 * - Ivory, champagne gold, deep charcoal, and subtle teal accents.
 */
export const ShieldProtectedUserSvg: FC<IllustrationProps> = ({ className = 'w-full h-full' }) => (
  <svg
    viewBox="0 0 360 180"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="User safely browsing with AI-powered digital shield protection and bilingual guidance"
  >
    <defs>
      <linearGradient id="spu_gold_shield" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFF2D6" />
        <stop offset="35%" stopColor="#D5B36B" />
        <stop offset="75%" stopColor="#C5A15D" />
        <stop offset="100%" stopColor="#875E1C" />
      </linearGradient>

      <linearGradient id="spu_shield_facet" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FAF6EF" stopOpacity="0.9" />
        <stop offset="50%" stopColor="#F0EBE2" stopOpacity="0.75" />
        <stop offset="100%" stopColor="#E2D7C3" stopOpacity="0.85" />
      </linearGradient>

      <radialGradient id="spu_defense_aura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#D5B36B" stopOpacity="0.25" />
        <stop offset="65%" stopColor="#14B8A6" stopOpacity="0.12" />
        <stop offset="100%" stopColor="#D5B36B" stopOpacity="0" />
      </radialGradient>

      <filter id="spu_shield_shadow" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#18181D" floodOpacity="0.22" />
      </filter>
    </defs>

    {/* Protective Dome Ambient Radiance */}
    <ellipse cx="180" cy="90" rx="145" ry="75" fill="url(#spu_defense_aura)" />

    {/* Security Arc Rings enclosing the protected space */}
    <path
      d="M 60 148 C 60 60 140 25 240 25 C 290 25 320 48 335 78"
      stroke="#D5B36B"
      strokeWidth="1"
      strokeDasharray="4 5"
      opacity="0.45"
      fill="none"
    />
    <path
      d="M 80 152 C 80 75 150 45 235 45 C 275 45 305 62 318 90"
      stroke="#2DD4BF"
      strokeWidth="0.8"
      strokeDasharray="2 4"
      opacity="0.4"
      fill="none"
    />

    {/* LEFT SIDE: Protected User with Laptop / Tablet */}
    <g transform="translate(62, 42)">
      {/* Protected User Torso & Contemporary Attire */}
      <path
        d="M 12 108 C 12 84 26 74 48 72 C 70 74 84 84 84 108 Z"
        fill="#24252F"
        stroke="#D5B36B"
        strokeWidth="1.2"
      />
      {/* Warm Ivory Sweater / Scarf */}
      <path d="M 36 73 C 44 82 52 82 60 73 C 64 78 58 88 48 88 C 38 88 32 78 36 73 Z" fill="#F2EBDD" />

      {/* User Neck & Head */}
      <rect x="42" y="60" width="12" height="15" rx="3" fill="#E4D5C0" />
      <ellipse cx="48" cy="46" rx="16" ry="19" fill="#E8D9C5" />

      {/* Sleek Hair Styling */}
      <path
        d="M 32 45 C 31 32 38 22 54 22 C 67 22 69 30 67 38 C 62 34 52 33 44 38 C 38 42 34 45 32 45 Z"
        fill="#18181D"
        stroke="#D5B36B"
        strokeWidth="0.8"
      />

      {/* Calm Confident Facial Contour */}
      <path d="M 54 48 C 55 51 57 52 60 52" stroke="#B89B74" strokeWidth="1" strokeLinecap="round" fill="none" />

      {/* Arms holding slim laptop / safe browsing device */}
      <path d="M 28 92 L 44 98 L 68 88" stroke="#E8D9C5" strokeWidth="4" strokeLinecap="round" />

      {/* Slim Metallic Laptop Base & Screen */}
      <rect x="46" y="86" width="34" height="2" rx="1" fill="#D5B36B" />
      <polygon points="52,86 78,86 82,72 58,72" fill="#1C1D24" stroke="#D5B36B" strokeWidth="0.8" />
      {/* Screen Safe Browsing Content */}
      <polygon points="54,85 76,85 80,74 60,74" fill="#14B8A6" fillOpacity="0.35" />
      <circle cx="70" cy="79" r="2" fill="#2DD4BF" />
    </g>

    {/* CENTER: Grand Multifaceted Cyber Shield */}
    <g transform="translate(170, 22)" filter="url(#spu_shield_shadow)">
      {/* Shield Outer Gold Rim Frame */}
      <path
        d="M 45 6 L 84 20 L 76 88 C 72 118 45 138 45 138 C 45 138 18 118 14 88 L 6 20 Z"
        fill="url(#spu_gold_shield)"
        stroke="#966D28"
        strokeWidth="1.5"
      />

      {/* Shield Inner Facet Top-Left */}
      <path
        d="M 45 12 L 12 24 L 18 84 C 21 110 45 128 45 128 Z"
        fill="url(#spu_shield_facet)"
        stroke="#D5B36B"
        strokeWidth="0.8"
      />

      {/* Shield Inner Facet Top-Right (Light Specular) */}
      <path
        d="M 45 12 L 78 24 L 72 84 C 69 110 45 128 45 128 Z"
        fill="#FAF6EF"
        fillOpacity="0.95"
        stroke="#D5B36B"
        strokeWidth="0.8"
      />

      {/* Shield Center Spine & Bevel Reflection */}
      <line x1="45" y1="12" x2="45" y2="128" stroke="#D5B36B" strokeWidth="1.5" />

      {/* Center SIFTRIX Emblem & Verified Checkmark */}
      <circle cx="45" cy="58" r="18" fill="#24252F" stroke="#D5B36B" strokeWidth="1.5" />
      <circle cx="45" cy="58" r="14" fill="#14B8A6" fillOpacity="0.25" stroke="#2DD4BF" strokeWidth="0.8" />
      {/* Gold Security Checkmark */}
      <path
        d="M 38 58 L 43 63 L 53 51"
        stroke="#F6E6BC"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="45" cy="58" r="1.5" fill="#D5B36B" />

      {/* Deflected Threat Sparks Bouncing Off Shield */}
      <g opacity="0.85">
        <path d="M 86 42 L 102 32" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="104" cy="31" r="1.5" fill="#EF4444" />
        <path d="M 88 74 L 106 78" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="108" cy="79" r="1.5" fill="#EF4444" />
      </g>
    </g>

    {/* RIGHT SIDE: Actionable Bilingual Guidance Cards */}
    {/* Bilingual Tag Card: EN · اردو */}
    <g transform="translate(258, 38)" filter="url(#spu_shield_shadow)">
      <rect x="0" y="0" width="88" height="42" rx="9" fill="#FFFFFF" stroke="#D5B36B" strokeWidth="1" />
      <rect x="2" y="2" width="84" height="38" rx="7" fill="#FDFBF7" />

      <circle cx="14" cy="14" r="5" fill="#24252F" stroke="#D5B36B" strokeWidth="0.8" />
      <text x="14" y="16.5" fill="#D5B36B" fontSize="6" fontWeight="bold" textAnchor="middle">AI</text>
      <text x="24" y="15" fill="#25252A" fontSize="7.5" fontWeight="bold">Bilingual Guard</text>

      {/* English + Urdu Badge */}
      <rect x="8" y="24" width="72" height="13" rx="6.5" fill="#FAF6EF" stroke="#D5B36B" strokeWidth="0.75" />
      <text x="44" y="33" fill="#765214" fontSize="7" fontWeight="bold" textAnchor="middle">
        English + اردو
      </text>
    </g>

    {/* Verified 0-Risk Verdict Pill */}
    <g transform="translate(258, 90)" filter="url(#spu_shield_shadow)">
      <rect x="0" y="0" width="88" height="42" rx="9" fill="#24252F" stroke="#D5B36B" strokeWidth="1" />
      <rect x="2" y="2" width="84" height="38" rx="7" fill="#1C1D24" />

      {/* Verified Status Tag */}
      <rect x="8" y="8" width="72" height="13" rx="6.5" fill="#14B8A6" fillOpacity="0.25" stroke="#14B8A6" strokeWidth="0.8" />
      <circle cx="16" cy="14.5" r="3" fill="#10B981" />
      <text x="46" y="18" fill="#2DD4BF" fontSize="7" fontWeight="bold" textAnchor="middle">
        SAFE VERDICT
      </text>

      <text x="44" y="33" fill="#FAF6EF" fontSize="7" textAnchor="middle">
        0/100 · Safe to Browse
      </text>
    </g>

    {/* Section Indicator Badge */}
    <rect x="25" y="142" width="62" height="15" rx="7.5" fill="#24252F" stroke="#D5B36B" strokeWidth="0.8" />
    <text x="56" y="152.5" fill="#FAF6EF" fontSize="6.5" fontWeight="600" textAnchor="middle" letterSpacing="0.08em">
      STEP 03 · CLARITY
    </text>
  </svg>
)
