import { describe, it, expect } from 'vitest'
import { looksLikeUrl, isValidUrl } from './urlValidator'

describe('urlValidator', () => {
  describe('looksLikeUrl', () => {
    it('detects standard URLs with protocols as URLs', () => {
      expect(looksLikeUrl('https://google.com')).toBe(true)
      expect(looksLikeUrl('http://example.com')).toBe(true)
      expect(looksLikeUrl('https://chase-security-update.xyz/login')).toBe(true)
      expect(looksLikeUrl('http://sub.domain.org/path/to/page?id=123')).toBe(true)
    })

    it('detects URLs starting with www. as URLs', () => {
      expect(looksLikeUrl('www.example.com')).toBe(true)
      expect(looksLikeUrl('www.google.com/search?q=cybersecurity')).toBe(true)
    })

    it('detects bare domains without protocol as URLs', () => {
      expect(looksLikeUrl('example.com')).toBe(true)
      expect(looksLikeUrl('phish-portal.xyz')).toBe(true)
      expect(looksLikeUrl('portal-check.net/login.php')).toBe(true)
      expect(looksLikeUrl('subdomain.example.co.uk')).toBe(true)
    })

    it('detects URLs pointing to files with full path as URLs', () => {
      expect(looksLikeUrl('https://example.com/report.pdf')).toBe(true)
      expect(looksLikeUrl('example.com/downloads/invoice.pdf')).toBe(true)
    })

    it('rejects empty or whitespace-only inputs', () => {
      expect(looksLikeUrl('')).toBe(false)
      expect(looksLikeUrl('   ')).toBe(false)
      expect(looksLikeUrl('\n\t')).toBe(false)
    })

    it('classifies normal multi-word sentences as messages, not URLs', () => {
      expect(looksLikeUrl('hello world, this is a message.')).toBe(false)
      expect(looksLikeUrl('URGENT: Your bank account has been suspended due to suspicious activity.')).toBe(false)
      expect(looksLikeUrl('Please call me when you receive this.')).toBe(false)
    })

    it('disqualifies standalone email addresses from being treated as web URLs', () => {
      expect(looksLikeUrl('user@example.com')).toBe(false)
      expect(looksLikeUrl('support@security-team.org')).toBe(false)
      expect(looksLikeUrl('admin@bank.xyz')).toBe(false)
    })

    it('disqualifies single words ending with punctuation from being treated as URLs', () => {
      expect(looksLikeUrl('Hello.')).toBe(false)
      expect(looksLikeUrl('Done.')).toBe(false)
      expect(looksLikeUrl('Finished.')).toBe(false)
      expect(looksLikeUrl('.hidden')).toBe(false)
    })

    it('disqualifies standalone file names from being treated as URLs', () => {
      expect(looksLikeUrl('report.pdf')).toBe(false)
      expect(looksLikeUrl('data.csv')).toBe(false)
      expect(looksLikeUrl('document.docx')).toBe(false)
      expect(looksLikeUrl('photo.png')).toBe(false)
      expect(looksLikeUrl('backup.zip')).toBe(false)
      expect(looksLikeUrl('payload.exe')).toBe(false)
    })
  })

  describe('isValidUrl', () => {
    it('accepts valid HTTPS and HTTP URLs', () => {
      expect(isValidUrl('https://google.com')).toBe(true)
      expect(isValidUrl('http://example.com')).toBe(true)
      expect(isValidUrl('https://chase-security-update.xyz/login')).toBe(true)
    })

    it('accepts bare domains by normalizing protocol', () => {
      expect(isValidUrl('example.com')).toBe(true)
      expect(isValidUrl('www.example.com')).toBe(true)
      expect(isValidUrl('sub.domain.org/path')).toBe(true)
    })

    it('rejects standalone email addresses', () => {
      expect(isValidUrl('user@example.com')).toBe(false)
      expect(isValidUrl('admin@security.org')).toBe(false)
    })

    it('rejects malformed or invalid URLs', () => {
      expect(isValidUrl('http://invalid url with spaces')).toBe(false)
      expect(isValidUrl('https://')).toBe(false)
      expect(isValidUrl('http://')).toBe(false)
      expect(isValidUrl('not_a_valid_url')).toBe(false)
    })
  })
})
