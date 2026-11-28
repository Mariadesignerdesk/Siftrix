import type { ReactNode } from 'react'
import {
  isSafeUrl,
  isValidHttpUrl,
  normalizeMarkdownSource,
  parseCitation,
} from '../utils/textSanitize'

/**
 * Minimal, safe Markdown renderer. It builds React elements only (no innerHTML),
 * so any HTML in the source is shown as literal text.
 * Supports: headings, bold, italic, inline code, links, ordered/unordered lists.
 */

// Alternatives (in capture-group order): 1 inline code, 2 bold, 3 markdown link (optional title,
// one level of balanced parentheses in the URL), 4 <autolink>, 5 bare http(s) URL, 6 italic.
// Bare URLs stop at whitespace, angle brackets and Arabic-script characters so Urdu text
// directly after a URL is never swallowed into the link.
const INLINE_PATTERN =
  /(`[^`\n]+`)|(\*\*[^*\n]+?\*\*|__[^_\n]+?__)|(\[[^\]\n]+\]\((?:[^()\s]|\([^()\s]*\))+(?:\s+"[^"\n]*")?\))|(<https?:\/\/[^\s<>]+>)|(https?:\/\/[^\s<>\u0600-\u06FF]+)|(\*[^*\s][^*\n]*?\*)/g

const LINK_CLASS =
  'underline decoration-siftrix-gold/70 underline-offset-2 hover:text-siftrix-antique-ink break-all'

/** Removes trailing sentence punctuation and unbalanced closing brackets from a bare URL. */
function trimBareUrl(url: string): string {
  let out = url
  for (;;) {
    const before = out
    out = out.replace(/[.,;:!?'"*\u06D4\u060C\u061B\u061F]+$/, '')
    if (out.endsWith(')') && (out.match(/\)/g) || []).length > (out.match(/\(/g) || []).length) {
      out = out.slice(0, -1)
    }
    if (out.endsWith(']') && (out.match(/\]/g) || []).length > (out.match(/\[/g) || []).length) {
      out = out.slice(0, -1)
    }
    if (out === before) return out
  }
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" dir="auto" className={LINK_CLASS}>
      {children}
    </a>
  )
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  let index = 0
  for (const match of text.matchAll(INLINE_PATTERN)) {
    const start = match.index ?? 0
    if (start < last) continue
    if (start > last) nodes.push(text.slice(last, start))
    let token = match[0]
    const key = `${keyPrefix}-${index++}`

    if (match[1]) {
      nodes.push(
        <code
          key={key}
          dir="ltr"
          className="rounded bg-siftrix-pearl px-1 py-0.5 font-mono text-[0.9em] text-siftrix-antique-ink border border-siftrix-border break-all"
        >
          {token.slice(1, -1)}
        </code>
      )
    } else if (match[2]) {
      nodes.push(
        <strong key={key} className="font-semibold">
          {renderInline(token.slice(2, -2), key)}
        </strong>
      )
    } else if (match[3]) {
      const parts = token.match(/^\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)(?:\s+"[^"\n]*")?\)$/)
      if (parts && isSafeUrl(parts[2])) {
        nodes.push(
          <ExternalLink key={key} href={parts[2]}>
            {parts[1]}
          </ExternalLink>
        )
      } else {
        nodes.push(parts ? parts[1] : token)
      }
    } else if (match[4]) {
      const url = token.slice(1, -1)
      nodes.push(
        isValidHttpUrl(url) ? (
          <ExternalLink key={key} href={url}>
            {url}
          </ExternalLink>
        ) : (
          token
        )
      )
    } else if (match[5]) {
      token = trimBareUrl(token)
      nodes.push(
        isValidHttpUrl(token) ? (
          <ExternalLink key={key} href={token}>
            {token}
          </ExternalLink>
        ) : (
          token
        )
      )
    } else if (match[6]) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>)
    }
    last = start + token.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

const HEADING_CLASSES = [
  'text-base font-bold',
  'text-[15px] font-bold',
  'text-sm font-bold',
  'text-sm font-semibold',
  'text-xs font-semibold',
  'text-xs font-semibold',
]

interface ListItem {
  text: string
  sub: string[]
}

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'ul' | 'ol'; items: ListItem[] }
  | { type: 'p'; text: string }
  | { type: 'code'; text: string }

function parseBlocks(source: string): Block[] {
  const lines = source.split('\n')
  const blocks: Block[] = []
  let paragraph: string[] = []
  let list: { type: 'ul' | 'ol'; items: ListItem[] } | null = null
  let fence: string[] | null = null

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: 'p', text: paragraph.join('\n') })
      paragraph = []
    }
  }
  const flushList = () => {
    if (list) {
      blocks.push(list)
      list = null
    }
  }

  for (const line of lines) {
    if (fence) {
      if (/^\s*```/.test(line)) {
        blocks.push({ type: 'code', text: fence.join('\n') })
        fence = null
      } else {
        fence.push(line)
      }
      continue
    }
    if (/^\s*```/.test(line)) {
      flushParagraph()
      flushList()
      fence = []
      continue
    }

    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/)
    if (heading) {
      flushParagraph()
      flushList()
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] })
      continue
    }

    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
    if (ordered || bullet) {
      flushParagraph()
      // Indented bullet under an existing item becomes a nested sub-item, so the
      // parent numbered list keeps counting (1, 2, 3...) instead of restarting.
      if (bullet && !ordered && list && /^\s{2,}/.test(line)) {
        list.items[list.items.length - 1].sub.push(bullet[1])
        continue
      }
      const type = ordered ? 'ol' : 'ul'
      if (!list || list.type !== type) {
        flushList()
        list = { type, items: [] }
      }
      list.items.push({ text: (ordered ?? bullet)![1], sub: [] })
      continue
    }

    if (!line.trim()) {
      flushParagraph()
      // Keep an open list across blank lines; any non-list line closes it below.
      continue
    }

    // Indented continuation of a list item
    if (list && /^\s{2,}\S/.test(line)) {
      list.items[list.items.length - 1].text += ` ${line.trim()}`
      continue
    }

    flushList()
    paragraph.push(line)
  }

  if (fence) blocks.push({ type: 'code', text: fence.join('\n') })
  flushParagraph()
  flushList()
  return blocks
}

interface MarkdownMessageProps {
  content: string
  dir?: 'ltr' | 'rtl'
  className?: string
}

export default function MarkdownMessage({ content, dir = 'ltr', className = '' }: MarkdownMessageProps) {
  const blocks = parseBlocks(normalizeMarkdownSource(String(content ?? '')))
  const isRtl = dir === 'rtl'

  return (
    <div dir={dir} className={`space-y-2 break-words ${isRtl ? 'text-right' : ''} ${className}`}>
      {blocks.map((block, i) => {
        const key = `b${i}`
        switch (block.type) {
          case 'heading':
            return (
              <p
                key={key}
                role="heading"
                aria-level={Math.min(block.level + 2, 6)}
                className={`${HEADING_CLASSES[block.level - 1]} text-siftrix-charcoal pt-1`}
              >
                {renderInline(block.text, key)}
              </p>
            )
          case 'ul':
          case 'ol': {
            const ListTag = block.type
            return (
              <ListTag
                key={key}
                className={`${block.type === 'ol' ? 'list-decimal' : 'list-disc'} space-y-1 ${
                  isRtl ? 'pr-5' : 'pl-5'
                }`}
              >
                {block.items.map((item, j) => (
                  <li key={j}>
                    {renderInline(item.text, `${key}-${j}`)}
                    {item.sub.length > 0 ? (
                      <ul className={`list-disc space-y-1 mt-1 ${isRtl ? 'pr-5' : 'pl-5'}`}>
                        {item.sub.map((sub, k) => (
                          <li key={k}>{renderInline(sub, `${key}-${j}-${k}`)}</li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ListTag>
            )
          }
          case 'code':
            return (
              <pre
                key={key}
                dir="ltr"
                className="overflow-x-auto rounded-lg bg-siftrix-pearl border border-siftrix-border p-2.5 font-mono text-[11px] text-left"
              >
                {block.text}
              </pre>
            )
          default:
            return (
              <p key={key} className="whitespace-pre-line">
                {renderInline(block.text, key)}
              </p>
            )
        }
      })}
    </div>
  )
}

export function VerifiedSources({
  citations,
  label = 'Verified Sources',
  compact = false,
}: {
  citations: ReadonlyArray<unknown>
  label?: string
  compact?: boolean
}) {
  if (!citations.length) return null
  return (
    <div className="pt-2 border-t border-siftrix-border/60 space-y-1.5 text-[10px] text-siftrix-muted-dark">
      <p className="font-semibold text-siftrix-antique-ink">{label}</p>
      <ul className="flex flex-wrap gap-1.5">
        {citations.map((cite, idx) => {
          const parsed = parseCitation(cite)
          const chip = `inline-flex max-w-full items-center gap-1.5 rounded bg-siftrix-pearl border border-siftrix-border ${
            compact ? 'px-1.5 py-0.5' : 'px-2 py-0.5'
          }`
          return (
            <li key={`${idx}`} className={chip}>
              <span className="font-medium text-siftrix-graphite">{parsed.name}</span>
              {parsed.url ? (
                <a
                  href={parsed.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  dir="ltr"
                  className="underline decoration-siftrix-gold/70 truncate max-w-[14rem] hover:text-siftrix-antique-ink"
                >
                  {parsed.url.replace(/^https?:\/\//i, '')}
                </a>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
