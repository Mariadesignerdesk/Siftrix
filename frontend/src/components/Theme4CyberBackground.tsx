import { WORLD_MAP_DOTS_PATH } from '../assets/worldMapDotsPath'

export interface Theme4CyberBackgroundProps {
  variant?: 'hero' | 'features'
}

/**
 * Key cyber threat monitoring hubs across global regions for Hero section
 * Scaled for the 1440x850 SVG coordinate space
 */
const HERO_CYBER_HUBS = [
  { id: 'sf', name: 'San Francisco', x: 260, y: 290, pingDelay: '0s' },
  { id: 'nyc', name: 'New York', x: 380, y: 290, pingDelay: '0.8s' },
  { id: 'sao', name: 'São Paulo', x: 480, y: 530, pingDelay: '1.6s' },
  { id: 'lon', name: 'London', x: 700, y: 240, pingDelay: '0.4s' },
  { id: 'fra', name: 'Frankfurt', x: 745, y: 255, pingDelay: '1.2s' },
  { id: 'dxb', name: 'Dubai', x: 840, y: 345, pingDelay: '2.0s' },
  { id: 'sin', name: 'Singapore', x: 1010, y: 420, pingDelay: '1.0s' },
  { id: 'tyo', name: 'Tokyo', x: 1140, y: 295, pingDelay: '0.6s' },
  { id: 'syd', name: 'Sydney', x: 1160, y: 580, pingDelay: '1.8s' },
] as const

/**
 * Cyber threat telemetry hubs positioned for Features section
 * Framed around the 3 feature cards, visible in gaps, header & footer areas
 * Scaled for the 1440x920 SVG coordinate space
 */
const FEATURES_CYBER_HUBS = [
  { id: 'f-top-left', name: 'Header West Node', x: 320, y: 190, pingDelay: '0.2s' },
  { id: 'f-top-mid', name: 'Header Center Node', x: 720, y: 180, pingDelay: '1.1s' },
  { id: 'f-top-right', name: 'Header East Node', x: 1120, y: 190, pingDelay: '0.5s' },
  { id: 'f-gap1-top', name: 'Card Gap 1 Upper', x: 490, y: 390, pingDelay: '1.4s' },
  { id: 'f-gap1-bot', name: 'Card Gap 1 Lower', x: 505, y: 610, pingDelay: '2.2s' },
  { id: 'f-gap2-top', name: 'Card Gap 2 Upper', x: 935, y: 390, pingDelay: '0.9s' },
  { id: 'f-gap2-bot', name: 'Card Gap 2 Lower', x: 950, y: 610, pingDelay: '1.7s' },
  { id: 'f-flank-left', name: 'Perimeter West', x: 120, y: 460, pingDelay: '0.7s' },
  { id: 'f-flank-right', name: 'Perimeter East', x: 1320, y: 460, pingDelay: '1.9s' },
  { id: 'f-bot-left', name: 'Telemetry South West', x: 380, y: 790, pingDelay: '1.3s' },
  { id: 'f-bot-mid', name: 'Telemetry South Core', x: 720, y: 810, pingDelay: '0.4s' },
  { id: 'f-bot-right', name: 'Telemetry South East', x: 1060, y: 790, pingDelay: '2.0s' },
] as const

/**
 * Ambient floating micro-particles for Hero
 */
const HERO_AMBIENT_PARTICLES = [
  { cx: 120, cy: 160, r: 1.5, opacity: 0.55, delay: '0s', dur: '5.2s' },
  { cx: 220, cy: 380, r: 1.2, opacity: 0.45, delay: '1.1s', dur: '6.4s' },
  { cx: 310, cy: 190, r: 2.0, opacity: 0.65, delay: '2.3s', dur: '4.8s' },
  { cx: 450, cy: 130, r: 1.4, opacity: 0.40, delay: '0.5s', dur: '7.1s' },
  { cx: 520, cy: 410, r: 1.8, opacity: 0.60, delay: '3.1s', dur: '5.6s' },
  { cx: 640, cy: 180, r: 1.5, opacity: 0.50, delay: '1.7s', dur: '6.2s' },
  { cx: 780, cy: 120, r: 2.2, opacity: 0.70, delay: '2.8s', dur: '4.5s' },
  { cx: 890, cy: 260, r: 1.3, opacity: 0.45, delay: '0.9s', dur: '5.9s' },
  { cx: 960, cy: 150, r: 1.7, opacity: 0.60, delay: '1.4s', dur: '6.7s' },
  { cx: 1040, cy: 460, r: 2.0, opacity: 0.65, delay: '2.5s', dur: '5.1s' },
  { cx: 1120, cy: 210, r: 1.6, opacity: 0.55, delay: '3.4s', dur: '4.9s' },
  { cx: 1220, cy: 390, r: 1.4, opacity: 0.45, delay: '1.2s', dur: '6.3s' },
  { cx: 1310, cy: 180, r: 1.8, opacity: 0.50, delay: '0.3s', dur: '5.7s' },
  { cx: 1380, cy: 480, r: 1.2, opacity: 0.40, delay: '2.0s', dur: '7.0s' },
  { cx: 600, cy: 620, r: 1.6, opacity: 0.50, delay: '1.5s', dur: '6.0s' },
  { cx: 850, cy: 680, r: 1.9, opacity: 0.65, delay: '2.9s', dur: '5.4s' },
] as const

/**
 * Ambient floating micro-particles for Features section
 */
const FEATURES_AMBIENT_PARTICLES = [
  { cx: 90, cy: 180, r: 1.5, opacity: 0.55, delay: '0.2s', dur: '5.5s' },
  { cx: 210, cy: 420, r: 1.2, opacity: 0.45, delay: '1.4s', dur: '6.8s' },
  { cx: 340, cy: 220, r: 2.0, opacity: 0.65, delay: '2.1s', dur: '4.6s' },
  { cx: 485, cy: 280, r: 1.6, opacity: 0.60, delay: '0.8s', dur: '6.2s' },
  { cx: 505, cy: 480, r: 1.4, opacity: 0.50, delay: '3.0s', dur: '5.9s' },
  { cx: 620, cy: 190, r: 1.8, opacity: 0.55, delay: '1.2s', dur: '5.2s' },
  { cx: 720, cy: 250, r: 2.2, opacity: 0.70, delay: '2.6s', dur: '4.4s' },
  { cx: 820, cy: 190, r: 1.3, opacity: 0.45, delay: '0.5s', dur: '6.5s' },
  { cx: 935, cy: 280, r: 1.6, opacity: 0.60, delay: '1.9s', dur: '5.8s' },
  { cx: 950, cy: 480, r: 1.5, opacity: 0.50, delay: '2.4s', dur: '6.1s' },
  { cx: 1080, cy: 220, r: 1.7, opacity: 0.60, delay: '1.1s', dur: '5.0s' },
  { cx: 1210, cy: 420, r: 1.4, opacity: 0.45, delay: '3.2s', dur: '6.4s' },
  { cx: 1350, cy: 210, r: 1.8, opacity: 0.50, delay: '0.4s', dur: '5.7s' },
  { cx: 280, cy: 780, r: 1.5, opacity: 0.50, delay: '2.2s', dur: '5.4s' },
  { cx: 560, cy: 750, r: 1.9, opacity: 0.65, delay: '1.5s', dur: '6.0s' },
  { cx: 720, cy: 840, r: 1.6, opacity: 0.55, delay: '2.8s', dur: '4.9s' },
  { cx: 880, cy: 750, r: 1.8, opacity: 0.60, delay: '0.9s', dur: '5.6s' },
  { cx: 1160, cy: 780, r: 1.4, opacity: 0.45, delay: '1.8s', dur: '6.7s' },
] as const

/**
 * Theme 4: Minimal Elegant Dark + Gold Homepage Background
 * 
 * Features:
 * 1. Matte charcoal black background with subtle radial depth.
 * 2. Subtle golden digital globe positioned in 3D perspective.
 * 3. Dotted world map effect spanning global continent coordinates.
 * 4. Elegant golden flowing light trails across threat telemetry corridors.
 * 5. Soft golden glowing particles and interconnected network lines.
 * 6. Smooth, sophisticated lighting effects and edge vignettes.
 * 
 * Supports variant='hero' (default) and variant='features' to seamlessly
 * extend across both sections while avoiding SVG ID collisions.
 */
export default function Theme4CyberBackground({ variant = 'hero' }: Theme4CyberBackgroundProps = {}) {
  const isFeatures = variant === 'features'
  const idPrefix = isFeatures ? 't4f_' : 't4h_'
  const hubs = isFeatures ? FEATURES_CYBER_HUBS : HERO_CYBER_HUBS
  const particles = isFeatures ? FEATURES_AMBIENT_PARTICLES : HERO_AMBIENT_PARTICLES
  const viewBox = isFeatures ? '0 0 1440 920' : '0 0 1440 850'
  const maskHeight = isFeatures ? 920 : 850

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
    >
      {/* Layer 1: Matte Charcoal Black Base with Sophisticated Radial Highlights */}
      <div className="absolute inset-0 bg-[#F7F3EC] dark:bg-[#0A0A0E] transition-colors duration-500" />

      {isFeatures ? (
        <>
          {/* Features Variant: Top Ambient Champagne Illumination */}
          <div
            className="absolute inset-x-0 top-0 h-96 opacity-60 dark:opacity-50"
            style={{
              background:
                'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(216, 181, 109, 0.18) 0%, rgba(197, 161, 93, 0.05) 50%, transparent 80%)',
            }}
          />

          {/* Features Variant: Left Column Spotlight (Behind AI Detection Card) */}
          <div
            className="absolute top-1/4 left-[8%] w-[38rem] h-[38rem] opacity-45 dark:opacity-35"
            style={{
              background:
                'radial-gradient(circle 380px at 40% 50%, rgba(216, 181, 109, 0.15) 0%, rgba(197, 161, 93, 0.04) 50%, transparent 75%)',
            }}
          />

          {/* Features Variant: Center Column Spotlight (Behind Threat Analysis & Center Globe) */}
          <div
            className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[48rem] h-[48rem] opacity-65 dark:opacity-55"
            style={{
              background:
                'radial-gradient(circle 480px at 50% 50%, rgba(216, 181, 109, 0.20) 0%, rgba(197, 161, 93, 0.06) 55%, transparent 75%)',
            }}
          />

          {/* Features Variant: Right Column Spotlight (Behind Bilingual Security Guidance Card) */}
          <div
            className="absolute top-1/4 right-[8%] w-[38rem] h-[38rem] opacity-45 dark:opacity-35"
            style={{
              background:
                'radial-gradient(circle 380px at 60% 50%, rgba(216, 181, 109, 0.15) 0%, rgba(197, 161, 93, 0.04) 50%, transparent 75%)',
            }}
          />
        </>
      ) : (
        <>
          {/* Hero Variant: Top Center Champagne Illumination */}
          <div
            className="absolute inset-x-0 -top-24 h-[32rem] opacity-70 dark:opacity-60"
            style={{
              background:
                'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(216, 181, 109, 0.22) 0%, rgba(197, 161, 93, 0.06) 50%, transparent 80%)',
            }}
          />

          {/* Hero Variant: Right-Side Golden Studio Spotlight (Backlight for Hero Composition & 3D Shield) */}
          <div
            className="absolute -top-12 right-0 w-[50rem] h-[48rem] opacity-65 dark:opacity-55"
            style={{
              background:
                'radial-gradient(circle 600px at 80% 40%, rgba(216, 181, 109, 0.20) 0%, rgba(197, 161, 93, 0.07) 50%, transparent 75%)',
            }}
          />

          {/* Hero Variant: Left-Side Soft Bronze Radiance */}
          <div
            className="absolute top-1/4 -left-20 w-[36rem] h-[36rem] opacity-45 dark:opacity-35"
            style={{
              background:
                'radial-gradient(circle 450px at 30% 40%, rgba(197, 161, 93, 0.14) 0%, transparent 70%)',
            }}
          />
        </>
      )}

      {/* Technical Drafting Cyber Grid */}
      <div className="absolute inset-0 siftrix-charcoal-grid opacity-35 dark:opacity-45" />

      {/* Layer 2: Vector Cybersecurity Elements (World Map, Digital Globe, Light Trails, Constellations) */}
      <svg
        viewBox={viewBox}
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full opacity-85 dark:opacity-90"
      >
        <defs>
          {/* Flowing Light Trail Gradients */}
          <linearGradient id={`${idPrefix}trailGold1`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D8B56D" stopOpacity="0.05" />
            <stop offset="30%" stopColor="#D8B56D" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#E8CC8E" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#C5A15D" stopOpacity="0.05" />
          </linearGradient>

          <linearGradient id={`${idPrefix}trailGold2`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C5A15D" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#FAF6EF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#D8B56D" stopOpacity="0.1" />
          </linearGradient>

          {/* Digital Globe Gradients */}
          <radialGradient id={`${idPrefix}globeAtmosphere`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#D8B56D" stopOpacity="0.08" />
            <stop offset="70%" stopColor="#D8B56D" stopOpacity="0.03" />
            <stop offset="96%" stopColor="#D8B56D" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#D8B56D" stopOpacity="0" />
          </radialGradient>

          <linearGradient id={`${idPrefix}globeRingGrad`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D8B56D" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#FAF6EF" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#C5A15D" stopOpacity="0.20" />
          </linearGradient>

          {/* Dotted World Map Radial Fade Mask */}
          <mask id={`${idPrefix}worldMapMask`}>
            <radialGradient
              id={`${idPrefix}mapFade`}
              cx="50%"
              cy={isFeatures ? '50%' : '46%'}
              r={isFeatures ? '58%' : '52%'}
            >
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="65%" stopColor="#FFFFFF" stopOpacity="0.85" />
              <stop offset="88%" stopColor="#FFFFFF" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
            <rect width="1440" height={maskHeight} fill={`url(#${idPrefix}mapFade)`} />
          </mask>

          {/* Soft Glow Filter */}
          <filter id={`${idPrefix}softGlow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ============================================================== */}
        {/* ELEMENT 2: DOTTED WORLD MAP EFFECT                             */}
        {/* ============================================================== */}
        <g
          mask={`url(#${idPrefix}worldMapMask)`}
          className="transition-opacity duration-300"
          transform={
            isFeatures
              ? 'translate(10, 60) scale(1.42, 1.45)'
              : 'translate(10, 40) scale(1.42, 1.25)'
          }
        >
          <path
            d={WORLD_MAP_DOTS_PATH}
            className="fill-siftrix-gold/45 dark:fill-siftrix-champagne/40"
          />
        </g>

        {/* ============================================================== */}
        {/* ELEMENT 3: SUBTLE GOLDEN DIGITAL GLOBE                         */}
        {/* ============================================================== */}
        {isFeatures ? (
          /* Features Variant: Digital Globe Centered Behind 3 Cards (cx: 720, cy: 500, r: 270) */
          <g transform="translate(720, 500) rotate(-14)" opacity="0.82">
            {/* Globe Atmosphere / Volumetric Glow */}
            <circle
              r="270"
              fill={`url(#${idPrefix}globeAtmosphere)`}
              stroke={`url(#${idPrefix}globeRingGrad)`}
              strokeWidth="1.2"
            />

            {/* Faint Outer Orbital Axis Ring */}
            <ellipse
              rx="360"
              ry="100"
              stroke="rgba(216, 181, 109, 0.28)"
              strokeWidth="1"
              strokeDasharray="6 8"
              fill="none"
              transform="rotate(-6)"
            />

            {/* Latitude Parallels */}
            <ellipse
              rx="270"
              ry="90"
              stroke="rgba(216, 181, 109, 0.45)"
              strokeWidth="1"
              strokeDasharray="4 6"
              fill="none"
            />
            <ellipse
              cy="-90"
              rx="245"
              ry="74"
              stroke="rgba(216, 181, 109, 0.30)"
              strokeWidth="0.9"
              strokeDasharray="3 5"
              fill="none"
            />
            <ellipse
              cy="90"
              rx="245"
              ry="74"
              stroke="rgba(216, 181, 109, 0.30)"
              strokeWidth="0.9"
              strokeDasharray="3 5"
              fill="none"
            />
            <ellipse
              cy="-175"
              rx="175"
              ry="48"
              stroke="rgba(216, 181, 109, 0.22)"
              strokeWidth="0.8"
              strokeDasharray="2 4"
              fill="none"
            />
            <ellipse
              cy="175"
              rx="175"
              ry="48"
              stroke="rgba(216, 181, 109, 0.22)"
              strokeWidth="0.8"
              strokeDasharray="2 4"
              fill="none"
            />

            {/* Longitude Meridians */}
            <ellipse
              rx="80"
              ry="270"
              stroke="rgba(216, 181, 109, 0.38)"
              strokeWidth="0.9"
              strokeDasharray="4 6"
              fill="none"
            />
            <ellipse
              rx="165"
              ry="270"
              stroke="rgba(216, 181, 109, 0.28)"
              strokeWidth="0.8"
              strokeDasharray="3 5"
              fill="none"
            />
            <ellipse
              rx="230"
              ry="270"
              stroke="rgba(216, 181, 109, 0.22)"
              strokeWidth="0.8"
              strokeDasharray="2 5"
              fill="none"
            />

            {/* Glowing Intersection Coordinate Nodes */}
            <circle cx="0" cy="0" r="2.5" fill="#FAF6EF" className="animate-pulse" />
            <circle cx="-80" cy="0" r="2" fill="#D8B56D" />
            <circle cx="80" cy="0" r="2" fill="#D8B56D" />
            <circle cx="-165" cy="0" r="1.8" fill="#C5A15D" />
            <circle cx="165" cy="0" r="1.8" fill="#C5A15D" />
            <circle cx="0" cy="-90" r="2" fill="#D8B56D" />
            <circle cx="0" cy="90" r="2" fill="#D8B56D" />
            <circle cx="-70" cy="-85" r="1.8" fill="#E8CC8E" />
            <circle cx="70" cy="-85" r="1.8" fill="#E8CC8E" />
            <circle cx="-70" cy="85" r="1.8" fill="#E8CC8E" />
            <circle cx="70" cy="85" r="1.8" fill="#E8CC8E" />
          </g>
        ) : (
          /* Hero Variant: Positioned on the right (cx: 1040, cy: 380, r: 230) behind Shield */
          <g transform="translate(1040, 380) rotate(-18)" opacity="0.85">
            {/* Globe Atmosphere / Volumetric Glow */}
            <circle
              r="230"
              fill={`url(#${idPrefix}globeAtmosphere)`}
              stroke={`url(#${idPrefix}globeRingGrad)`}
              strokeWidth="1.2"
            />

            {/* Latitude Parallels */}
            <ellipse
              rx="230"
              ry="75"
              stroke="rgba(216, 181, 109, 0.45)"
              strokeWidth="1"
              strokeDasharray="4 5"
              fill="none"
            />
            <ellipse
              cy="-80"
              rx="205"
              ry="62"
              stroke="rgba(216, 181, 109, 0.30)"
              strokeWidth="0.9"
              strokeDasharray="3 5"
              fill="none"
            />
            <ellipse
              cy="80"
              rx="205"
              ry="62"
              stroke="rgba(216, 181, 109, 0.30)"
              strokeWidth="0.9"
              strokeDasharray="3 5"
              fill="none"
            />
            <ellipse
              cy="-150"
              rx="145"
              ry="40"
              stroke="rgba(216, 181, 109, 0.22)"
              strokeWidth="0.8"
              strokeDasharray="2 4"
              fill="none"
            />
            <ellipse
              cy="150"
              rx="145"
              ry="40"
              stroke="rgba(216, 181, 109, 0.22)"
              strokeWidth="0.8"
              strokeDasharray="2 4"
              fill="none"
            />

            {/* Longitude Meridians */}
            <ellipse
              rx="65"
              ry="230"
              stroke="rgba(216, 181, 109, 0.38)"
              strokeWidth="0.9"
              strokeDasharray="4 6"
              fill="none"
            />
            <ellipse
              rx="140"
              ry="230"
              stroke="rgba(216, 181, 109, 0.28)"
              strokeWidth="0.8"
              strokeDasharray="3 5"
              fill="none"
            />
            <ellipse
              rx="195"
              ry="230"
              stroke="rgba(216, 181, 109, 0.22)"
              strokeWidth="0.8"
              strokeDasharray="2 5"
              fill="none"
            />

            {/* Glowing Intersection Coordinate Nodes */}
            <circle cx="0" cy="0" r="2.5" fill="#FAF6EF" className="animate-pulse" />
            <circle cx="-65" cy="0" r="2" fill="#D8B56D" />
            <circle cx="65" cy="0" r="2" fill="#D8B56D" />
            <circle cx="-140" cy="0" r="1.8" fill="#C5A15D" />
            <circle cx="140" cy="0" r="1.8" fill="#C5A15D" />
            <circle cx="0" cy="-80" r="2" fill="#D8B56D" />
            <circle cx="0" cy="80" r="2" fill="#D8B56D" />
            <circle cx="-58" cy="-75" r="1.8" fill="#E8CC8E" />
            <circle cx="58" cy="-75" r="1.8" fill="#E8CC8E" />
            <circle cx="-58" cy="75" r="1.8" fill="#E8CC8E" />
            <circle cx="58" cy="75" r="1.8" fill="#E8CC8E" />
          </g>
        )}

        {/* ============================================================== */}
        {/* ELEMENT 4: NETWORK CONNECTIONS & CYBER NODES                   */}
        {/* ============================================================== */}
        {isFeatures ? (
          <g stroke="rgba(216, 181, 109, 0.22)" strokeWidth="1" strokeDasharray="3 4">
            {/* Header Telemetry Line */}
            <line x1="320" y1="190" x2="720" y2="180" />
            <line x1="720" y1="180" x2="1120" y2="190" />
            {/* Card Gap 1 Vertical Telemetry */}
            <line x1="320" y1="190" x2="490" y2="390" />
            <line x1="490" y1="390" x2="505" y2="610" />
            <line x1="505" y1="610" x2="380" y2="790" />
            {/* Cross-Gap Lateral Telemetry Bridge */}
            <line x1="490" y1="390" x2="935" y2="390" />
            {/* Card Gap 2 Vertical Telemetry */}
            <line x1="1120" y1="190" x2="935" y2="390" />
            <line x1="935" y1="390" x2="950" y2="610" />
            <line x1="950" y1="610" x2="1060" y2="790" />
            {/* Flanking Perimeter Connections */}
            <line x1="120" y1="460" x2="490" y2="390" />
            <line x1="935" y1="390" x2="1320" y2="460" />
            {/* South Perimeter Baseline */}
            <line x1="380" y1="790" x2="720" y2="810" />
            <line x1="720" y1="810" x2="1060" y2="790" />
          </g>
        ) : (
          <g stroke="rgba(216, 181, 109, 0.22)" strokeWidth="1" strokeDasharray="3 4">
            <line x1="260" y1="290" x2="380" y2="290" />
            <line x1="380" y1="290" x2="480" y2="530" />
            <line x1="380" y1="290" x2="700" y2="240" />
            <line x1="700" y1="240" x2="745" y2="255" />
            <line x1="745" y1="255" x2="840" y2="345" />
            <line x1="840" y1="345" x2="1010" y2="420" />
            <line x1="1010" y1="420" x2="1140" y2="295" />
            <line x1="1010" y1="420" x2="1160" y2="580" />
            <line x1="1140" y1="295" x2="1160" y2="580" />
          </g>
        )}

        {/* ============================================================== */}
        {/* ELEMENT 5: ELEGANT GOLDEN FLOWING LIGHT TRAILS                 */}
        {/* ============================================================== */}
        <g filter={`url(#${idPrefix}softGlow)`}>
          {isFeatures ? (
            <>
              {/* Features Trail 1: Top Command Corridor spanning header */}
              <path
                d="M 120 190 Q 420 140 720 180 T 1320 190"
                stroke={`url(#${idPrefix}trailGold1)`}
                strokeWidth="1.8"
                fill="none"
                strokeDasharray="36 320"
                className="animate-siftrix-trail-flow"
              />

              {/* Features Trail 2: Wave weaving behind cards through the gaps */}
              <path
                d="M 60 540 Q 300 360 490 390 T 935 390 T 1380 540"
                stroke={`url(#${idPrefix}trailGold1)`}
                strokeWidth="1.8"
                fill="none"
                strokeDasharray="40 360"
                className="animate-siftrix-trail-flow"
                style={{ animationDelay: '-4.5s' }}
              />

              {/* Features Trail 3: Lower telemetry arc */}
              <path
                d="M 100 780 Q 420 850 720 810 T 1340 780"
                stroke={`url(#${idPrefix}trailGold2)`}
                strokeWidth="1.4"
                fill="none"
                strokeDasharray="28 260"
                className="animate-siftrix-trail-flow"
                style={{ animationDelay: '-2s' }}
              />
            </>
          ) : (
            <>
              {/* Trail 1: Transatlantic High-Speed Defense Corridor (SF -> NYC -> London) */}
              <path
                d="M 260 290 Q 320 270 380 290 T 700 240"
                stroke={`url(#${idPrefix}trailGold1)`}
                strokeWidth="1.8"
                fill="none"
                strokeDasharray="28 260"
                className="animate-siftrix-trail-flow"
              />

              {/* Trail 2: Eurasian Threat Telemetry Pipeline (London -> Dubai -> Singapore -> Tokyo) */}
              <path
                d="M 700 240 Q 770 290 840 345 T 1010 420 T 1140 295"
                stroke={`url(#${idPrefix}trailGold1)`}
                strokeWidth="1.8"
                fill="none"
                strokeDasharray="32 300"
                className="animate-siftrix-trail-flow"
                style={{ animationDelay: '-4s' }}
              />

              {/* Trail 3: Trans-Pacific Orbital Arc (Tokyo -> SF) */}
              <path
                d="M 1140 295 Q 1380 180 1440 240"
                stroke={`url(#${idPrefix}trailGold2)`}
                strokeWidth="1.4"
                fill="none"
                strokeDasharray="24 220"
                className="animate-siftrix-trail-flow"
                style={{ animationDelay: '-2s' }}
              />
              <path
                d="M 0 250 Q 120 220 260 290"
                stroke={`url(#${idPrefix}trailGold2)`}
                strokeWidth="1.4"
                fill="none"
                strokeDasharray="24 220"
                className="animate-siftrix-trail-flow"
                style={{ animationDelay: '-2s' }}
              />

              {/* Trail 4: Sweeping Grand Cyber Perimeter Wave */}
              <path
                d="M 80 480 Q 420 620 840 500 T 1380 340"
                stroke={`url(#${idPrefix}trailGold1)`}
                strokeWidth="1.6"
                fill="none"
                strokeDasharray="40 360"
                className="animate-siftrix-trail-flow"
                style={{ animationDelay: '-7s' }}
              />
            </>
          )}
        </g>

        {/* Cyber Hub Node Markers with Concentric Ping Rings */}
        {hubs.map((hub) => (
          <g key={hub.id} transform={`translate(${hub.x}, ${hub.y})`}>
            {/* Concentric Ping Pulse */}
            <circle
              r="7"
              fill="none"
              stroke="#D8B56D"
              strokeWidth="1"
              className="animate-siftrix-ping-slow origin-center"
              style={{ animationDelay: hub.pingDelay }}
            />
            {/* Core Node */}
            <circle
              r="3"
              fill="#FAF6EF"
              stroke="#D8B56D"
              strokeWidth="1.5"
            />
            <circle r="1.2" fill="#25252A" />
          </g>
        ))}

        {/* ============================================================== */}
        {/* ELEMENT 6: SOFT GOLDEN GLOWING PARTICLES                       */}
        {/* ============================================================== */}
        <g>
          {particles.map((p, idx) => (
            <circle
              key={idx}
              cx={p.cx}
              cy={p.cy}
              r={p.r}
              fill="#E8CC8E"
              opacity={p.opacity}
              className="animate-siftrix-particle-drift"
              style={{
                animationDelay: p.delay,
                animationDuration: p.dur,
              }}
            />
          ))}
        </g>
      </svg>

      {/* Layer 3: Smooth Bottom Edge Vignette to blend into subsequent sections */}
      <div
        className="absolute inset-x-0 bottom-0 h-36 pointer-events-none hidden dark:block"
        style={{
          background:
            'linear-gradient(to bottom, transparent 0%, rgba(10, 10, 14, 0.4) 60%, rgba(10, 10, 14, 0.85) 100%)',
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-36 pointer-events-none block dark:hidden"
        style={{
          background:
            'linear-gradient(to bottom, transparent 0%, rgba(232, 224, 210, 0.35) 60%, rgba(232, 224, 210, 0.85) 100%)',
        }}
      />
    </div>
  )
}
