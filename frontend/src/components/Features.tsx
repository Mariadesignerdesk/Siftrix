import type { ReactNode } from 'react'

interface FeatureCardItem {
  id: string
  title: string
  description: string
  icon: ReactNode
}

const FEATURE_CARDS: ReadonlyArray<FeatureCardItem> = [
  {
    id: 'ai-detection',
    title: 'AI Detection',
    description: 'Identify suspicious messages and URLs using AI.',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-6 h-6"
        aria-hidden="true"
      >
        <path
          d="M12 2.75L19.25 5.5V11.25C19.25 15.95 16.15 19.95 12 21.25C7.85 19.95 4.75 15.95 4.75 11.25V5.5L12 2.75Z"
          stroke="#8B6DFF"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="11.5" r="2.25" stroke="#B9A9F5" strokeWidth="1.75" />
        <path
          d="M12 6.75V8.5M12 14.5V16.25M8.25 11.5H9.5M14.5 11.5H15.75"
          stroke="#B9A9F5"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'threat-analysis',
    title: 'Threat Analysis',
    description: 'Understand potential online threats clearly.',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-6 h-6"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="8.25" stroke="#8B6DFF" strokeWidth="1.75" />
        <circle cx="12" cy="12" r="4.5" stroke="#B9A9F5" strokeWidth="1.5" strokeDasharray="3 2.5" />
        <circle cx="12" cy="12" r="1.5" fill="#E5DFF5" />
        <path
          d="M12 12L17.25 6.75"
          stroke="#E5DFF5"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'easy-to-use',
    title: 'Easy to Use',
    description: 'Simple and user-friendly security experience.',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-6 h-6"
        aria-hidden="true"
      >
        <rect
          x="5.25"
          y="10.25"
          width="13.5"
          height="10"
          rx="2.5"
          stroke="#8B6DFF"
          strokeWidth="1.75"
        />
        <path
          d="M8.5 10.25V7.75C8.5 5.82 10.07 4.25 12 4.25C13.93 4.25 15.5 5.82 15.5 7.75V10.25"
          stroke="#B9A9F5"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <path
          d="M9.75 15.25L11.25 16.75L14.5 13.5"
          stroke="#E5DFF5"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
]

export default function Features() {
  return (
    <section
      id="features"
      className="px-6 md:px-10 py-12 md:py-16 bg-gradient-to-b from-siftrix-royal/30 via-siftrix-royal/40 to-siftrix-navy border-y border-siftrix-lavender/15"
    >
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-siftrix-soft">
          Why Choose SIFTRIX?
        </h2>

        <p className="text-siftrix-lavender mt-3">
          Smart protection for a safer digital world.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURE_CARDS.map((card) => (
          <div
            key={card.id}
            className="siftrix-card-3d siftrix-card-3d-hover p-6 rounded-xl"
          >
            <div className="w-11 h-11 rounded-lg bg-siftrix-navy border border-siftrix-electric/50 shadow-[0_6px_16px_rgba(139,109,255,0.3)] flex items-center justify-center mb-4">
              {card.icon}
            </div>
            <h3 className="text-xl font-bold text-siftrix-navy">
              {card.title}
            </h3>
            <p className="text-siftrix-royal mt-3">
              {card.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
