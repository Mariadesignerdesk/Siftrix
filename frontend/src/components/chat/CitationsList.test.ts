import { describe, it, expect } from 'vitest'
import { parseCitation } from './citationUtils'

describe('CitationsList and parseCitation', () => {
  it('parses plain text citation without inventing a URL', () => {
    const raw = 'MITRE ATT&CK T1566: Phishing'
    const parsed = parseCitation(raw, 0)
    expect(parsed.label).toBe('MITRE ATT&CK T1566: Phishing')
    expect(parsed.url).toBeUndefined()
  })

  it('parses markdown link citation with valid URL', () => {
    const raw = '[MITRE ATT&CK T1566](https://attack.mitre.org/techniques/T1566/)'
    const parsed = parseCitation(raw, 1)
    expect(parsed.label).toBe('MITRE ATT&CK T1566')
    expect(parsed.url).toBe('https://attack.mitre.org/techniques/T1566/')
  })

  it('parses raw URL citation', () => {
    const raw = 'https://virustotal.com/gui/home/url'
    const parsed = parseCitation(raw, 2)
    expect(parsed.label).toBe('https://virustotal.com/gui/home/url')
    expect(parsed.url).toBe('https://virustotal.com/gui/home/url')
  })

  it('parses delimited citation format (Label - URL)', () => {
    const raw = 'OWASP Phishing Defense - https://owasp.org/www-community/attacks/Phishing'
    const parsed = parseCitation(raw, 3)
    expect(parsed.label).toBe('OWASP Phishing Defense')
    expect(parsed.url).toBe('https://owasp.org/www-community/attacks/Phishing')
  })

  it('rejects unsafe schemes like javascript: without generating a link', () => {
    const raw = '[Malicious](javascript:alert(1))'
    const parsed = parseCitation(raw, 4)
    expect(parsed.url).toBeUndefined()
  })

  it('never invents URLs for security framework names', () => {
    const names = [
      'NIST Cybersecurity Framework',
      'SIFTRIX Threat Intelligence Core',
      'CISA Incident Handling Guidelines',
      'Center for Internet Security (CIS)',
    ]
    for (let i = 0; i < names.length; i++) {
      const parsed = parseCitation(names[i], i)
      expect(parsed.label).toBe(names[i])
      expect(parsed.url).toBeUndefined()
    }
  })

  it('parses standard markdown link citation for APWG report with valid URL', () => {
    const raw =
      '[APWG Q4 2022 Report (PDF)](https://docs.apwg.org/reports/apwg_trends_report_q4_2022.pdf)'
    const parsed = parseCitation(raw, 5)
    expect(parsed.label).toBe('APWG Q4 2022 Report (PDF)')
    expect(parsed.url).toBe(
      'https://docs.apwg.org/reports/apwg_trends_report_q4_2022.pdf'
    )
  })

  it('parses escaped HTML anchor citation safely without raw HTML tags', () => {
    const raw =
      '\\<a href="https://docs.apwg.org/reports/apwg_trends_report_q4_2022.pdf">APWG Q4 2022 Report (PDF)\\</a>'
    const parsed = parseCitation(raw, 6)
    expect(parsed.label).toBe('APWG Q4 2022 Report (PDF)')
    expect(parsed.url).toBe(
      'https://docs.apwg.org/reports/apwg_trends_report_q4_2022.pdf'
    )
  })

  it('parses standard HTML anchor citation safely', () => {
    const raw =
      '<a href="https://docs.apwg.org/reports/apwg_trends_report_q4_2022.pdf">APWG Q4 2022 Report (PDF)</a>'
    const parsed = parseCitation(raw, 7)
    expect(parsed.label).toBe('APWG Q4 2022 Report (PDF)')
    expect(parsed.url).toBe(
      'https://docs.apwg.org/reports/apwg_trends_report_q4_2022.pdf'
    )
  })
})
