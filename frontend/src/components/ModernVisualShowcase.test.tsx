import {
  isValidElement,
  type KeyboardEvent,
  type MutableRefObject,
  type ReactElement,
  type ReactNode,
} from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import ModernVisualShowcase, { ModernVisualShowcaseContent } from './ModernVisualShowcase'

/**
 * NOTE ON TEST ENVIRONMENT SCOPE:
 * This workspace runs Vitest in Node without `jsdom`, `happy-dom`, or `@testing-library/react`.
 * Accordingly:
 * - Rendered HTML markup, ARIA attributes, `tabindex`, and `hidden` panel state are verified
 *   via React's `renderToStaticMarkup(<ModernVisualShowcase />)`.
 * - `onClick` and `onKeyDown` handlers are unit-tested by inspecting the element tree returned
 *   by `ModernVisualShowcaseContent(...)`. These tests verify element structure and handler/ref
 *   callback invocation only — they do NOT mount a live browser DOM or verify real browser focus.
 */

interface TabElementProps {
  id?: string
  role?: string
  tabIndex?: number
  hidden?: boolean
  'aria-selected'?: boolean
  'aria-controls'?: string
  'aria-labelledby'?: string
  onClick?: () => void
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void
  children?: ReactNode
}

function collectByRole(
  node: ReactNode,
  targetRole: string,
  out: Array<ReactElement<TabElementProps>> = []
): Array<ReactElement<TabElementProps>> {
  if (Array.isArray(node)) {
    for (const child of node) {
      collectByRole(child, targetRole, out)
    }
  } else if (isValidElement(node)) {
    const element = node as ReactElement<TabElementProps>
    if (element.props.role === targetRole) {
      out.push(element)
    }
    collectByRole(element.props.children, targetRole, out)
  }
  return out
}

function parseOpeningTags(html: string, role: string): Array<Record<string, string>> {
  const tagPattern = /<([a-z0-9]+)\b([^>]*)>/gi
  const results: Array<Record<string, string>> = []

  for (const match of html.matchAll(tagPattern)) {
    const rawAttrs = match[2]
    const attrs: Record<string, string> = {}
    const attrPattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:="([^"]*)")?/g
    for (const attrMatch of rawAttrs.matchAll(attrPattern)) {
      attrs[attrMatch[1]] = attrMatch[2] ?? ''
    }
    if (attrs.role === role) {
      results.push(attrs)
    }
  }
  return results
}

const EXPECTED_CATEGORIES = [
  { id: 'url-intelligence', headlineHtml: 'Deep Domain &amp; Scheme Inspection' },
  { id: 'message-scams', headlineHtml: 'Urgency &amp; Credential Harvesting Detection' },
  { id: 'agent-consensus', headlineHtml: 'Unified 0–100 Threat Severity Index' },
  { id: 'bilingual-guidance', headlineHtml: 'Accessible Plain-Language Protection' },
] as const

describe('ModernVisualShowcase SSR markup & handler unit tests (Node/SSR scope)', () => {
  it('renders tablist, unique tab/panel IDs, ARIA relationships, and roving tabindex in SSR HTML', () => {
    const html = renderToStaticMarkup(<ModernVisualShowcase />)

    const tablists = parseOpeningTags(html, 'tablist')
    const tabs = parseOpeningTags(html, 'tab')
    const panels = parseOpeningTags(html, 'tabpanel')

    expect(tablists).toHaveLength(1)
    expect(tabs).toHaveLength(4)
    expect(panels).toHaveLength(4)

    const tabIds = new Set(tabs.map((t) => t.id))
    const panelIds = new Set(panels.map((p) => p.id))
    expect(tabIds.size).toBe(4)
    expect(panelIds.size).toBe(4)

    EXPECTED_CATEGORIES.forEach((cat, index) => {
      const tab = tabs[index]
      const panel = panels[index]
      const isFirst = index === 0

      expect(tab.id).toBe(`showcase-tab-${cat.id}`)
      expect(tab['aria-controls']).toBe(`showcase-panel-${cat.id}`)
      expect(tab['aria-selected']).toBe(String(isFirst))
      expect(tab.tabindex).toBe(isFirst ? '0' : '-1')

      expect(panel.id).toBe(`showcase-panel-${cat.id}`)
      expect(panel['aria-labelledby']).toBe(`showcase-tab-${cat.id}`)
      expect('hidden' in panel).toBe(!isFirst)
    })

    expect(html).toContain(EXPECTED_CATEGORIES[0].headlineHtml)
  })

  it('renders each category panel cleanly via defaultTabId and invokes onSelectTab in click handler', () => {
    for (const [activeIndex, activeCat] of EXPECTED_CATEGORIES.entries()) {
      const html = renderToStaticMarkup(<ModernVisualShowcase defaultTabId={activeCat.id} />)
      const tabs = parseOpeningTags(html, 'tab')
      const panels = parseOpeningTags(html, 'tabpanel')

      expect(html).toContain(activeCat.headlineHtml)
      for (const otherCat of EXPECTED_CATEGORIES) {
        if (otherCat.id !== activeCat.id) {
          expect(html).not.toContain(otherCat.headlineHtml)
        }
      }

      tabs.forEach((tab, idx) => {
        expect(tab['aria-selected']).toBe(String(idx === activeIndex))
        expect(tab.tabindex).toBe(idx === activeIndex ? '0' : '-1')
      })
      panels.forEach((panel, idx) => {
        expect('hidden' in panel).toBe(idx !== activeIndex)
      })
    }

    // Handler unit check on element props (does not mount a live DOM)
    const onSelectTab = vi.fn()
    const tree = ModernVisualShowcaseContent({
      activeTabId: 'url-intelligence',
      onSelectTab,
    })
    const tabElements = collectByRole(tree, 'tab')
    tabElements[1].props.onClick?.()
    expect(onSelectTab).toHaveBeenCalledWith('message-scams')
  })

  it('invokes onSelectTab and ref.focus() callback for ArrowRight, ArrowLeft, Home, and End key handlers (handler unit test, not browser focus)', () => {
    const onSelectTab = vi.fn()
    const focusSpies = EXPECTED_CATEGORIES.map(() => vi.fn())
    const tabRefs: MutableRefObject<Array<HTMLButtonElement | null>> = {
      current: focusSpies.map((focus) => ({ focus } as unknown as HTMLButtonElement)),
    }

    const tree = ModernVisualShowcaseContent({
      activeTabId: 'url-intelligence',
      onSelectTab,
      tabRefs,
    })
    const tabs = collectByRole(tree, 'tab')

    const makeKeyEvent = (key: string) => {
      const preventDefault = vi.fn()
      return {
        event: { key, preventDefault } as unknown as KeyboardEvent<HTMLButtonElement>,
        preventDefault,
      }
    }

    // ArrowRight from index 0 -> index 1
    const rightFrom0 = makeKeyEvent('ArrowRight')
    tabs[0].props.onKeyDown?.(rightFrom0.event)
    expect(rightFrom0.preventDefault).toHaveBeenCalledTimes(1)
    expect(onSelectTab).toHaveBeenLastCalledWith('message-scams')
    expect(focusSpies[1]).toHaveBeenCalledTimes(1)

    // ArrowLeft from index 0 wraps -> index 3
    const leftFrom0 = makeKeyEvent('ArrowLeft')
    tabs[0].props.onKeyDown?.(leftFrom0.event)
    expect(leftFrom0.preventDefault).toHaveBeenCalledTimes(1)
    expect(onSelectTab).toHaveBeenLastCalledWith('bilingual-guidance')
    expect(focusSpies[3]).toHaveBeenCalledTimes(1)

    // ArrowRight from index 3 wraps -> index 0
    const rightFrom3 = makeKeyEvent('ArrowRight')
    tabs[3].props.onKeyDown?.(rightFrom3.event)
    expect(rightFrom3.preventDefault).toHaveBeenCalledTimes(1)
    expect(onSelectTab).toHaveBeenLastCalledWith('url-intelligence')
    expect(focusSpies[0]).toHaveBeenCalledTimes(1)

    // End from index 1 -> index 3
    const endFrom1 = makeKeyEvent('End')
    tabs[1].props.onKeyDown?.(endFrom1.event)
    expect(endFrom1.preventDefault).toHaveBeenCalledTimes(1)
    expect(onSelectTab).toHaveBeenLastCalledWith('bilingual-guidance')
    expect(focusSpies[3]).toHaveBeenCalledTimes(2)

    // Home from index 2 -> index 0
    const homeFrom2 = makeKeyEvent('Home')
    tabs[2].props.onKeyDown?.(homeFrom2.event)
    expect(homeFrom2.preventDefault).toHaveBeenCalledTimes(1)
    expect(onSelectTab).toHaveBeenLastCalledWith('url-intelligence')
    expect(focusSpies[0]).toHaveBeenCalledTimes(2)

    // Unrelated key (Tab) is ignored and not prevented
    const tabKey = makeKeyEvent('Tab')
    const prevCallCount = onSelectTab.mock.calls.length
    tabs[0].props.onKeyDown?.(tabKey.event)
    expect(tabKey.preventDefault).not.toHaveBeenCalled()
    expect(onSelectTab).toHaveBeenCalledTimes(prevCallCount)
  })
})
