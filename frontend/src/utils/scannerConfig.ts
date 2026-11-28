import type { ScanRequest, ScanResponse, ScanTargetType } from '../services/api'
import { isValidUrl, looksLikeUrl } from './urlValidator'
import type { LanguageView } from './userPreferences'

export type ScannerInputMode = 'auto' | 'url' | 'message' | 'email'
export type ScanChannel = 'web-scanner' | 'sms' | 'whatsapp' | 'email' | 'social-dm'

export interface ScanConfigOptions {
  mode: ScannerInputMode
  channel: ScanChannel
  senderHint: string
  languageView: LanguageView
}

export const MAX_SCAN_CONTENT_CHARS = 50_000

export const SCAN_MODE_OPTIONS: ReadonlyArray<{
  id: ScannerInputMode
  label: string
  hint: string
  placeholder: string
}> = [
  {
    id: 'auto',
    label: 'Auto-Detect',
    hint: 'Routes URLs vs. text automatically',
    placeholder: 'Paste a suspicious URL, SMS/WhatsApp message, or email snippet here...',
  },
  {
    id: 'url',
    label: 'URL',
    hint: 'Direct link & domain reputation check',
    placeholder: 'Enter an HTTP/HTTPS URL or domain (e.g., https://example-login.com/verify)...',
  },
  {
    id: 'message',
    label: 'Message',
    hint: 'SMS, chat, and DM scam analysis',
    placeholder: 'Paste the suspicious SMS, WhatsApp, or direct message text here...',
  },
  {
    id: 'email',
    label: 'Email',
    hint: 'Phishing email headers, lures & embedded links',
    placeholder: 'Paste email headers (From, Subject, Reply-To) and message body here...',
  },
]

export const SCAN_CHANNEL_OPTIONS: ReadonlyArray<{
  value: ScanChannel
  label: string
}> = [
  { value: 'web-scanner', label: 'General Web / Clipboard' },
  { value: 'sms', label: 'SMS / Mobile Text' },
  { value: 'whatsapp', label: 'WhatsApp / Chat App' },
  { value: 'email', label: 'Email Client' },
  { value: 'social-dm', label: 'Social Media DM' },
]

export const SCANNER_SAMPLES: ReadonlyArray<{
  id: 'url' | 'message' | 'email'
  label: string
  ariaLabel: string
  mode: ScannerInputMode
  channel: ScanChannel
  senderHint: string
  content: string
}> = [
  {
    id: 'url',
    label: 'Sample URL',
    ariaLabel: 'Load sample phishing URL',
    mode: 'auto',
    channel: 'web-scanner',
    senderHint: '',
    content: 'https://chase-security-update.xyz/login',
  },
  {
    id: 'message',
    label: 'Sample Message',
    ariaLabel: 'Load sample urgent message',
    mode: 'auto',
    channel: 'sms',
    senderHint: '',
    content:
      'URGENT: Your bank account has been suspended due to suspicious activity. Please verify your credentials immediately to restore access.',
  },
  {
    id: 'email',
    label: 'Sample Email',
    ariaLabel: 'Load sample phishing email',
    mode: 'email',
    channel: 'email',
    senderHint: 'security-notice@account-verify-support.xyz',
    content:
      'Subject: Immediate Action Required: Unrecognized Sign-In Attempt\nFrom: Account Security <security-notice@account-verify-support.xyz>\n\nWe noticed an unauthorized login attempt on your account. Confirm your identity within 2 hours at https://account-verify-support.xyz/session-check or your access will be restricted.',
  },
]

export const SCAN_PIPELINE_STAGES: ReadonlyArray<{
  id: 'validate' | 'agents' | 'advisor'
  step: string
  title: string
  detail: string
}> = [
  {
    id: 'validate',
    step: '01',
    title: 'Client Pre-Check & Dispatch',
    detail: 'Input validated and transmitted over TLS to POST /api/scan.',
  },
  {
    id: 'agents',
    step: '02',
    title: 'URL & Message Intelligence',
    detail: 'Backend agents inspect links, lures, and social-engineering patterns.',
  },
  {
    id: 'advisor',
    step: '03',
    title: 'Security Advisor Synthesis',
    detail: 'Compiling unified risk score and English + Urdu (اردو) guidance.',
  },
]

export const ILLUSTRATIVE_SAMPLE_REPORT: ScanResponse = {
  id: 'sample-preview-format',
  user_id: null,
  target_type: 'email',
  target_content:
    'Subject: Immediate Action Required\nFrom: Account Security <security-notice@account-verify-support.xyz>',
  overall_risk_score: 84,
  risk_level: 'high',
  verdict: 'malicious',
  summary: {
    en: 'Illustrative format example: This sample message combines urgent account-suspension pressure with an unverified lookalike domain asking for credentials.',
    ur: 'مثالی نمونہ: یہ پیغام اکاؤنٹ معطل ہونے کا خوف دلا کر غیر تصدیق شدہ جعلی لنک پر لاگ ان معلومات مانگتا ہے۔',
  },
  recommendations: {
    en: [
      'Do not click login links or reply with passwords or one-time passcodes.',
      'Open your provider app or official website directly using a saved bookmark.',
    ],
    ur: [
      'مشتبہ لنک پر کلک نہ کریں اور پاس ورڈ یا او ٹی پی ہرگز شیئر نہ کریں۔',
      'تصدیق کے لیے متعلقہ سروس کی اصل ایپ یا محفوظ بُک مارک خود کھولیں۔',
    ],
  },
  agent_findings: {
    url_intelligence: {
      agent: 'URLSecurityAgent',
      status: 'completed',
      risk_score: 86,
      indicators: ['Lookalike security subdomain', 'Suspicious .xyz top-level domain'],
    },
    message_intelligence: {
      agent: 'MessageAnalysisAgent',
      status: 'completed',
      risk_score: 82,
      tactics_detected: ['Artificial 2-hour urgency', 'Credential verification lure'],
    },
    security_advisor: {
      agent: 'SecurityAdvisorAgent',
      status: 'completed',
      bilingual_output: 'EN + UR generated',
    },
    raw_metadata: {
      note: 'Static illustrative fixture — not produced by a live backend scan.',
      channel: 'email',
      extracted_urls: ['https://account-verify-support.xyz/session-check'],
    },
  },
  created_at: '2026-11-11T12:00:00Z',
  updated_at: '2026-11-11T12:00:00Z',
}

export function detectScannerTargetType(
  inputText: string,
  mode: ScannerInputMode
): { targetType: ScanTargetType; displayLabel: 'URL' | 'Message' | 'Email' } | null {
  const trimmed = inputText.trim()

  if (mode === 'url') {
    return { targetType: 'url', displayLabel: 'URL' }
  }
  if (mode === 'message') {
    return { targetType: 'message', displayLabel: 'Message' }
  }
  if (mode === 'email') {
    return { targetType: 'email', displayLabel: 'Email' }
  }

  if (!trimmed) {
    return null
  }

  if (looksLikeUrl(trimmed)) {
    return { targetType: 'url', displayLabel: 'URL' }
  }

  return { targetType: 'message', displayLabel: 'Message' }
}

/**
 * Backend SSRF validator requires an explicit http:// or https:// scheme on target_type='url'.
 * Bare domains already accepted by isValidUrl (e.g., example.com/login) are normalized to https://.
 */
export function normalizeUrlForBackend(rawInput: string): string {
  const trimmed = rawInput.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed
  }
  return `https://${trimmed}`
}

export function resolveScanSubmission(
  rawInput: string,
  options: ScanConfigOptions
):
  | { ok: true; request: ScanRequest; effectiveTargetLabel: 'URL' | 'Message' | 'Email' }
  | { ok: false; error: string } {
  const trimmed = rawInput.trim()

  if (!trimmed) {
    return {
      ok: false,
      error: 'Please enter a URL, message, or email first.',
    }
  }

  if (trimmed.length > MAX_SCAN_CONTENT_CHARS) {
    return {
      ok: false,
      error: `Input exceeds the ${MAX_SCAN_CONTENT_CHARS.toLocaleString()}-character backend limit.`,
    }
  }

  const detected = detectScannerTargetType(trimmed, options.mode)
  const targetType: ScanTargetType = detected?.targetType ?? 'message'
  const effectiveTargetLabel = detected?.displayLabel ?? 'Message'

  let normalizedContent = trimmed
  if (targetType === 'url') {
    if (!isValidUrl(trimmed)) {
      return {
        ok: false,
        error: 'Invalid URL format. Please enter a valid HTTP or HTTPS URL (e.g., https://example.com).',
      }
    }
    normalizedContent = normalizeUrlForBackend(trimmed)
  }

  const metadata: Record<string, unknown> = {
    source: 'web-scanner',
    selection_mode: options.mode,
    channel: options.channel,
  }

  const cleanedSender = options.senderHint.trim()
  if (cleanedSender) {
    metadata.sender_hint = cleanedSender
  }

  return {
    ok: true,
    effectiveTargetLabel,
    request: {
      target_type: targetType,
      content: normalizedContent,
      metadata,
    },
  }
}
