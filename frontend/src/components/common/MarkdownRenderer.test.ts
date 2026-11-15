import { describe, it, expect } from 'vitest'
import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderInlineMarkdown, parseBlocks } from './markdownUtils'

interface AnchorProps {
  href: string
  children: ReactNode
  target?: string
  rel?: string
  title?: string
}

function findElement<P = Record<string, unknown>>(
  nodes: ReactNode[],
  type: string
): ReactElement<P> | undefined {
  return nodes.find(
    (n): n is ReactElement<P> => isValidElement(n) && n.type === type
  )
}

function filterElements<P = Record<string, unknown>>(
  nodes: ReactNode[],
  type: string
): ReactElement<P>[] {
  return nodes.filter(
    (n): n is ReactElement<P> => isValidElement(n) && n.type === type
  )
}

type ParsedListBlock = Extract<ReturnType<typeof parseBlocks>[number], { type: 'list' }>

describe('renderInlineMarkdown', () => {
  it('renders bold markdown formatting correctly', () => {
    const nodes = renderInlineMarkdown('This is **bold text** in SIFTRIX.')
    expect(nodes.length).toBeGreaterThan(1)
    // Check that one of the nodes is a strong element with bold text
    const strongNode = findElement<{ children: ReactNode }>(nodes, 'strong')
    expect(strongNode).toBeDefined()
    expect(strongNode?.props.children).toBe('bold text')
  })

  it('renders italic markdown formatting correctly', () => {
    const nodes = renderInlineMarkdown('This is *italicized* text.')
    const emNode = findElement<{ children: ReactNode }>(nodes, 'em')
    expect(emNode).toBeDefined()
    expect(emNode?.props.children).toBe('italicized')
  })

  it('renders inline code formatting correctly', () => {
    const nodes = renderInlineMarkdown('Run `scan_url()` for reputation.')
    const codeNode = findElement<{ children: ReactNode }>(nodes, 'code')
    expect(codeNode).toBeDefined()
    expect(codeNode?.props.children).toBe('scan_url()')
  })

  it('renders clickable markdown links for safe protocols', () => {
    const nodes = renderInlineMarkdown(
      'Refer to [MITRE ATT&CK](https://attack.mitre.org) for details.'
    )
    const linkNode = findElement<AnchorProps>(nodes, 'a')
    expect(linkNode).toBeDefined()
    expect(linkNode?.props.href).toBe('https://attack.mitre.org')
    expect(linkNode?.props.children).toBe('MITRE ATT&CK')
    expect(linkNode?.props.target).toBe('_blank')
    expect(linkNode?.props.rel).toBe('noopener noreferrer')
  })

  it('renders markdown link with optional title attribute', () => {
    const nodes = renderInlineMarkdown(
      '[Google](https://google.com "Google Search")'
    )
    const linkNode = findElement<AnchorProps>(nodes, 'a')
    expect(linkNode).toBeDefined()
    expect(linkNode?.props.href).toBe('https://google.com')
    expect(linkNode?.props.title).toBe('Google Search')
    expect(linkNode?.props.target).toBe('_blank')
    expect(linkNode?.props.rel).toBe('noopener noreferrer')
  })

  it('renders markdown link with nested parentheses in URL', () => {
    const nodes = renderInlineMarkdown(
      'Read [Phishing](https://en.wikipedia.org/wiki/Phishing_(disambiguation)) here.'
    )
    const linkNode = findElement<AnchorProps>(nodes, 'a')
    expect(linkNode).toBeDefined()
    expect(linkNode?.props.href).toBe('https://en.wikipedia.org/wiki/Phishing_(disambiguation)')
    expect(linkNode?.props.target).toBe('_blank')
    expect(linkNode?.props.rel).toBe('noopener noreferrer')
  })

  it('renders formatted label inside markdown link', () => {
    const nodes = renderInlineMarkdown(
      'See [**Urgent Alert**](https://security.example.com).'
    )
    const linkNode = findElement<AnchorProps>(nodes, 'a')
    expect(linkNode).toBeDefined()
    expect(linkNode?.props.href).toBe('https://security.example.com')
    // Child should contain strong element
    const child = linkNode?.props.children
    expect(isValidElement(child)).toBe(true)
    if (isValidElement(child)) {
      expect(child.type).toBe('strong')
    }
  })

  it('renders markdown link nested inside bold styling', () => {
    const nodes = renderInlineMarkdown(
      '**[Click Here](https://example.com)**'
    )
    const strongNode = findElement<{ children: ReactNode }>(nodes, 'strong')
    expect(strongNode).toBeDefined()
    const linkNode = strongNode?.props.children
    expect(isValidElement(linkNode)).toBe(true)
    if (isValidElement<AnchorProps>(linkNode)) {
      expect(linkNode.type).toBe('a')
      expect(linkNode.props.href).toBe('https://example.com')
    }
  })

  it('renders bare URLs as clickable links with target="_blank" and rel="noopener noreferrer"', () => {
    const nodes = renderInlineMarkdown(
      'Check out https://virustotal.com for threat intel.'
    )
    const linkNode = findElement<AnchorProps>(nodes, 'a')
    expect(linkNode).toBeDefined()
    expect(linkNode?.props.href).toBe('https://virustotal.com')
    expect(linkNode?.props.children).toBe('https://virustotal.com')
    expect(linkNode?.props.target).toBe('_blank')
    expect(linkNode?.props.rel).toBe('noopener noreferrer')
  })

  it('excludes trailing punctuation from bare URLs', () => {
    const nodes = renderInlineMarkdown(
      'Visit https://example.com/check, or https://example.com/info.'
    )
    const linkNodes = filterElements<AnchorProps>(nodes, 'a')
    expect(linkNodes).toHaveLength(2)
    expect(linkNodes[0].props.href).toBe('https://example.com/check')
    expect(linkNodes[1].props.href).toBe('https://example.com/info')
  })

  it('converts bare www. addresses to https:// links', () => {
    const nodes = renderInlineMarkdown('Visit www.siftrix.com for more info.')
    const linkNode = findElement<AnchorProps>(nodes, 'a')
    expect(linkNode).toBeDefined()
    expect(linkNode?.props.href).toBe('https://www.siftrix.com')
    expect(linkNode?.props.children).toBe('www.siftrix.com')
  })

  it('preserves bare URLs inside inline code as code rather than links', () => {
    const nodes = renderInlineMarkdown('Do not execute `https://malicious.example.com`.')
    const linkNode = findElement<AnchorProps>(nodes, 'a')
    expect(linkNode).toBeUndefined()
    const codeNode = findElement<{ children: ReactNode }>(nodes, 'code')
    expect(codeNode).toBeDefined()
    expect(codeNode?.props.children).toBe('https://malicious.example.com')
  })

  it('neutralizes javascript:, data:, and vbscript: URLs to prevent XSS', () => {
    const jsNodes = renderInlineMarkdown(
      'Click [here](javascript:evil()) for info.'
    )
    expect(findElement(jsNodes, 'a')).toBeUndefined()

    const dataNodes = renderInlineMarkdown(
      'Click [payload](data:text/html,<script>alert(1)</script>) to view.'
    )
    expect(findElement(dataNodes, 'a')).toBeUndefined()

    const vbNodes = renderInlineMarkdown(
      'Click [bad](vbscript:MsgBox(1)) now.'
    )
    expect(findElement(vbNodes, 'a')).toBeUndefined()
  })

  it('does not convert bare unsafe protocol strings into clickable links', () => {
    const nodes = renderInlineMarkdown(
      'Threat payload: javascript:alert(document.cookie)'
    )
    const linkNode = findElement(nodes, 'a')
    expect(linkNode).toBeUndefined()
  })

  it('renders standard markdown source link for APWG report as a clickable anchor', () => {
    const nodes = renderInlineMarkdown(
      'Source: [APWG Q4 2022 Report (PDF)](https://docs.apwg.org/reports/apwg_trends_report_q4_2022.pdf)'
    )
    const linkNode = findElement<AnchorProps>(nodes, 'a')
    expect(linkNode).toBeDefined()
    expect(linkNode?.props.href).toBe(
      'https://docs.apwg.org/reports/apwg_trends_report_q4_2022.pdf'
    )
    expect(linkNode?.props.children).toBe('APWG Q4 2022 Report (PDF)')
    expect(linkNode?.props.target).toBe('_blank')
    expect(linkNode?.props.rel).toBe('noopener noreferrer')
  })

  it('renders escaped HTML anchor (\\<a href=...) as a clean, clickable anchor tag', () => {
    const nodes = renderInlineMarkdown(
      'Source: \\<a href="https://docs.apwg.org/reports/apwg_trends_report_q4_2022.pdf">APWG Q4 2022 Report (PDF)\\</a>'
    )
    const linkNode = findElement<AnchorProps>(nodes, 'a')
    expect(linkNode).toBeDefined()
    expect(linkNode?.props.href).toBe(
      'https://docs.apwg.org/reports/apwg_trends_report_q4_2022.pdf'
    )
    expect(linkNode?.props.children).toBe('APWG Q4 2022 Report (PDF)')
    expect(linkNode?.props.target).toBe('_blank')
    expect(linkNode?.props.rel).toBe('noopener noreferrer')
  })

  it('renders standard HTML anchor (<a href=...) as a clean, clickable anchor tag', () => {
    const nodes = renderInlineMarkdown(
      'Source: <a href="https://docs.apwg.org/reports/apwg_trends_report_q4_2022.pdf">APWG Q4 2022 Report (PDF)</a>'
    )
    const linkNode = findElement<AnchorProps>(nodes, 'a')
    expect(linkNode).toBeDefined()
    expect(linkNode?.props.href).toBe(
      'https://docs.apwg.org/reports/apwg_trends_report_q4_2022.pdf'
    )
    expect(linkNode?.props.children).toBe('APWG Q4 2022 Report (PDF)')
    expect(linkNode?.props.target).toBe('_blank')
    expect(linkNode?.props.rel).toBe('noopener noreferrer')
  })
})

describe('parseBlocks - Ordered and Unordered Lists', () => {
  it('parses tight ordered list with sequential numbering (1, 2, 3, 4, 5)', () => {
    const md = `1. First step
2. Second step
3. Third step
4. Fourth step
5. Fifth step`

    const blocks = parseBlocks(md)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('list')

    const listBlock = blocks[0] as ParsedListBlock
    expect(listBlock.ordered).toBe(true)
    expect(listBlock.start).toBe(1)
    expect(listBlock.items).toHaveLength(5)
    expect(listBlock.items.map((it) => it.number)).toEqual([1, 2, 3, 4, 5])
    expect(listBlock.items[0].text).toBe('First step')
    expect(listBlock.items[4].text).toBe('Fifth step')
  })

  it('parses loose ordered list with blank lines without resetting each item to 1', () => {
    const md = `1. **Do NOT Enter Credentials**: Close the tab immediately.

2. **Disconnect Network**: Turn off Wi-Fi or disconnect Ethernet.

3. **Reset Passwords from a Clean Device**: Access target service.

4. **Enable Multi-Factor Authentication (MFA)**: Enforce authenticator app.

5. **Scan for Malware**: Run a thorough endpoint security scan.`

    const blocks = parseBlocks(md)
    expect(blocks).toHaveLength(1)
    const listBlock = blocks[0] as ParsedListBlock
    expect(listBlock.ordered).toBe(true)
    expect(listBlock.items).toHaveLength(5)
    expect(listBlock.items.map((it) => it.number)).toEqual([1, 2, 3, 4, 5])
  })

  it('parses ordered list with indented sub-bullets preserving sequential numbers', () => {
    const md = `1. **Sender Ka Asal Email Address**:
   - Display name fake ho sakta hai.
   - Domain dhyan se check karein.

2. **Ghair Zaroori Jaldbazi (Urgency Pressure)**:
   - "Account block ho jayega" jaise darane wale alfaz.

3. **Links Par Hover Karein**:
   - Mouse cursor le ja kar destination URL dekhein.`

    const blocks = parseBlocks(md)
    expect(blocks).toHaveLength(1)
    const listBlock = blocks[0] as ParsedListBlock
    expect(listBlock.ordered).toBe(true)
    expect(listBlock.items).toHaveLength(3)
    expect(listBlock.items.map((it) => it.number)).toEqual([1, 2, 3])

    // Verify sub-bullets are nested under item 1
    expect(listBlock.items[0].subItems).toHaveLength(2)
    expect(listBlock.items[0].subItems?.[0]).toBe('Display name fake ho sakta hai.')
    expect(listBlock.items[1].subItems).toHaveLength(1)
  })

  it('preserves unordered lists with bullets', () => {
    const md = `- Item Alpha
- Item Beta
- Item Gamma`

    const blocks = parseBlocks(md)
    expect(blocks).toHaveLength(1)
    const listBlock = blocks[0] as ParsedListBlock
    expect(listBlock.ordered).toBe(false)
    expect(listBlock.items).toHaveLength(3)
    expect(listBlock.items[0].text).toBe('Item Alpha')
  })
})

describe('parseBlocks - Block Elements', () => {
  it('parses horizontal rules (---, ***, ___, - - -)', () => {
    const md = `Section 1\n\n---\n\nSection 2\n\n***\n\nSection 3\n\n- - -\n\nSection 4`
    const blocks = parseBlocks(md)
    const hrBlocks = blocks.filter((b) => b.type === 'hr')
    expect(hrBlocks).toHaveLength(3)
  })

  it('parses headings and tables while preserving blocks', () => {
    const md = `### Threat Summary\n\n| Indicator | Severity |\n|---|---|\n| evil.com | High |`
    const blocks = parseBlocks(md)
    expect(blocks[0].type).toBe('heading')
    expect(blocks[1].type).toBe('table')
  })
})
