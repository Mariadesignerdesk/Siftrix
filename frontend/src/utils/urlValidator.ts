// Common non-web file extensions that should not be mistaken for top-level domains
export const FILE_EXTENSIONS = new Set([
  'pdf', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt',
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp',
  'zip', 'rar', '7z', 'tar', 'gz', 'bz2',
  'mp3', 'wav', 'ogg', 'mp4', 'mov', 'avi', 'mkv',
  'json', 'xml', 'csv', 'exe', 'apk', 'dmg', 'iso', 'bin',
])

export type DetectedInputType = 'URL' | 'Message' | null

// Helper function to check if input resembles a URL
export function looksLikeUrl(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false

  // 1. Explicit web URL prefix (http://, https://, www.)
  if (/^(https?:\/\/|www\.)/i.test(trimmed)) {
    return true
  }

  // 2. Email addresses (e.g. user@example.com) are messages, not web URLs
  if (trimmed.includes('@')) {
    return false
  }

  // 3. Multi-word strings with spaces are messages
  if (trimmed.includes(' ')) {
    return false
  }

  // 4. Extract the host segment (before any port, path, query, or hash)
  const hostPart = trimmed.split(/[/\\?#]/)[0]
  const hostWithoutPort = hostPart.split(':')[0]

  // Must contain a dot and cannot start or end with a dot (e.g., "Hello." or "Done.")
  if (!hostWithoutPort.includes('.') || hostWithoutPort.startsWith('.') || hostWithoutPort.endsWith('.')) {
    return false
  }

  const parts = hostWithoutPort.split('.')
  const lastPart = parts[parts.length - 1].toLowerCase()

  // 5. Standalone file names (e.g., "report.pdf") are not URLs
  if (FILE_EXTENSIONS.has(lastPart)) {
    return false
  }

  // 6. Must have a valid TLD structure of at least 2 alphabetic letters
  if (!/^[a-z]{2,}$/i.test(lastPart)) {
    return false
  }

  // 7. All domain segments must contain valid domain characters (letters, numbers, hyphens)
  return parts.every((part) => /^[a-z0-9-]+$/i.test(part))
}

// Validate URL format using the browser's URL API
export function isValidUrl(urlString: string): boolean {
  try {
    const trimmed = urlString.trim()

    // Standalone email addresses are not web URLs
    if (trimmed.includes('@') && !/^https?:\/\//i.test(trimmed)) {
      return false
    }

    const urlToTest = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const parsed = new URL(urlToTest)
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.includes('.')
  } catch {
    return false
  }
}
