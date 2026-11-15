import type { ReactNode } from 'react'

/**
 * Sanitizes URLs to prevent XSS (blocks javascript:, vbscript:, data:, and unknown schemes).
 * Safely accepts http:, https:, mailto:, relative (/), and anchor (#) URLs.
 * Automatically prefixes bare www. addresses with https://.
 */
export function sanitizeUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()

  // Immediately reject dangerous schemes
  if (/^(javascript|vbscript|data):/i.test(trimmed)) {
    return null
  }

  // Allow relative paths and anchor links
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return trimmed
  }

  // Handle www. prefix
  let candidate = trimmed
  if (/^www\./i.test(candidate)) {
    candidate = `https://${candidate}`
  }

  try {
    const parsed = new URL(candidate)
    if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return candidate
    }
    return null
  } catch {
    return null
  }
}

/**
 * Extracts the URL and optional title attribute from a Markdown link target.
 * e.g. "https://example.com \"Title\"" -> { url: "https://example.com", title: "Title" }
 */
export function extractUrlAndTitle(target: string): { url: string; title?: string } {
  let cleaned = target.trim()
  if (cleaned.startsWith('<') && cleaned.endsWith('>')) {
    cleaned = cleaned.slice(1, -1).trim()
  }
  const titleMatch = cleaned.match(/^([^\s]+)(?:\s+["'](.*)["'])?$/)
  if (titleMatch) {
    return { url: titleMatch[1], title: titleMatch[2] }
  }
  return { url: cleaned }
}

function labelText(label: string): string {
  return label.replace(/[*_`#[\]]/g, '').trim()
}

/**
 * Renders inline Markdown elements:
 * - Markdown links: [label](url)
 * - Bare URLs: https://... or http://...
 * - Inline code: `code`
 * - Bold + Italic: ***text*** or ___text___
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 */
export function renderInlineMarkdown(text: string): ReactNode[] {
  if (!text) return []

  // Token pattern matching:
  // 1. Inline code: `code`
  // 2. Markdown link: [label](target) with support for nested parentheses in URL & optional title
  // 3. HTML / Escaped HTML anchor: <a href="...">...</a> or \<a href="...">...\</a>
  // 4. Bare URL: https://... or http://... or www.... (stops before trailing sentence punctuation)
  // 5. Bold + Italic: ***text***
  // 6. Bold: **text**
  // 7. Italic: *text*
  const pattern =
    /(`[^`]+`)|\[([^\]]+)\]\(((?:[^\s()]+|\([^\s()]*\))+(?:\s+["'][^"']*["'])?)\)|(\\?<\s*a\s+[^>]*href=["']([^"'>\s]+)["'][^>]*>(.*?)\\?<\s*\/\s*a\s*\\?>)|((?:https?:\/\/|www\.)[^\s<>[\]()"`]+[^\s<>[\]()"`.,;:!?])|(\*\*\*[^*]+\*\*\*|___[^_]+___)|(\*\*[^*]+\*\*|__[^_]+__)|(\*[^*]+\*|_[^_]+_)/gi

  const nodes: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    const matchIndex = match.index

    if (matchIndex > lastIndex) {
      nodes.push(text.slice(lastIndex, matchIndex))
    }

    const fullMatch = match[0]
    const codeGroup = match[1]
    const linkLabel = match[2]
    const linkTarget = match[3]
    const htmlAnchorHref = match[5]
    const htmlAnchorLabel = match[6]
    const bareUrl = match[7]
    const boldItalicGroup = match[8]
    const boldGroup = match[9]
    const italicGroup = match[10]

    if (codeGroup) {
      // 1. Inline Code
      const code = codeGroup.slice(1, -1)
      nodes.push(
        <code
          key={`code-${matchIndex}`}
          className="rounded bg-siftrix-pearl px-1.5 py-0.5 font-mono text-[11px] text-siftrix-charcoal border border-siftrix-border"
        >
          {code}
        </code>
      )
    } else if (linkLabel !== undefined && linkTarget !== undefined) {
      // 2. Standard Markdown Link: [label](url)
      const { url, title } = extractUrlAndTitle(linkTarget)
      const safeUrl = sanitizeUrl(url)
      const parsedLabel = renderInlineMarkdown(linkLabel)
      const labelContent = parsedLabel.length === 1 ? parsedLabel[0] : parsedLabel

      if (safeUrl) {
        nodes.push(
          <a
            key={`link-${matchIndex}`}
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={title || labelText(linkLabel)}
            className="text-siftrix-gold underline decoration-siftrix-gold/70 underline-offset-2 hover:text-siftrix-antique-ink transition-colors font-medium break-all cursor-pointer inline"
          >
            {labelContent}
          </a>
        )
      } else {
        nodes.push(
          <span key={`link-raw-${matchIndex}`}>
            {labelContent}
          </span>
        )
      }
    } else if (htmlAnchorHref !== undefined && htmlAnchorLabel !== undefined) {
      // 3. HTML or Escaped HTML anchor: <a href="url">label</a> or \<a href="url">label\</a>
      const safeUrl = sanitizeUrl(htmlAnchorHref)
      const cleanLabel = htmlAnchorLabel.replace(/\\/g, '').trim()
      const parsedLabel = renderInlineMarkdown(cleanLabel)
      const labelContent =
        parsedLabel.length === 1
          ? parsedLabel[0]
          : parsedLabel.length > 0
          ? parsedLabel
          : cleanLabel

      if (safeUrl) {
        nodes.push(
          <a
            key={`html-link-${matchIndex}`}
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={labelText(cleanLabel)}
            className="text-siftrix-gold underline decoration-siftrix-gold/70 underline-offset-2 hover:text-siftrix-antique-ink transition-colors font-medium break-all cursor-pointer inline"
          >
            {labelContent}
          </a>
        )
      } else {
        nodes.push(
          <span key={`html-link-raw-${matchIndex}`}>
            {labelContent}
          </span>
        )
      }
    } else if (bareUrl) {
      // 3. Bare URL: https://example.com or www.example.com
      const safeUrl = sanitizeUrl(bareUrl)
      if (safeUrl) {
        nodes.push(
          <a
            key={`bare-url-${matchIndex}`}
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={bareUrl}
            className="text-siftrix-gold underline decoration-siftrix-gold/70 underline-offset-2 hover:text-siftrix-antique-ink transition-colors font-medium break-all cursor-pointer inline"
          >
            {bareUrl}
          </a>
        )
      } else {
        nodes.push(bareUrl)
      }
    } else if (boldItalicGroup) {
      // 4. Bold + Italic: ***text***
      const inner = boldItalicGroup.slice(3, -3)
      const innerNodes = renderInlineMarkdown(inner)
      nodes.push(
        <strong key={`bi-${matchIndex}`} className="font-bold">
          <em className="italic">{innerNodes.length === 1 ? innerNodes[0] : innerNodes}</em>
        </strong>
      )
    } else if (boldGroup) {
      // 5. Bold: **text**
      const inner = boldGroup.slice(2, -2)
      const innerNodes = renderInlineMarkdown(inner)
      nodes.push(
        <strong key={`bold-${matchIndex}`} className="font-bold text-siftrix-charcoal">
          {innerNodes.length === 1 ? innerNodes[0] : innerNodes}
        </strong>
      )
    } else if (italicGroup) {
      // 6. Italic: *text*
      const inner = italicGroup.slice(1, -1)
      const innerNodes = renderInlineMarkdown(inner)
      nodes.push(
        <em key={`italic-${matchIndex}`} className="italic">
          {innerNodes.length === 1 ? innerNodes[0] : innerNodes}
        </em>
      )
    } else {
      nodes.push(fullMatch)
    }

    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

export interface TableBlock {
  type: 'table'
  headers: string[]
  rows: string[][]
}

export interface CodeBlock {
  type: 'code_block'
  language: string
  code: string
}

export interface HeadingBlock {
  type: 'heading'
  level: number
  text: string
}

export interface ListItem {
  number?: number
  text: string
  subItems?: string[]
}

export interface ListBlock {
  type: 'list'
  ordered: boolean
  start?: number
  items: ListItem[]
}

export interface BlockquoteBlock {
  type: 'blockquote'
  text: string
}

export interface HorizontalRuleBlock {
  type: 'hr'
}

export interface ParagraphBlock {
  type: 'paragraph'
  text: string
}

export type MarkdownBlock =
  | TableBlock
  | CodeBlock
  | HeadingBlock
  | ListBlock
  | BlockquoteBlock
  | HorizontalRuleBlock
  | ParagraphBlock

/**
 * Parses markdown lines into structured block elements.
 */
export function parseBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.split(/\r?\n/)
  const blocks: MarkdownBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip empty lines
    if (!trimmed) {
      i++
      continue
    }

    // 1. Code Block: ```lang
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) {
        i++ // consume closing ```
      }
      blocks.push({
        type: 'code_block',
        language,
        code: codeLines.join('\n'),
      })
      continue
    }

    // 2. Table: line with pipes, followed by separator line with dashes
    if (
      trimmed.startsWith('|') &&
      trimmed.endsWith('|') &&
      i + 1 < lines.length &&
      lines[i + 1].trim().startsWith('|') &&
      /^[|\s-:]+$/.test(lines[i + 1].trim())
    ) {
      const rawHeader = trimmed
      const headers = rawHeader
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim())
      i += 2 // skip header and separator

      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        const rowCells = lines[i]
          .trim()
          .split('|')
          .slice(1, -1)
          .map((cell) => cell.trim())
        rows.push(rowCells)
        i++
      }
      blocks.push({
        type: 'table',
        headers,
        rows,
      })
      continue
    }

    // 3. Headings: #, ##, ###, ####
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      })
      i++
      continue
    }

    // 4. Blockquotes: > text
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''))
        i++
      }
      blocks.push({
        type: 'blockquote',
        text: quoteLines.join(' '),
      })
      continue
    }

    // 5. Horizontal Rule: ---, ***, ___ (at least 3 characters on their own line)
    if (/^(?:(?:\s*-\s*){3,}|(?:\s*\*\s*){3,}|(?:\s*_\s*){3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' })
      i++
      continue
    }

    // 6. Ordered List: 1. Item
    if (/^\d+\.\s+/.test(trimmed)) {
      const firstMatch = trimmed.match(/^(\d+)\.\s+(.+)$/)
      const startNum = firstMatch ? parseInt(firstMatch[1], 10) : 1
      const items: ListItem[] = []

      while (i < lines.length) {
        const lineRaw = lines[i]
        const currentTrim = lineRaw.trim()
        const match = currentTrim.match(/^(\d+)\.\s+(.+)$/)

        if (match) {
          const itemNum = parseInt(match[1], 10)
          items.push({
            number: itemNum,
            text: match[2],
            subItems: [],
          })
          i++
        } else if (
          items.length > 0 &&
          (lineRaw.startsWith('  ') || lineRaw.startsWith('\t')) &&
          currentTrim.match(/^[-*]\s+(.+)$/)
        ) {
          // Indented nested bullet item under active numbered item
          const subMatch = currentTrim.match(/^[-*]\s+(.+)$/)!
          if (!items[items.length - 1].subItems) {
            items[items.length - 1].subItems = []
          }
          items[items.length - 1].subItems!.push(subMatch[1])
          i++
        } else if (
          currentTrim &&
          items.length > 0 &&
          !/^\d+\.\s+/.test(currentTrim) &&
          !/^[-*]\s+/.test(currentTrim) &&
          !currentTrim.startsWith('#') &&
          !currentTrim.startsWith('```') &&
          !currentTrim.startsWith('|')
        ) {
          // Contiguous continuation of previous list item
          items[items.length - 1].text += ` ${currentTrim}`
          i++
        } else if (!currentTrim) {
          // Peek ahead across blank lines (loose list support)
          let j = i + 1
          while (j < lines.length && !lines[j].trim()) {
            j++
          }
          if (
            j < lines.length &&
            (/^\d+\.\s+/.test(lines[j].trim()) ||
              ((lines[j].startsWith('  ') || lines[j].startsWith('\t')) &&
                /^[-*]\s+/.test(lines[j].trim())))
          ) {
            i = j
          } else {
            break
          }
        } else {
          break
        }
      }

      blocks.push({
        type: 'list',
        ordered: true,
        start: startNum,
        items,
      })
      continue
    }

    // 7. Unordered List: - Item or * Item
    if (/^[-*]\s+/.test(trimmed)) {
      const items: ListItem[] = []
      while (i < lines.length) {
        const lineRaw = lines[i]
        const currentTrim = lineRaw.trim()
        const match = currentTrim.match(/^[-*]\s+(.+)$/)

        if (match) {
          items.push({ text: match[1], subItems: [] })
          i++
        } else if (
          items.length > 0 &&
          (lineRaw.startsWith('  ') || lineRaw.startsWith('\t')) &&
          (currentTrim.match(/^[-*]\s+(.+)$/) || currentTrim.match(/^\d+\.\s+(.+)$/))
        ) {
          // Indented nested item
          const subText = currentTrim.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '')
          if (!items[items.length - 1].subItems) {
            items[items.length - 1].subItems = []
          }
          items[items.length - 1].subItems!.push(subText)
          i++
        } else if (
          currentTrim &&
          items.length > 0 &&
          !/^[-*]\s+/.test(currentTrim) &&
          !/^\d+\.\s+/.test(currentTrim) &&
          !currentTrim.startsWith('#') &&
          !currentTrim.startsWith('```') &&
          !currentTrim.startsWith('|')
        ) {
          // Continuation text
          items[items.length - 1].text += ` ${currentTrim}`
          i++
        } else if (!currentTrim) {
          // Peek ahead across blank lines
          let j = i + 1
          while (j < lines.length && !lines[j].trim()) {
            j++
          }
          if (j < lines.length && /^[-*]\s+/.test(lines[j].trim())) {
            i = j
          } else {
            break
          }
        } else {
          break
        }
      }

      blocks.push({
        type: 'list',
        ordered: false,
        items,
      })
      continue
    }

    // 8. Paragraph
    const paraLines: string[] = [trimmed]
    i++
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('|') &&
      !lines[i].trim().match(/^#{1,4}\s+/) &&
      !lines[i].trim().startsWith('>') &&
      !/^(?:(?:\s*-\s*){3,}|(?:\s*\*\s*){3,}|(?:\s*_\s*){3,})$/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^[-*]\s+/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim())
      i++
    }
    blocks.push({
      type: 'paragraph',
      text: paraLines.join('\n'),
    })
  }

  return blocks
}
