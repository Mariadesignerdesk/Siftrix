import { createElement, isValidElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CyberAssistant, {
  CyberAssistantContent,
} from '../components/chat/CyberAssistant'
import AssistantPage, { AssistantPageContent } from '../pages/AssistantPage'
import * as apiClient from '../services/apiClient'
import {
  AUTH_STORAGE_KEY,
  AUTH_TOKEN_KEY,
  loginUser,
  logoutUser,
} from '../services/authService'
import {
  clearChatHistory,
  createUserMessage,
  getChatStorageKey,
  loadChatHistory,
  saveChatHistory,
} from '../services/chatService'
import { saveSessionId } from '../utils/session'
import { createSyncedChatController } from './useSyncedChat'

function createStorageMock(): Storage {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value)
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (i: number) => Object.keys(store)[i] || null,
  }
}

function collectNodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return ''
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }
  if (Array.isArray(node)) {
    return node.map(collectNodeText).join('')
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return collectNodeText(node.props.children)
  }
  return ''
}

function findButtons(
  node: ReactNode,
  predicate: (props: Record<string, unknown>, text: string) => boolean
): Array<Record<string, unknown>> {
  const matches: Array<Record<string, unknown>> = []

  function walk(current: ReactNode) {
    if (!current) return
    if (Array.isArray(current)) {
      current.forEach(walk)
      return
    }
    if (isValidElement<Record<string, unknown>>(current)) {
      if (current.type === 'button') {
        const text = collectNodeText(current.props.children as ReactNode).trim()
        if (predicate(current.props, text)) {
          matches.push(current.props)
        }
      }
      if ('children' in current.props) {
        walk(current.props.children as ReactNode)
      }
    }
  }

  walk(node)
  return matches
}

describe('Phase 4 Step 2.4B — Mounted Chat UI Synchronization (AssistantPage & CyberAssistant)', () => {
  const hadWindow = 'window' in globalThis
  const originalWindow = globalThis.window
  const hadLocalStorage = 'localStorage' in globalThis
  const originalLocalStorage = globalThis.localStorage

  let localMock: Storage
  let sessionMock: Storage

  const userABackend = {
    id: 'aaaa1111-2222-4333-8444-555555555555',
    email: 'alice@siftrix.internal',
    full_name: 'Alice Analyst',
    is_active: true,
    created_at: '2026-11-28T03:00:00Z',
  }

  const userBBackend = {
    id: 'bbbb1111-2222-4333-8444-666666666666',
    email: 'bob@siftrix.internal',
    full_name: 'Bob Responder',
    is_active: true,
    created_at: '2026-11-28T03:05:00Z',
  }

  function seedAuthenticatedUser(user: typeof userABackend, token: string) {
    localMock.setItem(AUTH_TOKEN_KEY, token)
    localMock.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: 'analyst',
        organization: 'SIFTRIX Cyber Defense',
        createdAt: user.created_at,
      })
    )
    window.dispatchEvent(new Event('siftrix:auth-change'))
  }

  beforeEach(() => {
    localMock = createStorageMock()
    sessionMock = createStorageMock()
    const eventTarget = new EventTarget()

    Object.defineProperty(globalThis, 'localStorage', {
      value: localMock,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(globalThis, 'window', {
      value: {
        localStorage: localMock,
        sessionStorage: sessionMock,
        addEventListener: eventTarget.addEventListener.bind(eventTarget),
        removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
        dispatchEvent: eventTarget.dispatchEvent.bind(eventTarget),
      },
      writable: true,
      configurable: true,
    })

    logoutUser()
    clearChatHistory()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    logoutUser()

    if (hadWindow) {
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        writable: true,
        configurable: true,
      })
    } else {
      Reflect.deleteProperty(globalThis, 'window')
    }

    if (hadLocalStorage) {
      Object.defineProperty(globalThis, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
        configurable: true,
      })
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage')
    }
  })

  it('1. keeps AssistantPage and CyberAssistant synchronized when mounted simultaneously, delivering each user and assistant message exactly once', async () => {
    vi.useFakeTimers()
    seedAuthenticatedUser(userABackend, 'jwt_alice_dual_ui')

    const assistantCtrl = createSyncedChatController()
    const floatingCtrl = createSyncedChatController()
    const unmountAssistant = assistantCtrl.mount()
    const unmountFloating = floatingCtrl.mount()

    try {
      expect(assistantCtrl.getSnapshot().messages).toHaveLength(1)
      expect(floatingCtrl.getSnapshot().messages).toHaveLength(1)

      // Send from AssistantPage -> CyberAssistant immediately sees the optimistic/saved user message
      assistantCtrl.setInputText('Check https://phishing-bank-alert.example')
      const pendingFromPage = assistantCtrl.sendMessage()

      expect(assistantCtrl.getSnapshot().isTyping).toBe(true)
      expect(assistantCtrl.getSnapshot().inputText).toBe('')
      expect(assistantCtrl.getSnapshot().messages).toHaveLength(2)
      expect(floatingCtrl.getSnapshot().messages).toHaveLength(2)
      expect(floatingCtrl.getSnapshot().messages[1].content).toBe(
        'Check https://phishing-bank-alert.example'
      )

      // Verify disabled send controls in AssistantPage while pending
      const pendingPageTree = AssistantPageContent({
        messages: assistantCtrl.getSnapshot().messages,
        inputText: assistantCtrl.getSnapshot().inputText,
        isTyping: assistantCtrl.getSnapshot().isTyping,
        onInputChange: assistantCtrl.setInputText,
        onSend: assistantCtrl.sendMessage,
        onClear: assistantCtrl.clearHistory,
        onNavigate: vi.fn(),
      })
      const followUpButtonsWhileTyping = findButtons(pendingPageTree, (_props, text) =>
        text.startsWith('💡')
      )
      expect(followUpButtonsWhileTyping.length).toBeGreaterThan(0)
      expect(
        followUpButtonsWhileTyping.every((btn) => btn.disabled === true)
      ).toBe(true)

      await vi.advanceTimersByTimeAsync(700)
      await pendingFromPage

      // Reply appears ONCE in both AssistantPage and CyberAssistant (total 3 messages: welcome + user + reply)
      expect(assistantCtrl.getSnapshot().isTyping).toBe(false)
      expect(assistantCtrl.getSnapshot().messages).toHaveLength(3)
      expect(floatingCtrl.getSnapshot().messages).toHaveLength(3)
      expect(assistantCtrl.getSnapshot().messages).toEqual(
        floatingCtrl.getSnapshot().messages
      )

      const pageIds = assistantCtrl.getSnapshot().messages.map((m) => m.id)
      expect(new Set(pageIds).size).toBe(3)

      // Send from CyberAssistant -> AssistantPage updates and each message appears once (total 5 messages)
      floatingCtrl.setInputText('What is SSRF?')
      const pendingFromWidget = floatingCtrl.sendMessage()
      expect(assistantCtrl.getSnapshot().messages).toHaveLength(4)
      expect(floatingCtrl.getSnapshot().messages).toHaveLength(4)

      await vi.advanceTimersByTimeAsync(700)
      await pendingFromWidget

      expect(assistantCtrl.getSnapshot().messages).toHaveLength(5)
      expect(floatingCtrl.getSnapshot().messages).toHaveLength(5)
      const allIds = floatingCtrl.getSnapshot().messages.map((m) => m.id)
      expect(new Set(allIds).size).toBe(5)

      // Verify both top-level components render identical synchronized messages cleanly
      const pageHtml = renderToStaticMarkup(
        createElement(AssistantPage, {
          onNavigate: vi.fn(),
          controller: assistantCtrl,
        })
      )
      const widgetHtml = renderToStaticMarkup(
        createElement(CyberAssistant, {
          controller: floatingCtrl,
          defaultOpen: true,
        })
      )
      expect(pageHtml).toContain('5 Messages')
      expect(pageHtml.match(/Server-Side Request Forgery \(SSRF\) Explained/g)).toHaveLength(1)
      expect(widgetHtml.match(/Server-Side Request Forgery \(SSRF\) Explained/g)).toHaveLength(1)
    } finally {
      unmountAssistant()
      unmountFloating()
    }
  })

  it('2. updates both consumers on Clear History, immediately resets isTyping, prevents pending reply resurrection, and prevents a subsequent send from undoing clear', async () => {
    vi.useFakeTimers()
    seedAuthenticatedUser(userABackend, 'jwt_alice_clear_sync')

    const assistantCtrl = createSyncedChatController()
    const floatingCtrl = createSyncedChatController()
    const unmountAssistant = assistantCtrl.mount()
    const unmountFloating = floatingCtrl.mount()

    try {
      // Case A: Send in AssistantPage, click Clear History in AssistantPage while pending
      const pendingA = assistantCtrl.sendMessage('I clicked a suspicious link!')
      expect(assistantCtrl.getSnapshot().isTyping).toBe(true)
      expect(floatingCtrl.getSnapshot().messages).toHaveLength(2)

      await vi.advanceTimersByTimeAsync(200)
      assistantCtrl.clearHistory()

      // Immediately resets isTyping and clears both consumers to [msg_welcome]
      expect(assistantCtrl.getSnapshot().isTyping).toBe(false)
      expect(assistantCtrl.getSnapshot().messages).toHaveLength(1)
      expect(assistantCtrl.getSnapshot().messages[0].id).toBe('msg_welcome')
      expect(floatingCtrl.getSnapshot().messages).toHaveLength(1)
      expect(floatingCtrl.getSnapshot().messages[0].id).toBe('msg_welcome')

      await vi.advanceTimersByTimeAsync(500)
      await pendingA

      // Neither consumer resurrects the cleared user message or invalidated assistant reply
      expect(assistantCtrl.getSnapshot().messages).toHaveLength(1)
      expect(floatingCtrl.getSnapshot().messages).toHaveLength(1)

      // Case B: Send in CyberAssistant, click Clear History in AssistantPage while CyberAssistant is pending
      const pendingB = floatingCtrl.sendMessage('What is SSRF?')
      expect(floatingCtrl.getSnapshot().isTyping).toBe(true)
      expect(assistantCtrl.getSnapshot().messages).toHaveLength(2)

      await vi.advanceTimersByTimeAsync(200)
      assistantCtrl.clearHistory()

      // CyberAssistant also immediately resets isTyping and clears its messages
      expect(floatingCtrl.getSnapshot().isTyping).toBe(false)
      expect(floatingCtrl.getSnapshot().messages).toHaveLength(1)
      expect(assistantCtrl.getSnapshot().messages).toHaveLength(1)

      await vi.advanceTimersByTimeAsync(500)
      await pendingB

      expect(floatingCtrl.getSnapshot().messages).toHaveLength(1)
      expect(assistantCtrl.getSnapshot().messages).toHaveLength(1)

      // Subsequent send from CyberAssistant does NOT resurrect previously cleared messages
      const pendingAfterClear = floatingCtrl.sendMessage('Fresh post-clear question')
      await vi.advanceTimersByTimeAsync(700)
      await pendingAfterClear

      const persisted = loadChatHistory()
      expect(persisted).toHaveLength(3)
      expect(persisted.some((m) => m.content === 'What is SSRF?')).toBe(false)
      expect(
        persisted.some((m) =>
          m.content.includes('Server-Side Request Forgery (SSRF) Explained')
        )
      ).toBe(false)
      expect(persisted.some((m) => m.content.includes('clicked a suspicious link'))).toBe(
        false
      )
      expect(persisted.some((m) => m.content === 'Fresh post-clear question')).toBe(true)
    } finally {
      unmountAssistant()
      unmountFloating()
    }
  })

  it('3. clears old messages, unsent input drafts, and typing state on logout/account switch while mounted, ignores pending responses, and never persists old-scope messages on subsequent sends', async () => {
    vi.useFakeTimers()
    seedAuthenticatedUser(userABackend, 'jwt_alice_mounted_auth')

    const assistantCtrl = createSyncedChatController()
    const floatingCtrl = createSyncedChatController()
    const unmountAssistant = assistantCtrl.mount()
    const unmountFloating = floatingCtrl.mount()

    try {
      // Alice completes one turn and starts a second in-flight turn + types an unsent draft
      const firstTurn = assistantCtrl.sendMessage(
        'Alice private URL https://alice-payroll.corp.example'
      )
      await vi.advanceTimersByTimeAsync(700)
      await firstTurn
      expect(floatingCtrl.getSnapshot().messages).toHaveLength(3)

      assistantCtrl.setInputText('Unsent Alice secret draft https://draft-only.corp.example')
      const pendingSecondTurn = floatingCtrl.sendMessage('Alice second confidential query')
      expect(floatingCtrl.getSnapshot().isTyping).toBe(true)
      expect(assistantCtrl.getSnapshot().inputText).toContain('draft-only.corp.example')

      // Alice logs out while both components remain mounted (no React remount)
      await vi.advanceTimersByTimeAsync(200)
      logoutUser()

      // Both mounted components immediately clear Alice's visible messages, unsent draft, and typing indicator
      expect(assistantCtrl.getSnapshot().scopeKey).toBe('siftrix_chat_history_guest')
      expect(floatingCtrl.getSnapshot().scopeKey).toBe('siftrix_chat_history_guest')
      expect(assistantCtrl.getSnapshot().inputText).toBe('')
      expect(floatingCtrl.getSnapshot().isTyping).toBe(false)
      expect(assistantCtrl.getSnapshot().messages).toHaveLength(1)
      expect(assistantCtrl.getSnapshot().messages[0].id).toBe('msg_welcome')
      expect(floatingCtrl.getSnapshot().messages).toHaveLength(1)

      // Alice's pending response resolves after logout and is completely ignored
      await vi.advanceTimersByTimeAsync(500)
      await pendingSecondTurn
      expect(assistantCtrl.getSnapshot().messages).toHaveLength(1)
      expect(floatingCtrl.getSnapshot().messages).toHaveLength(1)

      // Switch directly to Bob while mounted, start an in-flight guest send before login completes
      const pendingGuest = assistantCtrl.sendMessage('Temporary guest question')
      assistantCtrl.setInputText('Guest unsent draft')
      await vi.advanceTimersByTimeAsync(200)

      vi.spyOn(apiClient, 'apiPost').mockResolvedValueOnce({
        ok: true,
        status: 200,
        error: null,
        data: {
          access_token: 'jwt_bob_mounted_switch',
          token_type: 'bearer',
          user: userBBackend,
        },
      })
      const loginPromise = loginUser({
        email: userBBackend.email,
        password: 'Password123!',
        rememberMe: true,
      })
      await loginPromise

      const bobScope = `siftrix_chat_history_usr_${userBBackend.id}`
      expect(assistantCtrl.getSnapshot().scopeKey).toBe(bobScope)
      expect(floatingCtrl.getSnapshot().scopeKey).toBe(bobScope)
      expect(assistantCtrl.getSnapshot().inputText).toBe('')
      expect(assistantCtrl.getSnapshot().isTyping).toBe(false)
      expect(assistantCtrl.getSnapshot().messages).toHaveLength(1)

      await vi.advanceTimersByTimeAsync(500)
      await pendingGuest
      expect(assistantCtrl.getSnapshot().messages).toHaveLength(1)

      // Bob sends a new message from the same mounted instance -> neither Alice's nor Guest's messages are saved into Bob's scope
      const bobSend = floatingCtrl.sendMessage('Bob incident response question')
      await vi.advanceTimersByTimeAsync(700)
      await bobSend

      const bobStored = loadChatHistory()
      expect(bobStored).toHaveLength(3)
      expect(bobStored.some((m) => m.content.includes('alice-payroll'))).toBe(false)
      expect(bobStored.some((m) => m.content.includes('Temporary guest question'))).toBe(
        false
      )
      expect(bobStored.some((m) => m.content === 'Bob incident response question')).toBe(
        true
      )
    } finally {
      unmountAssistant()
      unmountFloating()
    }
  })

  it('4. seamlessly promotes pre-scan guest chat history and pending replies when X-Session-ID is assigned while mounted, and rejects promotion onto an existing session', async () => {
    vi.useFakeTimers()

    const assistantCtrl = createSyncedChatController()
    const floatingCtrl = createSyncedChatController()
    const unmountAssistant = assistantCtrl.mount()
    const unmountFloating = floatingCtrl.mount()

    try {
      expect(assistantCtrl.getSnapshot().scopeKey).toBe('siftrix_chat_history_guest')

      // Guest sends a prompt and types a follow-up draft in the other consumer while a scan assigns X-Session-ID
      const pendingPromotion = assistantCtrl.sendMessage(
        'Is https://courier-fee-notice.example safe?'
      )
      floatingCtrl.setInputText('Follow-up draft preserved across promotion')

      await vi.advanceTimersByTimeAsync(250)
      const newGuestSessionId = 'aaaaaaaa-bbbb-4ccc-8ddd-111111111111'
      saveSessionId(newGuestSessionId)

      await vi.advanceTimersByTimeAsync(450)
      await pendingPromotion

      const promotedKey = `siftrix_chat_history_sess_${newGuestSessionId}`
      expect(getChatStorageKey()).toBe(promotedKey)
      expect(assistantCtrl.getSnapshot().scopeKey).toBe(promotedKey)
      expect(floatingCtrl.getSnapshot().scopeKey).toBe(promotedKey)
      expect(assistantCtrl.getSnapshot().isTyping).toBe(false)
      expect(floatingCtrl.getSnapshot().inputText).toBe(
        'Follow-up draft preserved across promotion'
      )
      expect(assistantCtrl.getSnapshot().messages).toHaveLength(3)
      expect(floatingCtrl.getSnapshot().messages).toEqual(
        assistantCtrl.getSnapshot().messages
      )
      expect(localMock.getItem('siftrix_chat_history_guest')).toBeNull()

      // Rejected migration while mounted: switching from sessionless guest onto a pre-populated session
      const preExistingSessionId = 'aaaaaaaa-bbbb-4ccc-8ddd-222222222222'
      saveSessionId(preExistingSessionId)
      const preExistingMsg = createUserMessage('Existing session authoritative note')
      saveChatHistory([loadChatHistory()[0], preExistingMsg])

      localMock.removeItem('siftrix.session.id')
      sessionMock.removeItem('siftrix.session.id')
      assistantCtrl.reconcileScope()
      floatingCtrl.reconcileScope()
      expect(assistantCtrl.getSnapshot().scopeKey).toBe('siftrix_chat_history_guest')

      const rejectedPending = assistantCtrl.sendMessage('Stale sessionless guest query')
      assistantCtrl.setInputText('Stale sessionless draft')
      floatingCtrl.setInputText('Stale floating widget draft')
      await vi.advanceTimersByTimeAsync(200)
      saveSessionId(preExistingSessionId)

      await vi.advanceTimersByTimeAsync(500)
      await rejectedPending

      const expectedExistingKey = `siftrix_chat_history_sess_${preExistingSessionId}`
      expect(assistantCtrl.getSnapshot().scopeKey).toBe(expectedExistingKey)
      expect(floatingCtrl.getSnapshot().scopeKey).toBe(expectedExistingKey)
      expect(assistantCtrl.getSnapshot().inputText).toBe('')
      expect(floatingCtrl.getSnapshot().inputText).toBe('')
      expect(assistantCtrl.getSnapshot().isTyping).toBe(false)
      expect(floatingCtrl.getSnapshot().isTyping).toBe(false)
      expect(floatingCtrl.getSnapshot()).toEqual(assistantCtrl.getSnapshot())
      expect(
        assistantCtrl
          .getSnapshot()
          .messages.some((m) => m.content === 'Existing session authoritative note')
      ).toBe(true)
      expect(
        assistantCtrl
          .getSnapshot()
          .messages.some((m) => m.content === 'Stale sessionless guest query')
      ).toBe(false)
    } finally {
      unmountAssistant()
      unmountFloating()
    }
  })

  it('5. preserves valid chat history and in-flight responses when closing and reopening the CyberAssistant floating drawer', async () => {
    vi.useFakeTimers()
    seedAuthenticatedUser(userABackend, 'jwt_alice_drawer_toggle')

    const floatingCtrl = createSyncedChatController()
    const unmountFloating = floatingCtrl.mount()
    let isOpen = true
    let isMinimized = false

    const renderWidget = () =>
      CyberAssistantContent({
        isOpen,
        isMinimized,
        messages: floatingCtrl.getSnapshot().messages,
        inputText: floatingCtrl.getSnapshot().inputText,
        isTyping: floatingCtrl.getSnapshot().isTyping,
        onOpen: () => {
          floatingCtrl.reconcileScope()
          isOpen = true
          isMinimized = false
        },
        onClose: () => {
          isOpen = false
        },
        onToggleMinimize: () => {
          isMinimized = !isMinimized
        },
        onInputChange: floatingCtrl.setInputText,
        onSend: floatingCtrl.sendMessage,
        onClear: floatingCtrl.clearHistory,
      })

    try {
      // Send a message in the open floating widget, then close the drawer while response is still pending
      const pending = floatingCtrl.sendMessage('How does SIFTRIX analyze suspicious URLs?')
      expect(floatingCtrl.getSnapshot().messages).toHaveLength(2)

      const closeBtn = findButtons(
        renderWidget(),
        (props) => props['aria-label'] === 'Close chat'
      )[0]
      expect(closeBtn).toBeDefined()
      ;(closeBtn.onClick as () => void)()
      expect(isOpen).toBe(false)

      // Response completes while drawer is closed
      await vi.advanceTimersByTimeAsync(700)
      await pending

      // Reopen via launcher button -> valid user message + assistant reply are intact
      const openBtn = findButtons(
        renderWidget(),
        (props) => props['aria-label'] === 'Open AI Assistant'
      )[0]
      expect(openBtn).toBeDefined()
      ;(openBtn.onClick as () => void)()
      expect(isOpen).toBe(true)

      expect(floatingCtrl.getSnapshot().isTyping).toBe(false)
      expect(floatingCtrl.getSnapshot().messages).toHaveLength(3)
      const reopenedMarkup = renderToStaticMarkup(renderWidget())
      expect(reopenedMarkup).toContain('How does SIFTRIX analyze suspicious URLs?')
      expect(reopenedMarkup).toContain('Multi-Agent Cybersecurity Architecture')
    } finally {
      unmountFloating()
    }
  })

  it('6. handles cross-tab Clear History (active-key removal & localStorage.clear), wrong storageArea ignore, and cross-tab logout/account switch across mounted consumers', async () => {
    vi.useFakeTimers()
    seedAuthenticatedUser(userABackend, 'jwt_alice_xtab_ui')
    const aliceKey = `siftrix_chat_history_usr_${userABackend.id}`

    const assistantCtrl = createSyncedChatController()
    const floatingCtrl = createSyncedChatController()
    const unmountAssistant = assistantCtrl.mount()
    const unmountFloating = floatingCtrl.mount()

    try {
      // 1. Cross-tab active-key removal during pending send resets isTyping and blocks resurrection
      const pendingClearRace = assistantCtrl.sendMessage(
        'Alice query before cross-tab clear'
      )
      expect(assistantCtrl.getSnapshot().isTyping).toBe(true)
      expect(floatingCtrl.getSnapshot().messages).toHaveLength(2)

      // Wrong storageArea event (sessionStorage) is ignored while pending
      const sessionClearEvt = new Event('storage')
      Object.defineProperties(sessionClearEvt, {
        key: { value: null },
        newValue: { value: null },
        storageArea: { value: sessionMock },
      })
      window.dispatchEvent(sessionClearEvt)
      expect(assistantCtrl.getSnapshot().isTyping).toBe(true)
      expect(assistantCtrl.getSnapshot().messages).toHaveLength(2)

      // Genuine localStorage active-key removal from another tab
      await vi.advanceTimersByTimeAsync(200)
      localMock.removeItem(aliceKey)
      const xtabRemoveEvt = new Event('storage')
      Object.defineProperties(xtabRemoveEvt, {
        key: { value: aliceKey },
        newValue: { value: null },
        storageArea: { value: localMock },
      })
      window.dispatchEvent(xtabRemoveEvt)

      expect(assistantCtrl.getSnapshot().isTyping).toBe(false)
      expect(assistantCtrl.getSnapshot().messages).toHaveLength(1)
      expect(floatingCtrl.getSnapshot().messages).toHaveLength(1)

      await vi.advanceTimersByTimeAsync(500)
      await pendingClearRace
      expect(assistantCtrl.getSnapshot().messages).toHaveLength(1)
      expect(floatingCtrl.getSnapshot().messages).toHaveLength(1)
      expect(localMock.getItem(aliceKey)).toBeNull()

      // 2. Cross-tab logout and account switch via StorageEvent (without siftrix:auth-change)
      const aliceCompleted = assistantCtrl.sendMessage(
        'Alice private URL https://alice-secret-tab1.example'
      )
      await vi.advanceTimersByTimeAsync(700)
      await aliceCompleted
      expect(floatingCtrl.getSnapshot().messages).toHaveLength(3)

      assistantCtrl.setInputText('Alice unsent draft in AssistantPage')
      floatingCtrl.setInputText('Alice unsent draft in CyberAssistant')
      const alicePendingOnLogout = floatingCtrl.sendMessage(
        'Alice in-flight before cross-tab logout'
      )
      expect(floatingCtrl.getSnapshot().isTyping).toBe(true)

      await vi.advanceTimersByTimeAsync(200)
      // Simulate Tab 2 logout removing AUTH_STORAGE_KEY and AUTH_TOKEN_KEY (no siftrix:auth-change fired)
      localMock.removeItem(AUTH_STORAGE_KEY)
      localMock.removeItem(AUTH_TOKEN_KEY)
      const logoutEvt1 = new Event('storage')
      Object.defineProperties(logoutEvt1, {
        key: { value: AUTH_STORAGE_KEY },
        newValue: { value: null },
        storageArea: { value: localMock },
      })
      window.dispatchEvent(logoutEvt1)
      const logoutEvt2 = new Event('storage')
      Object.defineProperties(logoutEvt2, {
        key: { value: AUTH_TOKEN_KEY },
        newValue: { value: null },
        storageArea: { value: localMock },
      })
      window.dispatchEvent(logoutEvt2)

      expect(assistantCtrl.getSnapshot().scopeKey).toBe('siftrix_chat_history_guest')
      expect(floatingCtrl.getSnapshot().scopeKey).toBe('siftrix_chat_history_guest')
      expect(assistantCtrl.getSnapshot().inputText).toBe('')
      expect(floatingCtrl.getSnapshot().inputText).toBe('')
      expect(floatingCtrl.getSnapshot().isTyping).toBe(false)
      expect(assistantCtrl.getSnapshot().messages).toHaveLength(1)
      expect(floatingCtrl.getSnapshot().messages).toHaveLength(1)

      await vi.advanceTimersByTimeAsync(500)
      await alicePendingOnLogout
      expect(assistantCtrl.getSnapshot().messages).toHaveLength(1)
      expect(floatingCtrl.getSnapshot().messages).toHaveLength(1)

      // Simulate Tab 2 logging in as Bob (StorageEvents for AUTH_STORAGE_KEY + AUTH_TOKEN_KEY) while guest request is pending
      const guestPending = assistantCtrl.sendMessage('Guest pre-switch query')
      floatingCtrl.setInputText('Guest draft before Bob login')
      await vi.advanceTimersByTimeAsync(200)

      const bobSerialized = JSON.stringify({
        id: userBBackend.id,
        name: userBBackend.full_name,
        email: userBBackend.email,
        role: 'analyst',
        organization: 'SIFTRIX Cyber Defense',
        createdAt: userBBackend.created_at,
      })
      localMock.setItem(AUTH_STORAGE_KEY, bobSerialized)
      localMock.setItem(AUTH_TOKEN_KEY, 'jwt_bob_xtab_login')
      const bobTokenEvt = new Event('storage')
      Object.defineProperties(bobTokenEvt, {
        key: { value: AUTH_TOKEN_KEY },
        newValue: { value: 'jwt_bob_xtab_login' },
        storageArea: { value: localMock },
      })
      window.dispatchEvent(bobTokenEvt)

      const bobScope = `siftrix_chat_history_usr_${userBBackend.id}`
      expect(assistantCtrl.getSnapshot().scopeKey).toBe(bobScope)
      expect(floatingCtrl.getSnapshot().scopeKey).toBe(bobScope)
      expect(assistantCtrl.getSnapshot().isTyping).toBe(false)
      expect(floatingCtrl.getSnapshot().inputText).toBe('')
      expect(assistantCtrl.getSnapshot().messages).toHaveLength(1)
      expect(localMock.getItem('siftrix_chat_history_guest')).toBeNull()

      await vi.advanceTimersByTimeAsync(500)
      await guestPending
      expect(assistantCtrl.getSnapshot().messages).toHaveLength(1)
      expect(floatingCtrl.getSnapshot().messages).toHaveLength(1)
    } finally {
      unmountAssistant()
      unmountFloating()
    }
  })

  it('7. synchronizes silent clearSessionId() resets when another consumer mounts or reconciles, preserves valid guest promotion on mount, and survives React StrictMode remount cycles', async () => {
    vi.useFakeTimers()

    // 1. CyberAssistant is active on Guest Session 1; silent clearSessionId() occurs before AssistantPage mounts
    const session1 = '12121212-aaaa-4bbb-8ccc-111111111111'
    saveSessionId(session1)
    const floatingCtrl = createSyncedChatController()
    let unmountFloating = floatingCtrl.mount()

    // Simulate React StrictMode mount -> unmount -> remount cycle on floatingCtrl
    unmountFloating()
    unmountFloating = floatingCtrl.mount()

    let unmountAssistant: (() => void) | null = null

    try {
      const turn1 = floatingCtrl.sendMessage('Guest session 1 confidential URL')
      await vi.advanceTimersByTimeAsync(700)
      await turn1
      floatingCtrl.setInputText('Unsent draft in Guest Session 1')
      expect(floatingCtrl.getSnapshot().messages).toHaveLength(3)
      expect(floatingCtrl.getSnapshot().scopeKey).toBe(
        `siftrix_chat_history_sess_${session1}`
      )

      // Silent clearSessionId() (e.g. HTTP 400 invalid session reset on /scanner)
      localMock.removeItem('siftrix.session.id')
      sessionMock.removeItem('siftrix.session.id')

      // User navigates to /assistant -> AssistantPage mounts and StrictMode double-mounts
      const assistantCtrl = createSyncedChatController()
      unmountAssistant = assistantCtrl.mount()
      unmountAssistant()
      unmountAssistant = assistantCtrl.mount()

      // Both AssistantPage AND the already-mounted CyberAssistant converge to clean sessionless guest state
      expect(assistantCtrl.getSnapshot().scopeKey).toBe('siftrix_chat_history_guest')
      expect(floatingCtrl.getSnapshot().scopeKey).toBe('siftrix_chat_history_guest')
      expect(floatingCtrl.getSnapshot().inputText).toBe('')
      expect(floatingCtrl.getSnapshot().isTyping).toBe(false)
      expect(floatingCtrl.getSnapshot()).toEqual(assistantCtrl.getSnapshot())
      expect(floatingCtrl.getSnapshot().messages).toHaveLength(1)
      expect(floatingCtrl.getSnapshot().messages[0].id).toBe('msg_welcome')

      // 2. Valid guest promotion when CyberAssistant has a pending send + draft and AssistantPage mounts after X-Session-ID is saved
      unmountAssistant()
      unmountAssistant = null

      const pendingValidPromo = floatingCtrl.sendMessage(
        'Valid pre-scan guest question'
      )
      floatingCtrl.setInputText('Preserved draft during valid promotion')
      await vi.advanceTimersByTimeAsync(200)

      const newValidSession = '12121212-aaaa-4bbb-8ccc-222222222222'
      saveSessionId(newValidSession)

      const assistantCtrlAfterScan = createSyncedChatController()
      unmountAssistant = assistantCtrlAfterScan.mount()

      const expectedPromotedKey = `siftrix_chat_history_sess_${newValidSession}`
      expect(assistantCtrlAfterScan.getSnapshot().scopeKey).toBe(expectedPromotedKey)
      expect(floatingCtrl.getSnapshot().scopeKey).toBe(expectedPromotedKey)
      expect(floatingCtrl.getSnapshot().isTyping).toBe(true)
      expect(floatingCtrl.getSnapshot().inputText).toBe(
        'Preserved draft during valid promotion'
      )

      await vi.advanceTimersByTimeAsync(500)
      await pendingValidPromo

      expect(floatingCtrl.getSnapshot().isTyping).toBe(false)
      expect(floatingCtrl.getSnapshot().messages).toHaveLength(3)
      expect(assistantCtrlAfterScan.getSnapshot().messages).toEqual(
        floatingCtrl.getSnapshot().messages
      )
    } finally {
      unmountAssistant?.()
      unmountFloating()
    }
  })
})
