/**
 * Lightweight pure CSS + layered vector 3D cybersecurity shield illustration.
 * Uses GPU-composited animations that honor prefers-reduced-motion.
 */
export default function HeroShield3D() {
  return (
    <div
      className="relative w-44 h-48 sm:w-52 sm:h-56 md:w-64 md:h-72 shrink-0 flex items-center justify-center perspective-[900px] group"
      role="img"
      aria-label="Security shield illustration"
    >
      {/* Ambient Neon Backlight */}
      <div
        aria-hidden="true"
        className="absolute inset-4 rounded-full bg-siftrix-electric/25 blur-2xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute inset-8 rounded-full bg-siftrix-royal/55 blur-xl pointer-events-none"
      />

      {/* Tilted 3D Orbital Defense Ring */}
      <div
        aria-hidden="true"
        className="absolute w-44 h-44 sm:w-52 sm:h-52 md:w-60 md:h-60 rounded-full border border-siftrix-lavender/35 animate-siftrix-orbit pointer-events-none shadow-[0_0_20px_rgba(139,109,255,0.25)]"
      >
        <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-siftrix-electric shadow-[0_0_12px_#8B6DFF]" />
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-siftrix-lavender shadow-[0_0_10px_#B9A9F5]" />
      </div>

      {/* Floating 3D Shield Stack */}
      <div className="relative w-36 h-42 sm:w-44 sm:h-48 md:w-52 md:h-58 animate-siftrix-float">
        <div className="relative w-full h-full transition-transform duration-500 ease-out group-hover:[transform:rotateY(-10deg)_rotateX(6deg)_scale(1.03)] motion-reduce:group-hover:transform-none">
          {/* Back 3D Extruded Depth Plate */}
          <svg
            viewBox="0 0 220 250"
            aria-hidden="true"
            className="absolute inset-0 w-full h-full translate-x-2 translate-y-2.5 opacity-80"
          >
            <path
              d="M110 12 L202 46 V116 C202 174 162 218 110 238 C58 218 18 174 18 116 V46 Z"
              fill="#493B78"
              stroke="#8B6DFF"
              strokeOpacity="0.45"
              strokeWidth="2"
            />
          </svg>

          {/* Primary Metallic/Glass 3D Shield Body */}
          <svg
            viewBox="0 0 220 250"
            aria-hidden="true"
            className="relative w-full h-full drop-shadow-[0_14px_28px_rgba(23,21,46,0.8)]"
          >
            <defs>
              <linearGradient id="siftrix-shield-rim" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E5DFF5" />
                <stop offset="38%" stopColor="#8B6DFF" />
                <stop offset="75%" stopColor="#493B78" />
                <stop offset="100%" stopColor="#B9A9F5" />
              </linearGradient>

              <linearGradient id="siftrix-shield-base" x1="15%" y1="5%" x2="85%" y2="95%">
                <stop offset="0%" stopColor="#493B78" />
                <stop offset="48%" stopColor="#17152E" />
                <stop offset="100%" stopColor="#493B78" stopOpacity="0.88" />
              </linearGradient>

              <linearGradient id="siftrix-shield-left-facet" x1="0%" y1="0%" x2="100%" y2="85%">
                <stop offset="0%" stopColor="#B9A9F5" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#8B6DFF" stopOpacity="0.04" />
              </linearGradient>

              <linearGradient id="siftrix-shield-gloss" x1="0%" y1="0%" x2="80%" y2="100%">
                <stop offset="0%" stopColor="#E5DFF5" stopOpacity="0.34" />
                <stop offset="55%" stopColor="#B9A9F5" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#8B6DFF" stopOpacity="0" />
              </linearGradient>

              <radialGradient id="siftrix-shield-core-glow" cx="50%" cy="46%" r="50%">
                <stop offset="0%" stopColor="#8B6DFF" stopOpacity="0.55" />
                <stop offset="65%" stopColor="#493B78" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#17152E" stopOpacity="0" />
              </radialGradient>

              <clipPath id="siftrix-shield-clip">
                <path d="M110 18 L196 50 V116 C196 170 158 212 110 231 C62 212 24 170 24 116 V50 Z" />
              </clipPath>
            </defs>

            {/* Outer Rim Armor */}
            <path
              d="M110 12 L202 46 V116 C202 174 162 218 110 238 C58 218 18 174 18 116 V46 Z"
              fill="url(#siftrix-shield-base)"
              stroke="url(#siftrix-shield-rim)"
              strokeWidth="3.5"
            />

            {/* Clipped 3D Directional Facets & Reflections */}
            <g clipPath="url(#siftrix-shield-clip)">
              {/* Left Illuminated Facet */}
              <path
                d="M110 18 L24 50 V116 C24 170 62 212 110 231 Z"
                fill="url(#siftrix-shield-left-facet)"
              />

              {/* Right Shadowed Ridge Contrast */}
              <path
                d="M110 18 L196 50 V116 C196 170 158 212 110 231 Z"
                fill="#17152E"
                fillOpacity="0.36"
              />

              {/* Subtle Cyber Circuit Etches */}
              <path
                d="M110 34 V74 M60 72 L86 92 M160 72 L134 92 M54 134 L82 134 M166 134 L138 134 M110 162 V210"
                stroke="#8B6DFF"
                strokeOpacity="0.45"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="60" cy="72" r="2.5" fill="#B9A9F5" fillOpacity="0.7" />
              <circle cx="160" cy="72" r="2.5" fill="#B9A9F5" fillOpacity="0.7" />
              <circle cx="54" cy="134" r="2.5" fill="#8B6DFF" fillOpacity="0.7" />
              <circle cx="166" cy="134" r="2.5" fill="#8B6DFF" fillOpacity="0.7" />

              {/* Center Core Volumetric Aura */}
              <circle cx="110" cy="120" r="64" fill="url(#siftrix-shield-core-glow)" />

              {/* Specular Diagonal Glass Reflection */}
              <polygon
                points="14,32 138,14 96,120 14,96"
                fill="url(#siftrix-shield-gloss)"
              />
            </g>

            {/* Inner Bevel Rim */}
            <path
              d="M110 28 L184 56 V115 C184 162 152 199 110 216 C68 199 36 162 36 115 V56 Z"
              fill="none"
              stroke="#B9A9F5"
              strokeOpacity="0.42"
              strokeWidth="1.25"
            />

            {/* Central 3D Core Emblem */}
            <polygon
              points="110,78 144,98 144,136 110,156 76,136 76,98"
              fill="#17152E"
              fillOpacity="0.92"
              stroke="#8B6DFF"
              strokeWidth="2.5"
            />
            <polygon
              points="110,85 137,101 137,133 110,149 83,133 83,101"
              fill="#493B78"
              fillOpacity="0.45"
              stroke="#B9A9F5"
              strokeOpacity="0.55"
              strokeWidth="1"
            />

            {/* Luminous Verified Security Check Emblem */}
            <path
              d="M95 118 L106 129 L128 105"
              fill="none"
              stroke="#E5DFF5"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}
