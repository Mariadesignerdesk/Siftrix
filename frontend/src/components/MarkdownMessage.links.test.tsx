import { renderToStaticMarkup } from 'react-dom/server'
import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MarkdownMessage from './MarkdownMessage'
import { clearChatHistory, createUserMessage, sendChatMessage } from '../services/chatService'

const PROMPT =
  'Please show this URL as a normal clickable link, not inside code formatting: https://example.com'

/** Walks the element tree produced by MarkdownMessage (expanding function components). */
function collectAnchors(node: ReactNode, out: ReactElement<{ href?: string }>[] = []) {
  if (Array.isArray(node)) {
    node.forEach((child) => collectAnchors(child, out))
  } else if (isValidElement(node)) {
    const element = node as ReactElement<{ href?: string; children?: ReactNode }>
    if (typeof element.type === 'function') {
      collectAnchors((element.type as (p: unknown) => ReactNode)(element.props), out)
    } else {
      if (element.type === 'a') out.push(element)
      collectAnchors(element.props.children, out)
    }
  }
  return out
}

describe('plain URL rendering (MarkdownMessage)', () => {
  it('renders a plain URL outside code as an anchor with the correct href', () => {
    const tree = MarkdownMessage({ content: 'Visit https://example.com now' })
    const anchors = collectAnchors(tree)
    expect(anchors).toHaveLength(1)
    expect(anchors[0].props.href).toBe('https://example.com')

    const html = renderToStaticMarkup(<MarkdownMessage content="Visit https://example.com now" />)
    expect(html).toContain('<a href="https://example.com"')
    expect(html).toContain('target="_blank"')
    expect(html).not.toContain('pointer-events')
  })

  it('does not linkify the same URL inside inline code', () => {
    const html = renderToStaticMarkup(<MarkdownMessage content="Use `https://example.com` here" />)
    expect(html).toContain('<code')
    expect(html).not.toContain('<a ')
  })
  it('keeps numbered lists continuous when bullets are nested under items', () => {
    const html = renderToStaticMarkup(
      <MarkdownMessage content={'1. **One**:\n   - a\n   - b\n2. **Two**:\n   - c\n3. Three'} />
    )
    expect((html.match(/<ol/g) || []).length).toBe(1)
    expect((html.match(/<li>/g) || []).length).toBe(3 + 3)
  })

  it('never renders anchors for dangerous schemes, credentialed URLs, malformed hosts, or control/bidi chars', () => {
    const hostilePayload = [
      '[js](javascript:alert(1))',
      '[ent-js](&#x6a;avascript:alert(1))',
      '[ctrl-js](ja&#x09;vascript:alert(1))',
      '[data](data:text/html,<script>alert(1)</script>)',
      '[vb](vbscript:msgbox(1))',
      '[cred](https://chase.com:verify@evil.example/login)',
      'https://chase.com@evil.example/login',
      '<https://user:pass@evil.example>',
      'https:///triple-slash.example',
      'https://.',
      'https://example..com',
      'https://evil.example/\u202Egpj.exe',
      'https://evil.example/\u200Bhidden',
      '[bidi](https://evil.example/\u2066spoof\u2069)',
    ].join('\n')

    const tree = MarkdownMessage({ content: hostilePayload })
    expect(collectAnchors(tree)).toHaveLength(0)

    const html = renderToStaticMarkup(<MarkdownMessage content={hostilePayload} />)
    expect(html).not.toContain('<a ')
  })

  it('keeps entity-encoded HTML tags inert as escaped React text in both LTR and Urdu RTL', () => {
    const payload =
      '&#x3c;script&#x3e;alert(1)&#x3c;/script&#x3e; &lt;img src=x onerror=alert(1)&gt; &amp;lt;svg onload=alert(1)&amp;gt; اردو احتیاط'
    const html = renderToStaticMarkup(<MarkdownMessage content={payload} dir="rtl" />)

    expect(html).toContain('dir="rtl"')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<svg')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('&amp;lt;svg onload=alert(1)&amp;gt;')
    expect(html).toContain('اردو احتیاط')
  })
})

describe('AI Advisor end-to-end response path (chatService -> MarkdownMessage)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    clearChatHistory()
  })
  afterEach(() => {
    vi.useRealTimers()
    clearChatHistory()
  })

  it('returns a response that echoes the requested URL as a clickable link', async () => {
    const pending = sendChatMessage(PROMPT, [createUserMessage(PROMPT)])
    await vi.advanceTimersByTimeAsync(700)
    const reply = await pending

    const html = renderToStaticMarkup(<MarkdownMessage content={reply.content} />)
    expect(html).toContain('href="https://example.com"')
    // The URL must be a real link, not wrapped in <code>
    expect(html).not.toMatch(/<code[^>]*>https:\/\/example\.com<\/code>/)
    // No citation URLs are invented
    expect((reply.citations ?? []).every((c) => !/https?:\/\//i.test(c))).toBe(true)
  })
})
