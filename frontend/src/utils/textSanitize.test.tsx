import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import MarkdownMessage, { VerifiedSources } from '../components/MarkdownMessage'
import ScanResultCard from '../components/ScanResultCard'
import type { ScanResponse } from '../services/api'
import { decodeHtmlEntities, isSafeUrl, isValidHttpUrl, parseCitation } from './textSanitize'

describe('textSanitize', () => {
  it('decodes numeric entities without double decoding', () => {
    expect(decodeHtmlEntities('&#x41;lways &#x55;se &amp;lt;')).toBe('Always Use &lt;')
  })

  it('refuses to decode C0/C1 control characters, surrogates, or out-of-range code points', () => {
    expect(decodeHtmlEntities('&#x00;&#x09;&#x1b;&#x7f;&#x85;&#xd800;&#x110000;')).toBe(
      '&#x00;&#x09;&#x1b;&#x7f;&#x85;&#xd800;&#x110000;'
    )
    expect(decodeHtmlEntities('&#x3c;img src=x onerror=alert(1)&#x3e;')).toBe(
      '<img src=x onerror=alert(1)>'
    )
  })

  it('rejects dangerous schemes, embedded credentials, malformed hosts, whitespace, and Unicode bidi/zero-width chars', () => {
    const unsafeUrls = [
      'javascript:alert(1)',
      'JAVASCRIPT:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      'vbscript:msgbox(1)',
      'https://chase.com@evil.example/login',
      'https://user:password@evil.example/path',
      'https://trusted.com\\@evil.example',
      'https://',
      'https:///evil.example',
      'https://.',
      'https://..',
      'https://example..com',
      'https://-bad.com',
      'https://bad-.com',
      'https://singlelabel',
      'https://example.com:99999',
      'https://example.com/has space',
      'https://example.com/nbsp\u00A0here',
      'https://example.com/null\u0000byte',
      'https://example.com/esc\u001Bseq',
      'https://example.com/zwsp\u200Bpath',
      'https://example.com/\u202Egpj.exe',
      'https://example.com/\u2066spoof\u2069',
      'mailto:attacker@evil.example\u0000',
      'mailto:two@at@evil.example',
      'mailto:user@singlelabel',
    ]

    for (const bad of unsafeUrls) {
      expect(isValidHttpUrl(bad), `expected isValidHttpUrl(${JSON.stringify(bad)}) to be false`).toBe(false)
      expect(isSafeUrl(bad), `expected isSafeUrl(${JSON.stringify(bad)}) to be false`).toBe(false)
    }

    expect(isValidHttpUrl('https://owasp.org/Top10')).toBe(true)
    expect(isValidHttpUrl('http://localhost:8000/api/health')).toBe(true)
    expect(isValidHttpUrl('http://127.0.0.1:8000')).toBe(true)
    expect(isValidHttpUrl('https://مثال.پاکستان/مسار')).toBe(true)
    expect(isSafeUrl('mailto:security@siftrix.io')).toBe(true)
  })

  it('validates IPv4, IPv6, localhost, private/local URLs, and IDN/punycode edge cases accurately', () => {
    const validFormatUrls = [
      'http://localhost:8000/api/health',
      'http://127.0.0.1:8080/status',
      'http://10.0.0.1/internal',
      'http://172.16.0.10:3000/app',
      'http://192.168.1.1/router',
      'http://169.254.169.254/latest/meta-data/',
      'http://[::1]:8080/health',
      'https://[2001:db8::1]:8443/docs',
      'http://[::ffff:192.0.2.1]/check',
      'https://مثال.پاکستان/مسار',
      'https://bücher.example.com/guide',
      'https://xn--80ak6aa92e.com/',
      'https://sub.xn--mgbai9azgqp6j/info',
    ]

    for (const url of validFormatUrls) {
      expect(isValidHttpUrl(url), `expected ${url} to be syntactically valid`).toBe(true)
      expect(isSafeUrl(url), `expected ${url} to pass isSafeUrl`).toBe(true)
    }

    expect(isSafeUrl('mailto:user@[2001:db8::1]')).toBe(true)
    expect(isSafeUrl('mailto:admin@192.168.1.1')).toBe(true)
    expect(isSafeUrl('mailto:security@مثال.پاکستان')).toBe(true)

    const invalidEdgeUrls = [
      // Malformed IPv6 & bracketed non-IPv6
      'http://[]/',
      'http://[not-ipv6]/',
      'http://[::1::2]/',
      'http://[gggg::1]/',
      'http://[1:2:3:4:5:6:7:8:9]/',
      'http://[::1:99999]/',
      'http://[fe80::1%25eth0]/',
      'http://[::1/missing-bracket',
      'mailto:user@[not-ipv6]',
      'mailto:user@[::1::2]',
      'mailto:user@[]',
      // Out-of-range & non-canonical (shorthand, integer, hex, octal) IPv4
      'http://999.0.0.1/',
      'http://256.1.1.1/',
      'http://127.1/',
      'http://127.1:8080/admin',
      'http://192.168.1/',
      'http://2130706433/',
      'http://0x7f000001/',
      'http://0x7f.0.0.1/',
      'http://0177.0.0.1/',
      'http://127.0.0.01/',
      'http://127.0.0.1./',
      'mailto:user@999.999.999.999',
      'mailto:user@127.1',
      'mailto:user@0x7f000001',
      'mailto:user@0177.0.0.1',
      'mailto:user@2130706433',
      // Malformed punycode / invalid ACE prefixes
      'https://xn--.com/',
      'https://a.xn--/',
      'https://a.xn--z/',
      'https://xn--z.com/',
      'https://xn---a.com/',
      'https://ab--cd.com/',
    ]

    for (const bad of invalidEdgeUrls) {
      expect(isValidHttpUrl(bad), `expected isValidHttpUrl(${bad}) to be false`).toBe(false)
      expect(isSafeUrl(bad), `expected isSafeUrl(${bad}) to be false`).toBe(false)
    }

    // Citation parsing also preserves valid bracketed IPv6 URLs and rejects malformed ones
    expect(parseCitation('Local Dev — http://[::1]:8000/docs')).toEqual({
      name: 'Local Dev',
      url: 'http://[::1]:8000/docs',
    })
    expect(parseCitation('Bad IPv6 — http://[::1::2]/docs').url).toBeUndefined()
  })

  it('keeps URL syntax validation separate from safety/reputation claims and rejects malformed Markdown links', () => {
    const mdHtml = renderToStaticMarkup(
      <MarkdownMessage
        content={[
          'Valid local/IPv4/IPv6: http://127.0.0.1:8080/ok http://localhost:8000/status and [IPv6](https://[2001:db8::1]:8443/api)',
          'Rejected: http://127.1/ http://0x7f000001/ http://0177.0.0.1/ [hex](http://0x7f000001/) [bad-v6](http://[::1::2]/x) [bad-scheme](vbscript:msgbox(1)) [bad-puny](https://xn---a.com/)',
        ].join('\n')}
      />
    )
    expect(mdHtml).toContain('href="http://127.0.0.1:8080/ok"')
    expect(mdHtml).toContain('href="http://localhost:8000/status"')
    expect(mdHtml).toContain('href="https://[2001:db8::1]:8443/api"')
    expect(mdHtml).not.toContain('href="http://127.1/"')
    expect(mdHtml).not.toContain('href="http://0x7f000001/"')
    expect(mdHtml).not.toContain('href="http://0177.0.0.1/"')
    expect(mdHtml).not.toContain('href="http://[::1::2]/x"')
    expect(mdHtml).not.toContain('vbscript:')
    expect(mdHtml).not.toContain('href="https://xn---a.com/"')

    // Even when a localhost/private URL scan has verdict 'safe', ScanResultCard never claims verified legitimacy
    const localScan = {
      id: 'local12345678',
      target_type: 'url',
      target_content: 'http://192.168.1.1/login',
      verdict: 'safe',
      risk_level: 'low',
      overall_risk_score: 0,
      summary: { en: 'No external hits.', ur: 'کوئی بیرونی اشارہ نہیں۔' },
      recommendations: { en: ['Verify local router address.'], ur: ['مقامی ایڈریس چیک کریں۔'] },
      agent_findings: {},
      created_at: '2026-01-03T00:00:00Z',
    } as unknown as ScanResponse
    const cardHtml = renderToStaticMarkup(<ScanResultCard result={localScan} />)
    expect(cardHtml).toContain('does not prove a website is legitimate')
    expect(cardHtml).not.toContain('Legitimate infrastructure confirmed')
    expect(cardHtml).not.toContain('Verified clean')
  })

  it('parses citations into name and url and drops credentialed or dangerous citation URLs', () => {
    expect(parseCitation('OWASP — https://owasp.org/x')).toEqual({
      name: 'OWASP',
      url: 'https://owasp.org/x',
    })
    expect(parseCitation('NIST Framework')).toEqual({ name: 'NIST Framework' })
    expect(parseCitation('[Bad](javascript:alert(1))').url).toBeUndefined()
    expect(parseCitation('[Data](data:text/html,<script>alert(1)</script>)').url).toBeUndefined()
    expect(parseCitation('[VB](vbscript:msgbox(1))').url).toBeUndefined()
    expect(parseCitation('Spoof — https://chase.com@evil.example/login').url).toBeUndefined()
    expect(parseCitation({ name: 'Bidi', url: 'https://evil.example/\u202Egpj.exe' }).url).toBeUndefined()
  })
})

describe('MarkdownMessage', () => {
  it('renders escaped markdown, lists, code and links safely', () => {
    const html = renderToStaticMarkup(
      <MarkdownMessage
        content={'\\### Title\n\\*\\*Bold\\*\\* and `code`\n1. one\n2. two\n- a\n- b\n[ok](https://x.com) <script>alert(1)</script>'}
      />
    )
    expect(html).toContain('Title')
    expect(html).not.toContain('\\#')
    expect(html).toContain('<strong')
    expect(html).toContain('<code')
    expect(html).toContain('<ol')
    expect(html).toContain('<ul')
    expect(html).toContain('href="https://x.com"')
    expect(html).not.toContain('<script>')
  })

  it('renders RTL content and separated sources', () => {
    const html = renderToStaticMarkup(
      <>
        <MarkdownMessage content={'**اردو** متن'} dir="rtl" />
        <VerifiedSources citations={['OWASP — https://owasp.org']} />
      </>
    )
    expect(html).toContain('dir="rtl"')
    expect(html).toContain('OWASP')
    expect(html).toContain('href="https://owasp.org"')
  })
})

describe('MarkdownMessage links', () => {
  const render = (content: string, dir: 'ltr' | 'rtl' = 'ltr') =>
    renderToStaticMarkup(<MarkdownMessage content={content} dir={dir} />)

  it('linkifies bare URLs, trimming trailing punctuation', () => {
    const html = render('See https://example.com/path?a=1, then (https://foo.org/x). Done.')
    expect(html).toContain('href="https://example.com/path?a=1"')
    expect(html).toContain('href="https://foo.org/x"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer nofollow"')
  })

  it('renders markdown links, titles, balanced parens and autolinks', () => {
    const html = render(
      '[A](https://a.com) [B](https://b.com/x_(y) "t") <https://c.com> [bad](javascript:alert(1))'
    )
    expect(html).toContain('href="https://a.com"')
    expect(html).toContain('href="https://b.com/x_(y)"')
    expect(html).toContain('href="https://c.com"')
    expect(html).not.toContain('javascript:')
  })

  it('keeps URLs inside inline code as code, not links', () => {
    const html = render('Legit: `https://chase.com` vs https://real.com')
    expect(html).toContain('<code')
    expect(html).not.toContain('href="https://chase.com"')
    expect(html).toContain('href="https://real.com"')
  })

  it('does not swallow Urdu text after a URL and works in RTL', () => {
    const html = render('دیکھیں https://example.com/a۔ شکریہ', 'rtl')
    expect(html).toContain('href="https://example.com/a"')
    expect(html).toContain('dir="rtl"')
  })

  it('handles links inside list items and bold text', () => {
    const html = render('- **Docs: https://x.org/d**\n1. [Go](https://y.org)')
    expect(html).toContain('href="https://x.org/d"')
    expect(html).toContain('href="https://y.org"')
  })
})

describe('VerifiedSources', () => {
  it('links only real URLs and never invents them', () => {
    const html = renderToStaticMarkup(
      <VerifiedSources
        citations={[
          'MITRE ATT&CK T1566: Phishing',
          'VirusTotal URL Intelligence',
          { name: 'OWASP', url: 'https://owasp.org/Top10' },
          { title: 'Bad', url: 'javascript:alert(1)' },
          'NIST — https://nist.gov/x',
        ]}
      />
    )
    expect(html.match(/<a /g)?.length).toBe(2)
    expect(html).toContain('MITRE ATT&amp;CK T1566: Phishing')
    expect(html).toContain('href="https://owasp.org/Top10"')
    expect(html).toContain('href="https://nist.gov/x"')
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('mitre.org')
  })
})

describe('ScanResultCard presentation', () => {
  it('hides internal metadata, separates labels, decodes entities', () => {
    const scan = {
      id: 'abcdef123456',
      target_type: 'url',
      target_content: 'https://example.com',
      verdict: 'safe',
      risk_level: 'low',
      overall_risk_score: 5,
      summary: { en: 'ok', ur: 'ٹھیک' },
      recommendations: { en: ['&#x41;lways verify'], ur: ['&#x55;se caution'] },
      agent_findings: {
        url_intelligence: { domain: 'example.com', source: 'x', channel: 'y', scoring_engine: 'z', url_accounting: { a: 1 } },
        message_intelligence: {},
        security_advisor: {},
        raw_metadata: { pipeline: 'multi-agent-v1' },
      },
      created_at: '2026-01-01T00:00:00Z',
    } as unknown as ScanResponse
    const html = renderToStaticMarkup(<ScanResultCard result={scan} />)
    expect(html).toContain('Scan Type: URL')
    expect(html).toContain('Risk Score: 5/100')
    expect(html).toContain('Always verify')
    expect(html).toContain('Use caution')
    expect(html).toContain('Technical Details')
    expect(html).not.toContain('Scoring Engine')
    expect(html).toContain('does not prove a website is legitimate')
  })

  it('recursively strips internal metadata from nested objects, arrays, and depth-limit JSON while preserving Technical Details without mutating input', () => {
    function deepFreeze<T>(obj: T): T {
      if (obj && typeof obj === 'object') {
        Object.freeze(obj)
        for (const val of Object.values(obj as Record<string, unknown>)) {
          deepFreeze(val)
        }
      }
      return obj
    }

    const scan = deepFreeze({
      id: 'nested987654',
      target_type: 'message',
      target_content: 'Verify your login at https://phish.example/check',
      verdict: 'suspicious',
      risk_level: 'medium',
      overall_risk_score: 55,
      summary: { en: 'Suspicious link in message', ur: 'مشکوک پیغام' },
      recommendations: { en: ['Do not click'], ur: ['کلک نہ کریں'] },
      agent_findings: {
        url_intelligence: {
          inspected_host: 'phish.example',
          nested_check: {
            tls_valid: true,
            source: 'nested-source-secret',
            channel: 'nested-channel-secret',
            deep_level: {
              asn_org: 'ExampleASN',
              scoring_engine: 'deep-engine-v3',
              url_accounting: { redirect_budget: 4 },
              extra_depth: {
                registrar: 'NameExample',
                source: 'depth-limit-obj-secret',
              },
            },
          },
          redirect_chain: [
            {
              hop_url: 'https://phish.example/step1',
              source: 'array-item-source-secret',
              url_accounting: { hop: 1 },
              hop_details: {
                status_code: 302,
                channel: 'array-deep-channel-secret',
                deep_array_items: [
                  {
                    header_name: 'Location',
                    scoring_engine: 'depth-limit-arr-engine-secret',
                  },
                ],
              },
            },
          ],
        },
        message_intelligence: {
          urgency_detected: true,
        },
        security_advisor: {
          confidence: 'high',
        },
        raw_metadata: { pipeline: 'multi-agent-v2' },
      },
      created_at: '2026-01-02T00:00:00Z',
    }) as unknown as ScanResponse

    const html = renderToStaticMarkup(<ScanResultCard result={scan} />)

    // Split user-facing report markup from the collapsible <details> Technical Details block
    const [userFacingHtml, technicalDetailsHtml = ''] = html.split('<details')

    // Non-internal nested fields at all depths (including depth >= 2 JSON) remain visible
    expect(userFacingHtml).toContain('phish.example')
    expect(userFacingHtml).toContain('ExampleASN')
    expect(userFacingHtml).toContain('NameExample')
    expect(userFacingHtml).toContain('https://phish.example/step1')
    expect(userFacingHtml).toContain('302')
    expect(userFacingHtml).toContain('Location')

    // Internal keys and values never leak into user-facing panels at any depth
    expect(userFacingHtml).not.toContain('nested-source-secret')
    expect(userFacingHtml).not.toContain('nested-channel-secret')
    expect(userFacingHtml).not.toContain('deep-engine-v3')
    expect(userFacingHtml).not.toContain('redirect_budget')
    expect(userFacingHtml).not.toContain('depth-limit-obj-secret')
    expect(userFacingHtml).not.toContain('array-item-source-secret')
    expect(userFacingHtml).not.toContain('array-deep-channel-secret')
    expect(userFacingHtml).not.toContain('depth-limit-arr-engine-secret')
    expect(userFacingHtml).not.toContain('scoring_engine')
    expect(userFacingHtml).not.toContain('url_accounting')
    expect(userFacingHtml).not.toContain('Scoring Engine')
    expect(userFacingHtml).not.toContain('Url Accounting')

    // All stripped internal fields + raw_metadata remain accessible under Technical Details
    expect(technicalDetailsHtml).toContain('Technical Details (Raw Metadata)')
    expect(technicalDetailsHtml).toContain('nested-source-secret')
    expect(technicalDetailsHtml).toContain('nested-channel-secret')
    expect(technicalDetailsHtml).toContain('deep-engine-v3')
    expect(technicalDetailsHtml).toContain('redirect_budget')
    expect(technicalDetailsHtml).toContain('depth-limit-obj-secret')
    expect(technicalDetailsHtml).toContain('array-item-source-secret')
    expect(technicalDetailsHtml).toContain('array-deep-channel-secret')
    expect(technicalDetailsHtml).toContain('depth-limit-arr-engine-secret')
    expect(technicalDetailsHtml).toContain('multi-agent-v2')

    // Original deep-frozen input was not mutated and retained its internal properties
    const rawUrlIntel = scan.agent_findings?.url_intelligence as Record<string, unknown>
    expect((rawUrlIntel.nested_check as Record<string, unknown>).source).toBe(
      'nested-source-secret'
    )
  })
})
