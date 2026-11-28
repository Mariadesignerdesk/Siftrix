import {
  AUTH_STORAGE_KEY,
  AUTH_TOKEN_KEY,
  getActiveUser,
  type AuthUser,
} from './authService'
import { loadSessionId } from '../utils/session'
import { isValidHttpUrl } from '../utils/textSanitize'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  citations?: string[]
  suggestedFollowUps?: string[]
  language?: 'en' | 'ur' | 'both'
}

/**
 * Legacy shared storage key from v1. Retained as a constant reference only;
 * never read, copied, or written so historical shared messages cannot leak
 * into guest or authenticated sessions.
 */
export const CHAT_STORAGE_KEY = 'siftrix_chat_history_v1'
export const CHAT_SYNC_EVENT = 'siftrix:chat-sync'

const GUEST_FALLBACK_CHAT_KEY = 'siftrix_chat_history_guest'
const GUEST_SESSION_CHAT_PREFIX = 'siftrix_chat_history_sess_'
const USER_CHAT_PREFIX = 'siftrix_chat_history_usr_'

export type ChatHistoryListener = (
  messages: ChatMessage[],
  scopeKey: string
) => void

export const DEFAULT_SUGGESTED_QUESTIONS = [
  'How do I identify a phishing link before clicking?',
  'What should I do if I clicked a suspicious link?',
  'What is SSRF and why is it dangerous?',
  'How does SIFTRIX analyze suspicious URLs and SMS?',
  'کیا آپ اردو میں سائبر سیکیورٹی رہنمائی فراہم کر سکتے ہیں؟',
]

const INITIAL_GREETING: ChatMessage = {
  id: 'msg_welcome',
  role: 'assistant',
  content:
    'Greetings! I am the SIFTRIX AI Cybersecurity Advisor. You can ask me to evaluate suspicious link characteristics, explain phishing attack vectors, review smishing warning signs, or advise on immediate breach containment.',
  timestamp: new Date().toISOString(),
  citations: ['SIFTRIX Threat Intelligence Core', 'NIST Cybersecurity Framework'],
  suggestedFollowUps: [
    'How do I identify a phishing link before clicking?',
    'What should I do if I clicked a suspicious link?',
    'What is SSRF and why is it dangerous?',
  ],
}

export function createUserMessage(content: string): ChatMessage {
  return {
    id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    role: 'user',
    content,
    timestamp: new Date().toISOString(),
  }
}

// In-memory fallback partitioned by session scope key so restricted-storage
// environments never share chat history across accounts or guest sessions.
const memoryChatStores: Record<string, ChatMessage[]> = {}
const scopeClearGenerations: Record<string, number> = {}
const clearedRawTombstones: Record<string, string> = {}
const unreadableClearedStorages = new WeakMap<object, Set<string>>()
const inFlightGuestRequestsByGen: Record<number, number> = {}
const promotedSessionByGuestGen: Record<
  number,
  { targetScopeKey: string; authEpoch: number }
> = {}
const chatSyncListeners = new Set<ChatHistoryListener>()
const registeredAuthWindows = new WeakSet<object>()
const registeredStorageWindows = new WeakSet<object>()

let authTransitionEpoch = 0
let lastObservedAuthUserId: string | null = null
let lastObservedGuestSessionKey: string | null = null
let lastSyncedScopeKey: string | null = null
let isBroadcastingScopeTransition = false

function getSafeLocalStorage(): Storage | null {
  try {
    if (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      window.localStorage !== null &&
      typeof window.localStorage.getItem === 'function'
    ) {
      return window.localStorage
    }
    if (
      typeof globalThis !== 'undefined' &&
      'localStorage' in globalThis &&
      globalThis.localStorage !== undefined &&
      globalThis.localStorage !== null &&
      typeof globalThis.localStorage.getItem === 'function'
    ) {
      return globalThis.localStorage
    }
  } catch {
    return null
  }
  return null
}

function isValidChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') {
    return false
  }
  const candidate = value as Partial<ChatMessage>
  return (
    typeof candidate.id === 'string' &&
    (candidate.role === 'user' ||
      candidate.role === 'assistant' ||
      candidate.role === 'system') &&
    typeof candidate.content === 'string' &&
    typeof candidate.timestamp === 'string'
  )
}

function cloneChatMessage(msg: ChatMessage): ChatMessage {
  return {
    ...msg,
    citations: msg.citations ? [...msg.citations] : undefined,
    suggestedFollowUps: msg.suggestedFollowUps
      ? [...msg.suggestedFollowUps]
      : undefined,
  }
}

function cloneDefaultGreeting(): ChatMessage[] {
  return [cloneChatMessage(INITIAL_GREETING)]
}

function clearStorageTombstone(storage: Storage | null, scopeKey: string): void {
  delete clearedRawTombstones[scopeKey]
  if (storage && typeof storage === 'object') {
    unreadableClearedStorages.get(storage)?.delete(scopeKey)
  }
}

function removeStoredHistoryForKey(scopeKey: string): void {
  delete memoryChatStores[scopeKey]

  const storage = getSafeLocalStorage()
  if (!storage) {
    delete clearedRawTombstones[scopeKey]
    return
  }

  let removeFailed = false
  try {
    storage.removeItem(scopeKey)
  } catch {
    removeFailed = true
  }

  try {
    const remainingRaw = storage.getItem(scopeKey)
    if (remainingRaw === null) {
      clearStorageTombstone(storage, scopeKey)
    } else {
      // removeItem threw or silently failed while getItem still returns stale data;
      // record a tombstone so readStoredHistoryForKey ignores this stale payload.
      clearedRawTombstones[scopeKey] = remainingRaw
      unreadableClearedStorages.get(storage)?.delete(scopeKey)
    }
  } catch {
    if (removeFailed) {
      let unreadableSet = unreadableClearedStorages.get(storage)
      if (!unreadableSet) {
        unreadableSet = new Set<string>()
        unreadableClearedStorages.set(storage, unreadableSet)
      }
      unreadableSet.add(scopeKey)
    }
  }
}

function hasAnyInFlightGuestRequest(): boolean {
  return Object.values(inFlightGuestRequestsByGen).some((count) => count > 0)
}

function purgeSessionlessGuestHistory(incrementGeneration: boolean): void {
  if (incrementGeneration) {
    scopeClearGenerations[GUEST_FALLBACK_CHAT_KEY] =
      (scopeClearGenerations[GUEST_FALLBACK_CHAT_KEY] ?? 0) + 1
  }
  removeStoredHistoryForKey(GUEST_FALLBACK_CHAT_KEY)
}

function handleAuthStateTransition(): void {
  authTransitionEpoch += 1
  const currentUser = getActiveUser()
  lastObservedAuthUserId = currentUser?.id ?? null
  lastObservedGuestSessionKey = null
  purgeSessionlessGuestHistory(true)

  const nextScopeKey = getChatStorageKey()
  const nextMessages =
    readStoredHistoryForKey(nextScopeKey) ?? cloneDefaultGreeting()
  emitChatSync(nextScopeKey, nextMessages)
}

function isStorageKeyRemoved(
  event: StorageEvent,
  storage: Storage,
  targetKey: string
): boolean {
  if (event && 'newValue' in event && event.newValue !== undefined) {
    return event.newValue === null
  }
  try {
    return storage.getItem(targetKey) === null
  } catch {
    return false
  }
}

function handleCrossTabStorageEvent(event: StorageEvent): void {
  const storage = getSafeLocalStorage()
  if (!storage) {
    return
  }

  if (
    event &&
    'storageArea' in event &&
    event.storageArea !== undefined &&
    event.storageArea !== null &&
    event.storageArea !== storage
  ) {
    return
  }

  const key = event && 'key' in event ? event.key : null
  const isAuthKey = key === AUTH_STORAGE_KEY || key === AUTH_TOKEN_KEY
  const isSessionIdKey = key === 'siftrix.session.id'
  const isChatHistoryKey =
    key === GUEST_FALLBACK_CHAT_KEY ||
    (typeof key === 'string' &&
      (key.startsWith(GUEST_SESSION_CHAT_PREFIX) ||
        key.startsWith(USER_CHAT_PREFIX)))

  if (key !== null && !isAuthKey && !isSessionIdKey && !isChatHistoryKey) {
    return
  }

  const previousAuthEpoch = authTransitionEpoch
  const previousEffectiveGuestScope =
    lastObservedGuestSessionKey ?? GUEST_FALLBACK_CHAT_KEY
  const activeScopeKey = getChatStorageKey()
  const authChanged = authTransitionEpoch !== previousAuthEpoch

  if (isAuthKey) {
    if (authChanged) {
      const nextMessages =
        readStoredHistoryForKey(activeScopeKey) ?? cloneDefaultGreeting()
      emitChatSync(activeScopeKey, nextMessages)
    }
    return
  }

  if (isSessionIdKey) {
    if (activeScopeKey.startsWith(USER_CHAT_PREFIX)) {
      return
    }
    if (activeScopeKey !== previousEffectiveGuestScope) {
      const activeMessages =
        readStoredHistoryForKey(activeScopeKey) ?? cloneDefaultGreeting()
      emitChatSync(activeScopeKey, activeMessages)
    }
    return
  }

  if (key === null) {
    const clearConfirmed = isStorageKeyRemoved(event, storage, activeScopeKey)
    if (clearConfirmed) {
      scopeClearGenerations[activeScopeKey] =
        (scopeClearGenerations[activeScopeKey] ?? 0) + 1
      removeStoredHistoryForKey(activeScopeKey)
      emitChatSync(activeScopeKey, cloneDefaultGreeting())
    } else if (authChanged) {
      const activeMessages =
        readStoredHistoryForKey(activeScopeKey) ?? cloneDefaultGreeting()
      emitChatSync(activeScopeKey, activeMessages)
    }
    return
  }

  if (key !== activeScopeKey) {
    return
  }

  if (isStorageKeyRemoved(event, storage, activeScopeKey)) {
    scopeClearGenerations[activeScopeKey] =
      (scopeClearGenerations[activeScopeKey] ?? 0) + 1
    removeStoredHistoryForKey(activeScopeKey)
    emitChatSync(activeScopeKey, cloneDefaultGreeting())
    return
  }

  const activeMessages =
    readStoredHistoryForKey(activeScopeKey) ?? cloneDefaultGreeting()
  emitChatSync(activeScopeKey, activeMessages)
}

function ensureAuthListenerAndSyncIdentity(): AuthUser | null {
  try {
    if (
      typeof window !== 'undefined' &&
      window !== null &&
      typeof window.addEventListener === 'function'
    ) {
      if (!registeredAuthWindows.has(window)) {
        registeredAuthWindows.add(window)
        window.addEventListener('siftrix:auth-change', handleAuthStateTransition)
      }
      if (!registeredStorageWindows.has(window)) {
        registeredStorageWindows.add(window)
        window.addEventListener('storage', handleCrossTabStorageEvent)
      }
    }
  } catch {
    // Ignore non-browser environments
  }

  const user = getActiveUser()
  const currentUserId = user?.id ?? null
  if (currentUserId !== lastObservedAuthUserId) {
    authTransitionEpoch += 1
    lastObservedAuthUserId = currentUserId
    lastObservedGuestSessionKey = null
    purgeSessionlessGuestHistory(true)
  }
  return user
}

ensureAuthListenerAndSyncIdentity()

function readStoredHistoryForKey(scopeKey: string): ChatMessage[] | null {
  // C3: Check memoryChatStores[scopeKey] first because writeStoredHistoryForKey deletes
  // memoryChatStores[scopeKey] whenever localStorage persistence succeeds; an entry
  // here only exists when a newer write failed to persist (e.g., QuotaExceededError).
  const fromMemory = memoryChatStores[scopeKey]
  if (fromMemory && fromMemory.length > 0) {
    return fromMemory.map(cloneChatMessage)
  }

  const storage = getSafeLocalStorage()
  if (storage) {
    if (unreadableClearedStorages.get(storage)?.has(scopeKey)) {
      return null
    }

    try {
      const raw = storage.getItem(scopeKey)
      if (raw === null) {
        delete clearedRawTombstones[scopeKey]
        return null
      }
      if (clearedRawTombstones[scopeKey] === raw) {
        return null
      }
      delete clearedRawTombstones[scopeKey]

      const parsed: unknown = JSON.parse(raw)
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        parsed.every(isValidChatMessage)
      ) {
        return parsed.map(cloneChatMessage)
      }
    } catch {
      // Ignore storage or JSON parse errors
    }
  }

  return null
}

function writeStoredHistoryForKey(
  scopeKey: string,
  messages: ChatMessage[]
): { persistedToStorage: boolean; retainedInMemory: boolean } {
  const cloned = messages.map(cloneChatMessage)
  const storage = getSafeLocalStorage()
  const serialized = JSON.stringify(cloned)
  let persistedToStorage = false

  if (storage) {
    try {
      storage.setItem(scopeKey, serialized)
      persistedToStorage = storage.getItem(scopeKey) === serialized
    } catch {
      persistedToStorage = false
    }
  }

  if (persistedToStorage) {
    clearStorageTombstone(storage, scopeKey)
    delete memoryChatStores[scopeKey]
    return { persistedToStorage: true, retainedInMemory: false }
  }

  memoryChatStores[scopeKey] = cloned
  const retainedInMemory =
    Array.isArray(memoryChatStores[scopeKey]) &&
    memoryChatStores[scopeKey].length === cloned.length
  return { persistedToStorage: false, retainedInMemory }
}

function migrateGuestHistoryIfNeeded(sessionScopeKey: string): void {
  if (!sessionScopeKey.startsWith(GUEST_SESSION_CHAT_PREFIX)) {
    return
  }

  const guestGen = scopeClearGenerations[GUEST_FALLBACK_CHAT_KEY] ?? 0
  const priorPromotion = promotedSessionByGuestGen[guestGen]
  const guestHistory = readStoredHistoryForKey(GUEST_FALLBACK_CHAT_KEY)
  const existingSessionHistory = readStoredHistoryForKey(sessionScopeKey)

  if (existingSessionHistory && existingSessionHistory.length > 0) {
    // Never overwrite existing session-scoped history with older sessionless guest history.
    const isAlreadyPromotedTarget =
      priorPromotion !== undefined &&
      priorPromotion.authEpoch === authTransitionEpoch &&
      priorPromotion.targetScopeKey === sessionScopeKey

    if (guestHistory && guestHistory.length > 0) {
      delete promotedSessionByGuestGen[guestGen]
      purgeSessionlessGuestHistory(true)
    } else if (!isAlreadyPromotedTarget && hasAnyInFlightGuestRequest()) {
      purgeSessionlessGuestHistory(true)
    }
    return
  }

  if (
    priorPromotion !== undefined &&
    priorPromotion.authEpoch === authTransitionEpoch &&
    priorPromotion.targetScopeKey !== sessionScopeKey
  ) {
    scopeClearGenerations[GUEST_FALLBACK_CHAT_KEY] = guestGen + 1
  }

  const activeGuestGen = scopeClearGenerations[GUEST_FALLBACK_CHAT_KEY] ?? 0

  if (guestHistory && guestHistory.length > 0) {
    const { persistedToStorage, retainedInMemory } = writeStoredHistoryForKey(
      sessionScopeKey,
      guestHistory
    )

    if (persistedToStorage || retainedInMemory) {
      if ((scopeClearGenerations[sessionScopeKey] ?? 0) === 0) {
        promotedSessionByGuestGen[activeGuestGen] = {
          targetScopeKey: sessionScopeKey,
          authEpoch: authTransitionEpoch,
        }
      }
      purgeSessionlessGuestHistory(false)
    }
    return
  }

  if (
    (inFlightGuestRequestsByGen[activeGuestGen] ?? 0) > 0 &&
    (scopeClearGenerations[sessionScopeKey] ?? 0) === 0 &&
    promotedSessionByGuestGen[activeGuestGen] === undefined
  ) {
    promotedSessionByGuestGen[activeGuestGen] = {
      targetScopeKey: sessionScopeKey,
      authEpoch: authTransitionEpoch,
    }
  }
}

function mergeChatHistories(
  existing: ChatMessage[] | null,
  incoming: ChatMessage[]
): ChatMessage[] {
  if (!existing || existing.length === 0) {
    const deduped: ChatMessage[] = []
    const seen = new Set<string>()
    for (const msg of incoming) {
      if (isValidChatMessage(msg) && !seen.has(msg.id)) {
        seen.add(msg.id)
        deduped.push(cloneChatMessage(msg))
      }
    }
    return deduped
  }

  const merged: ChatMessage[] = []
  const seen = new Set<string>()
  const existingHasWelcome = existing.some((m) => m.id === INITIAL_GREETING.id)

  for (const msg of existing) {
    if (isValidChatMessage(msg) && !seen.has(msg.id)) {
      seen.add(msg.id)
      merged.push(cloneChatMessage(msg))
    }
  }

  for (const msg of incoming) {
    if (!isValidChatMessage(msg) || seen.has(msg.id)) {
      continue
    }
    if (msg.id === INITIAL_GREETING.id && !existingHasWelcome) {
      continue
    }
    seen.add(msg.id)
    merged.push(cloneChatMessage(msg))
  }

  return merged
}

function emitChatSync(scopeKey: string, messages: ChatMessage[]): void {
  lastSyncedScopeKey = scopeKey
  const snapshot = messages.map(cloneChatMessage)

  chatSyncListeners.forEach((listener) => {
    try {
      listener(snapshot.map(cloneChatMessage), scopeKey)
    } catch {
      // Ignore subscriber callback errors
    }
  })

  try {
    if (
      typeof window !== 'undefined' &&
      window !== null &&
      typeof window.dispatchEvent === 'function'
    ) {
      window.dispatchEvent(
        new CustomEvent(CHAT_SYNC_EVENT, {
          detail: {
            scopeKey,
            messages: snapshot.map(cloneChatMessage),
          },
        })
      )
    }
  } catch {
    // Ignore non-browser environments
  }
}

/**
 * Subscribes to same-tab scoped chat history updates without triggering storage writes.
 */
export function subscribeChatHistory(listener: ChatHistoryListener): () => void {
  chatSyncListeners.add(listener)
  return () => {
    chatSyncListeners.delete(listener)
  }
}

/**
 * Derives the storage key scoped to the active authenticated user or guest session.
 * - Authenticated user: `siftrix_chat_history_usr_<userId>`
 * - Guest with X-Session-ID: `siftrix_chat_history_sess_<sessionId>` (migrating pre-scan guest history safely)
 * - Fresh uninitialized guest: `siftrix_chat_history_guest`
 */
export function getChatStorageKey(): string {
  const user = ensureAuthListenerAndSyncIdentity()
  if (user && user.id) {
    lastObservedGuestSessionKey = null
    return `${USER_CHAT_PREFIX}${user.id}`
  }
  const sessionId = loadSessionId()
  if (sessionId) {
    const sessionScopeKey = `${GUEST_SESSION_CHAT_PREFIX}${sessionId}`
    migrateGuestHistoryIfNeeded(sessionScopeKey)
    lastObservedGuestSessionKey = sessionScopeKey
    return sessionScopeKey
  }
  if (lastObservedGuestSessionKey !== null) {
    lastObservedGuestSessionKey = null
    scopeClearGenerations[GUEST_FALLBACK_CHAT_KEY] =
      (scopeClearGenerations[GUEST_FALLBACK_CHAT_KEY] ?? 0) + 1
  }
  return GUEST_FALLBACK_CHAT_KEY
}

/**
 * Loads persisted chat history for the active user/guest scope or initializes
 * with the welcome message. Never reads the legacy shared v1 key.
 */
export function loadChatHistory(): ChatMessage[] {
  const scopeKey = getChatStorageKey()
  const stored = readStoredHistoryForKey(scopeKey)
  if (stored && stored.length > 0) {
    return stored
  }
  return cloneDefaultGreeting()
}

export interface ChatScopeMeta {
  scopeKey: string
  clearGeneration: number
  authEpoch: number
}

function areChatMessagesEqual(a: ChatMessage, b: ChatMessage): boolean {
  if (
    a.id !== b.id ||
    a.role !== b.role ||
    a.content !== b.content ||
    a.timestamp !== b.timestamp ||
    a.language !== b.language
  ) {
    return false
  }
  const aCit = a.citations ?? []
  const bCit = b.citations ?? []
  if (aCit.length !== bCit.length || aCit.some((val, idx) => val !== bCit[idx])) {
    return false
  }
  const aFol = a.suggestedFollowUps ?? []
  const bFol = b.suggestedFollowUps ?? []
  if (aFol.length !== bFol.length || aFol.some((val, idx) => val !== bFol[idx])) {
    return false
  }
  return true
}

function areChatHistoriesEqual(
  a: ChatMessage[] | null,
  b: ChatMessage[]
): boolean {
  if (!a || a.length !== b.length) {
    return false
  }
  return a.every((msg, idx) => areChatMessagesEqual(msg, b[idx]))
}

/**
 * Returns the active chat storage scope key alongside its current clear generation
 * and authentication transition epoch for UI synchronization.
 */
export function getChatScopeMeta(): ChatScopeMeta {
  const scopeKey = getChatStorageKey()
  return {
    scopeKey,
    clearGeneration: scopeClearGenerations[scopeKey] ?? 0,
    authEpoch: authTransitionEpoch,
  }
}

/**
 * Returns true when transitioning from `previousScopeKey` to `currentScopeKey`
 * represents a legitimate promotion of that exact sessionless guest generation
 * into a newly assigned empty guest session.
 */
export function isPromotedGuestSession(
  previousScopeKey: string,
  previousClearGeneration: number,
  previousAuthEpoch: number,
  currentScopeKey: string
): boolean {
  if (
    previousScopeKey !== GUEST_FALLBACK_CHAT_KEY ||
    !currentScopeKey.startsWith(GUEST_SESSION_CHAT_PREFIX) ||
    authTransitionEpoch !== previousAuthEpoch ||
    (scopeClearGenerations[GUEST_FALLBACK_CHAT_KEY] ?? 0) !==
      previousClearGeneration ||
    (scopeClearGenerations[currentScopeKey] ?? 0) !== 0
  ) {
    return false
  }
  const recorded = promotedSessionByGuestGen[previousClearGeneration]
  return (
    recorded !== undefined &&
    recorded.authEpoch === previousAuthEpoch &&
    recorded.targetScopeKey === currentScopeKey
  )
}

/**
 * Broadcasts the current active scope and its history to subscribed chat consumers
 * only when at least one mounted consumer (or the last synced scope) lags behind a
 * silent scope transition (such as rejected guest migration or `clearSessionId()`).
 * Guarded against recursive re-entrancy and avoids unnecessary broadcasts.
 */
export function syncMountedChatConsumers(
  observedConsumerScopeKeys?: Iterable<string>
): void {
  if (isBroadcastingScopeTransition || chatSyncListeners.size === 0) {
    return
  }

  const activeScopeKey = getChatStorageKey()
  let hasOutdatedConsumer =
    lastSyncedScopeKey !== null && lastSyncedScopeKey !== activeScopeKey

  if (!hasOutdatedConsumer && observedConsumerScopeKeys) {
    for (const consumerScope of observedConsumerScopeKeys) {
      if (consumerScope !== activeScopeKey) {
        hasOutdatedConsumer = true
        break
      }
    }
  }

  if (!hasOutdatedConsumer) {
    lastSyncedScopeKey = activeScopeKey
    return
  }

  isBroadcastingScopeTransition = true
  try {
    const activeMessages =
      readStoredHistoryForKey(activeScopeKey) ?? cloneDefaultGreeting()
    emitChatSync(activeScopeKey, activeMessages)
  } finally {
    isBroadcastingScopeTransition = false
  }
}

/**
 * Persists chat history into the active user/guest scope, merging by message ID
 * within the current clear generation so concurrent widgets in the same scope
 * never overwrite each other's newer messages.
 */
export function saveChatHistory(messages: ChatMessage[]): void {
  const scopeKey = getChatStorageKey()
  const existing = readStoredHistoryForKey(scopeKey)
  const merged = mergeChatHistories(existing, messages)
  const hasMemoryPendingFlush = Boolean(memoryChatStores[scopeKey]?.length)
  if (!hasMemoryPendingFlush && areChatHistoriesEqual(existing, merged)) {
    return
  }
  writeStoredHistoryForKey(scopeKey, merged)
  emitChatSync(scopeKey, merged)
}

/**
 * Clears chat history for the active user/guest scope only, advances the scope's
 * clear generation so pending requests cannot resurrect cleared messages, and
 * restores the initial greeting.
 */
export function clearChatHistory(): ChatMessage[] {
  const scopeKey = getChatStorageKey()
  scopeClearGenerations[scopeKey] =
    (scopeClearGenerations[scopeKey] ?? 0) + 1
  removeStoredHistoryForKey(scopeKey)

  const fresh = cloneDefaultGreeting()
  emitChatSync(scopeKey, fresh)
  return fresh
}

/**
 * Extracts the first valid plain HTTP/HTTPS URL outside inline backtick code spans,
 * stripping trailing sentence punctuation and unbalanced closing brackets/parentheses.
 * Returns null for empty, malformed, credentialed, or unsafe URLs.
 */
export function extractPlainHttpUrl(prompt: string): string | null {
  if (!prompt) return null
  const withoutInlineCode = prompt.replace(/`[^`\n]*`/g, ' ')
  const matches = withoutInlineCode.matchAll(/https?:\/\/[^\s<>`\\\u0600-\u06FF]+/gi)

  for (const match of matches) {
    let candidate = match[0]
    for (;;) {
      const before = candidate
      candidate = candidate.replace(/[.,;:!?'"*\u06D4\u060C\u061B\u061F]+$/, '')
      if (
        candidate.endsWith(')') &&
        (candidate.match(/\)/g) || []).length > (candidate.match(/\(/g) || []).length
      ) {
        candidate = candidate.slice(0, -1)
      }
      if (
        candidate.endsWith(']') &&
        (candidate.match(/\]/g) || []).length > (candidate.match(/\[/g) || []).length
      ) {
        candidate = candidate.slice(0, -1)
      }
      if (candidate === before) break
    }

    if (isValidHttpUrl(candidate)) {
      return candidate
    }
  }

  return null
}

/**
 * AI Cybersecurity response generator using simulated NLP intent recognition.
 * Prepares the frontend contract for seamless integration with real LLM APIs.
 */
export async function sendChatMessage(
  prompt: string,
  history: ChatMessage[]
): Promise<ChatMessage> {
  const requestScopeKey = getChatStorageKey()
  const requestClearGen = scopeClearGenerations[requestScopeKey] ?? 0
  const requestAuthEpoch = authTransitionEpoch
  const isSessionlessGuestRequest = requestScopeKey === GUEST_FALLBACK_CHAT_KEY
  if (isSessionlessGuestRequest) {
    inFlightGuestRequestsByGen[requestClearGen] =
      (inFlightGuestRequestsByGen[requestClearGen] ?? 0) + 1
  }

  try {
    // Simulate network/streaming latency
    await new Promise((resolve) => setTimeout(resolve, 600))

    const cleanPrompt = prompt.trim().toLowerCase()
    const isUrduQuery = /[\u0600-\u06FF]/.test(prompt) || cleanPrompt.includes('urdu')

    let responseContent: string
    let citations: string[]
    let suggestedFollowUps: string[]

    // If the user supplied a valid plain http(s) URL outside inline code, echo it back as normal
    // text so MarkdownMessage renders it safely as a clickable external link.
    const urlInPrompt = extractPlainHttpUrl(prompt)

    if (urlInPrompt) {
      if (isUrduQuery) {
        responseContent = `### 🔗 لنک کا حوالہ

آپ کا فراہم کردہ لنک یہاں موجود ہے: ${urlInPrompt}

**احتیاطی نوٹ:** یہ لنک نئے ٹیب میں کھلے گا اور SIFTRIX نے ابھی اس کی تصدیق نہیں کی ہے۔ کھولنے سے پہلے مشکوک لنک کو SIFTRIX تھریٹ سکینر میں ضرور چیک کریں۔`
        citations = ['SIFTRIX اردو سیکیورٹی گائیڈ']
      } else {
        responseContent = `### 🔗 Link Reference

Here is the URL you shared, as a normal link: ${urlInPrompt}

**Safety note:** it opens an external site in a new tab and SIFTRIX has not verified it. If you are unsure, paste it into the SIFTRIX Threat Scanner before visiting.`
        citations = ['SIFTRIX Threat Scanner']
      }
      suggestedFollowUps = [
        'How do I identify a phishing link before clicking?',
        'What should I do if I clicked a suspicious link?',
      ]
    } else if (isUrduQuery) {
      responseContent = `**SIFTRIX سائبر سیکیورٹی مشیر کی رہنمائی:**

1. **مشکوک لنکس کی فوری شناخت:**
   - ڈومین کے ہجے غور سے دیکھیں۔ ہیکرز اکثر ملتی جلتی ڈومینز (جیسے \`chase-security.xyz\`) استعمال کرتے ہیں۔
   - کسی نامعلوم SMS یا ای میل میں فوری لاگ ان کرنے یا OTP شیئر کرنے سے گریز کریں۔

2. **اگر آپ نے مشکوک لنک کھول دیا ہو:**
   - اپنے براؤزر کا انٹرنیٹ فوری منقطع کریں۔
   - اس سروس کا پاس ورڈ کسی محفوظ ڈیوائس سے فوراً تبدیل کریں۔
   - دو طرفہ تصدیق (2FA) فعال رکھیں۔

SIFTRIX کا تھریٹ سکینر آپ کو اردو اور انگریزی دونوں میں تفصیلی تجزیہ فراہم کرتا ہے۔`
      citations = ['SIFTRIX اردو سیکیورٹی گائیڈ', 'OWASP Phishing Defense']
      suggestedFollowUps = [
        'What should I do if I clicked a suspicious link?',
        'How does SIFTRIX analyze suspicious URLs and SMS?',
      ]
    } else if (cleanPrompt.includes('clicked') || cleanPrompt.includes('opened') || cleanPrompt.includes('victim')) {
      responseContent = `### 🚨 Immediate Breach Containment Protocol

If you clicked an untrusted or suspicious link, execute these containment steps immediately:

1. **Do NOT Enter Credentials**: If a login or payment form opened, close the tab immediately without typing your password, OTP, or credit card details.
2. **Disconnect Network**: Turn off Wi-Fi or disconnect Ethernet on the affected device to halt background payload downloads or C2 (Command & Control) beacons.
3. **Reset Passwords from a Clean Device**:
   - Access the target service (e.g. your bank, email, or Google account) from a secondary known-clean device.
   - Update your password and terminate all active sessions (\`Sign out of all devices\`).
4. **Enable Multi-Factor Authentication (MFA)**: Enforce authenticator-app or hardware-key 2FA. Avoid SMS 2FA if SIM-swapping is suspected.
5. **Scan for Malware**: Run a thorough endpoint security scan on the machine.
6. **Report the Threat**: Submit the suspicious link into SIFTRIX Threat Scanner to log indicators of compromise (IoC) in your Security Audit Log.`
      citations = ['CISA Incident Handling Guidelines', 'NIST SP 800-61 Rev 2']
      suggestedFollowUps = [
        'How do I identify a phishing link before clicking?',
        'What is SSRF and why is it dangerous?',
      ]
    } else if (cleanPrompt.includes('identify') || cleanPrompt.includes('spot') || cleanPrompt.includes('phishing') || cleanPrompt.includes('link')) {
      responseContent = `### 🔍 How to Identify Phishing Links Like a SOC Analyst

Attackers use visual deception to masquerade as trusted organizations. Look for these four red flags:

1. **Deceptive Top-Level Domains (TLDs)**:
   - Legitimate: \`https://chase.com\`
   - Phishing: \`https://chase-security-verify.xyz\` or \`http://login.bank.com.suspicious-domain.ru\`
   - *Rule*: Read from right to left before the first slash to identify the true root domain.
2. **Homograph & Punycode Attacks**:
   - Attackers substitute Cyrillic or Greek characters that look identical to Latin letters (e.g. \`gооgle.com\` where 'о' is Cyrillic).
3. **Artificial Urgency & Pressure Tactics**:
   - Phrases like *"Account suspended in 24 hours"*, *"Pending courier fee of $1.50"*, or *"Unusual activity detected"*.
4. **Unencrypted HTTP or Free Hosting**:
   - Free subdomains (\`.workers.dev\`, \`.firebaseapp.com\`, \`.weebly.com\`) hosting login forms for corporate brands.

*Tip: Paste any suspicious URL directly into the SIFTRIX Threat Scanner to run automated heuristic and reputation scoring.*`
      citations = ['MITRE ATT&CK T1566: Phishing', 'VirusTotal URL Intelligence']
      suggestedFollowUps = [
        'What is SSRF and why is it dangerous?',
        'How does SIFTRIX analyze suspicious URLs and SMS?',
        'What should I do if I clicked a suspicious link?',
      ]
    } else if (cleanPrompt.includes('ssrf')) {
      responseContent = `### 🛡️ Server-Side Request Forgery (SSRF) Explained

**SSRF (Server-Side Request Forgery)** occurs when an attacker induces a server application to make HTTP requests to an arbitrary domain of the attacker's choosing.

**Why it is critical in URL Scanners:**
When a cybersecurity tool scans a URL, it must inspect the destination. Without robust SSRF defenses, an attacker could supply \`http://169.254.169.254\` (AWS metadata endpoint) or \`http://localhost:8080/admin\` to trick the scanner into dumping internal cloud credentials.

**How SIFTRIX Mitigates SSRF:**
- Strict scheme filtering (only \`http://\` and \`https://\` accepted).
- Rejection of loopback addresses (\`localhost\`, \`127.0.0.1\`, \`::1\`).
- Rejection of private RFC 1918 IPv4 ranges (\`10.0.0.0/8\`, \`172.16.0.0/12\`, \`192.168.0.0/16\`).
- Strict cloud metadata boundary protection.`
      citations = ['OWASP Top 10 A10: Server-Side Request Forgery', 'RFC 1918 Private Addressing']
      suggestedFollowUps = [
        'How does SIFTRIX analyze suspicious URLs and SMS?',
        'How do I identify a phishing link before clicking?',
      ]
    } else if (cleanPrompt.includes('siftrix') || cleanPrompt.includes('how does') || cleanPrompt.includes('agent')) {
      responseContent = `### ⚡ The SIFTRIX Multi-Agent Cybersecurity Architecture

SIFTRIX employs a triple-agent orchestrated defense mesh:

1. **URL Intelligence Agent**:
   - Inspects URL entropy, scheme boundaries, TLD risk, and SSRF restrictions.
   - Queries external intelligence signals (such as VirusTotal) to check domain reputation.
2. **Message Intelligence Agent**:
   - Analyzes textual content, SMS messages, and emails using Natural Language Processing.
   - Detects social engineering urgency, authority impersonation, and credential traps.
3. **Security Advisor Agent**:
   - Synthesizes findings from both specialized agents into a unified 0–100 risk score.
   - Produces clear, actionable threat advisories in both **English** and **Urdu (اردو)**.

All scans automatically persist to your browser's audit log and Security Dashboard.`
      citations = ['SIFTRIX Architecture Blueprint v2', 'FastAPI Multi-Agent Pipeline']
      suggestedFollowUps = [
        'How do I identify a phishing link before clicking?',
        'What should I do if I clicked a suspicious link?',
      ]
    } else {
      responseContent = `Thank you for your cybersecurity question.

Regarding **"${prompt.slice(0, 80)}"**:
SIFTRIX continuously evaluates attack surfaces across URLs, SMS messages, and email lures. Key safety fundamentals to keep in mind:
- Always verify the authentic root domain before entering passwords.
- Treat unsolicited messages containing links or attachments with zero trust.
- Leverage multi-factor authentication (MFA) across all sensitive workspaces.
- You can paste any suspicious string directly into the SIFTRIX scanner at the top of the platform for automated multi-agent threat grading.

Would you like specific advice on phishing indicators, incident containment, or SSRF protection?`
      citations = ['SIFTRIX Knowledge Base', 'Center for Internet Security (CIS)']
      suggestedFollowUps = [
        'How do I identify a phishing link before clicking?',
        'What should I do if I clicked a suspicious link?',
        'What is SSRF and why is it dangerous?',
      ]
    }

    const assistantMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      role: 'assistant',
      content: responseContent,
      timestamp: new Date().toISOString(),
      citations,
      suggestedFollowUps,
      language: isUrduQuery ? 'ur' : 'en',
    }

    const currentScopeKey = getChatStorageKey()
    const recordedPromotion = isSessionlessGuestRequest
      ? promotedSessionByGuestGen[requestClearGen]
      : undefined
    const isGuestSessionPromotion =
      isSessionlessGuestRequest &&
      currentScopeKey.startsWith(GUEST_SESSION_CHAT_PREFIX) &&
      authTransitionEpoch === requestAuthEpoch &&
      recordedPromotion !== undefined &&
      recordedPromotion.authEpoch === requestAuthEpoch &&
      recordedPromotion.targetScopeKey === currentScopeKey
    const targetScopeKey = isGuestSessionPromotion
      ? currentScopeKey
      : requestScopeKey

    if (
      currentScopeKey === targetScopeKey &&
      authTransitionEpoch === requestAuthEpoch &&
      (scopeClearGenerations[requestScopeKey] ?? 0) === requestClearGen &&
      (!isGuestSessionPromotion ||
        (scopeClearGenerations[targetScopeKey] ?? 0) === 0)
    ) {
      const existing = readStoredHistoryForKey(targetScopeKey)
      const merged = mergeChatHistories(existing, [...history, assistantMessage])
      writeStoredHistoryForKey(targetScopeKey, merged)
      emitChatSync(targetScopeKey, merged)
    }

    return assistantMessage
  } finally {
    if (isSessionlessGuestRequest) {
      const remaining = (inFlightGuestRequestsByGen[requestClearGen] ?? 1) - 1
      if (remaining <= 0) {
        delete inFlightGuestRequestsByGen[requestClearGen]
      } else {
        inFlightGuestRequestsByGen[requestClearGen] = remaining
      }
    }
  }
}
