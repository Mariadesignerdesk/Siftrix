export interface ParsedCitation {
  id: string
  label: string
  url?: string
}

/**
 * Validates if a string is a safe HTTP/HTTPS URL.
 */
function isValidHttpUrl(candidate: string): boolean {
  if (!candidate || typeof candidate !== 'string') return false
  const trimmed = candidate.trim()
  try {
    const url = new URL(trimmed)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Parses a citation string:
 * 1. Markdown link: [Label](https://...)
 * 2. Raw URL: https://...
 * 3. Delimited URL: Label - https://... or Label | https://... or Label: https://...
 * 4. Plain text: Label (Never invents a URL)
 */
export function parseCitation(raw: string, index: number): ParsedCitation {
  const trimmed = raw.trim()

  // Case 1: Markdown link format: [Label](https://...)
  const mdMatch = trimmed.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/)
  if (mdMatch) {
    const label = mdMatch[1].trim()
    const url = mdMatch[2].trim()
    if (isValidHttpUrl(url)) {
      return { id: `cite-${index}-${label}`, label, url }
    }
  }

  // Case 2: HTML or escaped HTML anchor: <a href="...">Label</a> or \<a href="...">Label\</a>
  const htmlMatch = trimmed.match(
    /^\\?<\s*a\s+[^>]*href=["'](https?:\/\/[^"'>\s]+)["'][^>]*>(.*?)\\?<\s*\/\s*a\s*\\?>$/i
  )
  if (htmlMatch) {
    const url = htmlMatch[1].trim()
    const label = htmlMatch[2].replace(/\\/g, '').trim()
    if (label && isValidHttpUrl(url)) {
      return { id: `cite-${index}-${label}`, label, url }
    }
  }

  // Case 2: Direct URL
  if (isValidHttpUrl(trimmed)) {
    return { id: `cite-${index}-url`, label: trimmed, url: trimmed }
  }

  // Case 3: Label followed by delimiter and URL (e.g. "MITRE - https://attack.mitre.org")
  const sepMatch = trimmed.match(/^(.+?)\s*(?:[-|:]\s*|\s+)(https?:\/\/[^\s]+)$/i)
  if (sepMatch) {
    const label = sepMatch[1].trim()
    const url = sepMatch[2].trim()
    if (label && isValidHttpUrl(url)) {
      return { id: `cite-${index}-${label}`, label, url }
    }
  }

  // Case 4: Plain text title without any URL provided.
  // Rule: NEVER invent or guess a URL if none was explicitly provided.
  return { id: `cite-${index}-${trimmed}`, label: trimmed }
}
