import { useId } from 'react'

interface BrandMarkProps {
  className?: string
  showFrame?: boolean
}

/**
 * Shared architectural SIFTRIX shield emblem rendered with brushed metallic
 * champagne-gold bevels and Deep Charcoal core contrast.
 */
export default function BrandMark({
  className = 'h-9 w-9',
  showFrame = true,
}: BrandMarkProps) {
  const uid = useId()
  const goldRimId = `siftrix-mark-gold-${uid}`
  const coreFillId = `siftrix-mark-core-${uid}`

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id={goldRimId} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F5E5BD" />
          <stop offset="35%" stopColor="#D8B56D" />
          <stop offset="70%" stopColor="#C5A15D" />
          <stop offset="100%" stopColor="#A77B32" />
        </linearGradient>
        <linearGradient id={coreFillId} x1="16" y1="12" x2="48" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#35343C" />
          <stop offset="100%" stopColor="#1B1B20" />
        </linearGradient>
      </defs>

      {showFrame ? (
        <>
          <rect width="64" height="64" rx="14" fill="#25252A" />
          <rect
            x="2"
            y="2"
            width="60"
            height="60"
            rx="12"
            stroke={`url(#${goldRimId})`}
            strokeOpacity="0.65"
            strokeWidth="1.75"
          />
        </>
      ) : null}

      <path
        d="M32 9.5L51 17.5V31.5C51 43.4 42.9 52 32 55.5C21.1 52 13 43.4 13 31.5V17.5L32 9.5Z"
        fill={`url(#${coreFillId})`}
        stroke={`url(#${goldRimId})`}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M32 15.5L45 21V31.2C45 39.8 39.4 46 32 48.8C24.6 46 19 39.8 19 31.2V21L32 15.5Z"
        fill="#25252A"
        stroke="#C5A15D"
        strokeOpacity="0.62"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M25.2 32.6L29.9 37.3L39.4 27.1"
        stroke="#F7F3EC"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
