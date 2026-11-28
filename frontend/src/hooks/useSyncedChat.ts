import { useState, useSyncExternalStore } from 'react'
import {
  clearChatHistory,
  createUserMessage,
  getChatScopeMeta,
  isPromotedGuestSession,
  loadChatHistory,
  saveChatHistory,
  sendChatMessage,
  subscribeChatHistory,
  syncMountedChatConsumers,
  type ChatMessage,
} from '../services/chatService'

export interface SyncedChatState {
  messages: ChatMessage[]
  inputText: string
  isTyping: boolean
  scopeKey: string
}

export interface SyncedChatController {
  getSnapshot: () => SyncedChatState
  subscribe: (listener: () => void) => () => void
  setInputText: (value: string) => void
  sendMessage: (textToSend?: string) => Promise<void>
  clearHistory: () => void
  reconcileScope: () => boolean
  mount: () => () => void
}

interface MountedControllerHandle {
  getTrackedScopeKey: () => string
}

const activeMountedControllers = new Set<MountedControllerHandle>()

function getMountedConsumerScopeKeys(): string[] {
  return Array.from(activeMountedControllers, (entry) =>
    entry.getTrackedScopeKey()
  )
}

function areMessageListsIdentical(
  a: ChatMessage[],
  b: ChatMessage[]
): boolean {
  if (a === b) {
    return true
  }
  if (a.length !== b.length) {
    return false
  }
  return a.every(
    (msg, idx) =>
      msg.id === b[idx]?.id &&
      msg.role === b[idx]?.role &&
      msg.content === b[idx]?.content &&
      msg.timestamp === b[idx]?.timestamp
  )
}

/**
 * Creates a scoped, synchronization-safe chat state controller shared by
 * mounted chat UI consumers (`AssistantPage` and `CyberAssistant`).
 *
 * - Subscribes to `subscribeChatHistory()` and `'siftrix:auth-change'`.
 * - Applies incoming sync snapshots strictly for the currently active scope.
 * - Invalidates pending UI requests, resets `isTyping`, clears unsent drafts,
 *   and reloads scoped history on unrelated scope/auth transitions.
 * - Broadcasts silent guest scope transitions across all mounted consumers so
 *   concurrently mounted widgets never diverge.
 * - Seamlessly promotes pre-scan sessionless guest state to a newly assigned
 *   empty `X-Session-ID` without losing in-flight replies or duplicating messages.
 * - Uses imperative-only storage writes so subscriptions never loop.
 */
export function createSyncedChatController(): SyncedChatController {
  const initialMeta = getChatScopeMeta()
  let trackedScopeKey = initialMeta.scopeKey
  let trackedClearGen = initialMeta.clearGeneration
  let trackedAuthEpoch = initialMeta.authEpoch
  let uiRequestEpoch = 0
  let activeSubscriptions = 0
  let detachRuntimeListeners: (() => void) | null = null

  let state: SyncedChatState = {
    messages: loadChatHistory(),
    inputText: '',
    isTyping: false,
    scopeKey: initialMeta.scopeKey,
  }

  const storeListeners = new Set<() => void>()
  const controllerHandle: MountedControllerHandle = {
    getTrackedScopeKey: () => trackedScopeKey,
  }

  function notifyStoreListeners(): void {
    storeListeners.forEach((listener) => {
      listener()
    })
  }

  /**
   * Reconciles controller state with the currently active chat storage scope.
   * Returns `true` when an unrelated scope transition or clear invalidated prior UI state.
   */
  function reconcileScope(): boolean {
    const currentMeta = getChatScopeMeta()
    const scopeOrAuthChanged =
      currentMeta.scopeKey !== trackedScopeKey ||
      currentMeta.authEpoch !== trackedAuthEpoch

    if (scopeOrAuthChanged) {
      // Capture mounted scopes BEFORE updating trackedScopeKey so peer consumers
      // lagging on the previous scope are notified in lockstep.
      const observedScopesBeforeUpdate = getMountedConsumerScopeKeys()
      const validPromotion = isPromotedGuestSession(
        trackedScopeKey,
        trackedClearGen,
        trackedAuthEpoch,
        currentMeta.scopeKey
      )

      trackedScopeKey = currentMeta.scopeKey
      trackedClearGen = currentMeta.clearGeneration
      trackedAuthEpoch = currentMeta.authEpoch

      if (validPromotion) {
        state = {
          ...state,
          messages: loadChatHistory(),
          scopeKey: currentMeta.scopeKey,
        }
        notifyStoreListeners()
        syncMountedChatConsumers(observedScopesBeforeUpdate)
        return false
      }

      uiRequestEpoch += 1
      state = {
        messages: loadChatHistory(),
        inputText: '',
        isTyping: false,
        scopeKey: currentMeta.scopeKey,
      }
      notifyStoreListeners()
      syncMountedChatConsumers(observedScopesBeforeUpdate)
      return true
    }

    if (currentMeta.clearGeneration !== trackedClearGen) {
      trackedClearGen = currentMeta.clearGeneration
      uiRequestEpoch += 1
      state = {
        ...state,
        messages: loadChatHistory(),
        isTyping: false,
        scopeKey: currentMeta.scopeKey,
      }
      notifyStoreListeners()
      return true
    }

    // Even if this controller already matches currentMeta.scopeKey (e.g. freshly mounted
    // after a silent clearSessionId() reset), ensure any older mounted peer reconciles too.
    if (activeMountedControllers.size > 1) {
      syncMountedChatConsumers(getMountedConsumerScopeKeys())
    }

    return false
  }

  function handleServiceSync(
    syncedMessages: ChatMessage[],
    eventScopeKey: string
  ): void {
    const currentMeta = getChatScopeMeta()
    if (eventScopeKey !== currentMeta.scopeKey) {
      return
    }

    const scopeOrAuthChanged =
      currentMeta.scopeKey !== trackedScopeKey ||
      currentMeta.authEpoch !== trackedAuthEpoch

    if (scopeOrAuthChanged) {
      const validPromotion = isPromotedGuestSession(
        trackedScopeKey,
        trackedClearGen,
        trackedAuthEpoch,
        currentMeta.scopeKey
      )

      trackedScopeKey = currentMeta.scopeKey
      trackedClearGen = currentMeta.clearGeneration
      trackedAuthEpoch = currentMeta.authEpoch

      if (validPromotion) {
        state = {
          ...state,
          messages: syncedMessages,
          scopeKey: currentMeta.scopeKey,
        }
      } else {
        uiRequestEpoch += 1
        state = {
          messages: syncedMessages,
          inputText: '',
          isTyping: false,
          scopeKey: currentMeta.scopeKey,
        }
      }
      notifyStoreListeners()
      return
    }

    if (currentMeta.clearGeneration !== trackedClearGen) {
      trackedClearGen = currentMeta.clearGeneration
      uiRequestEpoch += 1
      state = {
        ...state,
        messages: syncedMessages,
        isTyping: false,
        scopeKey: currentMeta.scopeKey,
      }
      notifyStoreListeners()
      return
    }

    if (
      state.scopeKey === currentMeta.scopeKey &&
      areMessageListsIdentical(state.messages, syncedMessages)
    ) {
      return
    }

    state = {
      ...state,
      messages: syncedMessages,
      scopeKey: currentMeta.scopeKey,
    }
    notifyStoreListeners()
  }

  function attachIfNeeded(): void {
    if (detachRuntimeListeners !== null) {
      return
    }

    activeMountedControllers.add(controllerHandle)
    const unsubscribeChat = subscribeChatHistory(handleServiceSync)
    const handleAuthChange = () => {
      reconcileScope()
    }

    let attachedWindow: Window | null = null
    try {
      if (
        typeof window !== 'undefined' &&
        window !== null &&
        typeof window.addEventListener === 'function'
      ) {
        attachedWindow = window
        attachedWindow.addEventListener('siftrix:auth-change', handleAuthChange)
      }
    } catch {
      attachedWindow = null
    }

    detachRuntimeListeners = () => {
      activeMountedControllers.delete(controllerHandle)
      unsubscribeChat()
      if (
        attachedWindow &&
        typeof attachedWindow.removeEventListener === 'function'
      ) {
        try {
          attachedWindow.removeEventListener(
            'siftrix:auth-change',
            handleAuthChange
          )
        } catch {
          // Ignore cleanup errors
        }
      }
      detachRuntimeListeners = null
    }

    // Ensure state matches active scope if scope changed between construction and subscription,
    // and reconcile any already-mounted peer consumers if a silent scope transition occurred.
    if (!reconcileScope()) {
      const latest = loadChatHistory()
      if (!areMessageListsIdentical(state.messages, latest)) {
        state = {
          ...state,
          messages: latest,
        }
      }
    }
  }

  function subscribe(listener: () => void): () => void {
    storeListeners.add(listener)
    activeSubscriptions += 1
    if (activeSubscriptions === 1) {
      attachIfNeeded()
    }

    let unsubscribed = false
    return () => {
      if (unsubscribed) {
        return
      }
      unsubscribed = true
      storeListeners.delete(listener)
      activeSubscriptions = Math.max(0, activeSubscriptions - 1)
      if (activeSubscriptions === 0) {
        uiRequestEpoch += 1
        if (state.isTyping) {
          state = {
            ...state,
            isTyping: false,
          }
        }
        detachRuntimeListeners?.()
      }
    }
  }

  function mount(): () => void {
    return subscribe(() => {})
  }

  function setInputText(value: string): void {
    reconcileScope()
    if (state.inputText === value) {
      return
    }
    state = {
      ...state,
      inputText: value,
    }
    notifyStoreListeners()
  }

  async function sendMessage(textToSend?: string): Promise<void> {
    reconcileScope()

    const candidateText =
      textToSend !== undefined ? textToSend : state.inputText
    const text = candidateText.trim()
    if (!text || state.isTyping) {
      return
    }

    const userMessage = createUserMessage(text)
    const optimisticHistory = [...state.messages, userMessage]

    uiRequestEpoch += 1
    const requestEpoch = uiRequestEpoch

    state = {
      ...state,
      messages: optimisticHistory,
      inputText: '',
      isTyping: true,
    }
    notifyStoreListeners()

    // Imperatively persist user message; saveChatHistory merges with active storage
    // and synchronously notifies all mounted consumers via subscribeChatHistory.
    saveChatHistory(optimisticHistory)

    try {
      await sendChatMessage(text, state.messages)
      // Reconcile in case a silent guest migration rejection occurred while awaiting.
      // Valid completions have already updated state.messages via subscribeChatHistory
      // (or, if unsubscribed, are loaded cleanly without duplicate appends).
      if (!reconcileScope() && detachRuntimeListeners === null) {
        state = {
          ...state,
          messages: loadChatHistory(),
        }
      }
    } finally {
      if (uiRequestEpoch === requestEpoch && state.isTyping) {
        state = {
          ...state,
          isTyping: false,
        }
        notifyStoreListeners()
      }
    }
  }

  function clearHistory(): void {
    reconcileScope()
    uiRequestEpoch += 1

    const fresh = clearChatHistory()
    const currentMeta = getChatScopeMeta()
    trackedScopeKey = currentMeta.scopeKey
    trackedClearGen = currentMeta.clearGeneration
    trackedAuthEpoch = currentMeta.authEpoch

    state = {
      ...state,
      messages: fresh,
      isTyping: false,
      scopeKey: currentMeta.scopeKey,
    }
    notifyStoreListeners()
  }

  return {
    getSnapshot: () => state,
    subscribe,
    setInputText,
    sendMessage,
    clearHistory,
    reconcileScope,
    mount,
  }
}

export interface UseSyncedChatResult extends SyncedChatState {
  setInputText: (value: string) => void
  sendMessage: (textToSend?: string) => Promise<void>
  clearHistory: () => void
  reconcileScope: () => boolean
}

export function useSyncedChat(
  externalController?: SyncedChatController
): UseSyncedChatResult {
  const [controller] = useState(
    () => externalController ?? createSyncedChatController()
  )
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot
  )

  return {
    ...snapshot,
    setInputText: controller.setInputText,
    sendMessage: controller.sendMessage,
    clearHistory: controller.clearHistory,
    reconcileScope: controller.reconcileScope,
  }
}
