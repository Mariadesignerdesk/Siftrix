const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
}

/**
 * Decodes numeric (&#65; / &#x41;) and a small allow-list of named HTML entities
 * to plain text in a single pass. The result is meant to be rendered as a React
 * text node (never via dangerouslySetInnerHTML), so decoded `<` or `>` stay inert.
 */
export function decodeHtmlEntities(input: string): string {
  if (!input || input.indexOf('&') === -1) return input
  return input.replace(/&(?:#x([0-9a-fA-F]{1,6})|#(\d{1,7})|([a-zA-Z]{2,6}));/g, (match, hex, dec, name) => {
    if (hex || dec) {
      const code = hex ? parseInt(hex, 16) : parseInt(dec, 10)
      if (
        code >= 0x20 &&
        code <= 0x10ffff &&
        !(code >= 0x7f && code <= 0x9f) &&
        !(code >= 0xd800 && code <= 0xdfff)
      ) {
        return String.fromCodePoint(code)
      }
      return match
    }
    return NAMED_ENTITIES[name.toLowerCase()] ?? match
  })
}

/** Removes backslash escapes in front of Markdown punctuation (e.g. `\###`, `\*\*`). */
export function unescapeMarkdown(input: string): string {
  return input.replace(/\\([\\`*_{}[\]()#+\-.!>~|])/g, '$1')
}

/** Normalizes backend/user-facing text: decode entities for plain-text display. */
export function normalizeDisplayText(input: unknown): string {
  return typeof input === 'string' ? decodeHtmlEntities(input) : ''
}

/** Normalizes Markdown source before parsing (entities + escaped markers). */
export function normalizeMarkdownSource(input: string): string {
  return unescapeMarkdown(decodeHtmlEntities(input)).replace(/\r\n?/g, '\n')
}

/**
 * Rejects ASCII C0/C1 controls, ASCII/Unicode whitespace, zero-width formatting chars,
 * Unicode bidi marks/overrides/isolates, backslashes, angle brackets, double quotes, and backticks.
 */
function hasUnsafeUrlChars(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code <= 0x20 || (code >= 0x7f && code <= 0x9f)) return true
    if (code === 0x22 || code === 0x3c || code === 0x3e || code === 0x5c || code === 0x60) {
      return true
    }
    if (
      code === 0x00a0 ||
      code === 0x1680 ||
      (code >= 0x2000 && code <= 0x200a) ||
      code === 0x2028 ||
      code === 0x2029 ||
      code === 0x202f ||
      code === 0x205f ||
      code === 0x3000
    ) {
      return true
    }
    if ((code >= 0x200b && code <= 0x200d) || code === 0x2060 || code === 0xfeff) {
      return true
    }
    if (
      code === 0x061c ||
      code === 0x200e ||
      code === 0x200f ||
      (code >= 0x202a && code <= 0x202e) ||
      (code >= 0x2066 && code <= 0x2069)
    ) {
      return true
    }
  }
  return false
}

function isValidIpv4(hostname: string): boolean {
  const parts = hostname.split('.')
  if (parts.length !== 4) return false
  return parts.every((part) => /^(?:0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255)
}

function isValidBracketedIpv6(hostname: string): boolean {
  if (!hostname.startsWith('[') || !hostname.endsWith(']')) return false
  const inner = hostname.slice(1, -1)
  if (!inner || !/^[0-9a-fA-F:.]+$/.test(inner) || !inner.includes(':')) return false
  try {
    const parsed = new URL(`http://${hostname}`)
    return parsed.hostname.startsWith('[') && parsed.hostname.endsWith(']')
  } catch {
    return false
  }
}

function isValidDnsLabel(label: string): boolean {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)) return false
  const lower = label.toLowerCase()
  // RFC 5891: hyphens in both positions 3 and 4 are reserved for valid 'xn--' A-labels only
  if (lower.length >= 4 && lower.slice(2, 4) === '--') {
    if (!lower.startsWith('xn--')) return false
    // RFC 3492: valid non-control IDNA A-labels require >= 2 punycode chars and cannot start with 'xn---'
    if (lower.length < 6 || lower.startsWith('xn---')) return false
  }
  return true
}

function isValidHostname(hostname: string): boolean {
  if (!hostname || hostname.length > 253) return false
  if (hostname === 'localhost') return true
  if (hostname.startsWith('[') || hostname.endsWith(']')) {
    return isValidBracketedIpv6(hostname)
  }
  if (!hostname.includes('.') || hostname.startsWith('.') || hostname.endsWith('.') || hostname.includes('..')) {
    return false
  }
  if (/^\d+(?:\.\d+){3}$/.test(hostname)) return isValidIpv4(hostname)
  const labels = hostname.split('.')
  if (!labels.every(isValidDnsLabel)) return false
  const tld = labels[labels.length - 1]
  return /^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/i.test(tld)
}

function extractRawHttpHost(httpUrl: string): string {
  const afterScheme = httpUrl.replace(/^https?:\/\//i, '')
  const authority = afterScheme.split(/[/?#]/, 1)[0]
  if (authority.startsWith('[')) {
    const closeIdx = authority.indexOf(']')
    return closeIdx === -1 ? authority : authority.slice(0, closeIdx + 1)
  }
  return authority.split(':', 1)[0]
}

/**
 * Checks syntactic HTTP/HTTPS URL format and scheme safety (no embedded credentials or control/bidi chars).
 * Format validation only — does NOT assess domain reputation, SSRF boundaries, or phishing safety.
 */
export function isValidHttpUrl(url: string): boolean {
  const candidate = url.trim()
  if (!candidate || hasUnsafeUrlChars(candidate)) return false
  if (!/^https?:\/\/[^/\s\\]/i.test(candidate)) return false
  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    if (parsed.username !== '' || parsed.password !== '') return false
    // Reject non-canonical IPv4 forms (shorthand 127.1, integer, hex 0x..., octal 0177...)
    if (/^\d+(?:\.\d+){3}$/.test(parsed.hostname) && extractRawHttpHost(candidate) !== parsed.hostname) {
      return false
    }
    return isValidHostname(parsed.hostname)
  } catch {
    return false
  }
}

/**
 * Checks whether a URL uses a safe anchor scheme (valid http, https, or mailto) with valid syntax.
 * Format/protocol check only — never implies a target destination is trusted or verified safe.
 */
export function isSafeUrl(url: string): boolean {
  const candidate = url.trim()
  if (!candidate || hasUnsafeUrlChars(candidate)) return false
  if (/^mailto:/i.test(candidate)) {
    const address = candidate.slice('mailto:'.length)
    const parts = address.split('@')
    if (parts.length !== 2 || !parts[0] || !parts[1]) return false
    if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(parts[0])) return false
    const rawDomain = parts[1]
    let normalizedDomain = rawDomain
    if (!normalizedDomain.startsWith('[') && !normalizedDomain.endsWith(']')) {
      try {
        normalizedDomain = new URL(`http://${normalizedDomain}`).hostname
      } catch {
        return false
      }
      if (/^\d+(?:\.\d+){3}$/.test(normalizedDomain) && rawDomain !== normalizedDomain) {
        return false
      }
    }
    return isValidHostname(normalizedDomain)
  }
  return isValidHttpUrl(candidate)
}

export interface ParsedCitation {
  name: string
  url?: string
}

/**
 * Normalizes a citation (plain string, or an object with name/title/source and url/link/href)
 * into a display name and an optional URL. A URL is only returned when it is a valid
 * http(s) URL actually present in the data; URLs are never invented from source names.
 */
export function parseCitation(raw: unknown): ParsedCitation {
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    const pick = (...keys: string[]) => {
      for (const key of keys) {
        const value = obj[key]
        if (typeof value === 'string' && value.trim()) return value.trim()
      }
      return ''
    }
    const url = pick('url', 'link', 'href')
    const name = normalizeDisplayText(pick('name', 'title', 'source', 'label'))
    const safeUrl = url && isValidHttpUrl(url) ? url : undefined
    return { name: name || (safeUrl ? safeUrl.replace(/^https?:\/\//i, '') : ''), url: safeUrl }
  }

  const text = normalizeMarkdownSource(String(raw ?? '')).trim()

  const md = text.match(/^\[([^\]]+)\]\((\S+?)\)$/)
  if (md) {
    return isValidHttpUrl(md[2]) ? { name: md[1].trim(), url: md[2] } : { name: md[1].trim() }
  }

  const urlMatch = text.match(
    /https?:\/\/(?:\[[0-9a-fA-F:.]+\]|[^\s)>\]\u0600-\u06FF])[^\s)>\]\u0600-\u06FF]*/i
  )
  if (urlMatch) {
    const url = urlMatch[0].replace(/[.,;:]+$/, '')
    if (!isValidHttpUrl(url)) return { name: text }
    const name = text
      .replace(urlMatch[0], '')
      .replace(/[\s\-–—:|()<>[\]]+$/g, '')
      .replace(/^[\s\-–—:|()<>[\]]+/g, '')
      .trim()
    return { name: name || url.replace(/^https?:\/\//i, ''), url }
  }

  return { name: text }
}
