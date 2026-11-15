import { parseCitation } from './citationUtils'

interface CitationsListProps {
  citations: string[]
  className?: string
}

/**
 * Renders citation sources separately and distinctly.
 * - Displays each source separately in a semantic list.
 * - Renders source names as clickable links when valid URLs are provided.
 * - Displays as plain text badge when no URL exists.
 * - Never concatenates multiple sources into a single run of text.
 */
export default function CitationsList({ citations, className = '' }: CitationsListProps) {
  if (!citations || citations.length === 0) return null

  const parsed = citations.map((c, i) => parseCitation(c, i))

  return (
    <div
      className={`pt-2 border-t border-siftrix-border/60 text-[10px] text-siftrix-muted-dark space-y-1.5 ${className}`}
    >
      <div className="flex items-center gap-1.5 font-semibold text-siftrix-antique-ink">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-3 w-3 text-siftrix-gold shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <span>Verified Sources & Intel:</span>
      </div>

      <ul
        className="flex flex-wrap gap-1.5 list-none p-0 m-0"
        aria-label="Verified citation sources"
      >
        {parsed.map((cite) => (
          <li key={cite.id} className="inline-flex">
            {cite.url ? (
              <a
                href={cite.url}
                target="_blank"
                rel="noopener noreferrer"
                title={`Open source: ${cite.label}`}
                className="inline-flex items-center gap-1 rounded-md bg-siftrix-pearl px-2 py-0.5 border border-siftrix-gold/70 text-siftrix-charcoal hover:bg-siftrix-gold/20 hover:text-siftrix-antique-ink transition-colors font-medium underline decoration-siftrix-gold/60 underline-offset-2"
              >
                <span>{cite.label}</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="w-2.5 h-2.5 text-siftrix-gold shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            ) : (
              <span
                className="inline-flex items-center rounded-md bg-siftrix-pearl px-2 py-0.5 border border-siftrix-border text-siftrix-graphite font-medium select-all shadow-2xs"
              >
                {cite.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
